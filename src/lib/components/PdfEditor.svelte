<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { getPdfjs } from '$lib/pdf/pdfjs'
  import { markdownToTypst } from '$lib/pipeline/markdownToTypst'
  import { markdownToHtml } from '$lib/pipeline/markdownToHtml'
  import { getSharedTypstWorkerClient, TypstWorkerClient } from '$lib/workers/typstClient'
  import type { UILang } from '$lib/i18n/lang'
  import { renderMermaidToSvg } from '$lib/mermaid/render'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import type { RegisterSWOptions } from 'virtual:pwa-register/svelte'

  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte'
  import StatusHint from '$lib/components/StatusHint.svelte'
  import WysiwygEditor from '$lib/components/WysiwygEditor.svelte'
  import DocumentMenu from '$lib/components/DocumentMenu.svelte'
  import { PDF_TEMPLATES } from '$lib/templates/pdf-templates'
  import {
    documentStore,
    isBrokenTemplateDocument,
    isLegacyImplicitBlankDocument,
  } from '$lib/stores/documentStore.svelte'

  import 'pdfjs-dist/web/pdf_viewer.css'

  import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
  import type { PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
  import type { SavedDocument } from '$lib/storage/documents'

  // Props
  interface Props {
    lang: UILang
    seoTitle: string
    seoDescription: string
    initialMarkdown?: string
  }

  let {
    lang = 'en',
    seoTitle,
    seoDescription,
    initialMarkdown = '',
  }: Props = $props()

  // ========================================
  // State
  // ========================================
  let markdown = $state('')
  let hasInitializedMarkdown = false
  let markdownEditor = $state<MarkdownEditor | null>(null)
  let wysiwygEditor = $state<WysiwygEditor | null>(null)
  let imageInputEl = $state<HTMLInputElement | null>(null)

  type LocalImageAsset = {
    bytes: Uint8Array
    objectUrl: string
  }

  let imageAssets = $state<Record<string, LocalImageAsset>>({})

  // PWA Service Worker
  const swOptions: RegisterSWOptions = {
    onRegistered(swr) {
      console.log('SW registered: ', swr)
      if (swr) {
        setInterval(
          () => {
            console.log('Checking for SW update...')
            swr.update()
          },
          60 * 60 * 1000,
        )
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  }
  const { needRefresh, updateServiceWorker } = useRegisterSW(swOptions)

  function applyLoadedDocument(doc: SavedDocument) {
    markdown = doc.content
    documentStore.finishDocumentTransition()
  }

  $effect(() => {
    if (hasInitializedMarkdown) return
    if (!browser) return
    hasInitializedMarkdown = true
    ;(async () => {
      const hasSeedMarkdown = initialMarkdown.trim() !== ''
      await documentStore.init({ restoreCurrent: !hasSeedMarkdown })
      if (hasSeedMarkdown) {
        documentStore.setCurrentDocument(null, false)
        markdown = initialMarkdown
        return
      }
      const pdfDocs = documentStore.recentDocuments.filter((d) => d.mode === 'pdf')
      const invalidAutoDocs = pdfDocs.filter(
        (doc) => isLegacyImplicitBlankDocument(doc) || isBrokenTemplateDocument(doc),
      )
      if (invalidAutoDocs.length > 0) {
        for (const doc of invalidAutoDocs) {
          await documentStore.deleteDocument(doc.id)
        }
      }
      const usablePdfDocs = pdfDocs.filter(
        (doc) => !isLegacyImplicitBlankDocument(doc) && !isBrokenTemplateDocument(doc),
      )
      // Try loading current doc if it belongs to this mode
      if (documentStore.currentDocId) {
        const currentDoc = documentStore.recentDocuments.find((d) => d.id === documentStore.currentDocId)
        if (currentDoc?.mode === 'pdf' && !isLegacyImplicitBlankDocument(currentDoc)) {
          const doc = await documentStore.loadDocument(documentStore.currentDocId)
          if (doc !== null) {
            applyLoadedDocument(doc)
            return
          }
        }
      }
      // Check if there are recent PDF docs
      if (usablePdfDocs.length > 0) {
        const doc = await documentStore.loadDocument(usablePdfDocs[0].id)
        if (doc !== null) {
          applyLoadedDocument(doc)
          return
        }
      }
      // Create new doc from initial markdown or template
      const defaultContent = initialMarkdown || PDF_TEMPLATES[lang]?.[0]?.content || ''
      markdown = defaultContent
      const doc = await documentStore.createDocument('pdf', defaultContent, undefined, 'template')
      applyLoadedDocument(doc)
    })()
  })

  // Layout state
  let leftPaneWidth = $state(50)
  let isResizing = $state(false)
  let isDragging = $state(false)

  let editorMode = $state<'code' | 'wysiwyg'>(
    (browser && (localStorage.getItem('mdxport-editor-mode') as 'code' | 'wysiwyg')) || 'wysiwyg',
  )

  // Style state (PDF only — no redbook styles)
  let style = $state(
    (browser && localStorage.getItem('mdxport-style')) || 'modern-tech',
  ) as 'modern-tech' | 'classic-editorial'

  const STYLE_OPTIONS = [
    { id: 'modern-tech' as const, label: { zh: '现代风', en: 'Modern' } },
    { id: 'classic-editorial' as const, label: { zh: '经典风', en: 'Classic' } },
  ]

  let templates = $derived(PDF_TEMPLATES[lang] || [])

  // Mobile state
  let activeMobileTab = $state<'editor' | 'preview'>('editor')
  let isMenuOpen = $state(false)

  function toggleMenu(e?: Event) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    isMenuOpen = !isMenuOpen
  }

  function closeMenu() {
    isMenuOpen = false
  }

  // Derived filename
  let filename = $derived.by(() => {
    const h1Match = markdown.match(/^#\s+(.+)$/m)
    let base = h1Match ? h1Match[1].trim() : 'Untitled'

    base = base.replace(/[\\/:*?"<>|\x00-\x1F]/g, ' ')
    base = base.replace(/\s+/g, ' ').trim()

    if (!base) base = 'Untitled'

    const MAX_LEN = 50
    if (base.length > MAX_LEN) {
      base = base.substring(0, MAX_LEN).trim()
    }

    return `${base} - mdxport.com`
  })

  // SEO Content
  let seoHtml = $derived(markdownToHtml(initialMarkdown || ''))

  // Compilation state
  let status: 'idle' | 'compiling' | 'done' | 'error' = $state('idle')
  let errorMessage: string | null = $state(null)
  let pdfBytes = $state<Uint8Array | null>(null)
  let pdfUrl = $state<string | null>(null)

  // Loading state
  let isLoading = $state(true)
  let loadingText = $state('Initializing...')

  // PDF Viewer state
  let client = $state<TypstWorkerClient | null>(null)
  let pdfDoc = $state<PDFDocumentProxy | null>(null)
  let pdfPages = $state(0)
  let pdfPage = $state(1)
  let pdfScale = $state(1)
  let pdfViewer = $state<PDFViewer | null>(null)
  let pdfLinkService = $state<PDFLinkService | null>(null)
  let previewContainerEl = $state<HTMLDivElement | null>(null)
  let pdfViewerContainerElA = $state<HTMLDivElement | null>(null)
  let pdfViewerContainerElB = $state<HTMLDivElement | null>(null)
  let pdfViewerElA = $state<HTMLDivElement | null>(null)
  let pdfViewerElB = $state<HTMLDivElement | null>(null)
  let pdfLoadTask: PDFDocumentLoadingTask | null = null
  let pdfLoadSeq = 0
  let showPreviewCompilingHint = $state(false)
  let compilingHintTimer: number | null = null
  let activePreviewSlot = $state<0 | 1>(0)

  type ViewerRuntime = {
    viewer: PDFViewer | null
    linkService: PDFLinkService | null
    eventBus: {
      on: (name: string, cb: (event: any) => void) => void
      off: (name: string, cb: (event: any) => void) => void
    } | null
    doc: PDFDocumentProxy | null
  }

  const viewerRuntimes: [ViewerRuntime, ViewerRuntime] = [
    { viewer: null, linkService: null, eventBus: null, doc: null },
    { viewer: null, linkService: null, eventBus: null, doc: null },
  ]

  // Auto-compile
  let compileSeq = 0
  let hasEverCompiled = false
  let autoPreviewTimer: number | null = null

  // UI Text
  const UI = {
    zh: {
      new: '新建',
      template: '模板',
      export: '导出 PDF',
      loading: '正在初始化渲染引擎...',
      generating: '生成中...',
      langSwitch: 'EN',
      placeholder: '在这里输入 Markdown...',
    },
    en: {
      new: 'New',
      template: 'Template',
      export: 'Export PDF',
      loading: 'Initializing rendering engine...',
      generating: 'Generating...',
      langSwitch: '中',
      placeholder: 'Type Markdown here...',
    },
  }

  const SEO = {
    zh: { ogLocale: 'zh_CN' },
    en: { ogLocale: 'en_US' },
  }

  function t<K extends keyof (typeof UI)['zh']>(key: K): string {
    return UI[lang][key]
  }

  function getPreviewContainer(slot: 0 | 1): HTMLDivElement | null {
    return slot === 0 ? pdfViewerContainerElA : pdfViewerContainerElB
  }

  function getPreviewViewer(slot: 0 | 1): HTMLDivElement | null {
    return slot === 0 ? pdfViewerElA : pdfViewerElB
  }

  function getInactivePreviewSlot(): 0 | 1 {
    return activePreviewSlot === 0 ? 1 : 0
  }

  function getActivePreviewContainer(): HTMLDivElement | null {
    return getPreviewContainer(activePreviewSlot)
  }

  function waitForFirstRenderedPage(slot: 0 | 1): Promise<void> {
    const eventBus = viewerRuntimes[slot].eventBus
    if (!eventBus) return Promise.resolve()

    return new Promise((resolve) => {
      const onRendered = () => {
        eventBus.off('pagerendered', onRendered)
        resolve()
      }
      eventBus.on('pagerendered', onRendered)
    })
  }

  $effect(() => {
    if (!browser) return

    if (compilingHintTimer !== null) {
      window.clearTimeout(compilingHintTimer)
      compilingHintTimer = null
    }

    showPreviewCompilingHint = false

    if (status === 'compiling' && !!pdfBytes) {
      compilingHintTimer = window.setTimeout(() => {
        showPreviewCompilingHint = true
      }, 180)
    }

    return () => {
      if (compilingHintTimer !== null) {
        window.clearTimeout(compilingHintTimer)
        compilingHintTimer = null
      }
    }
  })

  // ========================================
  // Lifecycle
  // ========================================
  onMount(() => {
    // Save language preference
    try {
      localStorage.setItem('mdxport_lang', lang)
    } catch {
      // ignore
    }

    loadingText = t('loading')
    client = getSharedTypstWorkerClient()

    let aborted = false

    void (async () => {
      const containers: [HTMLDivElement | null, HTMLDivElement | null] = [
        pdfViewerContainerElA,
        pdfViewerContainerElB,
      ]
      const viewers: [HTMLDivElement | null, HTMLDivElement | null] = [
        pdfViewerElA,
        pdfViewerElB,
      ]
      if (containers.some((container) => !container) || viewers.some((viewer) => !viewer)) {
        return
      }

      await getPdfjs()
      const mod = await import('pdfjs-dist/web/pdf_viewer.mjs')
      if (aborted) return

      ;([0, 1] as const).forEach((slot) => {
        const eventBus = new mod.EventBus()
        const linkService = new mod.PDFLinkService({ eventBus })
        const pdfViewerInstance = new mod.PDFViewer({
          container: containers[slot]!,
          viewer: viewers[slot]!,
          eventBus,
          linkService,
        })
        linkService.setViewer(pdfViewerInstance)

        eventBus.on('pagesinit', () => {
          pdfViewerInstance.currentScaleValue = 'page-width'
        })
        eventBus.on('pagechanging', (event: { pageNumber: number }) => {
          if (slot !== activePreviewSlot) return
          pdfPage = event.pageNumber
        })
        eventBus.on('scalechanging', (event: { scale: number }) => {
          if (slot !== activePreviewSlot) return
          pdfScale = event.scale
        })

        viewerRuntimes[slot].viewer = pdfViewerInstance
        viewerRuntimes[slot].linkService = linkService
        viewerRuntimes[slot].eventBus = eventBus
      })

      pdfLinkService = viewerRuntimes[activePreviewSlot].linkService
      pdfViewer = viewerRuntimes[activePreviewSlot].viewer

      // Hide loading overlay
      isLoading = false

      // Trigger first compile
      void compile(markdown, style, lang)
    })().catch((error) => {
      console.error(error)
      isLoading = false
    })

    // Close menus on click outside
    const handleClickOutside = () => {
      closeMenu()
    }
    window.addEventListener('click', handleClickOutside)

    // Debounced resize handler for auto-fit
    let resizeTimer: number | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        fitWidth()
      }, 200)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      aborted = true
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
      for (const asset of Object.values(imageAssets)) {
        URL.revokeObjectURL(asset.objectUrl)
      }
      pdfLoadTask?.destroy()
      for (const runtime of viewerRuntimes) {
        void runtime.doc?.destroy()
        runtime.doc = null
      }
      pdfDoc = null
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  })

  // Track previous language to detect changes
  let prevLang: UILang | null = null

  $effect(() => {
    if (!browser) return
    const currentLang = lang

    // Set html lang attribute
    document.documentElement.lang = currentLang

    // Save language preference
    try {
      localStorage.setItem('mdxport_lang', currentLang)
    } catch {
      // ignore
    }

    // Update default content when language changes
    if (prevLang !== null && prevLang !== currentLang) {
      const oldDefault = PDF_TEMPLATES[prevLang]?.[0]?.content || ''
      if (markdown === oldDefault || markdown.trim() === '') {
        markdown = PDF_TEMPLATES[currentLang]?.[0]?.content || ''
      }
    }
    prevLang = currentLang
  })

  // Persist style to localStorage
  $effect(() => {
    if (!browser) return
    localStorage.setItem('mdxport-style', style)
    localStorage.setItem('mdxport-editor-mode', editorMode)
  })

  // Auto-save document to IndexedDB
  $effect(() => {
    if (!browser || !hasInitializedMarkdown || !documentStore.currentDocId) return
    if (documentStore.isTransitioningDocument) return
    documentStore.autoSave(documentStore.currentDocId, markdown)
  })

  // Auto-compile effect (debounce 450ms)
  $effect(() => {
    if (!browser) return
    if (!client) return
    if (isLoading) return

    const md = markdown
    const _style = style
    const _lang = lang

    if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer)

    const delay = hasEverCompiled ? 450 : 0
    autoPreviewTimer = window.setTimeout(() => {
      void compile(md, _style, _lang)
    }, delay)

    return () => {
      if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer)
    }
  })

  // Auto-fit on mobile tab switch
  $effect(() => {
    if (!browser) return
    if (activeMobileTab === 'preview') {
      setTimeout(() => {
        fitWidth()
      }, 50)
    }
  })

  // PDF loading effect (pdfBytes -> pdfDoc)
  $effect(() => {
    if (!browser) return
    const bytes = pdfBytes
    if (!bytes) {
      pdfLoadTask?.destroy()
      for (const runtime of viewerRuntimes) {
        void runtime.doc?.destroy()
        runtime.doc = null
      }
      pdfDoc = null
      pdfPages = 0
      pdfPage = 1
      pdfScale = 1
      return
    }

    const seq = ++pdfLoadSeq

    void (async () => {
      pdfLoadTask?.destroy()

      const pdfjs = await getPdfjs()
      const task: PDFDocumentLoadingTask = pdfjs.getDocument({ data: bytes })
      pdfLoadTask = task

      const doc: PDFDocumentProxy = await task.promise
      if (seq !== pdfLoadSeq) {
        void doc.destroy()
        return
      }

      const nextSlot = getInactivePreviewSlot()
      const previousSlot = activePreviewSlot
      const nextRuntime = viewerRuntimes[nextSlot]
      const previousRuntime = viewerRuntimes[previousSlot]

      // Save scroll position from current active container
      const prevContainer = previousSlot === 0 ? pdfViewerContainerElA : pdfViewerContainerElB
      const savedScrollTop = prevContainer?.scrollTop ?? 0
      const prevScrollHeight = prevContainer?.scrollHeight ?? 1

      if (!nextRuntime.viewer || !nextRuntime.linkService) {
        void doc.destroy()
        return
      }

      void nextRuntime.doc?.destroy()
      nextRuntime.doc = doc

      nextRuntime.linkService.setDocument(doc)
      nextRuntime.viewer.setDocument(doc)
      await waitForFirstRenderedPage(nextSlot)

      if (seq !== pdfLoadSeq) {
        if (nextRuntime.doc === doc) {
          nextRuntime.doc = null
        }
        void doc.destroy()
        return
      }

      // Restore scroll position BEFORE swapping visibility to avoid flicker
      const nextContainer = nextSlot === 0 ? pdfViewerContainerElA : pdfViewerContainerElB
      if (nextContainer && prevScrollHeight > 0) {
        const nextScrollHeight = nextContainer.scrollHeight
        if (nextScrollHeight > 0) {
          const scrollRatio = savedScrollTop / prevScrollHeight
          nextContainer.scrollTop = scrollRatio * nextScrollHeight
        }
      }

      // Now swap — the new container is already at the right scroll position
      activePreviewSlot = nextSlot
      pdfDoc = doc
      pdfPages = doc.numPages
      pdfLinkService = nextRuntime.linkService
      pdfViewer = nextRuntime.viewer
      const restoredPage = nextRuntime.viewer?.currentPageNumber ?? 1
      pdfPage = Math.max(1, Math.min(restoredPage, doc.numPages))
      void previousRuntime.doc?.destroy()
      previousRuntime.doc = null
    })().catch((error) => {
      console.error(error)
    })
  })

  // ========================================
  // Functions
  // ========================================
  function goToPage(nextPage: number) {
    if (!pdfDoc || !pdfViewer) return
    const clamped = Math.max(1, Math.min(nextPage, pdfPages || 1))
    if (clamped === pdfPage) return
    pdfPage = clamped
    pdfViewer.currentPageNumber = clamped
  }

  async function compile(
    md: string,
    nextStyle: typeof style,
    docLang: UILang,
  ) {
    if (!client) return
    hasEverCompiled = true

    const seq = ++compileSeq
    status = 'compiling'
    errorMessage = null

    try {
      // Pre-process Mermaid blocks
      let processedMd = md
      const images: Record<string, Uint8Array> = {}

      const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g
      const matches = [...md.matchAll(mermaidRegex)]

      if (matches.length > 0) {
        let lastIndex = 0
        let newContent = ''

        for (const [index, match] of matches.entries()) {
          const [fullMatch, code] = match
          const id = `mermaid-${index}`
          const filename_svg = `${id}.svg`

          try {
            const svg = await renderMermaidToSvg(code, id)
            images[filename_svg] = svg

            newContent += md.slice(lastIndex, match.index)
            newContent += `![Mermaid Diagram](${filename_svg})`
            lastIndex = (match.index || 0) + fullMatch.length
          } catch (e) {
            console.error('Mermaid render failed', e)
            newContent += md.slice(
              lastIndex,
              (match.index || 0) + fullMatch.length,
            )
            lastIndex = (match.index || 0) + fullMatch.length
          }
        }
        newContent += md.slice(lastIndex)
        processedMd = newContent
      }

      Object.assign(images, collectReferencedImageAssets(processedMd))

      const mainTypst = markdownToTypst(processedMd, {
        style: nextStyle,
        lang: docLang,
        font: 'sans',
      })
      // @ts-ignore
      const pdfData = await client.compilePdf(mainTypst, images)
      if (seq !== compileSeq) return
      setPdfPreview(pdfData.pdf)
      status = 'done'
    } catch (error) {
      if (seq !== compileSeq) return
      status = 'error'
      errorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  function setPdfPreview(bytes: Uint8Array<ArrayBuffer>) {
    pdfBytes = bytes
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    const blob = new Blob([bytes], { type: 'application/pdf' })
    pdfUrl = URL.createObjectURL(blob)
  }

  function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = filename + '.pdf'
    a.click()
  }

  function openPdfNewTab() {
    if (!pdfUrl) return
    window.open(pdfUrl, '_blank')
  }

  let fileInputEl = $state<HTMLInputElement | null>(null)

  function handleOpenFile() {
    fileInputEl?.click()
  }

  function handleOpenImage() {
    imageInputEl?.click()
  }

  function onFileSelected(e: Event) {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result
      if (typeof content === 'string') {
        markdown = content
      }
    }
    reader.readAsText(file)

    // Reset value so same file can be selected again
    target.value = ''
  }

  function getMarkdownImportFile(files: FileList): File | null {
    for (const file of files) {
      if (
        file.name.endsWith('.md') ||
        file.name.endsWith('.markdown') ||
        file.name.endsWith('.txt')
      ) {
        return file
      }
    }
    return null
  }

  function getImageDropFile(files: FileList): File | null {
    for (const file of files) {
      if (file.type.startsWith('image/')) return file
    }
    return null
  }

  function getImageExtension(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext && /^[a-z0-9]+$/.test(ext)) return ext
    switch (file.type) {
      case 'image/jpeg':
        return 'jpg'
      case 'image/png':
        return 'png'
      case 'image/webp':
        return 'webp'
      case 'image/svg+xml':
        return 'svg'
      case 'image/gif':
        return 'gif'
      default:
        return 'png'
    }
  }

  function getImageAltText(file: File): string {
    return file.name.replace(/\.[^.]+$/, '').trim() || 'Image'
  }

  function escapeMarkdownImageAlt(text: string): string {
    return text.replace(/[[\]\\]/g, '\\$&')
  }

  function createAssetId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  }

  async function saveLocalImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error(lang === 'zh' ? '仅支持图片文件' : 'Only image files are supported')
    }

    const path = `images/${createAssetId()}.${getImageExtension(file)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const objectUrl = URL.createObjectURL(file)

    imageAssets[path] = {
      bytes,
      objectUrl,
    }

    return path
  }

  function resolveImageUrl(path: string): string {
    return imageAssets[path]?.objectUrl ?? path
  }

  function insertMarkdownSnippet(snippet: string): void {
    if (editorMode === 'code' && markdownEditor?.insertTextAtSelection(snippet)) {
      return
    }
    if (editorMode === 'wysiwyg' && wysiwygEditor?.insertMarkdownAtSelection(snippet)) {
      return
    }

    const trimmed = markdown.trimEnd()
    markdown = trimmed ? `${trimmed}${snippet}` : snippet.trimStart()
  }

  function collectReferencedImageAssets(md: string): Record<string, Uint8Array> {
    const referenced = new Set<string>()
    const markdownImageRegex = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

    for (const match of md.matchAll(markdownImageRegex)) {
      const path = match[1]
      if (path in imageAssets) {
        referenced.add(path)
      }
    }

    return Object.fromEntries(
      [...referenced].map((path) => [path, imageAssets[path].bytes]),
    )
  }

  async function insertImageFile(file: File): Promise<void> {
    try {
      const path = await saveLocalImage(file)
      const alt = escapeMarkdownImageAlt(getImageAltText(file))
      insertMarkdownSnippet(`\n\n![${alt}](${path})\n\n`)
      errorMessage = null
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  async function onImageSelected(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    await insertImageFile(file)
  }

  function handleHelp() {
    const defaultContent = PDF_TEMPLATES[lang]?.[0]?.content || ''
    if (markdown.trim() !== '' && markdown !== defaultContent) {
      const msg =
        lang === 'zh'
          ? '这将覆盖当前内容，确定吗？'
          : 'This will overwrite current content. Continue?'
      if (!confirm(msg)) return
    }
    markdown = defaultContent
  }

  function switchLang() {
    const targetLang = lang === 'zh' ? 'en' : 'zh'
    void goto(`/${targetLang}/`)
  }

  // ========================================
  // Resizer Logic
  // ========================================
  function startResize(e: MouseEvent) {
    e.preventDefault()
    isResizing = true
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  function onResize(e: MouseEvent) {
    if (!isResizing) return
    const newWidth = (e.clientX / window.innerWidth) * 100
    leftPaneWidth = Math.min(Math.max(newWidth, 20), 80)
  }

  function stopResize() {
    isResizing = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  // ========================================
  // Drag & Drop Logic
  // ========================================
  function hasFiles(e: DragEvent): boolean {
    return e.dataTransfer?.types?.includes('Files') ?? false
  }

  function handleDragOver(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    isDragging = false
  }

  function handleDrop(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    isDragging = false

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const markdownFile = getMarkdownImportFile(files)
    if (markdownFile) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result
        if (typeof content === 'string') {
          markdown = content
        }
      }
      reader.readAsText(markdownFile)
      return
    }

    const imageFile = getImageDropFile(files)
    if (imageFile) {
      void insertImageFile(imageFile)
    }
  }

  async function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (!item.type.startsWith('image/')) continue
      const file = item.getAsFile()
      if (!file) continue
      e.preventDefault()
      await insertImageFile(file)
      return
    }
  }

  function fitWidth() {
    const container = getActivePreviewContainer()
    if (!pdfViewer || !container) return
    if (container.offsetParent === null) return
    pdfViewer.currentScaleValue = 'page-width'
  }

  // ResizeObserver for auto-fit
  $effect(() => {
    if (!previewContainerEl || !browser) return
    const observer = new ResizeObserver(() => {
      fitWidth()
    })
    observer.observe(previewContainerEl)
    return () => observer.disconnect()
  })
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />

  <!-- Open Graph -->
  <meta property="og:title" content={seoTitle} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content={SEO[lang].ogLocale} />
  <meta
    property="og:locale:alternate"
    content={lang === 'zh' ? 'en_US' : 'zh_CN'}
  />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={seoTitle} />
  <meta name="twitter:description" content={seoDescription} />
</svelte:head>

<!-- Loading Overlay -->
<div class="loading-overlay" class:hidden={!isLoading}>
  <div class="loading-spinner"></div>
  <div class="loading-progress">
    <div class="loading-progress-bar"></div>
  </div>
  <div class="loading-text">{loadingText}</div>
</div>

<!-- Main App -->
<div
  class="app"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onpaste={handlePaste}
  role="application"
>
  {#if isDragging}
    <div class="drop-overlay">
      <div class="drop-overlay-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>{lang === 'zh' ? '拖入 .md / 图片 文件' : 'Drop .md or image files here'}</span>
      </div>
    </div>
  {/if}

  <!-- File Input (Hidden) -->
  <input
    type="file"
    accept=".md,.markdown,.txt"
    style="display: none;"
    bind:this={fileInputEl}
    onchange={onFileSelected}
  />
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
    class="sr-only"
    bind:this={imageInputEl}
    onchange={onImageSelected}
  />

  <!-- Navbar -->
  <nav class="navbar">
    <div class="navbar-left">
      <a href="/{lang}/" class="logo-link">
        <img src="/logo.png" alt="MDXport" class="logo-img" />
      </a>
      <div class="mode-toggle hidden-mobile">
        <span class="mode-toggle-item active">PDF</span>
        <a href="/{lang}/cards/" class="mode-toggle-item">{lang === 'zh' ? '卡片' : 'Cards'}</a>
        <a href="/{lang}/slides/" class="mode-toggle-item">{lang === 'zh' ? '幻灯片' : 'Slides'}</a>
      </div>
      <DocumentMenu
        {lang}
        mode="pdf"
        templates={PDF_TEMPLATES[lang] || []}
        currentContent={markdown}
        onDocumentLoad={(doc) => { applyLoadedDocument(doc) }}
      />
    </div>
    <div class="navbar-right">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="menu-container" onclick={(e) => e.stopPropagation()}>
        <button
          class="btn btn-ghost btn-sm btn-icon"
          class:active={isMenuOpen}
          onclick={toggleMenu}
          aria-label="Menu"
          style="color: var(--color-gray-900);"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"></circle>
            <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"></circle>
            <circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"></circle>
          </svg>
        </button>

        {#if isMenuOpen}
          <div class="dropdown-menu">
            <button
              class="menu-item"
              onclick={() => { openPdfNewTab(); closeMenu() }}
              disabled={!pdfUrl || status === 'compiling'}
            >
              <span class="menu-icon">🌐</span>
              {lang === 'zh' ? '在新页预览 PDF' : 'Preview PDF in New Tab'}
            </button>

            <button
              class="menu-item"
              onclick={() => { handleOpenFile(); closeMenu() }}
            >
              <span class="menu-icon">📂</span>
              {lang === 'zh' ? '打开本地文件' : 'Open Local File'}
            </button>

            <button
              class="menu-item"
              onclick={() => { handleHelp(); closeMenu() }}
            >
              <span class="menu-icon">❓</span>
              {lang === 'zh' ? '查看帮助' : 'Help & Guide'}
            </button>

            <button class="menu-item" onclick={switchLang}>
              <span class="menu-icon">🌐</span>
              {t('langSwitch') === '中' ? 'Switch to Chinese' : 'Switch to English'}
            </button>

            <a
              href="https://github.com/cosformula/mdxport"
              target="_blank"
              rel="noopener noreferrer"
              class="menu-item"
            >
              <span class="menu-icon">🐙</span>
              GitHub
            </a>

            <a href="/{lang}/resources/" class="menu-item">
              <span class="menu-icon">🛠️</span>
              {lang === 'zh' ? '更多资源与工具' : 'Resources & Tools'}
            </a>

            <div class="menu-divider"></div>

            <a href="mailto:cosformula@gmail.com" class="menu-item small" title={lang === 'zh' ? '联系我们' : 'Contact Us'}>
              <span class="menu-icon">✉️</span>
              {lang === 'zh' ? '联系我们' : 'Contact'}
            </a>
            {#if $needRefresh}
              <div class="menu-divider"></div>
              <button
                class="menu-item"
                onclick={() => updateServiceWorker(true)}
                style="color: var(--color-green-600);"
              >
                <span class="menu-icon">⚡</span>
                {lang === 'zh' ? '更新应用' : 'Update Available'}
              </button>
            {:else}
              <div class="menu-divider"></div>
              <button class="menu-item small" disabled>
                <span class="menu-icon">✓</span>
                {lang === 'zh' ? '已是最新版本' : 'Latest Version'}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </nav>

  <!-- Workspace -->
  <main class="workspace">
    <!-- Editor Pane -->
    <section
      class="pane editor-pane"
      class:mobile-hidden={activeMobileTab !== 'editor'}
      style="width: {leftPaneWidth}%"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="editor-toolbar">
        <div class="editor-toolbar-left">
          <div class="editor-mode-toggle">
            <button class="mode-toggle-btn" class:active={editorMode === 'wysiwyg'} onclick={() => editorMode = 'wysiwyg'}>
              {lang === 'zh' ? '编辑' : 'Edit'}
            </button>
            <button class="mode-toggle-btn" class:active={editorMode === 'code'} onclick={() => editorMode = 'code'}>
              {lang === 'zh' ? '源码' : 'Code'}
            </button>
          </div>
          <div class="toolbar-divider"></div>
          <button class="toolbar-icon-btn" onclick={handleOpenImage} title={lang === 'zh' ? '插入图片' : 'Insert image'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="9.5" r="1.5"></circle>
              <path d="M21 15l-5-5L5 20"></path>
            </svg>
            {lang === 'zh' ? '图片' : 'Image'}
          </button>
        </div>
        <div class="editor-toolbar-right">
        </div>
      </div>
      {#if editorMode === 'wysiwyg'}
        <WysiwygEditor
          bind:this={wysiwygEditor}
          bind:markdown
          placeholder={t('placeholder')}
          imageUpload={saveLocalImage}
          resolveImageUrl={resolveImageUrl}
        />
      {:else}
        <MarkdownEditor bind:this={markdownEditor} bind:markdown placeholder={t('placeholder')} />
      {/if}
      {#if errorMessage}
        <div class="error-bar">{errorMessage}</div>
      {/if}
      <div class="drop-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        {lang === 'zh'
          ? '拖入 .md / .txt 导入，或拖拽 / 粘贴图片插入'
          : 'Drop .md / .txt to import, or drag / paste images to insert'}
      </div>
    </section>

    <!-- Resizer -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="resizer hidden-mobile"
      class:active={isResizing}
      onmousedown={startResize}
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
    ></div>

    <!-- Mobile Tab Switcher (Visible only on mobile) -->
    <div class="mobile-tabs">
      <button
        class="mobile-tab-btn"
        class:active={activeMobileTab === 'editor'}
        onclick={() => (activeMobileTab = 'editor')}
      >
        {lang === 'zh' ? '编辑' : 'Editor'}
      </button>
      <button
        class="mobile-tab-btn"
        class:active={activeMobileTab === 'preview'}
        onclick={() => (activeMobileTab = 'preview')}
      >
        {lang === 'zh' ? '预览' : 'Preview'}
      </button>
    </div>

    <!-- Preview Pane -->
    <section
      class="pane preview-pane"
      class:mobile-hidden={activeMobileTab !== 'preview'}
      style="width: {100 - leftPaneWidth}%"
    >
      <div class="preview-toolbar">
        <div class="preview-status-wrapper">
          <select class="style-select" bind:value={style}>
            {#each STYLE_OPTIONS as s}
              <option value={s.id}>{s.label[lang]}</option>
            {/each}
          </select>
          <div class="pager">
            <button
              onclick={() => goToPage(pdfPage - 1)}
              disabled={!pdfDoc || pdfPage <= 1}>&larr;</button
            >
            <span class="page-info">{pdfPage} / {pdfPages || '—'}</span>
            <button
              onclick={() => goToPage(pdfPage + 1)}
              disabled={!pdfDoc || pdfPage >= pdfPages}>&rarr;</button
            >
          </div>
          {#if status === 'error'}
            <div class="error-badge">
              <span>⚠️ {lang === 'zh' ? '编译失败' : 'Failed'}</span>
            </div>
          {/if}
        </div>
        <div class="preview-toolbar-right">
          <div class="zoom">
            <span class="zoom-level">{Math.round(pdfScale * 100)}%</span>
            <button onclick={fitWidth} disabled={!pdfDoc}>Fit</button>
            <button
              class="btn-icon-sm"
              onclick={openPdfNewTab}
              disabled={!pdfUrl || status === 'compiling'}
              title={lang === 'zh' ? '在新标签页打开' : 'Open in new tab'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          </div>
          <button
            class="btn btn-primary btn-sm"
            onclick={downloadPdf}
            disabled={!pdfBytes || status === 'compiling'}
          >
            {status === 'compiling' ? t('generating') : t('export')}
          </button>
        </div>
      </div>
      <div class="preview-container" bind:this={previewContainerEl}>
        {#if showPreviewCompilingHint}
          <StatusHint label={lang === 'zh' ? '更新预览中' : 'Updating preview'} />
        {/if}
        <div
          class="pdfjs-container"
          class:active={activePreviewSlot === 0}
          class:inactive={activePreviewSlot !== 0}
          bind:this={pdfViewerContainerElA}
        >
          <div class="pdfViewer" bind:this={pdfViewerElA}></div>
        </div>
        <div
          class="pdfjs-container"
          class:active={activePreviewSlot === 1}
          class:inactive={activePreviewSlot !== 1}
          bind:this={pdfViewerContainerElB}
        >
          <div class="pdfViewer" bind:this={pdfViewerElB}></div>
        </div>
        {#if status === 'compiling' && !pdfBytes}
          <div class="preview-placeholder">
            <div class="loading-spinner"></div>
          </div>
        {/if}
      </div>
    </section>
  </main>

  <!-- Hidden SEO Content for Search Engines -->
  <div class="visually-hidden" aria-hidden="false">
    {@html seoHtml}
  </div>
</div>

<style>
  /* ========================================
     App Container
     ======================================== */
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .drop-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--color-gray-500, #6b7280);
    font-size: 1rem;
    font-weight: 500;
    padding: 40px 60px;
    border: 2px dashed var(--color-gray-300, #d1d5db);
    border-radius: 16px;
    background: var(--color-gray-50, #f9fafb);
  }

  /* ========================================
     Navbar
     ======================================== */
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--navbar-height);
    padding: 0 var(--space-md);
    background: var(--color-white);
    border-bottom: 1px solid var(--color-gray-200);
    flex-shrink: 0;
  }

  .navbar-left,
  .navbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .navbar-left {
    flex: 1;
    min-width: 0;
  }

  .navbar-right {
    flex: 0 0 auto;
    gap: var(--space-xs);
  }

  .navbar-right > .btn {
    padding-left: var(--space-md);
    padding-right: var(--space-md);
  }

  .logo-link {
    display: flex;
    align-items: center;
    height: 100%;
    text-decoration: none;
  }

  .logo-img {
    height: 48px;
    width: auto;
    display: block;
  }

  .mode-toggle {
    display: flex;
    align-items: center;
    background: var(--color-gray-100);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 0;
  }

  .mode-toggle-item {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: calc(var(--radius-sm) - 1px);
    color: var(--color-gray-500);
    text-decoration: none;
    transition: all var(--transition-fast);
    cursor: pointer;
    white-space: nowrap;
  }

  .mode-toggle-item:hover:not(.active) {
    color: var(--color-gray-700);
  }

  .mode-toggle-item.active {
    background: var(--color-white);
    color: var(--color-gray-900);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    cursor: default;
  }

  /* ========================================
     Style Select
     ======================================== */
  .style-select {
    appearance: none;
    -webkit-appearance: none;
    padding: calc(0.5rem - 1px) 2rem calc(0.5rem - 1px) 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: var(--font-mono);
    line-height: 1;
    background-color: var(--color-gray-50);
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9L12 15L18 9' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 1rem;
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    cursor: pointer;
    box-sizing: border-box;
  }

  .style-select:hover {
    background-color: var(--color-gray-100);
    border-color: var(--color-gray-300);
  }

  /* ========================================
     Workspace
     ======================================== */
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    background-color: var(--color-gray-100);
  }

  /* ========================================
     Panes
     ======================================== */
  .pane {
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #fff;
  }

  /* Editor Pane */
  .editor-pane {
    background: var(--editor-bg);
    position: relative;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--color-gray-50, #f9fafb);
    border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    flex-shrink: 0;
    gap: 6px;
  }

  .editor-toolbar-left,
  .editor-toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .editor-mode-toggle {
    display: flex;
    background: var(--color-gray-200, #e5e7eb);
    border-radius: var(--radius-sm, 4px);
    padding: 1px;
    gap: 1px;
  }

  .mode-toggle-btn {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 3px 10px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: var(--color-gray-500, #6b7280);
    background: transparent;
    transition: all 0.15s;
  }

  .mode-toggle-btn.active {
    background: var(--color-white, #fff);
    color: var(--color-gray-900, #111);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .toolbar-divider {
    width: 1px;
    height: 18px;
    background: var(--color-gray-200, #e5e7eb);
  }

  .toolbar-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px solid var(--color-gray-200, #e5e7eb);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-white, #fff);
    color: var(--color-gray-600, #4b5563);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-icon-btn:hover {
    background: var(--color-gray-100, #f3f4f6);
    border-color: var(--color-gray-300, #d1d5db);
    color: var(--color-gray-900, #111827);
  }


  .error-bar {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.75rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-top: 1px solid rgba(239, 68, 68, 0.2);
  }

  .drop-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px;
    font-size: 0.6875rem;
    color: var(--color-gray-400, #9ca3af);
    border-top: 1px solid var(--color-gray-100, #f3f4f6);
    background: var(--color-gray-50, #f9fafb);
    flex-shrink: 0;
  }

  /* Resizer */
  .resizer {
    width: var(--divider-width);
    background: var(--color-gray-200);
    cursor: col-resize;
    flex-shrink: 0;
    position: relative;
    transition: background var(--transition-fast);
  }

  .resizer:hover,
  .resizer.active {
    background: var(--color-gray-400);
  }

  /* Preview Pane */
  .preview-pane {
    background: var(--preview-bg);
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-white);
    border-bottom: 1px solid var(--color-gray-200);
  }

  .preview-toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .preview-toolbar-right > .btn {
    padding: calc(0.5rem - 1px) 0.875rem;
    font-size: 0.8125rem;
  }

  .pager,
  .zoom {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .pager button,
  .zoom button {
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.75rem;
    background: var(--color-gray-100);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .pager button:disabled,
  .zoom button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info,
  .zoom-level {
    font-size: 0.75rem;
    color: var(--color-gray-500);
    font-family: var(--font-mono);
  }

  .btn-icon-sm {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: var(--color-gray-100);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-gray-500);
  }

  .btn-icon-sm:hover {
    color: var(--color-gray-900);
    background: var(--color-gray-200);
  }

  .btn-icon-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .preview-container {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .preview-status-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .error-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 12px;
    animation: fadeIn 0.2s ease-out;
  }

  .error-badge {
    background: #fef2f2;
    color: #ef4444;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .pdfjs-container {
    position: absolute;
    inset: 0;
    overflow: auto;
    padding: var(--space-lg);
    transition: opacity 0.18s ease-out;
  }

  .pdfjs-container.active {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .pdfjs-container.inactive {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .preview-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--preview-bg);
  }

  /* PDF Viewer Overrides */
  :global(.pdfViewer .page) {
    margin: 0 auto var(--space-md);
    box-shadow: var(--paper-shadow);
  }

  /* ========================================
     Menu
     ======================================== */
  .menu-container {
    position: relative;
    display: inline-block;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 200px;
    background: var(--color-white);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    z-index: 1000;
    padding: var(--space-xs) 0;
    display: flex;
    flex-direction: column;
  }

  .menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.8125rem;
    color: var(--color-gray-700);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition: background-color var(--transition-fast);
  }

  .menu-item:hover {
    background-color: var(--color-gray-50);
    color: var(--color-gray-900);
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item.small {
    font-size: 0.75rem;
    padding: 4px var(--space-sm);
  }

  .menu-icon {
    margin-right: var(--space-sm);
    font-size: 1rem;
    line-height: 1;
  }

  .menu-divider {
    height: 1px;
    background: var(--color-gray-100);
    margin: var(--space-xs) 0;
  }

  /* ========================================
     Mobile Layout
     ======================================== */
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 768px) {
    .app {
      height: 100dvh;
    }

    .navbar {
      padding: 0 var(--space-sm);
    }

    .workspace {
      flex-direction: column;
      position: relative;
    }

    .pane {
      width: 100% !important;
      height: 100%;
      position: absolute;
      inset: 0;
      z-index: 1;
      padding-bottom: 50px;
    }

    .pane.mobile-hidden {
      display: none;
      z-index: 0;
    }

    .resizer {
      display: none;
    }

    /* Mobile Tabs */
    .mobile-tabs {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: var(--color-white);
      border-top: 1px solid var(--color-gray-200);
      z-index: 100;
    }

    .mobile-tab-btn {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-500);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .mobile-tab-btn.active {
      color: var(--color-gray-900);
      background: var(--color-gray-50);
    }

    .mobile-tab-btn.active::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--color-gray-900);
    }

    .hidden-mobile {
      display: none !important;
    }

  }

</style>

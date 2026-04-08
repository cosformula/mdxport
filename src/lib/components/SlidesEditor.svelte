<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { markdownToTypst, markdownToTypstPages } from '$lib/pipeline/markdownToTypst'
  import { getTypstRenderer } from '$lib/typst/renderer'
  import { extractFirstPageSvg } from '$lib/typst/svg-utils'
  import type { TypstStyleId } from '$lib/pipeline/markdownToTypst'
  import { getSharedTypstWorkerClient, TypstWorkerClient } from '$lib/workers/typstClient'
  import type { UILang } from '$lib/i18n/lang'
  import { renderMermaidToSvg } from '$lib/mermaid/render'
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte'
  import WysiwygEditor from '$lib/components/WysiwygEditor.svelte'
  import CardGallery from '$lib/components/CardGallery.svelte'
  import DocumentMenu from '$lib/components/DocumentMenu.svelte'
  import { SLIDES_TEMPLATES } from '$lib/templates/slides-templates'
  import {
    documentStore,
    isBrokenTemplateDocument,
    isLegacyImplicitBlankDocument,
  } from '$lib/stores/documentStore.svelte'
  import type { SavedDocument, SavedDocumentAsset } from '$lib/storage/documents'

  // Props
  interface Props {
    lang: UILang
    seoTitle: string
    seoDescription: string
  }

  let { lang = 'en', seoTitle, seoDescription }: Props = $props()

  // ========================================
  // State
  // ========================================
  let markdown = $state('')
  let hasInitializedMarkdown = false
  let markdownEditor = $state<MarkdownEditor | null>(null)
  let wysiwygEditor = $state<WysiwygEditor | null>(null)
  let imageInput = $state<HTMLInputElement | null>(null)

  let leftPaneWidth = $state(50)
  let isResizing = $state(false)
  let isDragging = $state(false)

  type LocalImageAsset = {
    bytes: Uint8Array
    mimeType: string
    objectUrl: string
  }

  let imageAssets = $state<Record<string, LocalImageAsset>>({})
  let persistedImageAssets = $derived.by(() => buildDocumentAssets(imageAssets))

  let editorMode = $state<'code' | 'wysiwyg'>(
    (browser && (localStorage.getItem('mdxport-editor-mode') as 'code' | 'wysiwyg')) || 'wysiwyg',
  )

  let style = $state<'slides-modern' | 'slides-dark' | 'slides-minimal'>(
    (browser &&
      (localStorage.getItem('mdxport-slides-style') as
        | 'slides-modern'
        | 'slides-dark'
        | 'slides-minimal')) ||
      'slides-modern',
  )

  let font = $state<'sans' | 'serif'>(
    (browser && (localStorage.getItem('mdxport-slides-font') as 'sans' | 'serif')) ||
      'sans',
  )

  // Compilation state
  let status: 'idle' | 'compiling' | 'done' | 'error' = $state('idle')
  let errorMessage: string | null = $state(null)
  let pageSvgs = $state<string[] | null>(null)

  // Cache for incremental per-page compilation
  let cachedTypstSources: string[] = []
  let cachedSvgs: string[] = []
  let cachedImagesFingerprint = ''

  // Cached full-document Typst source + images for PDF export
  let lastCompiledFullTypst = ''
  let lastCompiledImages: Record<string, Uint8Array> = {}

  // Loading state
  let isLoading = $state(true)

  // Worker client
  let client = $state<TypstWorkerClient | null>(null)

  // Auto-compile
  let compileSeq = 0
  let hasEverCompiled = false
  let autoPreviewTimer: number | null = null

  // Mobile state
  let activeMobileTab = $state<'editor' | 'preview'>('editor')
  let isMenuOpen = $state(false)

  $effect(() => {
    if (hasInitializedMarkdown) return
    if (!browser) return
    hasInitializedMarkdown = true
    ;(async () => {
      await documentStore.init()
      const slidesDocs = documentStore.recentDocuments.filter((d) => d.mode === 'slides')
      const invalidAutoDocs = slidesDocs.filter(
        (doc) => isLegacyImplicitBlankDocument(doc) || isBrokenTemplateDocument(doc),
      )
      if (invalidAutoDocs.length > 0) {
        for (const doc of invalidAutoDocs) {
          await documentStore.deleteDocument(doc.id)
        }
      }
      const usableSlidesDocs = slidesDocs.filter(
        (doc) => !isLegacyImplicitBlankDocument(doc) && !isBrokenTemplateDocument(doc),
      )
      // Try loading current doc if it belongs to this mode
      if (documentStore.currentDocId) {
        const currentDoc = documentStore.recentDocuments.find((d) => d.id === documentStore.currentDocId)
        if (currentDoc?.mode === 'slides' && !isLegacyImplicitBlankDocument(currentDoc)) {
          const doc = await documentStore.loadDocument(documentStore.currentDocId)
          if (doc !== null) {
            applyLoadedDocument(doc)
            return
          }
        }
      }
      // Check recent slides docs
      if (usableSlidesDocs.length > 0) {
        const doc = await documentStore.loadDocument(usableSlidesDocs[0].id)
        if (doc !== null) {
          applyLoadedDocument(doc)
          return
        }
      }
      // Create from template
      const defaultContent = SLIDES_TEMPLATES[lang]?.[0]?.content ?? ''
      markdown = defaultContent
      const doc = await documentStore.createDocument('slides', defaultContent, undefined, 'template')
      applyLoadedDocument(doc)
    })()
  })

  // ========================================
  // UI Text
  // ========================================
  const UI = {
    zh: {
      template: '模板',
      exportPdf: '导出 PDF',
      loading: '正在初始化渲染引擎...',
      generating: '生成中...',
      langSwitch: 'EN',
      placeholder: '在这里输入 Markdown，用 --- 分隔幻灯片...',
    },
    en: {
      template: 'Template',
      exportPdf: 'Export PDF',
      loading: 'Initializing rendering engine...',
      generating: 'Generating...',
      langSwitch: '中',
      placeholder: 'Type Markdown here, use --- to separate slides...',
    },
  }

  function t<K extends keyof (typeof UI)['zh']>(key: K): string {
    return UI[lang][key]
  }

  // ========================================
  // Derived
  // ========================================
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

  // ========================================
  // Lifecycle
  // ========================================
  onMount(() => {
    try {
      localStorage.setItem('mdxport_lang', lang)
    } catch {
      // ignore
    }

    client = getSharedTypstWorkerClient()

    let aborted = false

    void (async () => {
      isLoading = false

      void compile(markdown, style, lang, font)
    })().catch((error) => {
      console.error(error)
      isLoading = false
    })

    const handleClickOutside = () => {
      closeMenu()
    }
    window.addEventListener('click', handleClickOutside)

    return () => {
      aborted = true
      void documentStore.flushPendingSave()
      window.removeEventListener('click', handleClickOutside)
      revokeImageAssetUrls(imageAssets)
    }
  })

  // ========================================
  // Persist preferences
  // ========================================
  $effect(() => {
    if (!browser) return
    localStorage.setItem('mdxport-slides-style', style)
    localStorage.setItem('mdxport-slides-font', font)
    localStorage.setItem('mdxport-editor-mode', editorMode)
  })

  // Auto-save document to IndexedDB
  $effect(() => {
    if (!browser || !hasInitializedMarkdown || !documentStore.currentDocId) return
    if (documentStore.isTransitioningDocument) return
    documentStore.autoSave(documentStore.currentDocId, markdown, persistedImageAssets)
  })

  // ========================================
  // Language change
  // ========================================
  let prevLang: UILang | null = null

  $effect(() => {
    if (!browser) return
    const currentLang = lang

    document.documentElement.lang = currentLang

    try {
      localStorage.setItem('mdxport_lang', currentLang)
    } catch {
      // ignore
    }

    if (prevLang !== null && prevLang !== currentLang) {
      const oldTemplates = SLIDES_TEMPLATES[prevLang]
      const isOldDefault = oldTemplates.some((tmpl) => tmpl.content === markdown)
      if (isOldDefault || markdown.trim() === '') {
        const newTemplates = SLIDES_TEMPLATES[currentLang]
        markdown = newTemplates[0]?.content ?? ''
      }
    }
    prevLang = currentLang
  })

  // ========================================
  // Auto-compile effect (debounce 450ms)
  // ========================================
  $effect(() => {
    if (!browser) return
    if (!client) return
    if (isLoading) return

    const md = markdown
    const _style = style
    const _lang = lang
    const _font = font

    if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer)

    const delay = hasEverCompiled ? 450 : 0
    autoPreviewTimer = window.setTimeout(() => {
      void compile(md, _style, _lang, _font)
    }, delay)

    return () => {
      if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer)
    }
  })

  // ========================================
  // Compile function
  // ========================================
  async function compile(
    md: string,
    nextStyle: TypstStyleId,
    docLang: UILang,
    compileFont: 'sans' | 'serif' = 'sans',
  ) {
    if (!client) return
    hasEverCompiled = true

    const seq = ++compileSeq
    status = 'compiling'
    errorMessage = null

    try {
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
          const mermaidFilename = `${id}.svg`

          try {
            const svg = await renderMermaidToSvg(code, id)
            images[mermaidFilename] = svg

            newContent += md.slice(lastIndex, match.index)
            newContent += `![Mermaid Diagram](${mermaidFilename})`
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

      // Cache full-document Typst for PDF export (with preprocessed mermaid + images)
      lastCompiledFullTypst = markdownToTypst(processedMd, {
        style: nextStyle,
        lang: docLang,
        font: compileFont,
      })
      lastCompiledImages = images

      const typstPages = markdownToTypstPages(processedMd, {
        style: nextStyle,
        lang: docLang,
        font: compileFont,
      })

      // Incremental: only recompile pages whose Typst source or images changed
      const renderer = await getTypstRenderer()
      const imagesFingerprint = Object.keys(images).sort().join(',') + ':' +
        Object.values(images).reduce((sum, v) => sum + v.length, 0)
      const imagesChanged = imagesFingerprint !== cachedImagesFingerprint
      const svgs = imagesChanged ? [] : [...cachedSvgs]

      for (let i = 0; i < typstPages.length; i++) {
        if (seq !== compileSeq) return
        if (!imagesChanged && typstPages[i] === cachedTypstSources[i] && svgs[i]) continue

        // @ts-ignore
        const { vector } = await client.compileVector(typstPages[i], images)
        await renderer.runWithSession(
          { format: 'vector' as const, artifactContent: vector },
          async (session) => {
            svgs[i] = extractFirstPageSvg(await session.renderSvg({}))
          },
        )
      }
      if (seq !== compileSeq) return

      svgs.length = typstPages.length
      cachedTypstSources = typstPages
      cachedSvgs = svgs
      cachedImagesFingerprint = imagesFingerprint
      pageSvgs = [...svgs]
      status = 'done'
    } catch (error) {
      if (seq !== compileSeq) return
      status = 'error'
      errorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  // ========================================
  // Download PDF
  // ========================================
  async function downloadPdf() {
    if (!client || !lastCompiledFullTypst) return
    // @ts-ignore
    const { pdf } = await client.compilePdf(lastCompiledFullTypst, lastCompiledImages)
    const blob = new Blob([pdf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openImagePicker() {
    imageInput?.click()
  }

  function insertPageBreak() {
    const insertion = `\n\n---\n\n`
    if (editorMode === 'code' && markdownEditor?.insertTextAtSelection(insertion)) {
      return
    }
    if (editorMode === 'wysiwyg' && wysiwygEditor?.insertMarkdownAtSelection(insertion)) {
      return
    }

    const trimmed = markdown.trimEnd()
    markdown = trimmed
      ? `${trimmed}${insertion}`
      : `---\n\n`
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

  function buildDocumentAssets(
    assets: Record<string, LocalImageAsset>,
  ): Record<string, SavedDocumentAsset> | undefined {
    const entries = Object.entries(assets).map(([path, asset]) => [
      path,
      { bytes: asset.bytes, mimeType: asset.mimeType },
    ])
    if (entries.length === 0) return undefined
    return Object.fromEntries(entries)
  }

  function revokeImageAssetUrls(assets: Record<string, LocalImageAsset>) {
    for (const asset of Object.values(assets)) {
      URL.revokeObjectURL(asset.objectUrl)
    }
  }

  function restoreImageAssets(assets?: Record<string, SavedDocumentAsset>) {
    revokeImageAssetUrls(imageAssets)
    if (!assets) {
      imageAssets = {}
      return
    }

    imageAssets = Object.fromEntries(
      Object.entries(assets).map(([path, asset]) => {
        const bytes = asset.bytes instanceof Uint8Array
          ? asset.bytes
          : new Uint8Array(asset.bytes)
        const blobBytes = new Uint8Array(bytes.byteLength)
        blobBytes.set(bytes)
        const objectUrl = URL.createObjectURL(new Blob([blobBytes.buffer], { type: asset.mimeType }))
        return [
          path,
          {
            bytes,
            mimeType: asset.mimeType,
            objectUrl,
          },
        ]
      }),
    )
  }

  function applyLoadedDocument(doc: SavedDocument) {
    restoreImageAssets(doc.assets)
    markdown = doc.content
    documentStore.finishDocumentTransition()
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
      mimeType: file.type || 'application/octet-stream',
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

  async function handleImageInputChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    await insertImageFile(file)
  }

  // ========================================
  // Navigation helpers
  // ========================================
  async function navigateTo(path: string) {
    if (documentStore.currentDocId) {
      await documentStore.saveNow(documentStore.currentDocId, markdown, persistedImageAssets)
    } else {
      await documentStore.flushPendingSave()
    }
    await goto(path)
  }

  function switchLang() {
    const targetLang = lang === 'zh' ? 'en' : 'zh'
    void navigateTo(`/${targetLang}/slides/`)
  }

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
    const containerWidth = window.innerWidth
    const newWidth = (e.clientX / containerWidth) * 100
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
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
</svelte:head>

<!-- Loading Overlay -->
<div class="loading-overlay" class:hidden={!isLoading}>
  <div class="loading-spinner"></div>
  <div class="loading-progress">
    <div class="loading-progress-bar"></div>
  </div>
  <div class="loading-text">{t('loading')}</div>
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
  <!-- Navbar -->
  <nav class="navbar">
    <div class="navbar-left">
      <a
        href="/{lang}/"
        class="logo-link"
        onclick={(e) => {
          e.preventDefault()
          void navigateTo(`/${lang}/`)
        }}
      >
        <img src="/logo.png" alt="MDXport" class="logo-img" />
      </a>
      <div class="mode-toggle hidden-mobile">
        <a
          href="/{lang}/"
          class="mode-toggle-item"
          onclick={(e) => {
            e.preventDefault()
            void navigateTo(`/${lang}/`)
          }}
        >
          PDF
        </a>
        <a
          href="/{lang}/cards/"
          class="mode-toggle-item"
          onclick={(e) => {
            e.preventDefault()
            void navigateTo(`/${lang}/cards/`)
          }}
        >
          {lang === 'zh' ? '卡片' : 'Cards'}
        </a>
        <span class="mode-toggle-item active">{lang === 'zh' ? '幻灯片' : 'Slides'}</span>
      </div>
      <DocumentMenu
        {lang}
        mode="slides"
        templates={SLIDES_TEMPLATES[lang] || []}
        currentContent={markdown}
        documentAssets={persistedImageAssets}
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
          <button class="toolbar-icon-btn" onclick={insertPageBreak} title={lang === 'zh' ? '插入新幻灯片' : 'Insert new slide'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <path d="M6 8V4h12v4"></path>
              <path d="M6 16v4h12v-4"></path>
            </svg>
            {lang === 'zh' ? '新页' : 'New Slide'}
          </button>
          <button class="toolbar-icon-btn" onclick={openImagePicker} title={lang === 'zh' ? '插入图片' : 'Insert image'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="9.5" r="1.5"></circle>
              <path d="M21 15l-5-5L5 20"></path>
            </svg>
            {lang === 'zh' ? '图片' : 'Image'}
          </button>
        </div>
        <div class="editor-toolbar-right"></div>
      </div>
      <input
        bind:this={imageInput}
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onchange={handleImageInputChange}
      />
      {#if editorMode === 'wysiwyg'}
        <WysiwygEditor
          bind:this={wysiwygEditor}
          bind:markdown
          placeholder={t('placeholder')}
          cardMode
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

    <!-- Mobile Tab Switcher -->
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

    <!-- Preview Pane (Slide Gallery) -->
    <section
      class="pane preview-pane"
      class:mobile-hidden={activeMobileTab !== 'preview'}
      style="width: {100 - leftPaneWidth}%"
    >
      <div class="preview-toolbar">
        <div class="preview-toolbar-left">
          <select class="style-select" bind:value={style}>
            <option value="slides-modern">{lang === 'zh' ? '现代蓝' : 'Modern'}</option>
            <option value="slides-dark">{lang === 'zh' ? '深邃暗夜' : 'Dark'}</option>
            <option value="slides-minimal">{lang === 'zh' ? '极简' : 'Minimal'}</option>
          </select>
          <select class="font-select" bind:value={font}>
            <option value="sans">{lang === 'zh' ? '无衬线' : 'Sans'}</option>
            <option value="serif">{lang === 'zh' ? '衬线' : 'Serif'}</option>
          </select>
        </div>
        <div class="preview-toolbar-right">
          {#if status === 'compiling'}
            <div class="compiling-badge">
              <div class="spinner-xs"></div>
              <span>{lang === 'zh' ? '生成中...' : 'Generating...'}</span>
            </div>
          {:else if status === 'error'}
            <div class="error-badge">
              <span>{lang === 'zh' ? '编译失败' : 'Failed'}</span>
            </div>
          {/if}
          <button
            class="btn btn-primary btn-sm"
            onclick={downloadPdf}
            disabled={!pageSvgs || status === 'compiling'}
          >
            {status === 'compiling' ? t('generating') : t('exportPdf')}
          </button>
        </div>
      </div>
      <CardGallery {pageSvgs} {status} {filename} {lang} columns={1} aspectRatio="16 / 9" fullResWidth={1920} thumbWidth={800} />
    </section>
  </main>
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
     Loading Overlay
     ======================================== */
  .loading-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--color-white);
    z-index: 9999;
    transition: opacity 0.3s ease;
  }

  .loading-overlay.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-gray-200);
    border-top-color: var(--color-gray-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-progress {
    width: 200px;
    height: 3px;
    background: var(--color-gray-200);
    border-radius: 2px;
    overflow: hidden;
  }

  .loading-progress-bar {
    width: 40%;
    height: 100%;
    background: var(--color-gray-500);
    border-radius: 2px;
    animation: progress-indeterminate 1.2s ease-in-out infinite;
  }

  @keyframes progress-indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(350%);
    }
  }

  .loading-text {
    font-size: 0.875rem;
    color: var(--color-gray-500);
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

  .style-select,
  .font-select {
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

  .style-select:hover,
  .font-select:hover {
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

  .editor-toolbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .editor-toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    background: var(--color-gray-200, #e5e7eb);
    flex-shrink: 0;
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

  .toolbar-icon-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 3px 8px;
    border: none;
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    color: var(--color-gray-500, #6b7280);
    background: transparent;
    transition: all 0.15s;
  }

  .toolbar-icon-btn:hover {
    background: var(--color-gray-200, #e5e7eb);
    color: var(--color-gray-700, #374151);
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

  .preview-pane {
    background: var(--preview-bg);
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    background: var(--color-white, #fff);
    flex-shrink: 0;
    gap: 8px;
    min-height: 36px;
  }

  .preview-toolbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .preview-toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-toolbar-right > .btn {
    padding: calc(0.5rem - 1px) 0.875rem;
    font-size: 0.8125rem;
  }

  .compiling-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--color-gray-500, #6b7280);
  }

  .error-badge {
    font-size: 0.75rem;
    color: #ef4444;
  }

  .spinner-xs {
    width: 12px;
    height: 12px;
    border: 1.5px solid var(--color-gray-200, #e5e7eb);
    border-top-color: var(--color-gray-500, #6b7280);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ========================================
     Resizer
     ======================================== */
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

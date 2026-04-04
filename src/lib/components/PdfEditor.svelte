<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { getPdfjs } from '$lib/pdf/pdfjs'
  import { markdownToTypst } from '$lib/pipeline/markdownToTypst'
  import { markdownToHtml } from '$lib/pipeline/markdownToHtml'
  import { TypstWorkerClient } from '$lib/workers/typstClient'
  import type { UILang } from '$lib/i18n/lang'
  import { renderMermaidToSvg } from '$lib/mermaid/render'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'

  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte'
  import WysiwygEditor from '$lib/components/WysiwygEditor.svelte'
  import { PDF_TEMPLATES, type Template } from '$lib/templates/pdf-templates'

  import 'pdfjs-dist/web/pdf_viewer.css'

  import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
  import type { PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'

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
  let hasInitialized = false

  $effect(() => {
    if (!hasInitialized) {
      const defaultTemplate = PDF_TEMPLATES[lang]?.[0]?.content || ''
      markdown = initialMarkdown || defaultTemplate
      hasInitialized = true
    }
  })

  // PWA Service Worker
  const { needRefresh, updateServiceWorker } = useRegisterSW({
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
  })

  // Layout state
  let leftPaneWidth = $state(50)
  let isResizing = $state(false)
  let isDragging = $state(false)

  let editorMode = $state<'code' | 'wysiwyg'>(
    (browser && (localStorage.getItem('mdxport-editor-mode') as 'code' | 'wysiwyg')) || 'code',
  )

  // Style state (PDF only — no redbook styles)
  let style = $state(
    (browser && localStorage.getItem('mdxport-style')) || 'modern-tech',
  ) as 'modern-tech' | 'classic-editorial'

  const STYLE_OPTIONS = [
    { id: 'modern-tech' as const, label: { zh: '现代风', en: 'Modern' } },
    { id: 'classic-editorial' as const, label: { zh: '经典风', en: 'Classic' } },
  ]

  // Template dropdown state
  let isTemplateMenuOpen = $state(false)

  let templates = $derived(PDF_TEMPLATES[lang] || [])

  function toggleTemplateMenu(e?: Event) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    isTemplateMenuOpen = !isTemplateMenuOpen
  }

  function closeTemplateMenu() {
    isTemplateMenuOpen = false
  }

  function loadTemplate(t: Template) {
    if (markdown.trim() !== '') {
      const msg =
        lang === 'zh'
          ? '这将覆盖当前内容，确定吗？'
          : 'This will overwrite current content. Continue?'
      if (!confirm(msg)) {
        closeTemplateMenu()
        return
      }
    }
    markdown = t.content
    closeTemplateMenu()
  }

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
  let pdfViewerContainerEl = $state<HTMLDivElement | null>(null)
  let pdfViewerEl = $state<HTMLDivElement | null>(null)
  let pdfLoadTask: PDFDocumentLoadingTask | null = null
  let pdfLoadSeq = 0

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
    client = new TypstWorkerClient()

    let aborted = false

    void (async () => {
      const container = pdfViewerContainerEl
      const viewer = pdfViewerEl
      if (!container || !viewer) return

      await getPdfjs()
      const mod = await import('pdfjs-dist/web/pdf_viewer.mjs')
      if (aborted) return

      const eventBus = new mod.EventBus()
      const linkService = new mod.PDFLinkService({ eventBus })
      const pdfViewerInstance = new mod.PDFViewer({
        container,
        viewer,
        eventBus,
        linkService,
      })
      linkService.setViewer(pdfViewerInstance)

      eventBus.on('pagesinit', () => {
        pdfViewerInstance.currentScaleValue = 'page-width'
      })
      eventBus.on('pagechanging', (event: { pageNumber: number }) => {
        pdfPage = event.pageNumber
      })
      eventBus.on('scalechanging', (event: { scale: number }) => {
        pdfScale = event.scale
      })

      pdfLinkService = linkService
      pdfViewer = pdfViewerInstance

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
      closeTemplateMenu()
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
      client?.dispose()
      pdfLoadTask?.destroy()
      pdfDoc?.destroy()
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
      pdfDoc?.destroy()
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

      void pdfDoc?.destroy()
      pdfDoc = doc
      pdfPages = doc.numPages
      pdfPage = 1

      pdfLinkService?.setDocument(doc)
      pdfViewer?.setDocument(doc)
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

  function handleNew() {
    markdown = ''
  }

  let fileInputEl = $state<HTMLInputElement | null>(null)

  function handleOpenFile() {
    fileInputEl?.click()
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

    const file = files[0]
    if (
      !file.name.endsWith('.md') &&
      !file.name.endsWith('.markdown') &&
      !file.name.endsWith('.txt')
    ) {
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        markdown = content
      }
    }
    reader.readAsText(file)
  }

  function fitWidth() {
    if (!pdfViewer || !pdfViewerContainerEl) return
    if (pdfViewerContainerEl.offsetParent === null) return
    pdfViewer.currentScaleValue = 'page-width'
  }

  // ResizeObserver for auto-fit
  $effect(() => {
    if (!pdfViewerContainerEl || !browser) return
    const observer = new ResizeObserver(() => {
      fitWidth()
    })
    observer.observe(pdfViewerContainerEl)
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
        <span>{lang === 'zh' ? '拖入 .md 文件' : 'Drop .md file here'}</span>
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

  <!-- Navbar -->
  <nav class="navbar">
    <div class="navbar-left">
      <a href="/{lang}/" class="logo-link">
        <img src="/logo.png" alt="MDXport" class="logo-img" />
      </a>
      <a
        href="https://github.com/cosformula/mdxport"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-icon hidden-mobile"
        title="View on GitHub"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
          ></path>
        </svg>
      </a>

      <a href="/{lang}/redbook/" class="mode-link hidden-mobile" title={lang === 'zh' ? '小红书卡片模式' : 'RedNote Card Mode'}>
        {lang === 'zh' ? '小红书模式' : 'Card Mode'}
      </a>
    </div>
    <div class="navbar-center">
      <!-- Intentionally empty -->
    </div>
    <div class="navbar-right">
      <button
        class="btn btn-primary btn-sm"
        onclick={downloadPdf}
        disabled={!pdfBytes || status === 'compiling'}
      >
        {status === 'compiling' ? t('generating') : t('export')}
      </button>

      <!-- Language Switch -->
      <button class="btn btn-ghost btn-sm hidden-mobile" onclick={switchLang}>
        {t('langSwitch')}
      </button>

      <!-- Menu Button (More) -->
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
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"
            ></circle>
            <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"
            ></circle>
            <circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"
            ></circle>
          </svg>
        </button>

        {#if isMenuOpen}
          <div class="dropdown-menu">
            <button
              class="menu-item show-mobile"
              onclick={() => {
                openPdfNewTab()
                closeMenu()
              }}
              disabled={!pdfUrl || status === 'compiling'}
            >
              <span class="menu-icon">🌐</span>
              {lang === 'zh' ? '在新页预览 PDF' : 'Preview PDF in New Tab'}
            </button>

            <a
              href="https://github.com/cosformula/mdxport"
              target="_blank"
              rel="noopener noreferrer"
              class="menu-item show-mobile"
            >
              <span class="menu-icon">🐙</span>
              GitHub
            </a>

            <button class="menu-item show-mobile" onclick={switchLang}>
              <span class="menu-icon">🌐</span>
              {t('langSwitch') === '中'
                ? 'Switch to Chinese'
                : 'Switch to English'}
            </button>

            <button
              class="menu-item"
              onclick={() => {
                handleNew()
                closeMenu()
              }}
            >
              <span class="menu-icon">📄</span>
              {t('new')}
            </button>

            <button
              class="menu-item"
              onclick={() => {
                handleOpenFile()
                closeMenu()
              }}
            >
              <span class="menu-icon">📂</span>
              {lang === 'zh' ? '打开本地文件' : 'Open Local File'}
            </button>

            <button
              class="menu-item"
              onclick={() => {
                handleHelp()
                closeMenu()
              }}
            >
              <span class="menu-icon">❓</span>
              {lang === 'zh' ? '查看帮助' : 'Help & Guide'}
            </button>

            <div class="menu-divider"></div>

            <a href="/{lang}/redbook/" class="menu-item">
              <span class="menu-icon">📱</span>
              {lang === 'zh' ? '小红书卡片模式' : 'RedNote Card Mode'}
            </a>

            <a href="/{lang}/resources/" class="menu-item">
              <span class="menu-icon">🛠️</span>
              {lang === 'zh' ? '更多资源与工具' : 'Resources & Tools'}
            </a>

            <div class="menu-divider"></div>

            <a
              href="mailto:cosformula@gmail.com"
              class="menu-item small"
              title={lang === 'zh' ? '联系我们' : 'Contact Us'}
            >
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
        <div class="editor-mode-toggle">
          <button class="mode-toggle-btn" class:active={editorMode === 'wysiwyg'} onclick={() => editorMode = 'wysiwyg'}>
            {lang === 'zh' ? '编辑' : 'Edit'}
          </button>
          <button class="mode-toggle-btn" class:active={editorMode === 'code'} onclick={() => editorMode = 'code'}>
            {lang === 'zh' ? '源码' : 'Code'}
          </button>
        </div>
        <div class="template-dropdown" onclick={(e) => e.stopPropagation()}>
          <button class="toolbar-btn" onclick={toggleTemplateMenu}>
            {lang === 'zh' ? '模板' : 'Templates'}
          </button>
          {#if isTemplateMenuOpen}
            <div class="template-menu">
              {#each templates as tmpl}
                <button class="template-menu-item" onclick={() => loadTemplate(tmpl)}>
                  <span class="template-icon">{tmpl.icon}</span>
                  {tmpl.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      {#if editorMode === 'wysiwyg'}
        <WysiwygEditor bind:markdown placeholder={t('placeholder')} />
      {:else}
        <MarkdownEditor bind:markdown placeholder={t('placeholder')} />
      {/if}
      {#if errorMessage}
        <div class="error-bar">{errorMessage}</div>
      {/if}
    </section>

    <!-- Resizer -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
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
          {#if status === 'compiling'}
            <div class="compiling-badge">
              <div class="spinner-xs"></div>
              <span>{lang === 'zh' ? '正在排版...' : 'Typing...'}</span>
            </div>
          {:else if status === 'error'}
            <div class="error-badge">
              <span>⚠️ {lang === 'zh' ? '编译失败' : 'Failed'}</span>
            </div>
          {/if}
        </div>
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
      </div>
      <div class="preview-container">
        <div class="pdfjs-container" bind:this={pdfViewerContainerEl}>
          <div class="pdfViewer" bind:this={pdfViewerEl}></div>
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
  .navbar-center,
  .navbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .navbar-left {
    flex: 0 0 auto;
  }

  .navbar-center {
    flex: 1;
    justify-content: center;
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

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-gray-500);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .nav-icon:hover {
    background: var(--color-gray-100);
    color: var(--color-gray-900);
  }

  .mode-link {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-gray-500, #6b7280);
    text-decoration: none;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 4px);
    transition: all 0.15s ease;
  }

  .mode-link:hover {
    color: var(--color-gray-900, #111);
    background: var(--color-gray-100, #f3f4f6);
  }

  /* ========================================
     Template Dropdown
     ======================================== */
  .template-dropdown {
    position: relative;
    display: inline-block;
  }

  .template-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 180px;
    background: var(--color-white);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    z-index: 1000;
    padding: var(--space-xs) 0;
    display: flex;
    flex-direction: column;
  }

  .template-menu-item {
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
    transition: background-color var(--transition-fast);
  }

  .template-menu-item:hover {
    background-color: var(--color-gray-50);
    color: var(--color-gray-900);
  }

  .template-icon {
    margin-right: var(--space-sm);
    font-size: 1rem;
    line-height: 1;
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

  .toolbar-btn {
    font-size: 0.8125rem;
    font-weight: 500;
    padding: 3px 10px;
    background: var(--color-white, #fff);
    border: 1px solid var(--color-gray-200, #e5e7eb);
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    color: var(--color-gray-600, #4b5563);
  }

  .toolbar-btn:hover {
    background: var(--color-gray-100, #f3f4f6);
    border-color: var(--color-gray-300, #d1d5db);
  }

  .error-bar {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.75rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-top: 1px solid rgba(239, 68, 68, 0.2);
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

  .compiling-badge,
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

  .compiling-badge {
    background: var(--color-gray-100);
    color: var(--color-gray-600);
  }

  .error-badge {
    background: #fef2f2;
    color: #ef4444;
  }

  .spinner-xs {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-gray-300);
    border-top-color: var(--color-gray-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
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

    .show-mobile {
      display: flex !important;
    }
  }

  .show-mobile {
    display: none;
  }
</style>

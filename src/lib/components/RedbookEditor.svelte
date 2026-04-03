<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { getPdfjs } from '$lib/pdf/pdfjs'
  import { markdownToTypst } from '$lib/pipeline/markdownToTypst'
  import type { TypstStyleId } from '$lib/pipeline/markdownToTypst'
  import { TypstWorkerClient } from '$lib/workers/typstClient'
  import type { UILang } from '$lib/i18n/lang'
  import { renderMermaidToSvg } from '$lib/mermaid/render'
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte'
  import WysiwygEditor from '$lib/components/WysiwygEditor.svelte'
  import CardGallery from '$lib/components/CardGallery.svelte'
  import { REDBOOK_TEMPLATES } from '$lib/templates/redbook-templates'

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
  let hasInitialized = false

  $effect(() => {
    if (!hasInitialized) {
      const templates = REDBOOK_TEMPLATES[lang]
      markdown = templates[0]?.content ?? ''
      hasInitialized = true
    }
  })

  let leftPaneWidth = $state(50)
  let isResizing = $state(false)
  let isDragging = $state(false)

  let editorMode = $state<'code' | 'wysiwyg'>(
    (browser && (localStorage.getItem('mdxport-editor-mode') as 'code' | 'wysiwyg')) || 'code',
  )

  let style = $state<'redbook-knowledge' | 'redbook-dark' | 'redbook-minimalist'>(
    (browser &&
      (localStorage.getItem('mdxport-redbook-style') as
        | 'redbook-knowledge'
        | 'redbook-dark'
        | 'redbook-minimalist')) ||
      'redbook-knowledge',
  )

  let font = $state<'sans' | 'serif'>(
    (browser && (localStorage.getItem('mdxport-card-font') as 'sans' | 'serif')) ||
      'sans',
  )

  let cardColumns = $state(
    (browser && parseInt(localStorage.getItem('mdxport-card-columns') || '0', 10)) || 0,
  )

  // Compilation state
  let status: 'idle' | 'compiling' | 'done' | 'error' = $state('idle')
  let errorMessage: string | null = $state(null)
  let pdfBytes = $state<Uint8Array | null>(null)

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

  // ========================================
  // UI Text
  // ========================================
  const UI = {
    zh: {
      template: '模板',
      exportCards: '下载图片',
      loading: '正在初始化渲染引擎...',
      generating: '生成中...',
      langSwitch: 'EN',
      placeholder: '在这里输入 Markdown...',
    },
    en: {
      template: 'Template',
      exportCards: 'Download Images',
      loading: 'Initializing rendering engine...',
      generating: 'Generating...',
      langSwitch: '中',
      placeholder: 'Type Markdown here...',
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

    client = new TypstWorkerClient()

    let aborted = false

    void (async () => {
      // Wait for PDF.js to be ready (needed for card rendering)
      await getPdfjs()
      if (aborted) return

      isLoading = false

      // Trigger first compile
      void compile(markdown, style, lang, font)
    })().catch((error) => {
      console.error(error)
      isLoading = false
    })

    // Close menu on click outside
    const handleClickOutside = () => {
      closeMenu()
    }
    window.addEventListener('click', handleClickOutside)

    return () => {
      aborted = true
      window.removeEventListener('click', handleClickOutside)
      client?.dispose()
    }
  })

  // ========================================
  // Persist preferences
  // ========================================
  $effect(() => {
    if (!browser) return
    localStorage.setItem('mdxport-redbook-style', style)
    localStorage.setItem('mdxport-card-font', font)
    localStorage.setItem('mdxport-card-columns', String(cardColumns))
    localStorage.setItem('mdxport-editor-mode', editorMode)
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
      const oldTemplates = REDBOOK_TEMPLATES[prevLang]
      const isOldDefault = oldTemplates.some((tmpl) => tmpl.content === markdown)
      if (isOldDefault || markdown.trim() === '') {
        const newTemplates = REDBOOK_TEMPLATES[currentLang]
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

      const mainTypst = markdownToTypst(processedMd, {
        style: nextStyle,
        lang: docLang,
        font: compileFont,
      })
      // @ts-ignore
      const pdfData = await client.compilePdf(mainTypst, images)
      if (seq !== compileSeq) return
      pdfBytes = pdfData.pdf
      status = 'done'
    } catch (error) {
      if (seq !== compileSeq) return
      status = 'error'
      errorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  // ========================================
  // Download cards (render PDF pages to 1242px-wide PNGs)
  // ========================================
  async function downloadCards() {
    if (!pdfBytes) return
    const pdfjs = await getPdfjs()
    const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const baseVp = page.getViewport({ scale: 1 })
      const scale = 1242 / baseVp.width
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, canvas, viewport }).promise
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${String(i).padStart(2, '0')}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
    doc.destroy()
  }

  // ========================================
  // Template handling
  // ========================================
  function applyTemplate(templateContent: string) {
    markdown = templateContent
  }

  // ========================================
  // Navigation helpers
  // ========================================
  function switchLang() {
    const targetLang = lang === 'zh' ? 'en' : 'zh'
    void goto(`/${targetLang}/redbook/`)
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
  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    isDragging = false
  }

  function handleDrop(e: DragEvent) {
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
</script>

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
  class:drop-zone-active={isDragging}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="application"
>
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

      <a href="/{lang}/" class="mode-link hidden-mobile" title={lang === 'zh' ? 'PDF 模式' : 'PDF Mode'}>
        {lang === 'zh' ? 'PDF 模式' : 'PDF Mode'}
      </a>
    </div>
    <div class="navbar-center">
      <!-- spacer -->
    </div>
    <div class="navbar-right">
      <!-- Download Button -->
      <button
        class="btn btn-primary btn-sm"
        onclick={downloadCards}
        disabled={!pdfBytes || status === 'compiling'}
      >
        {status === 'compiling' ? t('generating') : t('exportCards')}
      </button>

      <!-- Language Switch -->
      <button class="btn btn-ghost btn-sm hidden-mobile" onclick={switchLang}>
        {t('langSwitch')}
      </button>

      <!-- Menu Button -->
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
                markdown = ''
                closeMenu()
              }}
            >
              <span class="menu-icon">📄</span>
              {lang === 'zh' ? '新建' : 'New'}
            </button>

            <a href="/{lang}/" class="menu-item">
              <span class="menu-icon">📑</span>
              {lang === 'zh' ? 'PDF 编辑器' : 'PDF Editor'}
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
        <div class="editor-mode-toggle">
          <button class="mode-toggle-btn" class:active={editorMode === 'wysiwyg'} onclick={() => editorMode = 'wysiwyg'}>
            {lang === 'zh' ? '编辑' : 'Edit'}
          </button>
          <button class="mode-toggle-btn" class:active={editorMode === 'code'} onclick={() => editorMode = 'code'}>
            {lang === 'zh' ? '源码' : 'Code'}
          </button>
        </div>
        <select
          class="toolbar-select"
          onchange={(e) => {
            const target = e.target as HTMLSelectElement
            const idx = parseInt(target.value, 10)
            if (!isNaN(idx)) {
              applyTemplate(REDBOOK_TEMPLATES[lang][idx].content)
            }
            target.value = ''
          }}
        >
          <option value="" disabled selected>{lang === 'zh' ? '模板' : 'Templates'}</option>
          {#each REDBOOK_TEMPLATES[lang] as tmpl, idx}
            <option value={idx}>{tmpl.icon} {tmpl.name}</option>
          {/each}
        </select>
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

    <!-- Preview Pane (Card Gallery) -->
    <section
      class="pane preview-pane"
      class:mobile-hidden={activeMobileTab !== 'preview'}
      style="width: {100 - leftPaneWidth}%"
    >
      <div class="preview-toolbar">
        <div class="preview-toolbar-left">
          <select class="style-select" bind:value={style}>
            <option value="redbook-knowledge">{lang === 'zh' ? '知识卡片' : 'Knowledge'}</option>
            <option value="redbook-dark">{lang === 'zh' ? '深色卡片' : 'Dark'}</option>
            <option value="redbook-minimalist">{lang === 'zh' ? '极简卡片' : 'Minimal'}</option>
          </select>
          <select class="font-select" bind:value={font}>
            <option value="sans">{lang === 'zh' ? '无衬线' : 'Sans'}</option>
            <option value="serif">{lang === 'zh' ? '衬线' : 'Serif'}</option>
          </select>
          <select class="columns-select" bind:value={cardColumns}>
            <option value={0}>{lang === 'zh' ? '自动排列' : 'Auto'}</option>
            <option value={1}>1 {lang === 'zh' ? '列' : 'col'}</option>
            <option value={2}>2 {lang === 'zh' ? '列' : 'col'}</option>
            <option value={3}>3 {lang === 'zh' ? '列' : 'col'}</option>
            <option value={4}>4 {lang === 'zh' ? '列' : 'col'}</option>
          </select>
        </div>
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
      </div>
      <CardGallery {pdfBytes} {status} {filename} {lang} columns={cardColumns} />
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

  .drop-zone-active {
    outline: 3px dashed var(--color-gray-400);
    outline-offset: -3px;
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

  .template-select,
  .style-select,
  .font-select,
  .columns-select {
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

  .template-select:hover,
  .style-select:hover,
  .font-select:hover,
  .columns-select:hover {
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

  .toolbar-select {
    appearance: none;
    -webkit-appearance: none;
    padding: 3px 24px 3px 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    background-color: var(--color-white, #fff);
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9L12 15L18 9' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 6px center;
    background-size: 12px;
    border: 1px solid var(--color-gray-200, #e5e7eb);
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    color: var(--color-gray-600, #4b5563);
  }

  .toolbar-select:hover {
    background-color: var(--color-gray-100, #f3f4f6);
    border-color: var(--color-gray-300, #d1d5db);
  }

  .error-bar {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.75rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-top: 1px solid rgba(239, 68, 68, 0.2);
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

    .show-mobile {
      display: flex !important;
    }
  }

  .show-mobile {
    display: none;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

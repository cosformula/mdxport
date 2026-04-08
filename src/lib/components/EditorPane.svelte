<script lang="ts">
  import { browser } from '$app/environment'
  import type { UILang } from '$lib/i18n/lang'
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte'
  import WysiwygEditor from '$lib/components/WysiwygEditor.svelte'
  import {
    getImageExtension,
    getImageAltText,
    escapeMarkdownImageAlt,
    createAssetId,
  } from '$lib/utils/image-utils'

  interface Props {
    markdown: string
    lang: UILang
    placeholder?: string
    cardMode?: boolean
    errorMessage?: string | null
    pageBreakToken?: string | null
    pageBreakLabel?: { zh: string; en: string } | null
    pageBreakTitle?: { zh: string; en: string } | null
    imageAssets?: Record<string, { bytes: Uint8Array; objectUrl: string; mimeType?: string }>
    onImageSaved?: (path: string, bytes: Uint8Array, objectUrl: string, mimeType: string) => void
  }

  let {
    markdown = $bindable(),
    lang,
    placeholder = '',
    cardMode = false,
    errorMessage = null,
    pageBreakToken = null,
    pageBreakLabel = null,
    pageBreakTitle = null,
    imageAssets = {},
    onImageSaved,
  }: Props = $props()

  let markdownEditor = $state<MarkdownEditor | null>(null)
  let wysiwygEditor = $state<WysiwygEditor | null>(null)
  let imageInput = $state<HTMLInputElement | null>(null)

  let editorMode = $state<'code' | 'wysiwyg'>(
    (browser && (localStorage.getItem('mdxport-editor-mode') as 'code' | 'wysiwyg')) || 'wysiwyg',
  )

  $effect(() => {
    if (!browser) return
    localStorage.setItem('mdxport-editor-mode', editorMode)
  })

  function openImagePicker() {
    imageInput?.click()
  }

  function insertPageBreak() {
    if (!pageBreakToken) return
    const insertion = `\n\n${pageBreakToken}\n\n`
    insertMarkdownSnippet(insertion)
  }

  export function insertMarkdownSnippet(snippet: string): void {
    if (editorMode === 'code' && markdownEditor?.insertTextAtSelection(snippet)) {
      return
    }
    if (editorMode === 'wysiwyg' && wysiwygEditor?.insertMarkdownAtSelection(snippet)) {
      return
    }

    const trimmed = markdown.trimEnd()
    markdown = trimmed ? `${trimmed}${snippet}` : snippet.trimStart()
  }

  async function saveLocalImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error(lang === 'zh' ? '仅支持图片文件' : 'Only image files are supported')
    }

    const path = `images/${createAssetId()}.${getImageExtension(file)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const objectUrl = URL.createObjectURL(file)
    const mimeType = file.type || 'application/octet-stream'

    onImageSaved?.(path, bytes, objectUrl, mimeType)

    return path
  }

  function resolveImageUrl(path: string): string {
    return imageAssets[path]?.objectUrl ?? path
  }

  export async function insertImageFile(file: File): Promise<void> {
    try {
      const path = await saveLocalImage(file)
      const alt = escapeMarkdownImageAlt(getImageAltText(file))
      insertMarkdownSnippet(`\n\n![${alt}](${path})\n\n`)
    } catch (error) {
      // Errors are shown via errorMessage from parent
      console.error('Insert image failed:', error)
    }
  }

  async function handleImageInputChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    await insertImageFile(file)
  }
</script>

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
    {#if pageBreakToken && pageBreakLabel}
      <button class="toolbar-icon-btn" onclick={insertPageBreak} title={pageBreakTitle ? pageBreakTitle[lang] : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <path d="M6 8V4h12v4"></path>
          <path d="M6 16v4h12v-4"></path>
        </svg>
        {pageBreakLabel[lang]}
      </button>
    {/if}
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
    {placeholder}
    {cardMode}
    imageUpload={saveLocalImage}
    {resolveImageUrl}
  />
{:else}
  <MarkdownEditor bind:this={markdownEditor} bind:markdown {placeholder} />
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

<style>
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
    padding: var(--space-sm, 8px) var(--space-md, 16px);
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
</style>

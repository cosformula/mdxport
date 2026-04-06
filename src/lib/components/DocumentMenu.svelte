<script lang="ts">
  import type { UILang } from '$lib/i18n/lang'
  import type { Template } from '$lib/templates/pdf-templates'
  import { deriveNameFromContent, documentStore } from '$lib/stores/documentStore.svelte'
  import type { SavedDocument, SavedDocumentAsset } from '$lib/storage/documents'

  let {
    lang,
    mode,
    templates,
    currentContent,
    documentAssets,
    onDocumentLoad,
  }: {
    lang: UILang
    mode: 'pdf' | 'redbook' | 'slides'
    templates: Template[]
    currentContent: string
    documentAssets?: Record<string, SavedDocumentAsset>
    onDocumentLoad: (doc: SavedDocument) => void
  } = $props()

  let isOpen = $state(false)

  const currentModeDocs = $derived(
    documentStore.recentDocuments.filter((d) => d.mode === mode),
  )

  const currentDoc = $derived(
    documentStore.recentDocuments.find((d) => d.id === documentStore.currentDocId),
  )
  const docName = $derived(currentDoc?.name || deriveNameFromContent(currentContent))

  function toggle() {
    isOpen = !isOpen
  }

  function close() {
    isOpen = false
  }

  function relativeTime(ts: number): string {
    const diff = Date.now() - ts
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now'
    if (minutes < 60) return lang === 'zh' ? `${minutes} 分钟前` : `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return lang === 'zh' ? `${hours} 小时前` : `${hours}h ago`
    const days = Math.floor(hours / 24)
    return lang === 'zh' ? `${days} 天前` : `${days}d ago`
  }

  async function openDocument(doc: SavedDocument) {
    await saveCurrentIfNeeded()
    const loadedDoc = await documentStore.loadDocument(doc.id)
    if (loadedDoc === null) return
    onDocumentLoad(loadedDoc)
    close()
  }

  async function newFromTemplate(template: Template) {
    await saveCurrentIfNeeded()
    const doc = await documentStore.createDocument(mode, template.content, undefined, 'template')
    onDocumentLoad(doc)
    close()
  }

  async function newBlank() {
    await saveCurrentIfNeeded()
    const doc = await documentStore.createDocument(mode, '', undefined, 'blank')
    onDocumentLoad(doc)
    close()
  }

  async function createFallbackDocument() {
    const defaultTemplate = templates[0]
    if (defaultTemplate) {
      await newFromTemplate(defaultTemplate)
      return
    }
    await newBlank()
  }

  async function saveCurrentIfNeeded() {
    if (!documentStore.currentDocId) return
    await documentStore.saveNow(documentStore.currentDocId, currentContent, documentAssets)
  }

  async function handleDelete(e: Event, doc: SavedDocument) {
    e.stopPropagation()
    const wasCurrent = doc.id === documentStore.currentDocId
    await documentStore.deleteDocument(doc.id)
    // If deleted the current doc, switch to another or recreate from template
    if (wasCurrent) {
      const remaining = currentModeDocs.filter((d) => d.id !== doc.id)
      if (remaining.length > 0) {
        await openDocument(remaining[0])
      } else {
        await createFallbackDocument()
      }
    }
  }

  // Close on click outside
  function handleWindowClick() {
    if (isOpen) close()
  }

  const statusText = $derived(
    documentStore.saveStatus === 'saving'
      ? (lang === 'zh' ? '保存中...' : 'Saving...')
      : '',
  )
</script>

<svelte:window onclick={handleWindowClick} />

<div class="doc-menu">
  <button
    class="doc-name-btn"
    onclick={(e) => {
      e.stopPropagation()
      toggle()
    }}
    title={docName}
  >
    <span class="doc-name-text">{docName}</span>
    {#if statusText}
      <span class="doc-status">{statusText}</span>
    {/if}
    <svg class="chevron" class:open={isOpen} width="12" height="12" viewBox="0 0 12 12">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>
  </button>

  {#if isOpen}
    <div class="doc-popover">
      {#if currentModeDocs.length > 0}
        <div class="doc-section-label">{lang === 'zh' ? '本地文档' : 'Local Documents'}</div>
        <div class="doc-list">
          {#each currentModeDocs.slice(0, 10) as doc}
            <div
              class="doc-item"
              class:active={doc.id === documentStore.currentDocId}
              role="button"
              tabindex="0"
              onclick={() => openDocument(doc)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openDocument(doc)
              }}
            >
              <span class="doc-item-name">{doc.name}</span>
              <span class="doc-item-time">{relativeTime(doc.updatedAt)}</span>
              <button
                class="doc-item-delete"
                onclick={(e) => handleDelete(e, doc)}
                title={lang === 'zh' ? '删除' : 'Delete'}
              >&times;</button>
            </div>
          {/each}
        </div>
        <div class="doc-divider"></div>
      {/if}

      <div class="doc-section-label">{lang === 'zh' ? '模板' : 'Templates'}</div>
      {#each templates as t}
        <button class="doc-item" onclick={() => newFromTemplate(t)}>
          <span class="doc-item-icon">{t.icon}</span>
          <span class="doc-item-name">{t.name}</span>
        </button>
      {/each}

      <div class="doc-divider"></div>
      <button class="doc-item doc-new" onclick={newBlank}>
        + {lang === 'zh' ? '新建空白文档' : 'New blank document'}
      </button>
    </div>
  {/if}
</div>

<style>
  .doc-menu {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 280px;
  }

  .doc-name-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--color-gray-700);
    transition: all var(--transition-fast);
    max-width: 280px;
  }

  .doc-name-btn:hover {
    background: var(--color-gray-50);
    border-color: var(--color-gray-200);
  }

  .doc-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
    font-weight: 500;
  }

  .doc-status {
    font-size: 0.6875rem;
    color: var(--color-gray-400);
    white-space: nowrap;
  }

  .chevron {
    flex-shrink: 0;
    color: var(--color-gray-400);
    transition: transform var(--transition-fast);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .doc-popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 300px;
    max-height: 400px;
    overflow-y: auto;
    background: var(--color-white);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    z-index: 1000;
    padding: var(--space-xs) 0;
  }

  .doc-section-label {
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-gray-400);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .doc-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .doc-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px var(--space-sm);
    font-size: 0.8125rem;
    color: var(--color-gray-700);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .doc-item:hover {
    background: var(--color-gray-50);
  }

  .doc-item.active {
    background: var(--color-gray-100);
    font-weight: 500;
  }

  .doc-item-icon {
    flex-shrink: 0;
  }

  .doc-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-item-time {
    font-size: 0.6875rem;
    color: var(--color-gray-400);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .doc-item-delete {
    display: none;
    padding: 0 4px;
    font-size: 0.875rem;
    color: var(--color-gray-400);
    background: transparent;
    border: none;
    cursor: pointer;
    line-height: 1;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .doc-item:hover .doc-item-delete {
    display: block;
  }

  .doc-item-delete:hover {
    color: var(--color-gray-700);
    background: var(--color-gray-200);
  }

  .doc-divider {
    height: 1px;
    background: var(--color-gray-100);
    margin: var(--space-xs) 0;
  }

  .doc-new {
    color: var(--color-gray-500);
  }

  @media (max-width: 768px) {
    .doc-menu {
      max-width: 160px;
    }

    .doc-name-text {
      max-width: 120px;
    }

    .doc-popover {
      width: 260px;
    }
  }
</style>

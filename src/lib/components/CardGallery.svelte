<script lang="ts">
  import { untrack } from 'svelte'
  import { getPdfjs } from '$lib/pdf/pdfjs'
  import StatusHint from '$lib/components/StatusHint.svelte'
  import type { PDFDocumentProxy } from 'pdfjs-dist'

  interface Props {
    pdfBytes: Uint8Array | null
    status: 'idle' | 'compiling' | 'done' | 'error'
    filename: string
    lang: 'zh' | 'en'
    columns?: number
    aspectRatio?: string
    fullResWidth?: number
    thumbWidth?: number
  }

  let { pdfBytes, status, filename, lang, columns = 0, aspectRatio = '3 / 4', fullResWidth = 1242, thumbWidth = 400 }: Props = $props()

  interface CardItem {
    pageNum: number
    blobUrl: string
    blob: Blob
    hash: string
  }

  let cards = $state<CardItem[]>([])
  let rendering = $state(false)
  let activeRenderPage = $state<number | null>(null)
  let visibleRenderPage = $state<number | null>(null)
  let pendingTotalPages = $state(0)
  let renderSeq = 0
  let currentDoc: PDFDocumentProxy | null = null
  let renderHintTimer: number | null = null

  // Render PDF pages to card images when pdfBytes changes
  $effect(() => {
    const bytes = pdfBytes
    untrack(() => {
      if (!bytes) {
        renderSeq += 1
        rendering = false
        activeRenderPage = null
        visibleRenderPage = null
        pendingTotalPages = 0
        cleanup()
        return
      }

      const seq = ++renderSeq
      rendering = true
      renderPages(bytes, seq)
    })
  })

  function revokeCards(cardsToRevoke: CardItem[]) {
    for (const card of cardsToRevoke) {
      URL.revokeObjectURL(card.blobUrl)
    }
  }

  function cleanup() {
    revokeCards(cards)
    cards = []
    activeRenderPage = null
    visibleRenderPage = null
    pendingTotalPages = 0
    clearRenderHint()
    if (currentDoc) {
      currentDoc.destroy()
      currentDoc = null
    }
  }

  async function renderPages(bytes: Uint8Array, seq: number) {
    let doc: PDFDocumentProxy | null = null
    try {
      const pdfjs = await getPdfjs()
      doc = await pdfjs.getDocument({ data: bytes.slice() }).promise

      if (seq !== renderSeq) {
        doc.destroy()
        return
      }

      const previousCards = cards
      const previousDoc = currentDoc
      const nextCards = [...previousCards]
      const createdBlobUrls: string[] = []
      pendingTotalPages = doc.numPages

      const dpr = window.devicePixelRatio || 1
      const thumbPixelWidth = thumbWidth * dpr

      for (let i = 1; i <= doc.numPages; i++) {
        activeRenderPage = i
        scheduleRenderHint(i, seq)
        const page = await doc.getPage(i)
        const baseVp = page.getViewport({ scale: 1 })
        const scale = thumbPixelWidth / baseVp.width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, canvas, viewport }).promise

        if (seq !== renderSeq) {
          for (const blobUrl of createdBlobUrls) {
            URL.revokeObjectURL(blobUrl)
          }
          doc.destroy()
          return
        }

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png'),
        )
        const hash = await hashBlob(blob)
        const existing = nextCards[i - 1]

        if (
          existing &&
          existing.pageNum === i &&
          existing.hash === hash
        ) {
          clearRenderHint(i)
          continue
        }

        const blobUrl = URL.createObjectURL(blob)
        createdBlobUrls.push(blobUrl)
        nextCards[i - 1] = { pageNum: i, blobUrl, blob, hash }
        if (existing) {
          URL.revokeObjectURL(existing.blobUrl)
        }
        cards = nextCards.slice(0, Math.max(previousCards.length, i))
        clearRenderHint(i)
      }

      if (seq === renderSeq) {
        currentDoc = doc
        const removedCards = nextCards.slice(doc.numPages)
        revokeCards(removedCards)
        cards = nextCards.slice(0, doc.numPages)
        rendering = false
        activeRenderPage = null
        visibleRenderPage = null
        pendingTotalPages = doc.numPages
        clearRenderHint()
        previousDoc?.destroy()
      }
    } catch {
      doc?.destroy()
      if (seq === renderSeq) {
        rendering = false
        activeRenderPage = null
        visibleRenderPage = null
        pendingTotalPages = cards.length
        clearRenderHint()
      }
    }
  }

  function scheduleRenderHint(pageNum: number, seq: number) {
    clearRenderHint()
    renderHintTimer = window.setTimeout(() => {
      if (seq === renderSeq && activeRenderPage === pageNum) {
        visibleRenderPage = pageNum
      }
    }, 180)
  }

  function clearRenderHint(pageNum?: number) {
    if (renderHintTimer !== null) {
      window.clearTimeout(renderHintTimer)
      renderHintTimer = null
    }
    if (pageNum === undefined || visibleRenderPage === pageNum) {
      visibleRenderPage = null
    }
  }

  async function copyCard(card: CardItem) {
    // Re-render at full resolution for copy
    const fullBlob = await renderFullRes(card.pageNum)
    if (!fullBlob) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': fullBlob }),
      ])
    } catch {
      // Fallback: download instead
      downloadSingleCard(card.pageNum, fullBlob)
    }
  }

  async function downloadCard(card: CardItem) {
    const fullBlob = await renderFullRes(card.pageNum)
    if (!fullBlob) return
    downloadSingleCard(card.pageNum, fullBlob)
  }

  function downloadSingleCard(pageNum: number, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${String(pageNum).padStart(2, '0')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Lightbox state
  let lightboxCard = $state<CardItem | null>(null)
  let lightboxUrl = $state<string | null>(null)
  let lightboxLoading = $state(false)

  async function openLightbox(card: CardItem) {
    lightboxCard = card
    lightboxLoading = true
    const blob = await renderFullRes(card.pageNum)
    if (blob) {
      if (lightboxUrl) URL.revokeObjectURL(lightboxUrl)
      lightboxUrl = URL.createObjectURL(blob)
    }
    lightboxLoading = false
  }

  function closeLightbox() {
    lightboxCard = null
    if (lightboxUrl) {
      URL.revokeObjectURL(lightboxUrl)
      lightboxUrl = null
    }
  }

  async function renderFullRes(pageNum: number): Promise<Blob | null> {
    if (!currentDoc) return null
    const page = await currentDoc.getPage(pageNum)
    const baseVp = page.getViewport({ scale: 1 })
    const scale = fullResWidth / baseVp.width
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, canvas, viewport }).promise
    return new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    )
  }

  async function hashBlob(blob: Blob): Promise<string> {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      return `${blob.size}`
    }

    const digest = await subtle.digest('SHA-256', await blob.arrayBuffer())
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
  }
</script>

<div class="card-gallery">
  {#if rendering && cards.length === 0}
    <div class="card-gallery-placeholder">
      <div class="card-spinner"></div>
      <span>{lang === 'zh' ? '正在生成卡片...' : 'Generating cards...'}</span>
    </div>
  {:else if cards.length === 0 && status !== 'compiling'}
    <div class="card-gallery-placeholder">
      <span>{lang === 'zh' ? '编辑 Markdown 开始生成卡片' : 'Edit Markdown to generate cards'}</span>
    </div>
  {:else}
    <div class="card-grid" style={columns > 0 ? `grid-template-columns: repeat(${columns}, 1fr)` : ''}>
      {#each cards as card (card.pageNum)}
        <div class="card-item">
          <div class="card-image-wrapper" style="aspect-ratio: {aspectRatio}">
            <img
              src={card.blobUrl}
              alt="Card {card.pageNum}"
              class="card-image"
              draggable="false"
            />
            <div class="card-overlay">
              <button
                class="card-action-btn"
                onclick={() => openLightbox(card)}
                title={lang === 'zh' ? '放大查看' : 'View full size'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
              <button
                class="card-action-btn"
                onclick={() => copyCard(card)}
                title={lang === 'zh' ? '复制到剪贴板' : 'Copy to clipboard'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button
                class="card-action-btn"
                onclick={() => downloadCard(card)}
                title={lang === 'zh' ? '下载图片' : 'Download image'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
            {#if rendering && visibleRenderPage === card.pageNum}
              <StatusHint
                label={lang === 'zh' ? '更新中' : 'Updating'}
                position="top-left"
              />
            {/if}
            <span class="card-badge">{card.pageNum}/{cards.length}</span>
          </div>
        </div>
      {/each}
      {#if rendering && visibleRenderPage !== null && activeRenderPage !== null && activeRenderPage > cards.length}
        <div class="card-item">
          <div class="card-image-wrapper card-image-wrapper-loading" style="aspect-ratio: {aspectRatio}">
            <StatusHint
              label={lang === 'zh' ? '新增卡片中' : 'Adding card'}
              position="top-left"
            />
            <span class="card-badge">{activeRenderPage}/{pendingTotalPages || activeRenderPage}</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if lightboxCard}
  <div class="lightbox-overlay" onclick={closeLightbox}>
    <div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
      {#if lightboxLoading}
        <div class="lightbox-loading"><div class="card-spinner"></div></div>
      {:else if lightboxUrl}
        <img src={lightboxUrl} alt="Card {lightboxCard.pageNum}" class="lightbox-image" />
      {/if}
      <div class="lightbox-actions">
        <button class="lightbox-btn" onclick={() => lightboxCard && copyCard(lightboxCard)}>
          {lang === 'zh' ? '复制' : 'Copy'}
        </button>
        <button class="lightbox-btn" onclick={() => lightboxCard && downloadCard(lightboxCard)}>
          {lang === 'zh' ? '下载' : 'Download'}
        </button>
        <span class="lightbox-info">{lightboxCard.pageNum}/{cards.length}</span>
      </div>
    </div>
    <button
      class="lightbox-close"
      onclick={closeLightbox}
      aria-label={lang === 'zh' ? '关闭预览' : 'Close preview'}
      title={lang === 'zh' ? '关闭预览' : 'Close preview'}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
{/if}

<style>
  .card-gallery {
    position: relative;
    height: 100%;
    overflow-y: auto;
    padding: 16px;
    background: var(--color-gray-50, #f9fafb);
  }

  .card-gallery-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--color-gray-400, #9ca3af);
    font-size: 0.875rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
    align-content: flex-start;
  }

  .card-item {
    width: 100%;
  }

  .card-image-wrapper {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: white;
    cursor: pointer;
  }

  .card-image-wrapper-loading {
    background:
      linear-gradient(135deg, rgba(249, 250, 251, 0.98), rgba(243, 244, 246, 0.98));
    border: 1px dashed rgba(209, 213, 219, 0.95);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .card-image-wrapper:hover .card-overlay {
    opacity: 1;
  }

  .card-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    cursor: pointer;
    color: #333;
    transition: transform 0.1s ease, background 0.1s ease;
  }

  .card-action-btn:hover {
    background: white;
    transform: scale(1.1);
  }

  .card-badge {
    position: absolute;
    bottom: 6px;
    right: 8px;
    z-index: 3;
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
  }

  .card-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid var(--color-gray-200, #e5e7eb);
    border-top-color: var(--color-gray-500, #6b7280);
    border-radius: 50%;
    animation: card-spin 0.6s linear infinite;
  }

  @keyframes card-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    .card-gallery {
      padding: 10px;
    }
  }

  /* Lightbox */
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .lightbox-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-height: 100%;
    max-width: 100%;
  }

  .lightbox-image {
    max-height: calc(100vh - 140px);
    max-width: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .lightbox-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 267px;
  }

  .lightbox-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .lightbox-btn {
    padding: 6px 16px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .lightbox-btn:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .lightbox-info {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .lightbox-close {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1001;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: background 0.15s;
  }

  .lightbox-close:hover {
    background: rgba(255, 255, 255, 0.25);
  }
</style>

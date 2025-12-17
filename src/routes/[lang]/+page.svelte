<script lang="ts">
	import { browser, dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { getPdfjs } from '$lib/pdf/pdfjs';
	import { markdownToTypst } from '$lib/pipeline/markdownToTypst';
	import { TypstWorkerClient } from '$lib/workers/typstClient';
	import type { UILang } from '$lib/i18n/lang';

	import 'pdfjs-dist/web/pdf_viewer.css';

	import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
	import type { PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';

	function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
		let text = strings[0] ?? '';
		for (let i = 0; i < values.length; i++) {
			text += String(values[i]) + (strings[i + 1] ?? '');
		}

		text = text.replace(/^\n/, '').replace(/\n\s*$/, '');
		const lines = text.split('\n');
		const indents = lines
			.filter((line) => line.trim().length > 0)
			.map((line) => (/^\s*/.exec(line)?.[0].length ?? 0));
		const minIndent = indents.length ? Math.min(...indents) : 0;
		return lines.map((line) => line.slice(minIndent)).join('\n');
	}

	const UI_TEXT = {
		zh: {
			subtitle: '一键把 Markdown 导出为 PDF（预览 + 下载）',
			language: '语言',
			markdown: 'Markdown',
			pdfPreview: 'PDF 预览',
			style: '排版',
			autoPreview: '自动预览',
			refresh: '刷新预览',
			download: '下载',
			print: '打印',
			open: '新标签打开',
			prev: '上一页',
			next: '下一页',
			fitWidth: '适应宽度',
			generating: '正在生成预览…',
			waiting: '等待生成预览…',
			compilingHint: '正在生成预览（首次可能较慢，需要初始化 WASM/字体）。',
			pastePlaceholder: '在这里粘贴 Markdown…',
			diagnostics: '编译诊断',
			generatedTypst: '生成的 Typst（用于排障）'
		},
		en: {
			subtitle: 'Convert Markdown to PDF (preview + download)',
			language: 'Language',
			markdown: 'Markdown',
			pdfPreview: 'PDF Preview',
			style: 'Style',
			autoPreview: 'Auto preview',
			refresh: 'Refresh',
			download: 'Download',
			print: 'Print',
			open: 'Open',
			prev: 'Prev',
			next: 'Next',
			fitWidth: 'Fit width',
			generating: 'Generating preview…',
			waiting: 'Waiting for preview…',
			compilingHint: 'Generating preview (first run may be slow while initializing WASM/fonts).',
			pastePlaceholder: 'Paste Markdown here…',
			diagnostics: 'Diagnostics',
			generatedTypst: 'Generated Typst (debug)'
		}
	} as const;

	type UiTextKey = keyof (typeof UI_TEXT)['zh'];

	let { data }: { data: { lang: UILang } } = $props();
	function t(key: UiTextKey): string {
		return UI_TEXT[data.lang][key];
	}

	const DEFAULT_MARKDOWN: Record<UILang, string> = {
		zh: dedent`
			---
			lang: zh
			title: MDXport 技术文档示例
			authors:
			  - MDXport Team
			date: 2025-12-17
			---

			# 概述

			这是一段普通段落，包含 **加粗**、_斜体_、\`行内代码\`、以及一个 [内联链接](https://example.com)。

			下面演示引用式链接：([Quarto][1])，以及另一个引用：[SvelteKit 配置文档][2]。

			## 强制换行（Hard break）

			这一行结尾用反斜杠强制换行\\
			下一行会紧跟在同一段落里，但会换行。

			---

			# 引用与列表

			> 这是引用块第一段，包含 **加粗** 和 \`code\`。
			>
			> - 引用块中的列表项 A
			> - 引用块中的列表项 B
			>   - 嵌套 1
			>   - 嵌套 2

			## 列表与嵌套

			- 无序列表 1
			- 无序列表 2
			  1. 嵌套有序 1
			  2. 嵌套有序 2
			- 无序列表 3（含 [引用链接][2]）

			1. 有序列表 1
			2. 有序列表 2
			   - 嵌套无序 a
			   - 嵌套无序 b

			---

			# 代码块

			\`\`\`ts
			export function greet(name: string) {
			  const msg = \`Hello, \${name}\`;
			  return msg;
			}
			\`\`\`

			[1]: https://quarto.org
			[2]: https://svelte.dev/docs/kit/configuration
		`,
		en: dedent`
			---
			lang: en
			title: MDXport Sample Document
			authors:
			  - MDXport Team
			date: 2025-12-17
			---

			# Overview

			This is a regular paragraph with **bold**, _italic_, \`inline code\`, and an [inline link](https://example.com).

			Below is a reference-style link: ([Quarto][1]), and another one: [SvelteKit configuration][2].

			## Hard line break

			This line ends with a backslash for a hard break\\
			The next line stays in the same paragraph, but breaks the line.

			---

			# Blockquote & Lists

			> This is a blockquote paragraph with **bold** and \`code\`.
			>
			> - Item A
			> - Item B
			>   - Nested 1
			>   - Nested 2

			## Lists & Nesting

			- Unordered 1
			- Unordered 2
			  1. Nested ordered 1
			  2. Nested ordered 2
			- Unordered 3 (with a [reference link][2])

			1. Ordered 1
			2. Ordered 2
			   - Nested unordered a
			   - Nested unordered b

			---

			# Code block

			\`\`\`ts
			export function greet(name: string) {
			  const msg = \`Hello, \${name}\`;
			  return msg;
			}
			\`\`\`

			[1]: https://quarto.org
			[2]: https://svelte.dev/docs/kit/configuration
		`
	};

	let markdown = $state(DEFAULT_MARKDOWN.zh);
	let status = $state<'idle' | 'compiling' | 'done' | 'error'>('idle');
	let errorMessage = $state<string | null>(null);
	let diagnostics = $state<string[]>([]);
	let lastTypst = $state<string | null>(null);
	let style = $state<'modern-tech' | 'classic-editorial'>('modern-tech');
	let pdfBytes = $state<Uint8Array<ArrayBuffer> | null>(null);
	let pdfUrl = $state<string | null>(null);
	let autoPreview = $state(true);

	let client = $state<TypstWorkerClient | null>(null);
	let compileSeq = 0;
	let hasEverCompiled = false;
	let autoPreviewTimer: number | null = null;

	let pdfDoc = $state<PDFDocumentProxy | null>(null);
	let pdfPages = $state(0);
	let pdfPage = $state(1);
	let pdfScale = $state(1);
	let pdfLoadStatus = $state<'idle' | 'loading' | 'error'>('idle');
	let pdfError = $state<string | null>(null);

	let pdfViewer = $state<PDFViewer | null>(null);
	let pdfLinkService = $state<PDFLinkService | null>(null);

	let pdfViewerContainerEl = $state<HTMLDivElement | null>(null);
	let pdfViewerEl = $state<HTMLDivElement | null>(null);

	let pdfLoadTask: PDFDocumentLoadingTask | null = null;
	let pdfLoadSeq = 0;

	const LANG_STORAGE_KEY = 'mdxport_lang';
	let lastTemplateLang: UILang = 'zh';
	let langInitialized = false;

	onMount(() => {
		client = new TypstWorkerClient();

		let aborted = false;
		void (async () => {
			const container = pdfViewerContainerEl;
			const viewer = pdfViewerEl;
			if (!container || !viewer) return;

			await getPdfjs();
			const mod = await import('pdfjs-dist/web/pdf_viewer.mjs');
			if (aborted) return;

			const eventBus = new mod.EventBus();
			const linkService = new mod.PDFLinkService({ eventBus });
			const pdfViewerInstance = new mod.PDFViewer({
				container,
				viewer,
				eventBus,
				linkService
			});
			linkService.setViewer(pdfViewerInstance);

			eventBus.on('pagesinit', () => {
				pdfViewerInstance.currentScaleValue = 'page-width';
			});
			eventBus.on('pagechanging', (event: { pageNumber: number }) => {
				pdfPage = event.pageNumber;
			});
			eventBus.on('scalechanging', (event: { scale: number }) => {
				pdfScale = event.scale;
			});

			pdfLinkService = linkService;
			pdfViewer = pdfViewerInstance;

			if (pdfDoc) {
				linkService.setDocument(pdfDoc);
				pdfViewerInstance.setDocument(pdfDoc);
			}
		})().catch((error) => {
			console.error(error);
		});

		return () => {
			aborted = true;
			client?.dispose();
			pdfLoadTask?.destroy();
			clearPdfViewerDocument();
			pdfDoc?.destroy();
			if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		};
	});

	$effect(() => {
		if (!browser) return;

		const lang = data.lang;
		try {
			localStorage.setItem(LANG_STORAGE_KEY, lang);
		} catch {
			// ignore
		}

		const current = untrack(() => markdown);
		if (!langInitialized) {
			langInitialized = true;
			lastTemplateLang = lang;
			if (lang !== 'zh' && current === DEFAULT_MARKDOWN.zh) {
				markdown = DEFAULT_MARKDOWN[lang];
			}
			return;
		}

		if (lang !== lastTemplateLang && current === DEFAULT_MARKDOWN[lastTemplateLang]) {
			markdown = DEFAULT_MARKDOWN[lang];
		}
		lastTemplateLang = lang;
	});

	$effect(() => {
		if (!browser) return;
		if (!pdfPages) return;
		if (pdfPage < 1) pdfPage = 1;
		if (pdfPage > pdfPages) pdfPage = pdfPages;
	});

	$effect(() => {
		if (!browser) return;
		if (!pdfPages) return;
		if (!pdfViewer) return;
		if (!pdfDoc) return;

		const next = Number.isFinite(pdfPage) ? Math.trunc(pdfPage) : 1;
		if (next < 1 || next > pdfPages) return;
		if (pdfViewer.currentPageNumber === next) return;
		pdfViewer.currentPageNumber = next;
	});

	$effect(() => {
		if (!browser) return;
		const bytes = pdfBytes;
		if (!bytes) {
			pdfLoadTask?.destroy();
			clearPdfViewerDocument();
			pdfDoc?.destroy();
			pdfDoc = null;
			pdfPages = 0;
			pdfPage = 1;
			pdfScale = 1;
			pdfLoadStatus = 'idle';
			pdfError = null;
			return;
		}

		const seq = ++pdfLoadSeq;
		pdfLoadStatus = 'loading';
		pdfError = null;

		void (async () => {
			pdfLoadTask?.destroy();

			const pdfjs = await getPdfjs();
			const task: PDFDocumentLoadingTask = pdfjs.getDocument({ data: bytes });
			pdfLoadTask = task;

			const doc: PDFDocumentProxy = await task.promise;
			if (seq !== pdfLoadSeq) {
				void doc.destroy();
				return;
			}

			void pdfDoc?.destroy();
			pdfDoc = doc;
			pdfPages = doc.numPages;
			pdfPage = 1;

			pdfLinkService?.setDocument(doc);
			pdfViewer?.setDocument(doc);
			pdfLoadStatus = 'idle';
		})().catch((error) => {
			if (seq !== pdfLoadSeq) return;
			pdfLoadStatus = 'error';
			pdfError = error instanceof Error ? error.message : String(error);
		});
	});

	$effect(() => {
		if (!browser) return;
		if (!autoPreview) return;
		if (!client) return;

		const md = markdown;
		const _style = style;
		const _lang = data.lang;
		if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer);

		const delay = hasEverCompiled ? 450 : 0;
		autoPreviewTimer = window.setTimeout(() => {
			void compile(md, _style, _lang);
		}, delay);

		return () => {
			if (autoPreviewTimer) window.clearTimeout(autoPreviewTimer);
		};
	});

	async function exportPdf() {
		await compile(markdown, style, data.lang);
	}

	function onLangChange(event: Event) {
		const next = (event.currentTarget as HTMLSelectElement | null)?.value as UILang | undefined;
		if (!next || next === data.lang) return;
		try {
			localStorage.setItem(LANG_STORAGE_KEY, next);
		} catch {
			// ignore
		}
		void goto(`/${next}/`);
	}

	function clearPdfViewerDocument() {
		if (pdfViewer) {
			(pdfViewer as unknown as { setDocument: (doc: PDFDocumentProxy | null) => void }).setDocument(null);
		}
		if (pdfLinkService) {
			(
				pdfLinkService as unknown as {
					setDocument: (doc: PDFDocumentProxy | null, baseUrl?: string | null) => void;
				}
			).setDocument(null);
		}
	}

	function setPdfPreview(bytes: Uint8Array<ArrayBuffer>) {
		pdfBytes = bytes;
		if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		const blob = new Blob([bytes], { type: 'application/pdf' });
		pdfUrl = URL.createObjectURL(blob);
	}

	function fitWidth() {
		if (!pdfViewer) return;
		pdfViewer.currentScaleValue = 'page-width';
	}

	function zoomIn() {
		if (!pdfViewer) return;
		pdfViewer.currentScale = Math.min(pdfViewer.currentScale * 1.2, 4);
	}

	function zoomOut() {
		if (!pdfViewer) return;
		pdfViewer.currentScale = Math.max(pdfViewer.currentScale / 1.2, 0.25);
	}

	function prevPage() {
		if (pdfPage > 1) pdfPage -= 1;
	}

	function nextPage() {
		if (pdfPages && pdfPage < pdfPages) pdfPage += 1;
	}

	async function compile(md: string, nextStyle: typeof style, lang: UILang) {
		if (!client) return;
		hasEverCompiled = true;

		const seq = ++compileSeq;
		status = 'compiling';
		errorMessage = null;
		diagnostics = [];

		try {
			const mainTypst = markdownToTypst(md, { style: nextStyle, lang });
			if (dev) lastTypst = mainTypst;
			const { pdf, diagnostics: diag } = await client.compilePdf(mainTypst);
			if (seq !== compileSeq) return;
			if (dev) diagnostics = diag;
			setPdfPreview(pdf);
			status = 'done';
		} catch (error) {
			if (seq !== compileSeq) return;
			status = 'error';
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}

	function downloadPdf() {
		if (!pdfUrl) return;
		const a = document.createElement('a');
		a.href = pdfUrl;
		a.download = 'mdxport.pdf';
		a.click();
	}

	function printPdf() {
		if (!pdfUrl) return;

		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.width = '0';
		iframe.style.height = '0';
		iframe.style.border = '0';
		iframe.src = pdfUrl;
		iframe.onload = () => {
			try {
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
			} finally {
				window.setTimeout(() => {
					iframe.remove();
				}, 800);
			}
		};
		document.body.appendChild(iframe);
	}
</script>

<main>
	<header class="topbar">
		<div class="topbar-title">
			<h1>MDXport</h1>
			<p>{t('subtitle')}</p>
		</div>
		<div class="topbar-controls">
				<label class="select">
					{t('language')}
					<select value={data.lang} onchange={onLangChange} disabled={status === 'compiling'}>
						<option value="zh">中文</option>
						<option value="en">English</option>
					</select>
				</label>
		</div>
	</header>

	<div class="split">
		<section class="panel editor">
			<div class="panel-header">
				<h2>{t('markdown')}</h2>
			</div>

			<textarea
				id="md"
				bind:value={markdown}
				spellcheck="false"
				placeholder={t('pastePlaceholder')}
			></textarea>

			{#if status === 'compiling'}
				<div class="hint">{t('compilingHint')}</div>
			{/if}

			{#if errorMessage}
				<pre class="error">{errorMessage}</pre>
			{/if}

			{#if dev && diagnostics.length}
				<details class="diag">
					<summary>{t('diagnostics')} ({diagnostics.length})</summary>
					<pre>{diagnostics.join('\n')}</pre>
				</details>
			{/if}

			{#if dev && lastTypst}
				<details class="typst">
					<summary>{t('generatedTypst')}</summary>
					<pre>{lastTypst}</pre>
				</details>
			{/if}
		</section>

		<section class="panel preview">
			<div class="panel-header">
				<h2>{t('pdfPreview')}</h2>
				<div class="controls">
						<label class="select">
							{t('style')}
							<select bind:value={style} disabled={status === 'compiling'}>
								<option value="modern-tech">{data.lang === 'zh' ? '现代科技风' : 'Modern Tech'}</option>
								<option value="classic-editorial">{data.lang === 'zh' ? '经典阅读风' : 'Classic Editorial'}</option>
							</select>
						</label>
					<label class="toggle">
						<input type="checkbox" bind:checked={autoPreview} />
						{t('autoPreview')}
					</label>
					<button onclick={exportPdf} disabled={!client || status === 'compiling'}>{t('refresh')}</button>
					<button onclick={downloadPdf} disabled={!pdfUrl || status === 'compiling'}>{t('download')}</button>
					<button onclick={printPdf} disabled={!pdfUrl || status === 'compiling'}>{t('print')}</button>
					<a class="open {pdfUrl ? '' : 'disabled'}" href={pdfUrl ?? '#'} target="_blank" rel="noreferrer"
						>{t('open')}</a
					>
				</div>
			</div>

			<div class="pdf-toolbar">
				<div class="pager">
					<button onclick={prevPage} disabled={!pdfDoc || pdfPage <= 1}>{t('prev')}</button>
					<input
						class="page"
						type="number"
						min="1"
						max={pdfPages || 1}
						bind:value={pdfPage}
						disabled={!pdfDoc || pdfLoadStatus === 'loading'}
					/>
					<span class="total">/ {pdfPages || '—'}</span>
					<button onclick={nextPage} disabled={!pdfDoc || (pdfPages ? pdfPage >= pdfPages : true)}>{t('next')}</button>
				</div>
				<div class="zoom">
					<button onclick={zoomOut} disabled={!pdfDoc}>-</button>
					<span class="percent">{Math.round(pdfScale * 100)}%</span>
					<button onclick={zoomIn} disabled={!pdfDoc}>+</button>
					<button onclick={fitWidth} disabled={!pdfDoc}>{t('fitWidth')}</button>
				</div>
			</div>

			<div class="pdf-body">
				<div class="pdfjs-container" bind:this={pdfViewerContainerEl}>
					<div class="pdfViewer" bind:this={pdfViewerEl}></div>
				</div>

				{#if !pdfBytes || pdfLoadStatus === 'loading'}
					<div class="placeholder overlay">
						{#if status === 'compiling' || pdfLoadStatus === 'loading'}
							{t('generating')}
						{:else}
							{t('waiting')}
						{/if}
					</div>
				{/if}
			</div>

			{#if pdfError}
				<pre class="error">{pdfError}</pre>
			{/if}
		</section>
	</div>
</main>

	<style>
			main {
				box-sizing: border-box;
				padding: 2rem clamp(1rem, 3vw, 2rem) 3rem;
				font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			}

	.topbar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.topbar-title h1 {
		margin: 0;
		line-height: 1.1;
	}

	.topbar-title p {
		margin: 0.5rem 0 0;
		opacity: 0.7;
	}

	.topbar-controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.panel {
		min-width: 0;
		margin-top: 1.5rem;
		display: grid;
		gap: 0.75rem;
	}

	.split {
		--pane-height: min(75vh, 820px);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

		@media (max-width: 900px) {
			.split {
				grid-template-columns: 1fr;
			}
		}

	.panel {
		padding: 1rem;
		border-radius: 12px;
		border: 1px solid rgba(0, 0, 0, 0.12);
	}

	.panel-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.panel-header h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		opacity: 0.85;
	}

	.select {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		opacity: 0.85;
	}

	.select select {
		padding: 0.35rem 0.5rem;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		background: white;
	}

	textarea {
		box-sizing: border-box;
		width: 100%;
		height: var(--pane-height);
		font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		padding: 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		resize: none;
	}

	button {
		padding: 0.55rem 0.9rem;
		border: 0;
		border-radius: 10px;
		background: #111827;
		color: white;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.open {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 0.9rem;
		border: 0;
		border-radius: 10px;
		background: #111827;
		color: white;
		text-decoration: none;
		cursor: pointer;
	}

	.open.disabled {
		pointer-events: none;
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pdf-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.pager,
	.zoom {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page {
		width: 4.5rem;
		padding: 0.35rem 0.5rem;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.15);
	}

	.total,
	.percent {
		opacity: 0.75;
		font-size: 0.9rem;
	}

	.pdf-body {
		position: relative;
		height: var(--pane-height);
		overflow: hidden;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.02);
		padding: 0.75rem;
		box-sizing: border-box;
	}

	.pdfjs-container {
		position: absolute;
		inset: 0;
		overflow: auto;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px dashed rgba(0, 0, 0, 0.2);
		border-radius: 10px;
		color: rgba(0, 0, 0, 0.55);
		background: rgba(0, 0, 0, 0.02);
		text-align: center;
		padding: 1rem;
	}

	.placeholder.overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
	}

	.hint {
		opacity: 0.7;
		font-size: 0.9rem;
	}

	.error {
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.25);
		padding: 0.75rem;
		border-radius: 10px;
		white-space: pre-wrap;
	}

	.diag pre {
		margin: 0.75rem 0 0;
		white-space: pre-wrap;
	}

	.typst pre {
		margin: 0.75rem 0 0;
		white-space: pre;
		overflow: auto;
		max-height: 40vh;
	}
</style>

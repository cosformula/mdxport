<script lang="ts">
	import { browser } from '$app/environment';
	import type { UILang } from '$lib/i18n/lang';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: { lang: UILang }; children: Snippet } = $props();

	const META: Record<UILang, { title: string; description: string; ogLocale: string }> = {
		zh: {
			title: 'MDXport · 轻松导出你的 Markdown',
			description: '在浏览器中把 Markdown 一键转换为排版精美的 PDF（Typst + PDF 预览）。',
			ogLocale: 'zh_CN'
		},
		en: {
			title: 'MDXport · Export Markdown to PDF',
			description: 'Convert Markdown to a beautifully typeset PDF in the browser (Typst + live preview).',
			ogLocale: 'en_US'
		}
	};

	const current = () => META[data.lang];

	$effect(() => {
		if (!browser) return;
		document.documentElement.lang = data.lang;
	});
</script>

<svelte:head>
	<title>{current().title}</title>
	<meta name="description" content={current().description} />

	<link rel="canonical" href={`/${data.lang}/`} />
	<link rel="alternate" hreflang="en" href="/en/" />
	<link rel="alternate" hreflang="zh-Hans" href="/zh/" />
	<link rel="alternate" hreflang="x-default" href="/zh/" />

	<meta property="og:title" content={current().title} />
	<meta property="og:description" content={current().description} />
	<meta property="og:locale" content={current().ogLocale} />
</svelte:head>

{@render children()}

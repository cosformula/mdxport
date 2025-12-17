<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type UILang = 'zh' | 'en';
	const LANG_STORAGE_KEY = 'mdxport_lang';
	const DEFAULT_LANG: UILang = 'en';

	function detectPreferredLang(): UILang {
		try {
			const saved = localStorage.getItem(LANG_STORAGE_KEY);
			if (saved === 'zh' || saved === 'en') return saved;
		} catch {
			// ignore
		}

		const nav = (navigator.language || '').toLowerCase();
		return nav.startsWith('zh') ? 'zh' : 'en';
	}

	const shouldRedirect = browser && detectPreferredLang() !== DEFAULT_LANG;

	onMount(() => {
		if (!browser) return;
		const target = detectPreferredLang();
		if (target === DEFAULT_LANG) {
			void goto(`/en/`, { replaceState: true, keepFocus: true });
			return;
		}
		void goto(`/zh/`, { replaceState: true, keepFocus: true });
	});
</script>

<svelte:head>
	<title>MDXport · Export Markdown to PDF</title>
	<meta name="description" content="Convert Markdown to a beautifully typeset PDF in the browser (Typst + live preview)." />
	<link rel="canonical" href="/en/" />
	<link rel="alternate" hreflang="en" href="/en/" />
	<link rel="alternate" hreflang="zh-Hans" href="/zh/" />
	<link rel="alternate" hreflang="x-default" href="/en/" />
</svelte:head>

{#if shouldRedirect}
	<main class="landing">
		<h1>MDXport</h1>
		<p>正在跳转到中文… / Redirecting to Chinese…</p>
		<div class="actions">
			<span class="hint">未自动跳转？ / Not redirected?</span>
			<a class="btn" href="/zh/">中文</a>
			<a class="btn" href="/en/">English</a>
		</div>
	</main>
{:else}
	<main class="landing">
		<h1>MDXport</h1>
		<p>Redirecting…</p>
		<div class="actions">
			<span class="hint">Not redirected?</span>
			<a class="btn" href="/en/">Open editor</a>
			<a class="btn" href="/zh/">打开中文</a>
		</div>
	</main>
{/if}

<style>
	.landing {
		min-height: 70vh;
		display: grid;
		place-content: center;
		gap: 0.75rem;
		text-align: center;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		padding: 2rem;
	}

	h1 {
		margin: 0;
		line-height: 1.1;
	}

	p {
		margin: 0;
		opacity: 0.75;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}

	.hint {
		opacity: 0.7;
		font-size: 0.95rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 0.9rem;
		border-radius: 10px;
		background: #111827;
		color: white;
		text-decoration: none;
	}
</style>

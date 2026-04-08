import type { TypstRenderer } from '@myriaddreamin/typst.ts';

let rendererPromise: Promise<TypstRenderer> | null = null;

export function getTypstRenderer(): Promise<TypstRenderer> {
	if (rendererPromise) return rendererPromise;

	rendererPromise = (async () => {
		const { createTypstRenderer } = await import('@myriaddreamin/typst.ts');
		const rendererWasmUrl = (
			await import('@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url')
		).default;
		const renderer = createTypstRenderer();
		await renderer.init({
			getModule: () => rendererWasmUrl
		});
		return renderer;
	})();

	// If init fails, allow retry
	rendererPromise.catch(() => {
		rendererPromise = null;
	});

	return rendererPromise;
}

export function resetTypstRenderer(): void {
	rendererPromise = null;
}

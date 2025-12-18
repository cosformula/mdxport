/// <reference lib="webworker" />

import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import typstCompilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import modernTechTyp from '../typst/styles/modern-tech.typ?raw';
import classicEditorialTyp from '../typst/styles/classic-editorial.typ?raw';

type CompileRequest = {
	type: 'compile';
	id: string;
	mainTypst: string;
	images?: Record<string, Uint8Array<ArrayBuffer>>;
};

type CompileResponse =
	| {
			type: 'compile-result';
			id: string;
			ok: true;
			pdf: ArrayBuffer;
			diagnostics: string[];
	  }
	| {
			type: 'compile-result';
			id: string;
			ok: false;
			error: string;
			diagnostics: string[];
	  };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let compilerPromise: Promise<TypstCompiler> | null = null;
let compileQueue: Promise<void> = Promise.resolve();

const CORE_FONTS: string[] = [
	// IBM Plex Sans (Modern UI) - Part of typst-dev-assets
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Regular.ttf',
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Bold.ttf',

	// Math font (Critical for mathematical formulas) - Part of typst-assets
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NewCMMath-Regular.otf',
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NewCMMath-Book.otf'
];

const CJK_FONTS: string[] = [
	// Sans CJK (Simplified Chinese) - Noto Sans CJK SC (~15MB)
	'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
	'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf',

	// Serif CJK (Simplified Chinese) - Noto Serif SC from Google Fonts (~14MB)
	'https://fonts.gstatic.com/s/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7SCqyWv.ttf'
];

const EMOJI_FONTS: string[] = [
	// Emoji font (Noto Color Emoji) (~9MB)
	'https://fonts.gstatic.com/s/notocoloremoji/v37/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFab4.ttf'
];

let cjkLoaded = false;
let emojiLoaded = false;

async function upgradeCompiler(needCjk: boolean, needEmoji: boolean) {
	// Check if we need to upgrade
	const shouldUpgradeCjk = needCjk && !cjkLoaded;
	const shouldUpgradeEmoji = needEmoji && !emojiLoaded;

	if (!shouldUpgradeCjk && !shouldUpgradeEmoji) return;

	if (shouldUpgradeCjk) cjkLoaded = true;
	if (shouldUpgradeEmoji) emojiLoaded = true;

	console.log(`MDXport - Upgrading compiler (CJK: ${cjkLoaded}, Emoji: ${emojiLoaded})...`);
	
	const fontsToLoad = [...CORE_FONTS];
	if (cjkLoaded) fontsToLoad.push(...CJK_FONTS);
	if (emojiLoaded) fontsToLoad.push(...EMOJI_FONTS);

	const newCompiler = createTypstCompiler();
	await newCompiler.init({
		getModule: () => typstCompilerWasmUrl,
		beforeBuild: [
			loadFonts(fontsToLoad, {
				assets: ['text']
			})
		]
	});
	newCompiler.addSource('/styles/modern-tech.typ', modernTechTyp);
	newCompiler.addSource('/styles/classic-editorial.typ', classicEditorialTyp);
	
	// Swap the compiler promise
	compilerPromise = Promise.resolve(newCompiler);
	console.log('MDXport - Compiler upgraded successfully.');
}

function getCompiler(): Promise<TypstCompiler> {
	if (compilerPromise) return compilerPromise;

	compilerPromise = (async () => {
		const compiler = createTypstCompiler();
		await compiler.init({
			getModule: () => typstCompilerWasmUrl,
			beforeBuild: [
				loadFonts(CORE_FONTS, {
					assets: ['text'] // Load standard Typst fonts (~18MB), includes math and common Latin fonts
				})
			]
		});
		compiler.addSource('/styles/modern-tech.typ', modernTechTyp);
		compiler.addSource('/styles/classic-editorial.typ', classicEditorialTyp);
		return compiler;
	})();

	return compilerPromise;
}

async function compilePdf(
	mainTypst: string,
	images: Record<string, Uint8Array<ArrayBuffer>> = {}
): Promise<{ pdf: Uint8Array; diagnostics: string[] }> {
	// Check for special characters
	const hasCjk = /[\u4e00-\u9fa5]/.test(mainTypst);
	// Broad emoji detection regex
	const hasEmoji = /[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(mainTypst);
	
	if (hasCjk || hasEmoji) {
		await upgradeCompiler(hasCjk, hasEmoji);
	}

	const compiler = await getCompiler();
	compiler.addSource('/main.typ', mainTypst);

	for (const [path, data] of Object.entries(images)) {
		compiler.mapShadow('/' + path, data);
	}

	const result = await compiler.compile({
		mainFilePath: '/main.typ',
		format: 1,
		diagnostics: 'unix'
	});

	const diagnostics = (result.diagnostics ?? []).map(String);
	if (!result.result) {
		throw new Error(diagnostics.join('\n') || 'Typst 编译失败（无诊断信息）');
	}

	return { pdf: result.result, diagnostics };
}

ctx.onmessage = (event: MessageEvent<CompileRequest>) => {
	const message = event.data;
	if (!message || message.type !== 'compile') return;

	compileQueue = compileQueue.then(async () => {
		try {
			const { pdf, diagnostics } = await compilePdf(message.mainTypst, message.images);
			const pdfCopy = new Uint8Array(pdf.length);
			pdfCopy.set(pdf);
			ctx.postMessage(
				{
					type: 'compile-result',
					id: message.id,
					ok: true,
					pdf: pdfCopy.buffer,
					diagnostics
				} satisfies CompileResponse,
				[pdfCopy.buffer]
			);
		} catch (error) {
			ctx.postMessage({
				type: 'compile-result',
				id: message.id,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
				diagnostics: []
			} satisfies CompileResponse);
		}
	});
};

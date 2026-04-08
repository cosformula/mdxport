/// <reference lib="webworker" />

import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import typstCompilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import modernTechTyp from '../typst/styles/modern-tech.typ?raw';
import classicEditorialTyp from '../typst/styles/classic-editorial.typ?raw';
import redbookKnowledgeTyp from '../typst/styles/redbook-knowledge.typ?raw';
import redbookDarkTyp from '../typst/styles/redbook-dark.typ?raw';
import redbookMinimalistTyp from '../typst/styles/redbook-minimalist.typ?raw';
import redbookForestTyp from '../typst/styles/redbook-forest.typ?raw';
import redbookBlueprintTyp from '../typst/styles/redbook-blueprint.typ?raw';
import redbookCleanTyp from '../typst/styles/redbook-clean.typ?raw';
import redbookModernTyp from '../typst/styles/redbook-modern.typ?raw';
import redbookTypographyTyp from '../typst/styles/redbook-typography.typ?raw';
import slidesModernTyp from '../typst/styles/slides-modern.typ?raw';
import slidesDarkTyp from '../typst/styles/slides-dark.typ?raw';
import slidesMinimalTyp from '../typst/styles/slides-minimal.typ?raw';

type CompileRequest = {
	type: 'compile';
	id: string;
	mainTypst: string;
	images?: Record<string, Uint8Array<ArrayBuffer>>;
	format?: 'pdf' | 'vector';
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
			ok: true;
			vector: ArrayBuffer;
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
	newCompiler.addSource('/styles/redbook-knowledge.typ', redbookKnowledgeTyp);
	newCompiler.addSource('/styles/redbook-dark.typ', redbookDarkTyp);
	newCompiler.addSource('/styles/redbook-minimalist.typ', redbookMinimalistTyp);
	newCompiler.addSource('/styles/redbook-modern.typ', redbookModernTyp);
	newCompiler.addSource('/styles/redbook-forest.typ', redbookForestTyp);
	newCompiler.addSource('/styles/redbook-blueprint.typ', redbookBlueprintTyp);
	newCompiler.addSource('/styles/redbook-clean.typ', redbookCleanTyp);
	newCompiler.addSource('/styles/redbook-typography.typ', redbookTypographyTyp);
	newCompiler.addSource('/styles/slides-modern.typ', slidesModernTyp);
	newCompiler.addSource('/styles/slides-dark.typ', slidesDarkTyp);
	newCompiler.addSource('/styles/slides-minimal.typ', slidesMinimalTyp);

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
		compiler.addSource('/styles/redbook-knowledge.typ', redbookKnowledgeTyp);
		compiler.addSource('/styles/redbook-dark.typ', redbookDarkTyp);
		compiler.addSource('/styles/redbook-minimalist.typ', redbookMinimalistTyp);
		compiler.addSource('/styles/redbook-modern.typ', redbookModernTyp);
		compiler.addSource('/styles/redbook-forest.typ', redbookForestTyp);
		compiler.addSource('/styles/redbook-blueprint.typ', redbookBlueprintTyp);
		compiler.addSource('/styles/redbook-clean.typ', redbookCleanTyp);
		compiler.addSource('/styles/redbook-typography.typ', redbookTypographyTyp);
		compiler.addSource('/styles/slides-modern.typ', slidesModernTyp);
		compiler.addSource('/styles/slides-dark.typ', slidesDarkTyp);
		compiler.addSource('/styles/slides-minimal.typ', slidesMinimalTyp);
		return compiler;
	})();

	return compilerPromise;
}

async function compileTypst(
	mainTypst: string,
	images: Record<string, Uint8Array<ArrayBuffer>> = {},
	format: 'pdf' | 'vector' = 'pdf'
): Promise<{ result: Uint8Array; diagnostics: string[] }> {
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

	const compileResult = await compiler.compile({
		mainFilePath: '/main.typ',
		format: format === 'pdf' ? 1 : 0,
		diagnostics: 'unix'
	});

	const diagnostics = (compileResult.diagnostics ?? []).map(String);
	if (!compileResult.result) {
		throw new Error(diagnostics.join('\n') || 'Typst 编译失败（无诊断信息）');
	}

	return { result: compileResult.result, diagnostics };
}

ctx.onmessage = (event: MessageEvent<CompileRequest>) => {
	const message = event.data;
	if (!message || message.type !== 'compile') return;

	const fmt = message.format || 'pdf';
	compileQueue = compileQueue.then(async () => {
		try {
			const { result, diagnostics } = await compileTypst(message.mainTypst, message.images, fmt);
			const copy = new Uint8Array(result.length);
			copy.set(result);
			const response: CompileResponse = fmt === 'pdf'
				? { type: 'compile-result', id: message.id, ok: true, pdf: copy.buffer, diagnostics }
				: { type: 'compile-result', id: message.id, ok: true, vector: copy.buffer, diagnostics };
			ctx.postMessage(response, [copy.buffer]);
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

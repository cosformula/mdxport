/// <reference lib="webworker" />

import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import typstCompilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import modernTechTyp from '../typst/styles/modern-tech.typ?raw';
import classicEditorialTyp from '../typst/styles/classic-editorial.typ?raw';

type CompileRequest = {
	type: 'compile';
	id: string;
	mainTypst: string;
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

const EXTRA_FONTS: string[] = [
	// Sans (Latin) for modern headings/body
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Regular.ttf',
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Medium.ttf',
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Bold.ttf',

	// Bold for CJK serif (better emphasis in classic style)
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/NotoSerifCJKsc-Bold.otf',

	// Sans CJK (Simplified Chinese)
	'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
	'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf'
];

function getCompiler(): Promise<TypstCompiler> {
	if (compilerPromise) return compilerPromise;

	compilerPromise = (async () => {
		const compiler = createTypstCompiler();
		await compiler.init({
			getModule: () => typstCompilerWasmUrl,
			beforeBuild: [
				loadFonts(EXTRA_FONTS, {
					assets: ['text', 'cjk']
				})
			]
		});
		compiler.addSource('/styles/modern-tech.typ', modernTechTyp);
		compiler.addSource('/styles/classic-editorial.typ', classicEditorialTyp);
		return compiler;
	})();

	return compilerPromise;
}

async function compilePdf(mainTypst: string): Promise<{ pdf: Uint8Array; diagnostics: string[] }> {
	const compiler = await getCompiler();
	compiler.addSource('/main.typ', mainTypst);

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
			const { pdf, diagnostics } = await compilePdf(message.mainTypst);
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

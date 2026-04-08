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

type CompileResult = {
	pdf?: Uint8Array<ArrayBuffer>;
	vector?: Uint8Array<ArrayBuffer>;
	diagnostics: string[];
};

type Pending = {
	resolve: (value: CompileResult) => void;
	reject: (reason: unknown) => void;
};

export class TypstWorkerClient {
	#worker: Worker;
	#pending = new Map<string, Pending>();

	constructor() {
		this.#worker = new Worker(new URL('./typst.worker.ts', import.meta.url), { type: 'module' });
		this.#worker.addEventListener('message', (event: MessageEvent<CompileResponse>) => {
			const message = event.data;
			if (!message || message.type !== 'compile-result') return;

			const pending = this.#pending.get(message.id);
			if (!pending) return;
			this.#pending.delete(message.id);

			if (!message.ok) {
				pending.reject(new Error(message.error));
				return;
			}

			const result: CompileResult = { diagnostics: message.diagnostics };
			if ('pdf' in message) result.pdf = new Uint8Array(message.pdf);
			if ('vector' in message) result.vector = new Uint8Array(message.vector);
			pending.resolve(result);
		});
	}

	dispose(): void {
		this.#worker.terminate();
		for (const pending of this.#pending.values()) {
			pending.reject(new Error('Worker terminated'));
		}
		this.#pending.clear();
	}

	compilePdf(
		mainTypst: string,
		images: Record<string, Uint8Array<ArrayBuffer>> = {}
	): Promise<{ pdf: Uint8Array<ArrayBuffer>; diagnostics: string[] }> {
		return this.#compile(mainTypst, images, 'pdf').then((r) => ({
			pdf: r.pdf!,
			diagnostics: r.diagnostics
		}));
	}

	compileVector(
		mainTypst: string,
		images: Record<string, Uint8Array<ArrayBuffer>> = {}
	): Promise<{ vector: Uint8Array<ArrayBuffer>; diagnostics: string[] }> {
		return this.#compile(mainTypst, images, 'vector').then((r) => ({
			vector: r.vector!,
			diagnostics: r.diagnostics
		}));
	}

	#compile(
		mainTypst: string,
		images: Record<string, Uint8Array<ArrayBuffer>>,
		format: 'pdf' | 'vector'
	): Promise<CompileResult> {
		const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
		const request: CompileRequest = { type: 'compile', id, mainTypst, images, format };

		return new Promise((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			this.#worker.postMessage(request);
		});
	}
}

let sharedTypstWorkerClient: TypstWorkerClient | null = null;

export function getSharedTypstWorkerClient(): TypstWorkerClient {
	if (!sharedTypstWorkerClient) {
		sharedTypstWorkerClient = new TypstWorkerClient();
	}

	return sharedTypstWorkerClient;
}

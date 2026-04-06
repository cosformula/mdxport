import { describe, expect, it, vi } from 'vitest';

type MockSavedDocument = {
	id: string;
	name: string;
	mode: 'pdf' | 'redbook' | 'slides';
	content: string;
	assets?: Record<string, { bytes: Uint8Array; mimeType: string }>;
	creationSource?: 'template' | 'blank' | 'import';
	createdAt: number;
	updatedAt: number;
};

function cloneDoc<T>(value: T): T {
	return structuredClone(value);
}

function createDocumentsMock() {
	const docs = new Map<string, MockSavedDocument>();

	return {
		docs,
		module: {
			saveDocument: vi.fn(async (doc: MockSavedDocument) => {
				docs.set(doc.id, cloneDoc(doc));
			}),
			getDocument: vi.fn(async (id: string) => {
				const doc = docs.get(id);
				return doc ? cloneDoc(doc) : null;
			}),
			listDocuments: vi.fn(async () =>
				Array.from(docs.values())
					.map((doc) => cloneDoc(doc))
					.sort((a, b) => b.updatedAt - a.updatedAt),
			),
			deleteDocument: vi.fn(async (id: string) => {
				docs.delete(id);
			}),
		},
	};
}

async function loadStoreWithMock() {
	const documentsMock = createDocumentsMock();

	vi.resetModules();
	vi.doMock('$lib/storage/documents', () => documentsMock.module);

	const storeModule = await import('$lib/stores/documentStore.svelte');

	return {
		documentsMock,
		storeModule,
	};
}

describe('documentStore persistence guards', () => {
	it('does not overwrite a restored template document before transition finishes', async () => {
		const firstLoad = await loadStoreWithMock();
		const original = await firstLoad.storeModule.documentStore.createDocument(
			'pdf',
			'# Template content',
			undefined,
			'template',
		);
		firstLoad.storeModule.documentStore.finishDocumentTransition();

		const docs = new Map(
			Array.from(firstLoad.documentsMock.docs.entries()).map(([id, doc]) => [id, cloneDoc(doc)]),
		);

		vi.resetModules();
		vi.doMock('$lib/storage/documents', () => ({
			saveDocument: vi.fn(async (doc: MockSavedDocument) => {
				docs.set(doc.id, cloneDoc(doc));
			}),
			getDocument: vi.fn(async (id: string) => {
				const doc = docs.get(id);
				return doc ? cloneDoc(doc) : null;
			}),
			listDocuments: vi.fn(async () =>
				Array.from(docs.values())
					.map((doc) => cloneDoc(doc))
					.sort((a, b) => b.updatedAt - a.updatedAt),
			),
			deleteDocument: vi.fn(async (id: string) => {
				docs.delete(id);
			}),
		}));

		const restoredModule = await import('$lib/stores/documentStore.svelte');

		await restoredModule.documentStore.init();

		expect(restoredModule.documentStore.currentDocId).toBe(original.id);
		expect(restoredModule.documentStore.isTransitioningDocument).toBe(true);

		vi.useFakeTimers();
		restoredModule.documentStore.autoSave(original.id, '');
		await vi.advanceTimersByTimeAsync(1000);

		expect(docs.get(original.id)?.content).toBe('# Template content');
	});

	it('allows autosave again after transition finishes', async () => {
		const { documentsMock, storeModule } = await loadStoreWithMock();
		const doc = await storeModule.documentStore.createDocument(
			'slides',
			'# Slide Title',
			undefined,
			'template',
		);

		storeModule.documentStore.finishDocumentTransition();

		vi.useFakeTimers();
		storeModule.documentStore.autoSave(doc.id, '# Updated Slide Title');
		await vi.advanceTimersByTimeAsync(1000);

		expect(documentsMock.docs.get(doc.id)?.content).toBe('# Updated Slide Title');
	});

	it('flushes pending saves before creating another document', async () => {
		const { documentsMock, storeModule } = await loadStoreWithMock();
		const first = await storeModule.documentStore.createDocument(
			'redbook',
			'# First Doc',
			undefined,
			'template',
		);

		storeModule.documentStore.finishDocumentTransition();

		vi.useFakeTimers();
		storeModule.documentStore.autoSave(first.id, '# First Doc Updated');

		const second = await storeModule.documentStore.createDocument(
			'redbook',
			'# Second Doc',
			undefined,
			'template',
		);

		expect(second.content).toBe('# Second Doc');
		expect(documentsMock.docs.get(first.id)?.content).toBe('# First Doc Updated');
	});
});

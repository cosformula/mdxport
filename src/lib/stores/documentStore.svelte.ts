import {
	saveDocument,
	getDocument,
	listDocuments,
	deleteDocument as deleteDocFromDB,
	type SavedDocument
} from '$lib/storage/documents';

export type SaveStatus = 'saved' | 'saving';
type InitOptions = {
	restoreCurrent?: boolean;
};

let currentDocId = $state<string | null>(null);
let saveStatus = $state<SaveStatus>('saved');
let recentDocuments = $state<SavedDocument[]>([]);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let hasLoadedSessionCurrent = false;

export function deriveNameFromContent(content: string): string {
	const match = content.match(/^#\s+(.+)$/m);
	if (match) return match[1].trim().slice(0, 50);
	const firstLine = content.trim().split('\n')[0]?.trim();
	if (firstLine) return firstLine.slice(0, 50);
	return 'Untitled';
}

function setCurrentDocument(id: string | null, persistSession: boolean) {
	currentDocId = id;
	if (persistSession) {
		if (id) {
			sessionStorage.setItem('mdxport-current-doc-id', id);
		} else {
			sessionStorage.removeItem('mdxport-current-doc-id');
		}
	}
}

function upsertRecentDocument(doc: SavedDocument) {
	recentDocuments = [doc, ...recentDocuments.filter((existing) => existing.id !== doc.id)];
}

export const documentStore = {
	get currentDocId() {
		return currentDocId;
	},
	get saveStatus() {
		return saveStatus;
	},
	get recentDocuments() {
		return recentDocuments;
	},

	async init(options: InitOptions = {}) {
		const { restoreCurrent = true } = options;
		if (restoreCurrent && !hasLoadedSessionCurrent && currentDocId === null) {
			hasLoadedSessionCurrent = true;
			const stored = sessionStorage.getItem('mdxport-current-doc-id');
			if (stored) currentDocId = stored;
		}
		await this.refreshList();
	},

	async refreshList() {
		recentDocuments = await listDocuments();
	},

	async loadDocument(id: string): Promise<string | null> {
		const doc = await getDocument(id);
		if (!doc) return null;
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		setCurrentDocument(id, true);
		return doc.content;
	},

	async createDocument(
		mode: 'pdf' | 'redbook' | 'slides',
		content: string = ''
	): Promise<{ id: string; content: string }> {
		const now = Date.now();
		const doc: SavedDocument = {
			id: crypto.randomUUID(),
			name: deriveNameFromContent(content) || 'Untitled',
			mode,
			content,
			createdAt: now,
			updatedAt: now
		};
		await saveDocument(doc);
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		setCurrentDocument(doc.id, true);
		upsertRecentDocument(doc);
		return { id: doc.id, content: doc.content };
	},

	setCurrentDocument(id: string | null, persistSession: boolean = true) {
		setCurrentDocument(id, persistSession);
	},

	async saveNow(id: string, content: string): Promise<void> {
		if (!id) return;
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		const existing = await getDocument(id);
		if (!existing) {
			saveStatus = 'saved';
			return;
		}
		existing.content = content;
		existing.name = deriveNameFromContent(content);
		existing.updatedAt = Date.now();
		await saveDocument(existing);
		saveStatus = 'saved';
		upsertRecentDocument({ ...existing });
	},

	autoSave(id: string, content: string) {
		if (!id) return;
		saveStatus = 'saving';
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			await this.saveNow(id, content);
		}, 1000);
	},

	async deleteDocument(id: string) {
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		await deleteDocFromDB(id);
		if (currentDocId === id) {
			setCurrentDocument(null, true);
		}
		recentDocuments = recentDocuments.filter((doc) => doc.id !== id);
	}
};

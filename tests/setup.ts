import { afterEach, beforeEach, vi } from 'vitest';

class MemoryStorage implements Storage {
	#store = new Map<string, string>();

	get length() {
		return this.#store.size;
	}

	clear() {
		this.#store.clear();
	}

	getItem(key: string) {
		return this.#store.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.#store.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.#store.delete(key);
	}

	setItem(key: string, value: string) {
		this.#store.set(key, String(value));
	}
}

Object.defineProperty(globalThis, 'localStorage', {
	value: new MemoryStorage(),
	configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
	value: new MemoryStorage(),
	configurable: true,
});

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
	vi.resetModules();
	localStorage.clear();
	sessionStorage.clear();
});

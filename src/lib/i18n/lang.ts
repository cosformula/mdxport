export const SUPPORTED_LANGS = ['zh', 'en'] as const;
export type UILang = (typeof SUPPORTED_LANGS)[number];

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

export function isUILang(value: string): value is UILang {
	return SUPPORTED_LANG_SET.has(value);
}


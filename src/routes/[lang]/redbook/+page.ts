import { SUPPORTED_LANGS } from '$lib/i18n/lang';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => SUPPORTED_LANGS.map((lang) => ({ lang }));

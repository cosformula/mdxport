import { error } from '@sveltejs/kit';
import { isUILang, type UILang } from '$lib/i18n/lang';

export const prerender = true;
export const trailingSlash = 'always';

export function load({ params }: { params: { lang: string } }): { lang: UILang } {
	const lang = params.lang;
	if (!isUILang(lang)) throw error(404, 'Not found');
	return { lang };
}

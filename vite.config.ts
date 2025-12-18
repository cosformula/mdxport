import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'MDXport',
				short_name: 'MDXport',
				description: 'Markdown to PDF Professional Export Tool',
				theme_color: '#ffffff',
				icons: [
					{
						src: 'favicon-16x16.png',
						sizes: '16x16',
						type: 'image/png'
					},
					{
						src: 'favicon-32x32.png',
						sizes: '32x32',
						type: 'image/png'
					},
					{
						src: 'logo.png',
						sizes: '183x100',
						type: 'image/png'
					},
					{
						src: 'apple-touch-icon.png',
						sizes: '180x180',
						type: 'image/png'
					},
					{
						src: 'square.png',
						sizes: '240x240',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	],
	worker: {
		format: 'es'
	}
});

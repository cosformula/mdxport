import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'node',
			pool: 'threads',
			setupFiles: ['./tests/setup.ts'],
			include: ['tests/**/*.test.ts']
		}
	})
);

import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import { config } from 'dotenv';

config();
installGlobals();

export default defineConfig({
	mode: process.env.NODE_ENV,
	plugins: [
		tsconfigPaths(),
		remix({
			ignoredRouteFiles: ['**/*.css'],
		}),
	],
	resolve: {
		alias: {
			'~': '/app',
		},
	},
});

import { chunkSplitPlugin } from 'vite-plugin-chunk-split';
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import devServer from '@hono/vite-dev-server';
import { defineConfig } from 'vite';
import { config } from 'dotenv';
import esbuild from 'esbuild';

config();
installGlobals();

export default defineConfig({
	mode: process.env.NODE_ENV,
	server: {
		port: 3000,
		warmup: {
			clientFiles: [
				'./app/entry.client.tsx',
				'./app/routes/**/*',
				'./app/root.tsx',
			],
		},
	},
	define: {
		'process.env': process.env,
	},
	plugins: [
		chunkSplitPlugin(),
		tsconfigPaths(),
		devServer({
			entry: 'server/index.ts',
			injectClientScript: false,
			exclude: [/^\/(app)\/.+/, /^\/@.+$/, /^\/node_modules\/.*/],
		}),
		remix({
			ignoredRouteFiles: ['**/*.css'],
			serverBuildFile: 'remix.js',
			buildEnd: async () => {
				await esbuild.build({
					alias: { '~': './app' },
					outfile: 'build/server/index.js',
					entryPoints: ['server/index.ts'],
					external: ['./build/server/*'],
					packages: 'external',
					logLevel: 'info',
					platform: 'node',
					format: 'esm',
					bundle: true,
				}).catch((error: unknown) => {
					console.error(error);
					process.exit(1);
				});
			},
		}),
	],
	resolve: {
		alias: {
			'~': '/app',
		},
	},
	build: {
		chunkSizeWarningLimit: 1700,
	},
});

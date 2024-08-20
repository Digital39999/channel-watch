import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRequestHandler } from '@remix-run/express';
import LoggerModule from '~/utils/logger.server';
import { ServerBuild } from '@remix-run/node';
import { time } from '~/other/utils';
import { config } from 'dotenv';
import express from 'express';

config({ path: '../.env' });

const isProd = process.env.NODE_ENV === 'production';
const app = express().disable('x-powered-by');

if (isProd) app.use('/assets', cache(time(365, 'd', 's')), express.static('./build/client/assets'));

const viteDevServer = isProd
	? undefined
	: await import('vite').then((vite) =>
		vite.createServer({
			server: { middlewareMode: true },
			appType: 'custom',
		}),
	);

const remixHandler = createRequestHandler({
	build: viteDevServer
		? await viteDevServer.ssrLoadModule('virtual:remix/server-build') as unknown as ServerBuild
		// @ts-ignore
		// eslint-disable-next-line
		: await import('../build/server/remix.js') as unknown as ServerBuild,
});

if (viteDevServer) app.use(viteDevServer.middlewares);
else app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));

app.use('/api/discord', createProxyMiddleware({
	target: 'https://discord.com/api',
	changeOrigin: true,
	secure: true,
	pathRewrite: { '^/api/discord': '' },
	headers: {
		'User-Agent': 'DiscordBot (https://hono.app, 1.0)',
	},
}));

app.all('*', remixHandler);

if (isProd) {
	const port = Number(process.env.PORT) || 3000;

	app.listen(port, () => {
		console.clear();
		LoggerModule('Express', `🚀 Server started on port ${port}!\n`, 'green');
	});
}

export default app;

function cache(seconds: number) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (!req.path.match(/\.[a-zA-Z0-9]+$/) || req.path.endsWith('.data')) return next();
		res.setHeader('Cache-Control', `public, max-age=${seconds}`);
		next();
	};
}


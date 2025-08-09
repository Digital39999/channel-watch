import type { ServerBuild } from '@remix-run/server-runtime';
import { serveStatic } from '@hono/node-server/serve-static';
import { SecurityUtils } from '~/utils/functions.server.js';
import { HttpBindings, serve } from '@hono/node-server';
import { parseZodError, time } from '~/other/utils';
import LoggerModule from '~/utils/logger.server';
import { createMiddleware } from 'hono/factory';
import { remix } from 'remix-hono/handler';
import { logger } from 'hono/logger';
import { config } from 'dotenv';
import { Hono } from 'hono';
import { z } from 'zod';

config({ path: '../.env' });

const isProd = process.env.NODE_ENV === 'production';
const app = new Hono<{ Bindings: HttpBindings; }>();

app.use('*', cacheMiddleware(time(30, 'd', 's')), serveStatic({ root: isProd ? './build/client' : './public' }));
app.use('*', logger((m, ...rest) => LoggerModule('Server', m, 'blue', ...rest)));

/* -------------------- Proxy -------------------- */

app.get('/api/discord/*', async (c) => {
	const targetBase = 'https://discord.com/api';
	const targetPath = c.req.path.replace('/api/discord', '');
	const target = targetBase + targetPath;

	const isBot = c.req.header('Authorization')?.startsWith('Bot');

	const headers = new Headers(c.req.raw.headers);
	headers.set('User-Agent', isBot ? 'DiscordBot (https://example.app, 1.0)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
	headers.set('Origin', 'https://discord.com');
	headers.set('Host', 'discord.com');

	headers.delete('Cookie');
	headers.delete('Referer');

	headers.set('X-Forwarded-For', c?.env?.incoming?.socket.remoteAddress || c.req.header('X-Forwarded-For') || '');
	headers.set('X-Real-IP', c?.env?.incoming?.socket.remoteAddress || c.req.header('X-Forwarded-For') || '');

	const res = await fetch(target, {
		method: c.req.method,
		headers,
	}).catch((e) => e);

	if (res instanceof Error) return new Response(JSON.stringify({ error: 'Internal Server Error.', status: 500 }), { status: 500 });

	const body = await res.json().catch(() => res.text());
	return new Response(JSON.stringify(body), { status: res.status, statusText: res.statusText });
});

app.post('/api/crypto', async (c) => {
	const data = await c.req.json();
	if (!data) return new Response(JSON.stringify({ error: 'Bad Request.', status: 400 }), { status: 400 });

	const isValid = z.object({ type: z.enum(['encrypt', 'decrypt']), data: z.string() }).safeParse(data);
	if (!isValid.success) return new Response(JSON.stringify({ error: parseZodError(isValid.error), status: 400 }), { status: 400 });

	const { type, data: text } = isValid.data;

	try {
		switch (type) {
			case 'encrypt': return new Response(JSON.stringify({ data: SecurityUtils.encrypt(text), status: 200 }), { status: 200 });
			case 'decrypt': return new Response(JSON.stringify({ data: SecurityUtils.decrypt(text), status: 200 }), { status: 200 });
			default: return new Response(JSON.stringify({ error: 'Bad Request.', status: 400 }), { status: 400 });
		}
	} catch (e) {
		return new Response(JSON.stringify({ error: 'Internal Server Error.', status: 500 }), { status: 500 });
	}
});

/* -------------------- Remix -------------------- */

const viteDevServer = isProd
	? undefined
	: await import('vite').then((vite) =>
		vite.createServer({
			server: { middlewareMode: true },
			appType: 'custom',
		}),
	);

app.use(async (c, next) => {
	const build = viteDevServer
		? await viteDevServer.ssrLoadModule('virtual:remix/server-build') as unknown as ServerBuild
		// @ts-ignore
		// eslint-disable-next-line
		: await import('../build/server/remix.js') as unknown as ServerBuild;

	return remix({
		build,
		mode: isProd ? 'production' : 'development',
	})(c, next);
});

/* -------------------- App -------------------- */

if (isProd) {
	serve({ ...app, port: 3000 }, async (info) => {
		console.clear();
		LoggerModule('Hono', `🚀 Server started on port ${info.port}!\n`, 'green');
	});
}

export default app;

export function cacheMiddleware(seconds: number) {
	return createMiddleware(async (c, next) => {
		if (
			!c.req.path.match(/\.[a-zA-Z0-9]+$/) ||
			c.req.path.endsWith('.data')
		) return next();

		await next();

		if (!c.res.ok) return;
		c.res.headers.set('cache-control', `public, max-age=${seconds}`);
	});
}

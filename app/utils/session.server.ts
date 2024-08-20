import { createCookie } from '@remix-run/node';
import { z } from 'zod';

export const recentData = createCookie('recent', {
	httpOnly: true,
	sameSite: 'lax',
	path: '/',
});

export const RecentSchema = z.object({
	currentIndex: z.number().optional(),
	all: z.array(z.object({
		lastUsed: z.number(),
		channels: z.array(z.object({
			id: z.string(),
			name: z.string().nullable(),
			guildId: z.string(),
		})).optional(),
		token: z.string().optional(),
		isBot: z.boolean().optional(),
		info: z.object({
			id: z.string(),
			name: z.string(),
			avatar: z.string().nullable(),
		}).optional(),
	})).optional(),
});

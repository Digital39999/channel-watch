import { createCookie } from '@remix-run/node';

export const recentData = createCookie('recent', {
	httpOnly: false,
	sameSite: 'lax',
	path: '/',
});

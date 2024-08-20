import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { recentData, RecentSchema } from '~/utils/session.server';
import { parseZodError } from '~/other/utils';
import { Recents } from '~/other/types';

export function json<T>(data: T, headers?: HeadersInit) {
	return new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			...(headers || {}),
		},
	});
}

export async function loader({ request }: LoaderFunctionArgs) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) return json({ status: 404, error: 'No cookie header found.' });

	const recentsData = (await recentData.parse(cookieHeader) || {}) as Recents;

	return json({
		status: 200,
		data: recentsData,
	});
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') return json({ status: 400, error: 'Bad Request.' });

	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) return json({ status: 404, error: 'No cookie header found.' });

	const newCookie = await recentData.parse(cookieHeader);

	const isValid = RecentSchema.safeParse(newCookie);
	if (!isValid.success) return { status: 400, error: parseZodError(isValid.error) };

	return json({
		status: 200,
		data: newCookie,
	}, {
		'Set-Cookie': await recentData.serialize(newCookie),
	});
}

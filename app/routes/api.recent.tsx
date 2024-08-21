import { ActionFunctionArgs, LoaderFunctionArgs, json as jsonResponse } from '@remix-run/node';
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
	const recentsData = (await recentData.parse(cookieHeader) || {}) as Recents;

	return json({
		status: 200,
		data: recentsData,
	});
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') return json({ status: 405, error: 'Method Not Allowed.' });

	const cookieHeader = request.headers.get('Cookie');
	const jsonBody = await request.clone().json();
	let recentsData = (await recentData.parse(cookieHeader) || {}) as Recents;

	const isValid = RecentSchema.safeParse(jsonBody);
	if (!isValid.success) return json({ status: 400, error: parseZodError(isValid.error) });

	recentsData = isValid.data;

	throw jsonResponse({
		status: 200,
		data: recentsData,
	}, {
		headers: {
			'Set-Cookie': await recentData.serialize(recentsData),
		},
	});
}

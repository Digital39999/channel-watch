import { ActionFunctionArgs, json } from '@remix-run/node';
import { SecurityUtils } from '~/utils/functions.server';
import { parseZodError } from '~/other/utils';
import { z } from 'zod';

export async function loader() {
	return json({ error: 'Method Not Allowed.', status: 405 }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') return json({ error: 'Method Not Allowed.', status: 405 }, { status: 405 });

	const data = await request.json();
	if (!data) return json({ error: 'Bad Request.', status: 400 }, { status: 400 });

	const isValid = z.object({ type: z.enum(['encrypt', 'decrypt']), data: z.string() }).safeParse(data);
	if (!isValid.success) return json({ error: parseZodError(isValid.error), status: 400 }, { status: 400 });

	const { type, data: text } = isValid.data;

	try {
		switch (type) {
			case 'encrypt': return json({ data: SecurityUtils.encrypt(text), status: 200 }, { status: 200 });
			case 'decrypt': return json({ data: SecurityUtils.decrypt(text), status: 200 }, { status: 200 });
			default: return json({ error: 'Bad Request.', status: 400 }, { status: 400 });
		}
	} catch (e) {
		return json({ error: 'Internal Server Error.', status: 500 }, { status: 500 });
	}
}

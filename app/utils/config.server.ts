import { z } from 'zod';
import { parseZodError } from '~/other/utils';

const config = {
	sessionSecret: process.env.SESSION_SECRET!,
};

const ConfigSchema = z.object({
	sessionSecret: z.string().optional(),
});

const validatedConfig = ConfigSchema.safeParse(config);
if (!validatedConfig.success) throw new Error(JSON.stringify(parseZodError(validatedConfig.error), null, 5));

export default config;

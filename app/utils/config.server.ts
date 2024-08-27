import { parseZodError } from '~/other/utils';
import { z } from 'zod';

const config = {
	encryption: process.env.ENCRYPTION_KEY,
};

const ConfigSchema = z.object({
	encryption: z.string(),
});

const validatedConfig = ConfigSchema.safeParse(config);
if (!validatedConfig.success) throw new Error(JSON.stringify(parseZodError(validatedConfig.error), null, 5));

export default validatedConfig.data;

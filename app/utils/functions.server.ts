import { CipherKey, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import config from '~/utils/config.server';

export const SecurityUtils = {
	encrypt: <T extends object | string>(data: T): string => {
		const text = typeof data === 'string' ? data : JSON.stringify(data);
		const iv = randomBytes(16);
		const cipher = createCipheriv('aes-256-cbc', SecurityUtils.checkKey(config.encryption), iv);
		const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

		return iv.toString('hex') + encrypted.toString('hex');
	},
	decrypt: <T extends object | string>(text?: string): T | null => {
		if (!text) return null;

		const iv = Buffer.from(text.substring(0, 32), 'hex');
		const encryptedText = Buffer.from(text.substring(32), 'hex');
		const decipher = createDecipheriv('aes-256-cbc', SecurityUtils.checkKey(config.encryption), iv);
		const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

		const decryptedString = decrypted.toString('utf8');

		try {
			return JSON.parse(decryptedString) as T;
		} catch (e) {
			return decryptedString as T;
		}
	},
	checkKey: (key: string): CipherKey => {
		if (!key) return Buffer.alloc(32).fill(0);
		else if (key.length === 32) return Buffer.from(key);
		else if (key.length > 32) return Buffer.from(key.substring(0, 32));
		else {
			const keyBuffer = Buffer.alloc(32);
			keyBuffer.write(key);

			return keyBuffer;
		}
	},
};

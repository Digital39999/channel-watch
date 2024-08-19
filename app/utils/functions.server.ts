import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '~/utils/config.server';

export async function axiosFetch<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<AxiosResponse<T, D>> {
	return axios<T>(config);
}

export const securityUtils = {
	encrypt: <T extends object | string>(data: T): string => {
		const text = typeof data === 'string' ? data : JSON.stringify(data);
		const iv = randomBytes(16);
		const cipher = createCipheriv('aes-256-cbc', config.sessionSecret?.slice(0, 32) || '', iv);
		const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

		return iv.toString('hex') + encrypted.toString('hex');
	},
	decrypt: <T extends object | string>(text?: string): T | null => {
		if (!text) return null;

		const iv = Buffer.from(text.substring(0, 32), 'hex');
		const encryptedText = Buffer.from(text.substring(32), 'hex');
		const decipher = createDecipheriv('aes-256-cbc', config.sessionSecret?.slice(0, 32) || '', iv);
		const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

		const decryptedString = decrypted.toString('utf8');

		try {
			return JSON.parse(decryptedString) as T;
		} catch (e) {
			return decryptedString as T;
		}
	},
	randomString: (length: number) => {
		return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
	},
};

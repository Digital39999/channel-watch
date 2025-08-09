import { APIChannel, APIGuild, ChannelType } from 'discord-api-types/v10';
import { Recent, Recents, TimeUnits, WebReturnType } from './types';
import axios, { AxiosError } from 'axios';
import { ZodError, ZodIssue } from 'zod';

export function formatBigNumbers(number: number | string) {
	if (typeof number === 'string') number = parseInt(number);

	const remove0s = (str: string) => {
		if (str.includes('.')) {
			while (str.endsWith('0')) str = str.slice(0, -1);
			if (str.endsWith('.')) str = str.slice(0, -1);
		}

		return str;
	};

	if (number >= 1000000000) return remove0s((number / 1000000000).toFixed(2)) + 'B';
	else if (number >= 1000000) return remove0s((number / 1000000).toFixed(2)) + 'M';
	else if (number >= 1000) return remove0s((number / 1000).toFixed(2)) + 'K';
	else return remove0s(number.toString());
}

export function typedLowercase<T extends string>(value: T): Lowercase<T> {
	return value.toLowerCase() as Lowercase<T>;
}

export function parseZodError(error: ZodError) {
	const errors: string[] = [];

	const formatSchemaPath = (path: (string | number)[]) => {
		return !path.length ? 'Schema' : `Schema.${path.join('.')}`;
	};

	const firstLetterToLowerCase = (str: string) => {
		return str.charAt(0).toLowerCase() + str.slice(1);
	};

	const makeSureItsString = (value: unknown) => {
		return typeof value === 'string' ? value : JSON.stringify(value);
	};

	const parseZodIssue = (issue: ZodIssue) => {
		switch (issue.code) {
			case 'invalid_type': return `${formatSchemaPath(issue.path)} must be a ${issue.expected} (invalid_type)`;
			case 'invalid_literal': return `${formatSchemaPath(issue.path)} must be a ${makeSureItsString(issue.expected)} (invalid_literal)`;
			case 'custom': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (custom)`;
			case 'invalid_union': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union)`;
			case 'invalid_union_discriminator': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union_discriminator)`;
			case 'invalid_enum_value': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_enum_value)`;
			case 'unrecognized_keys': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (unrecognized_keys)`;
			case 'invalid_arguments': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_arguments)`;
			case 'invalid_return_type': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_return_type)`;
			case 'invalid_date': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_date)`;
			case 'invalid_string': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_string)`;
			case 'too_small': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_small)`;
			case 'too_big': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_big)`;
			case 'invalid_intersection_types': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_intersection_types)`;
			case 'not_multiple_of': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_multiple_of)`;
			case 'not_finite': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_finite)`;
			default: return `Schema has an unknown error (JSON: ${JSON.stringify(issue)})`;
		}
	};

	for (const issue of error.issues) {
		const parsedIssue = parseZodIssue(issue) + '.';
		if (parsedIssue) errors.push(parsedIssue);
	}

	return errors;
}

export async function getRecent() {
	if (typeof localStorage === 'undefined') return null;

	const encryptedText = localStorage.getItem('recent');
	if (!encryptedText) return { currentIndex: -1, all: [] } as Recents;

	let recentData = await axios<WebReturnType<Recents>>({
		method: 'POST',
		url: '/api/crypto',
		data: { type: 'decrypt', data: encryptedText },
	}).then((res) => res.data).catch((err: AxiosError<WebReturnType<Recents>>) => err.response?.data);

	if (!recentData) recentData = { data: {}, status: 200 };
	else if ('error' in recentData) throw new Response(null, { status: 404, statusText: Array.isArray(recentData.error) ? recentData.error.join('. ') : recentData.error });

	return recentData.data;
}

export async function updateRecent(newData: Recents) {
	if (typeof localStorage === 'undefined') return null;

	const encryptedText = await axios<WebReturnType<string>>({
		method: 'POST',
		url: '/api/crypto',
		data: { type: 'encrypt', data: JSON.stringify(newData) },
	}).then((res) => res.data).catch((err: AxiosError<WebReturnType<string>>) => err.response?.data);

	if (!encryptedText) throw new Response(null, { status: 404, statusText: 'Not Found 1.' });
	else if ('error' in encryptedText) throw new Response(null, { status: 404, statusText: Array.isArray(encryptedText.error) ? encryptedText.error.join('. ') : encryptedText.error });

	localStorage.setItem('recent', encryptedText.data);
}

export function time(number: number, from: TimeUnits = 's', to: TimeUnits = 'ms'): number {
	const units: Record<TimeUnits, number> = {
		'ns': 1,
		'µs': 1000,
		'ms': 1000000,
		's': 1000000000,
		'm': 60000000000,
		'h': 3600000000000,
		'd': 86400000000000,
		'w': 604800000000000,
	};

	if (from === to) return number;
	else return (number * units[from]) / units[to];
}

export function snowflakeToDate(snowflake: string) {
	return new Date((parseInt(snowflake) / 4194304) + 1420070400000);
}

export function formatChannelName(channel: APIChannel, currentUserId?: string): string {
	switch (channel.type) {
		case ChannelType.GuildText:
		case ChannelType.GuildAnnouncement:
		case ChannelType.GuildVoice:
		case ChannelType.GroupDM: {
			return channel.name || `ID: ${channel.id}`;
		}
		case ChannelType.DM: {
			const recipient = channel.recipients?.find((x) => x.id !== currentUserId);
			return recipient ? `@${recipient.username}` : 'Unknown User';
		}
		default: {
			return 'Unknown Channel';
		}
	}
}

export function getImage(channel: APIChannel, guild: APIGuild | null): string {
	const randomAvatar = `https://cdn.discordapp.com/embed/avatars/${(Number(channel.id) >> 22) % 6}.png`;

	switch (channel.type) {
		case ChannelType.DM: {
			const participant = channel.recipients?.find((x) => x.avatar);
			return participant ? `https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.${participant.avatar?.startsWith('a_') ? 'gif' : 'png'}` : randomAvatar;
		}
		case ChannelType.GroupDM: {
			return channel.icon ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.${channel.icon?.startsWith('a_') ? 'gif' : 'png'}` : randomAvatar;
		}
		case ChannelType.GuildText:
		case ChannelType.GuildVoice:
		case ChannelType.GuildAnnouncement: {
			return guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon?.startsWith('a_') ? 'gif' : 'png'}` : randomAvatar;
		}
		default: {
			return randomAvatar;
		}
	}
}

export function formatTimestamp(timestamp?: string, locale?: Intl.LocalesArgument): string {
	if (!timestamp) return 'Never';

	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	else if (diffDays === 1) return 'Yesterday';
	else if (diffDays < 7) return `${diffDays} days ago`;
	else return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function getCurrentUser(recentsData: Recents): Recent | null {
	if (typeof recentsData.currentIndex !== 'number' || recentsData.currentIndex < 0) return null;
	return recentsData.all?.[recentsData.currentIndex] || null;
}

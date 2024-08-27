import { APIGuild, APITextChannel, APIGuildVoiceChannel, APINewsChannel } from 'discord-api-types/v10';

export type Recents = {
	currentIndex?: number;
	all?: Recent[];
};

export type Recent = {
	lastUsed: number;

	channels?: RecentChannel[];
	token?: string;
	isBot?: boolean;

	info?: RecentInfo;
};

export type RecentInfo = {
	id: string;
	name: string;
	avatar: string | null;
};

export type RecentChannel = {
	id: string;
	name: string | null;
	guildId: string;
};

export type TimeUnits = 'ns' | 'µs' | 'ms' | 's' | 'm' | 'h' | 'd' | 'w';
export type WebReturnType<T> = { status: 200; data: T; } | { status: 400 | 401 | 403 | 500; error: string | string[]; };

export type Guild = APIGuild & { channels: Channel[]; };
export type Channel = APITextChannel | APIGuildVoiceChannel | APINewsChannel;

export type GetGuildArgs = {
	guildId: string;
	current: { isBot: boolean; token: string; };
};

export type GetMessagesArgs = {
	channelId: string;
	before?: string;
	current: { isBot: boolean; token: string; };
};

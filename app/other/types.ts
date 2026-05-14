import { APIGuild, APITextChannel, APIGuildVoiceChannel, APINewsChannel, APIChannel } from 'discord-api-types/v10';

export type Recents = {
	currentIndex?: number;
	all?: Recent[];
};

export type Recent = {
	lastUsed: number;

	token: string;
	isBot: boolean;

	info: RecentInfo;
	dmChannels: RecentChannel[];
	recentChannels: RecentChannel[];
};

export type RecentInfo = {
	id: string;
	name: string;
	avatar: string | null;
};

export type RecentChannel = {
	id: string;
	name: string;
	guildId?: string;
	imageUrl?: string;
	isFromDm?: boolean;
	latestMessageTimestamp?: string;
};

export type TimeUnits = 'ns' | 'µs' | 'ms' | 's' | 'm' | 'h' | 'd' | 'w';
export type WebReturnType<T> = { status: 200; data: T; } | { status: 400 | 401 | 403 | 500; error: string | string[]; };

export type SubmitType = 'login' | 'logout' | 'refresh' | 'checkChannel' | 'deleteChannel' | 'deleteUser' | 'getDMs';

export type Guild = APIGuild & { channels: APIChannel[]; };
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

export type DiscordAPIError = {
    code: number;
    message: string;
};

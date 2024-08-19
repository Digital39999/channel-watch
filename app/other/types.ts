export type Recents = {
	currentIndex?: number;
	all?: Recent[];
};

export type Recent = {
	lastUsed: number;

	channels?: RecentChannel[];
	token?: string;
	isBot?: boolean;

	info?: {
		id: string;
		name: string;
		avatar: string | null;
	};
};

export type RecentChannel = {
	id: string;
	name: string | null;
	guildId: string;
};

export type WebReturnType<T> = { status: 200; data: T; } | { status: 400 | 401 | 403 | 500; error: string; };

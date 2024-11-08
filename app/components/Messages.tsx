import { DiscordActionRow, DiscordAttachments, DiscordAudioAttachment, DiscordButton, DiscordCommand, DiscordEmbed, DiscordEmbedDescription, DiscordEmbedField, DiscordEmbedFields, DiscordEmbedFooter, DiscordFileAttachment, DiscordImageAttachment, DiscordMessage, DiscordMessages, DiscordReaction, DiscordReactions, DiscordReply, DiscordStringSelectMenu, DiscordStringSelectMenuOption, DiscordSystemMessage, DiscordThread, DiscordVideoAttachment } from '@skyra/discord-components-react';
import { APIChannel, APIMessage, APIRole, APIUser, ButtonStyle, ChannelType, ComponentType, MessageType } from 'discord-api-types/v10';
import { useCallback, useMemo, useState } from 'react';
import { Text, useColorMode } from '@chakra-ui/react';
import { Channel, Guild } from '~/other/types';

const NormalMessages = [
	MessageType.Default,
	MessageType.Reply,
	MessageType.ChatInputCommand,
	MessageType.ThreadStarterMessage,
	MessageType.ContextMenuCommand,
];

export type Mentions = {
	users: Map<string, APIUser>;
	roles: Map<string, APIRole>;
	channels: Map<string, APIChannel>;
};

export function Messages({ messages, guild, loggedIn }: { messages: APIMessage[]; guild: Guild | null; loggedIn?: string; }) {
	const [highlighted, setHighlighted] = useState<string | null>(null);
	const { colorMode } = useColorMode();

	const messagesKey = useMemo(() => `${messages?.[0]?.id}-${Date.now()}`, [messages]);

	const allUsers = useMemo(() => {
		const users = new Map<string, APIUser>();
		for (const message of messages) {
			if (message.author) users.set(message.author.id, message.author);

			if (message.mentions) {
				for (const user of message.mentions) {
					users.set(user.id, user);
				}
			}
		}

		return users;
	}, [messages]);

	const getUser = useCallback((id: string) => allUsers.get(id), [allUsers]);

	const allRoles = useMemo(() => {
		const roles = new Map<string, APIRole>();
		for (const role of guild?.roles || []) {
			roles.set(role.id, role);
		}

		return roles;
	}, [guild?.roles]);

	const getRole = useCallback((id: string) => allRoles.get(id), [allRoles]);

	const allChannels = useMemo(() => {
		const channels = new Map<string, Channel>();
		for (const channel of guild?.channels || []) {
			channels.set(channel.id, channel);
		}

		return channels;
	}, [guild?.channels]);

	const getChannel = useCallback((id: string) => allChannels.get(id), [allChannels]);

	return (
		<DiscordMessages lightTheme={colorMode === 'light'} compactMode={false} key={messagesKey}>
			{messages.map((message, index) => {
				if (!NormalMessages.includes(message.type)) return SystemMessage({ message, guild, key: `${message.id}-${index}-${messagesKey}` });
				else return (
					<SingleMessage
						key={`${message.id}-${index}-${messagesKey}`}

						loggedIn={loggedIn}
						message={message}
						getUser={getUser}
						getRole={getRole}
						getChannel={getChannel}

						allChannels={allChannels}
						highlighted={highlighted === message.id}

						setHighlighted={setHighlighted}
					/>
				);
			})}
		</DiscordMessages>
	);
}

export function SingleMessage({
	loggedIn,
	message,
	getRole,

	allChannels,
	highlighted = false,

	setHighlighted,
}: {
	loggedIn?: string;
	message: APIMessage;
	getUser: (id: string) => APIUser | undefined;
	getRole: (id: string) => APIRole | undefined;
	getChannel: (id: string) => Channel | undefined;

	allChannels: Map<string, Channel>;
	highlighted: boolean;

	setHighlighted: (id: string) => void;
}) {
	const mentions = useMemo(() => {
		const users = new Map<string, APIUser>();
		const roles = new Map<string, APIRole>();

		for (const user of message.mentions) {
			users.set(user.id, user);
		}

		if (message.mention_roles) {
			for (const roleId of message.mention_roles) {
				const role = getRole(roleId);
				if (role) roles.set(roleId, role);
			}
		}

		return { users, roles };
	}, [message.mentions, message.mention_roles, getRole]);

	const refMentions = useMemo(() => {
		const users = new Map<string, APIUser>();
		const roles = new Map<string, APIRole>();

		if (message.referenced_message) {
			if (message.referenced_message.author) users.set(message.referenced_message.author.id, message.referenced_message.author);

			if (message.referenced_message.mentions) {
				for (const user of message.referenced_message.mentions) {
					users.set(user.id, user);
				}
			}

			if (message.referenced_message.mention_roles) {
				for (const roleId of message.referenced_message.mention_roles) {
					const role = getRole(roleId);
					if (role) roles.set(roleId, role);
				}
			}
		}

		return { users, roles };
	}, [message.referenced_message, getRole]);

	const getButtonType = useCallback((style: ButtonStyle) => {
		switch (style) {
			case ButtonStyle.Primary: return 'primary';
			case ButtonStyle.Secondary: return 'secondary';
			case ButtonStyle.Success: return 'success';
			case ButtonStyle.Danger: return 'destructive';
			default: return 'secondary';
		}
	}, []);

	const getColorInHex = useCallback((color: number) => {
		return `#${color.toString(16).padStart(6, '0')}`;
	}, []);

	// const getTenorVideo = useCallback(() => {
	// 	// idk get raw tenor video somehow...
	// }, []);

	// const hasTenorVideo = useMemo(() => getTenorVideo(message.content) !== null, [getTenorVideo, message.content]);

	const { colorMode } = useColorMode();

	return (
		<DiscordMessage
			verified
			id={message.id}
			author={message.author?.username + ` (${message.id})`}
			avatar={message.author?.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.${message.author.avatar.startsWith('a_') ? 'gif' : 'png'}` : undefined}
			highlight={message.content.includes('@everyone') || message.content.includes('@here') || message.mentions.some((mention) => mention.id === loggedIn)}
			edited={message.edited_timestamp !== null}
			timestamp={new Date(message.timestamp)}
			roleColor={colorMode === 'light' ? '#000000' : '#ffffff'}
			lightTheme={colorMode === 'light'}
			bot={message.author?.bot ?? false}
			style={{ backgroundColor: highlighted ? (colorMode === 'light' ? '#f0f0f0' : '#272939') : undefined }}
			key={message.id}
		>
			{message.referenced_message?.id && (
				<DiscordReply
					verified
					slot='reply'
					lightTheme={colorMode === 'light'}
					author={message.referenced_message.author?.username}
					roleColor={colorMode === 'light' ? '#000000' : '#ffffff'}
					avatar={message.referenced_message.author?.avatar ? `https://cdn.discordapp.com/avatars/${message.referenced_message.author.id}/${message.referenced_message.author.avatar}.${message.referenced_message.author.avatar.startsWith('a_') ? 'gif' : 'png'}` : undefined}
					bot={message.referenced_message.author?.bot ?? false}
					edited={message.referenced_message.edited_timestamp !== null}
					attachment={message.referenced_message.attachments.length > 0}
					mentions={message.referenced_message.mentions.some((mention) => mention.id === message.author?.id)}
					key={`referenced-${message.id}-${message.referenced_message.id}`}
					onClick={() => {
						setHighlighted(message.referenced_message!.id);

						const element = document.getElementById(message.referenced_message!.id);
						if (element) element.scrollIntoView({ behavior: 'smooth' });

						const distance = Math.abs(element!.getBoundingClientRect().top - document.documentElement.getBoundingClientRect().top);
						setTimeout(() => setHighlighted(''), distance < 1000 ? 3000 : distance);
					}}
				>
					{parseText(message.referenced_message.content, {
						...refMentions,
						channels: allChannels,
					}, false, true)}
				</DiscordReply>
			)}

			{message.interaction && (
				<DiscordCommand
					slot='reply'
					key={`interaction-${message.id}`}
					lightTheme={colorMode === 'light'}
					author={message.interaction_metadata?.user.username}
					roleColor={colorMode === 'light' ? '#000000' : '#ffffff'}
					avatar={message.interaction_metadata?.user?.avatar ? `https://cdn.discordapp.com/avatars/${message.interaction_metadata?.user.id}/${message.interaction_metadata?.user.avatar}.${message.interaction_metadata?.user.avatar.startsWith('a_') ? 'gif' : 'png'}` : undefined}
					command={message.type === MessageType.ChatInputCommand ? `/${message.interaction.name}` : message.interaction.name}
				/>
			)}

			{parseText(message.content, { ...mentions, channels: allChannels }, false)}

			{/* {hasTenorVideo && (
				<DiscordTenorVideo slot='attachments' url={getTenorVideo(message.content)!} />
			)} */}

			{message.thread && (
				<DiscordThread
					slot='thread'
					lightTheme={colorMode === 'light'}
					name={message.thread.name || undefined}
					key={`thread-${message.id}`}
				>
					Thread with some messages..
				</DiscordThread>
			)}

			{message.attachments && message.attachments.length > 0 && (
				<DiscordAttachments slot='attachments' key={`attachments-${message.id}`}>
					{message.attachments.map((attachment, index) => {
						if (attachment.content_type?.startsWith('image/')) {
							return (
								<DiscordImageAttachment
									url={attachment.url}
									key={`attachment-${index}-${message.id}`}
									height={(attachment.height || 0) / 2 || undefined}
									width={(attachment.width || 0) / 2 || undefined}
									alt={attachment.description}
									style={{ borderRadius: '8px' }}
								/>
							);
						}

						if (attachment.content_type?.startsWith('video/')) {
							return (
								<DiscordVideoAttachment
									href={attachment.url}
									key={`attachment-${index}-${message.id}`}
									poster={attachment.proxy_url}
									style={{ borderRadius: '8px' }}
								/>
							);
						}

						if (attachment.content_type?.startsWith('audio/')) {
							return (
								<DiscordAudioAttachment
									key={`attachment-${index}-${message.id}`}
									href={attachment.url}
									name={attachment.filename}
									style={{ borderRadius: '8px' }}
									bytes={attachment.size}
									bytesUnit='B'
								/>
							);
						}

						return (
							<DiscordFileAttachment
								key={`attachment-${index}-${message.id}`}
								name={attachment.filename}
								bytes={attachment.size}
								bytesUnit='B'
								href={attachment.url}
								rel='noreferrer noopener'
								target='_blank'
								type={attachment.content_type}
								style={{ borderRadius: '8px' }}
							/>
						);
					})}
				</DiscordAttachments>
			)}

			{message.embeds ? message.embeds.filter((embed) => embed.type === 'rich').map((embed, index) => (
				<DiscordEmbed
					key={`embed-${index}-${message.id}`}
					color={embed.color ? getColorInHex(embed.color) : undefined}
					authorName={embed.author?.name}
					authorImage={embed.author?.icon_url}
					authorUrl={embed.author?.url}
					embedTitle={embed.title}
					embedEmojisMap={{}}
					url={embed.url}
					provider={embed.provider?.name}
					thumbnail={embed.thumbnail?.url}
					lightTheme={colorMode === 'light'}
					video={embed.video?.url}
					image={embed.image?.url}
				>
					{embed.description && <DiscordEmbedDescription slot='description'>{parseText(embed.description, { ...mentions, channels: allChannels }, true)}</DiscordEmbedDescription>}
					{embed.fields && embed.fields.length > 0 && (
						<DiscordEmbedFields slot='fields' key={`fields-${index}-${message.id}`}>
							{embed.fields.map((field, ix) => (
								<DiscordEmbedField
									key={`field-${ix}-${message.id}-${index}`}
									fieldTitle={field.name}
									inline={field.inline}
								>
									{parseText(field.value, { ...mentions, channels: allChannels }, true)}
								</DiscordEmbedField>
							))}
						</DiscordEmbedFields>
					)}
					{embed.footer && <DiscordEmbedFooter
						slot='footer'
						lightTheme={colorMode === 'light'}
						footerImage={embed.footer.icon_url}
						footerImageAlt={embed.footer.text}
						timestamp={embed.timestamp}
					>
						{embed.footer.text}
					</DiscordEmbedFooter>}
				</DiscordEmbed>
			)) : null}

			{message.components && message.components.length > 0 && (
				<DiscordAttachments slot='components'>
					{message.components.map((component, index) => {
						if (component.type === 1) {
							return (
								<DiscordActionRow key={index}>
									{component.components.map((comp, ix) => {
										switch (comp.type) {
											case ComponentType.Button: {
												if (!('sku_id' in comp)) return (
													<DiscordButton
														key={`button-${ix}-${index}`}
														disabled={comp.disabled}
														type={getButtonType(comp.style) as never}
														url={'url' in comp ? comp.url : undefined}
														emoji={comp.emoji?.id ? `https://cdn.discordapp.com/emojis/${comp.emoji.id}.${comp.emoji.animated ? 'gif' : 'png'}` : undefined}
														emojiName={comp.emoji?.name}
													>
														{comp.label}
													</DiscordButton>
												);

												break;
											}
											case ComponentType.StringSelect: {
												return (
													<DiscordStringSelectMenu
														key={`select-menu-${ix}-${index}`}
														disabled={comp.disabled}
														placeholder={comp.placeholder}
													>
														{comp.options.map((option, ixn) => (
															<DiscordStringSelectMenuOption
																key={`option-${ixn}-${ix}-${index}`}
																emoji={option.emoji?.id ? `https://cdn.discordapp.com/emojis/${option.emoji.id}.${option.emoji.animated ? 'gif' : 'png'}` : undefined}
																emojiName={option.emoji?.name}
																label={option.label}
																description={option.description}
															/>
														))}
													</DiscordStringSelectMenu>
												);
											}
											default: return null;
										}
									})}
								</DiscordActionRow>
							);
						}

						return null;
					})}
				</DiscordAttachments>
			)}

			{message.reactions && message.reactions.length > 0 && (
				<DiscordReactions slot='reactions'>
					{message.reactions.map((reaction, index) => (
						<DiscordReaction
							key={`reaction-${index}-${message.id}`}
							count={reaction.count}
							name={reaction.emoji.name || undefined}
							reacted={reaction.me}
							emoji={reaction.emoji.id ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${reaction.emoji.animated ? 'gif' : 'png'}` : undefined}
						/>
					))}
				</DiscordReactions>
			)}
		</DiscordMessage>
	);
}

export function SystemMessage({ message, guild, key }: { message: APIMessage; guild: Guild | null; key: string; }) {
	type Type = 'thread' | 'join' | 'alert' | 'error' | 'boost' | 'call' | 'edit' | 'leave' | 'missed-call' | 'pin' | 'upgrade';

	const { colorMode } = useColorMode();

	const getSystemMessage = useCallback((m: APIMessage, type: Type, content?: string, channelName?: boolean) => {
		return (
			<DiscordSystemMessage
				key={key}
				lightTheme={colorMode === 'light'}
				timestamp={new Date(m.timestamp)}
				channelName={channelName}
				type={type}
			>
				<span dangerouslySetInnerHTML={{ __html: content || m.content }} />

				{message.thread && (
					<DiscordThread
						slot='thread'
						lightTheme={colorMode === 'light'}
						name={message.thread.name || undefined}
					>
						Thread with some messages..
					</DiscordThread>
				)}
			</DiscordSystemMessage>
		);
	}, [colorMode, key, message.thread]);

	const formattedDateDifference = useCallback((timestamp1: string, timestamp2: string) => {
		const timestamp1Date = new Date(timestamp1).getTime();
		const timestamp2Date = new Date(timestamp2).getTime();

		const difference = timestamp1Date - timestamp2Date;
		const seconds = Math.floor(difference / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
		if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
		if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

		return `${seconds} second${seconds === 1 ? '' : 's'}`;
	}, []);

	const getWelcomeMessage = useCallback((username: string, timestamp: string) => {
		const unixTimestamp = new Date(timestamp).getTime() % 13;

		switch (unixTimestamp) {
			case 0: return `${username} joined the party.`;
			case 1: return `${username} is here.`;
			case 2: return `Welcome, ${username}. We hope you brought pizza.`;
			case 3: return `A wild ${username} appeared.`;
			case 4: return `${username} just landed.`;
			case 5: return `${username} just slid into the server.`;
			case 6: return `${username} just showed up!`;
			case 7: return `Welcome ${username}. Say hi!`;
			case 8: return `${username} hopped into the server.`;
			case 9: return `Everyone welcome ${username}!`;
			case 10: return `Glad you're here, ${username}.`;
			case 11: return `Good to see you, ${username}.`;
			case 12: return `Yay you made it, ${username}!`;
			default: return `Hi ${username}!`;
		}
	}, []);

	const InfoMessage = useCallback(({ content }: { content: string; }) => {
		return <DiscordMessage author='System' timestamp={new Date()}>{content}</DiscordMessage>;
	}, []);

	const getNotSupportedMessage = useCallback((type: MessageType) => {
		return InfoMessage({ content: `Message type not yet supported. (${type})` });
	}, [InfoMessage]);

	const getUnknownMessage = useCallback((type: MessageType) => {
		return InfoMessage({ content: `Unknown message type. (${type})` });
	}, [InfoMessage]);

	switch (message.type as (MessageType | (number & {}))) { // eslint-disable-line
		case MessageType.Default: return null;
		case MessageType.RecipientAdd: return getSystemMessage(message, 'join', `<i>${message.author?.username}</i> added <i>${message.mentions[0].username}</i> to the group.`);
		case MessageType.RecipientRemove: return getSystemMessage(message, 'leave', `<i>${message.author?.username}</i> removed <i>${message.mentions[0].username}</i> from the group.`);
		case MessageType.Call: {
			if (message.call?.ended_timestamp) return getSystemMessage(message, 'missed-call', `<i>${message.author?.username}</i> started a call that lasted ${formattedDateDifference(message.call.ended_timestamp, message.timestamp)}.`);
			return getSystemMessage(message, 'call', `<i>${message.author?.username}</i> started a call.`);
		}
		case MessageType.ChannelNameChange: return getSystemMessage(message, 'edit', `<i>${message.author?.username}</i> changed the channel name: ${message.content}.`, true);
		case MessageType.ChannelIconChange: return getSystemMessage(message, 'edit', `<i>${message.author?.username}</i> changed the group icon.`);
		case MessageType.ChannelPinnedMessage: return getSystemMessage(message, 'pin', `<i>${message.author?.username}</i> pinned <i>a message</i> to this channel. See all <i>pinned messages</i>.`);
		case MessageType.UserJoin: return getSystemMessage(message, 'join', getWelcomeMessage(`<i>${message.author?.username}</i>`, message.timestamp));
		case MessageType.GuildBoost: return getSystemMessage(message, 'boost', `<i>${message.author?.username}</i> just boosted the server!`);
		case MessageType.GuildBoostTier1: return getSystemMessage(message, 'boost', `<i>${message.author?.username}</i> just boosted the server! ${guild?.name || 'unknown server'} has achieved **Level 1**!`);
		case MessageType.GuildBoostTier2: return getSystemMessage(message, 'boost', `<i>${message.author?.username}</i> just boosted the server! ${guild?.name || 'unknown server'} has achieved **Level 2**!`);
		case MessageType.GuildBoostTier3: return getSystemMessage(message, 'boost', `<i>${message.author?.username}</i> just boosted the server! ${guild?.name || 'unknown server'} has achieved **Level 3**!`);
		case MessageType.ChannelFollowAdd: return getSystemMessage(message, 'edit', `<i>${message.author?.username}</i> has added <i>${message.content}</i> to the channel. Its most important updates will show up here.`);
		case MessageType.GuildDiscoveryDisqualified: return getSystemMessage(message, 'error', 'This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server settings for more details.');
		case MessageType.GuildDiscoveryRequalified: return getSystemMessage(message, 'boost', 'This server has been requalified for Server Discovery. Check Server settings for more details.');
		case MessageType.GuildDiscoveryGracePeriodInitialWarning: return getSystemMessage(message, 'alert', 'This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.');
		case MessageType.GuildDiscoveryGracePeriodFinalWarning: return getSystemMessage(message, 'alert', 'This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery');
		case MessageType.ThreadCreated: return getSystemMessage(message, 'thread', `<i>${message.author?.username}</i> started a thread: ${message.thread?.name}. See all <i>threads</i>.`, true);
		case MessageType.Reply: return null;
		case MessageType.ChatInputCommand: return null;
		case MessageType.ThreadStarterMessage: return null;
		case MessageType.GuildInviteReminder: return getNotSupportedMessage(message.type);
		case MessageType.ContextMenuCommand: return null;
		case MessageType.AutoModerationAction: return getNotSupportedMessage(message.type);
		case MessageType.RoleSubscriptionPurchase: {
			if (message.role_subscription_data?.is_renewal) return getSystemMessage(message, 'join', `<i>${message.author?.username}</i> renewed ${message.role_subscription_data?.tier_name} and has been subscriber of ${guild?.name || 'unknown server'} for ${message.role_subscription_data.total_months_subscribed} month${message.role_subscription_data.total_months_subscribed === 1 ? '' : 's'}.`);
			else return getSystemMessage(message, 'join', `<i>${message.author?.username}</i> joined ${message.role_subscription_data?.tier_name} and has been subscriber of ${guild?.name || 'unknown server'} for ${message.role_subscription_data?.total_months_subscribed || 1} month${message.role_subscription_data?.total_months_subscribed === 1 ? '' : 's'}.`);
		}
		case MessageType.InteractionPremiumUpsell: return getNotSupportedMessage(message.type);
		case MessageType.StageStart: return getSystemMessage(message, 'call', `<i>${message.author?.username}</i> started ${message.content}.`);
		case MessageType.StageEnd: return getSystemMessage(message, 'missed-call', `<i>${message.author?.username}</i> ended ${message.content}.`);
		case MessageType.StageSpeaker: return getSystemMessage(message, 'call', `<i>${message.author?.username}</i> is now a speaker.`);
		case MessageType.StageRaiseHand: return getSystemMessage(message, 'call', `<i>${message.author?.username}</i> requested to speak.`);
		case MessageType.StageTopic: return getSystemMessage(message, 'edit', `<i>${message.author?.username}</i> changed the Stage topic: ${message.content}.`);
		case MessageType.GuildApplicationPremiumSubscription: return getSystemMessage(message, 'upgrade', `<i>${message.author?.username}</i> upgraded ${guild?.name || 'unknown server'} to premium for this server! 🎉`);
		case MessageType.GuildIncidentAlertModeEnabled: return getNotSupportedMessage(message.type);
		case MessageType.GuildIncidentAlertModeDisabled: return getNotSupportedMessage(message.type);
		case MessageType.GuildIncidentReportRaid: return getNotSupportedMessage(message.type);
		case MessageType.GuildIncidentReportFalseAlarm: return getNotSupportedMessage(message.type);
		// case 44: return getSystemMessage(message, 'join', `<i>${message.author?.username}</i> has purchased ${message.purchase_notification.guild_product_purchase.product_name}!`);
		default: return getUnknownMessage(message.type);
	}
}

export function parseText(content: string, mentions: Mentions, inEmbed: boolean, onlyFirst?: boolean) {
	const onlyEmojiMessage = isMessageOnlyEmojis(content);

	let parsedMentions = parseMentionsContent(content, mentions, inEmbed, onlyEmojiMessage);
	if (onlyFirst) parsedMentions = parsedMentions.split('\n')[0];

	const parsedMarkdown = parseMarkdown(parsedMentions, inEmbed);
	return <Text as={'span'} dangerouslySetInnerHTML={{ __html: parsedMarkdown || '' }} />;
}

export function parseMentionsContent(content: string, mentions: Mentions, inEmbed: boolean, isOnlyEmoji: boolean) {
	content = content.replace(/<id:(\w+)>/g, (full, id) => {
		switch (id) {
			case 'home': return '<discord-mention type=\'server-guide\'>Server Guide</discord-mention>';
			case 'customize': case 'browse': return '<discord-mention type=\'channels-and-roles\'>Channels & Roles</discord-mention>';
			// case '
			default: return full;
		}
	});

	content = content.replace(/<@!?(\d+)>/g, (full, id) => {
		const user = mentions.users.get(id);
		return `<discord-mention type='user' id='${id}'>${user?.username || id}</discord-mention>`;
	});

	content = content.replace(/<@&(\d+)>/g, (full, id) => {
		const role = mentions.roles.get(id);
		return `<discord-mention type='role' id='${id}'>${role?.name || id}</discord-mention>`;
	});

	content = content.replace(/<#(\d+)>/g, (full, id) => {
		const channel = mentions.channels.get(id);
		const type =
			channel?.type === ChannelType.GuildText ? 'channel' :
				channel?.type === ChannelType.GuildVoice ? 'voice' :
					channel?.type === ChannelType.GuildForum ? 'forum' :
						channel?.type === ChannelType.PrivateThread ? 'thread' :
							channel?.type === ChannelType.PublicThread ? 'thread' :
								'channel';

		return `<discord-mention type='${type}' id='${id}'>${channel?.name || id}</discord-mention>`;
	});

	content = content.replace(/<\/(\w+):(\d+)>/g, (_, name, id) => {
		return `<discord-mention type='slash' id='${id}'>${name}</discord-mention>`;
	});

	content = content.replace(/<a?:(\w+):([0-9]+)>/g, (full, name, id) => {
		const animated = full.startsWith('<a:');
		return `<discord-custom-emoji name='${name}' ${inEmbed ? 'embedEmoji' : ''} ${isOnlyEmoji ? 'jumbo' : ''} url='${`https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`}'></discord-custom-emoji>`;
	});

	return content;
}

export function parseMarkdown(content: string, inEmbed: boolean) {
	const splitAndTrimAll = (m: string) => m.split('\n').map((s) => s.trim()).join('\n').trim();
	const anyWhateverLink = /\b((?:https?|ftp):\/\/(?:www\.)?[^\s()<>]+(?:\([^\s()<>]*\)|[^\s()<>])*)\b/;

	content = content.replace(/(?:^|\n)> \s*(.*)/g, (_, text) => {
		return `<discord-quote>${text}</discord-quote>`;
	});

	content = content.replace(/^(#{1,3})\s*(.+)$/gm, (_, hashes, text) => {
		return `<discord-header level='${hashes.length}'>${text}</discord-header>`;
	});

	content = content.replace(/<(https?:\/\/\S+)>/g, (_, url) => {
		return `<discord-link href='${url}' rel='noreferrer noopener' target='_blank'>${url}</discord-link>`;
	});

	content = content.replace(/\[([^[\]]*?)\]\((.*?)\)/g, (_, text, url) => {
		return `<discord-link href='${url}' target='_blank'>${text}</discord-link>`;
	});

	content = content.replace(anyWhateverLink, (url) => {
		const before = content[content.indexOf(url) - 1];
		const after = content[content.indexOf(url) + url.length];
		if (before || after) return url;

		return `<discord-link href='${url}' target='_blank'>${url}</discord-link>`;
	});

	content = content.replace(/```(\w+)\n([\s\S]*?)```/g, (_, __, code) => {
		return `<discord-code multiline ${inEmbed ? 'embed' : ''}>${splitAndTrimAll(code)}</discord-code>`;
	});

	content = content.replace(/`([^`]+)`/g, (_, code) => {
		return `<discord-code ${inEmbed ? 'embed' : ''}>${code}</discord-code>`;
	});

	content = content.replace(/~~([^~]+)~~/g, (_, text) => {
		return `<span style='text-decoration: line-through;'>${text}</span>`;
	});

	content = content.replace(/(?:^|\n)-#\s*(.*)/g, (_, text) => {
		return `<discord-subscript>${text}</discord-subscript>`;
	});

	content = content.replace(/\n/g, '<br />');

	content = content.replace(/\*\*([^*]+)\*\*/g, (_, text) => {
		return `<discord-bold>${text}</discord-bold>`;
	});

	content = content.replace(/__([^_]+)__/g, (_, text) => {
		return `<discord-underlined>${text}</discord-underlined>`;
	});

	content = content.replace(/\*([^*]+)\*/g, (_, text) => {
		return `<discord-italic>${text}</discord-italic>`;
	});

	content = content.replace(/_([^_]+)_/g, (_, text) => {
		return `<discord-italic>${text}</discord-italic>`;
	});

	content = content.replace(/\|\|([^|]+)\|\|/g, (_, text) => {
		return `<discord-spoiler>${text}</discord-spoiler>`;
	});

	return content;
}

export function isMessageOnlyEmojis(content: string) {
	return !content.replace(/<a?:\w+:\d+>/g, '').trim();
}

import { Flex, VStack, Box, Text, IconButton, Divider, Tooltip, HStack, AbsoluteCenter, Spinner } from '@chakra-ui/react';
import { ClientLoaderFunctionArgs, Link, useFetcher } from '@remix-run/react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { GetGuildArgs, Channel, GetMessagesArgs } from '~/other/types';
import { typedjson, useTypedLoaderData } from 'remix-typedjson';
import { APIGuild, APIMessage } from 'discord-api-types/v10';
import { FaBackspace, FaDownload } from 'react-icons/fa';
import { useRootData } from '~/hooks/useRootData';
import { Messages } from '~/components/Messages';
import { getRecent } from '~/other/utils';
import axios from 'axios';

async function getGuild({ guildId, current }: GetGuildArgs) {
	const guildData = await axios({
		method: 'GET',
		url: `/api/discord/guilds/${guildId}`,
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as APIGuild | { message: string; };
	if (!guildData) throw new Response(null, { status: 404, statusText: 'There was an error getting guild data.' });
	else if ('message' in guildData) throw new Response(null, { status: 404, statusText: guildData.message });

	const guildChannels = await axios({
		method: 'GET',
		url: `/api/discord/guilds/${guildId}/channels`,
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as Channel[] | { message: string; };
	if (!guildChannels) throw new Response(null, { status: 404, statusText: 'There was an error getting guild channels.' });
	else if ('message' in guildChannels) throw new Response(null, { status: 404, statusText: guildChannels.message });

	return {
		...guildData,
		channels: guildChannels || [],
	};
}

async function getMessages({ channelId, before, current }: GetMessagesArgs) {
	const messageData = await axios({
		method: 'GET',
		url: `/api/discord/channels/${channelId}/messages` + '?limit=100' + (before ? `&before=${before}` : ''),
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as APIMessage[] | { message: string; };
	if (!messageData) throw new Response(null, { status: 404, statusText: 'There was an error getting messages.' });
	else if ('message' in messageData) throw new Response(null, { status: 404, statusText: messageData.message });

	return messageData.reverse();
}

export const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
	const url = new URL(request.url);
	const before = url.searchParams.get('before') || undefined;

	const recentsData = await getRecent();
	if (!recentsData) throw new Response(null, { status: 404, statusText: 'Not Found.' });

	let current = typeof recentsData.currentIndex === 'number' ? recentsData.all?.[recentsData.currentIndex] || null : null;
	if (!current?.token) throw new Response(null, { status: 401, statusText: 'Unable to get current user\'s data.' });

	const channelId = params.id;
	if (!channelId) throw new Response(null, { status: 400, statusText: 'Bad Request.' });

	const allChannels = [...current.recentChannels, ...current.dmChannels];

	let channelData = allChannels.find((channel) => channel.id === channelId);
	if (!channelData) {
		const isElsewhere = recentsData.all?.find((user) => user.recentChannels?.find((channel) => channel.id === channelId) || user.dmChannels?.find((channel) => channel.id === channelId));
		if (!isElsewhere) throw new Response(null, { status: 403, statusText: 'This channel is not accessible.' });

		channelData = isElsewhere.recentChannels?.find((channel) => channel.id === channelId) || isElsewhere.dmChannels?.find((channel) => channel.id === channelId);
		if (!channelData) throw new Response(null, { status: 404, statusText: 'Channel not found.' });

		current = isElsewhere;
		if (!current.token) throw new Response(null, { status: 401, statusText: 'Unable to get current user\'s data.' });
	}

	const guildData = before ? null : channelData.guildId ? await getGuild({ guildId: channelData.guildId, current: { isBot: current.isBot || false, token: current.token } }) : null;
	const messageData = await getMessages({ channelId, before, current: { isBot: current.isBot || false, token: current.token } });

	return typedjson({
		info: current.info,
		messages: messageData || [],
		channel: channelData,
		guild: guildData,
	});
};


export function HydrateFallback() {
	return (
		<AbsoluteCenter>
			<Spinner size='xl' />
		</AbsoluteCenter>
	);
}

export default function Channels() {
	const { messages: initialMessages, channel, guild } = useTypedLoaderData<typeof clientLoader>();
	const [messages, setMessages] = useState<APIMessage[]>(initialMessages as never);
	const { current } = useRootData();

	const fetcher = useFetcher<{ messages: APIMessage[] }>();
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);

	const lastMessageId = useMemo(() => messages.length > 0 ? messages[0]?.id : null, [messages]);

	useEffect(() => {
		if (fetcher.data?.messages.length) {
			setMessages((prev) => [
				...(fetcher.data?.messages as APIMessage[]),
				...prev,
			]);
		}
	}, [fetcher.data]);

	useEffect(() => {
		if (fetcher.data?.messages.length) console.log(`[Channels] Fetched ${fetcher.data?.messages.length} messages, total: ${messages.length}, last: ${lastMessageId}.`);
		else console.log(`[Channels] Messages updated, total: ${messages.length}, last: ${lastMessageId}.`);
	}, [fetcher.data, messages, lastMessageId]);

	const loadNext = useCallback(() => {
		if (!lastMessageId || fetcher.state === 'loading' || fetcher.state === 'submitting') return;
		fetcher.submit(`?before=${lastMessageId}`);
	}, [fetcher, lastMessageId]);

	const scrollToBottom = useCallback(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: 'smooth',
			});
		}
	}, [scrollContainerRef]);

	useEffect(() => { scrollToBottom(); }, []); // eslint-disable-line

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2' mb={16}>
				<Flex
					flexDir={{ base: 'column', md: 'row' }}
					justifyContent={'space-between'}
					alignItems={'center'}
					borderRadius={8}
					bg='alpha100'
					gap={2}
					w='100%'
					p={4}
				>
					<Text
						fontSize={{ base: '2xl', md: '3xl' }}
						fontWeight={'bold'}
						color={'alpha900'}
					>
						{channel?.name || `Channel ${channel?.id}`}
					</Text>
					<HStack>
						<Tooltip label='Go Back.'>
							<IconButton
								as={Link}
								size='lg'
								aria-label='Go Back'
								icon={<FaBackspace />}
								to='/'
							/>
						</Tooltip>
						<Tooltip label='Load More.'>
							<IconButton
								size='lg'
								aria-label='Load More'
								icon={<FaDownload />}
								isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
								onClick={loadNext}
							/>
						</Tooltip>
					</HStack>
				</Flex>

				<Divider my={4} />

				<Flex
					direction='column-reverse'
					justifyContent='flex-start'
					alignItems='stretch'
					borderRadius={8}
					bg='alpha100'
					w='100%'
					maxH='70vh'
					overflowY='auto'
					scrollBehavior='smooth'
					ref={scrollContainerRef}
				>
					<Messages
						guild={guild}
						messages={messages}
						loggedIn={current?.info?.id}
					/>

					{(fetcher.state === 'loading' || fetcher.state === 'submitting') && (
						<Box p={2} borderRadius={8} bg='alpha200'>
							<Text>Loading...</Text>
						</Box>
					)}
				</Flex>
			</Box>
		</VStack>
	);
}

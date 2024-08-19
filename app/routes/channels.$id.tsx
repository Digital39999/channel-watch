import { APIGuild, APIGuildVoiceChannel, APIMessage, APINewsChannel, APITextChannel } from 'discord-api-types/v10';
import { Flex, VStack, Box, Text, IconButton, Divider, Tooltip, HStack } from '@chakra-ui/react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { typedjson, useTypedLoaderData } from 'remix-typedjson';
import { FaBackspace, FaDownload } from 'react-icons/fa';
import { Link, useFetcher } from '@remix-run/react';
import { recentData } from '~/utils/session.server';
import { useRootData } from '~/hooks/useRootData';
import { Messages } from '~/components/Messages';
import { Recents } from '~/other/types';
import axios from 'axios';

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

async function getGuild({ guildId, current }: GetGuildArgs) {
	const guildData = await axios({
		method: 'GET',
		url: `https://discord.com/api/v10/guilds/${guildId}`,
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as APIGuild | { message: string; };
	if ('message' in guildData) throw new Response(null, { status: 404, statusText: guildData.message });
	else if (!guildData) throw new Response(null, { status: 404, statusText: 'Not Found.' });

	const guildChannels = await axios({
		method: 'GET',
		url: `https://discord.com/api/v10/guilds/${guildId}/channels`,
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as Channel[] | { message: string; };
	if ('message' in guildChannels) throw new Response(null, { status: 404, statusText: guildChannels.message });
	else if (!guildChannels) throw new Response(null, { status: 404, statusText: 'Not Found.' });

	return {
		...guildData,
		channels: guildChannels || [],
	};
}

async function getMessages({ channelId, before, current }: GetMessagesArgs) {
	const messageData = await axios({
		method: 'GET',
		url: `https://discord.com/api/v10/channels/${channelId}/messages` + '?limit=1' + (before ? `&before=${before}` : ''),
		headers: {
			'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
		},
	}).then((res) => res.data).catch((err) => err.response?.data) as APIMessage[] | { message: string; };
	if ('message' in messageData) throw new Response(null, { status: 404, statusText: 'Not Found.' });
	else if (!messageData?.length) throw new Response(null, { status: 404, statusText: 'Not Found.' });

	return messageData.reverse();
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const before = url.searchParams.get('before') || undefined;

	const cookieHeader = request.headers.get('Cookie');
	const data = (await recentData.parse(cookieHeader) || {}) as Recents;

	const current = typeof data.currentIndex === 'number' ? data.all?.[data.currentIndex] || null : null;
	if (!current?.token) throw new Response(null, { status: 401, statusText: 'Unauthorized.' });

	const channelId = params.id;
	if (!channelId) throw new Response(null, { status: 400, statusText: 'Bad Request.' });

	const channelData = current.channels?.find((channel) => channel.id === channelId);
	if (!channelData) throw new Response(null, { status: 403, statusText: 'Forbidden.' });

	const guildData = await getGuild({ guildId: channelData.guildId, current: { isBot: current.isBot || false, token: current.token } });
	const messageData = await getMessages({ channelId, before, current: { isBot: current.isBot || false, token: current.token } });

	return typedjson({
		info: current.info,
		initialMessages: messageData || [],
		channel: channelData,
		guild: guildData,
	});
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const url = new URL(request.url);
	const before = url.searchParams.get('before') || undefined;

	const cookieHeader = request.headers.get('Cookie');
	const data = (await recentData.parse(cookieHeader) || {}) as Recents;

	const current = typeof data.currentIndex === 'number' ? data.all?.[data.currentIndex] || null : null;
	if (!current?.token) throw new Response(null, { status: 401, statusText: 'Unauthorized.' });

	const channelId = params.id;
	if (!channelId) throw new Response(null, { status: 400, statusText: 'Bad Request.' });

	const channelData = current.channels?.find((channel) => channel.id === channelId);
	if (!channelData) throw new Response(null, { status: 403, statusText: 'Forbidden.' });

	return typedjson({
		messages: await getMessages({ channelId, before, current: { isBot: current.isBot || false, token: current.token } }) || [],
	});
};

export default function Channels() {
	const { initialMessages, channel, guild } = useTypedLoaderData<typeof loader>();
	const [messages, setMessages] = useState<APIMessage[]>(initialMessages as never);
	const [loading, setLoading] = useState(false);
	const { current } = useRootData();

	const fetcher = useFetcher<{ messages: APIMessage[] }>();
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);

	const lastMessageId = useMemo(() => messages[0]?.id, [messages]);

	useEffect(() => {
		if (fetcher.state === 'submitting') setLoading(true);
		else if (!fetcher.data || fetcher.state === 'loading') return;

		if (fetcher.data?.messages) {
			setMessages((prev) => [
				...(fetcher.data?.messages as APIMessage[]).reverse(),
				...prev,
			]);
		}
	}, [fetcher.state, fetcher.data]);

	const loadNext = useCallback(() => {
		if (loading || !lastMessageId) return;
		fetcher.submit(`?before=${lastMessageId}`, { method: 'POST' });
	}, [loading, fetcher, lastMessageId]);

	const scrollToBottom = () => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: 'smooth',
			});
		}
	};

	useEffect(() => { scrollToBottom(); }, []);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<Flex
					flexDir={{ base: 'column', md: 'row' }}
					justifyContent={'space-between'}
					alignItems={'center'}
					borderRadius={8}
					bg="alpha100"
					gap={2}
					w="100%"
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
								isLoading={loading}
								onClick={loadNext}
							/>
						</Tooltip>
					</HStack>
				</Flex>

				<Divider my={4} />

				<Flex
					direction="column-reverse"
					justifyContent="flex-start"
					alignItems="stretch"
					borderRadius={8}
					bg="alpha100"
					w="100%"
					maxH="70vh"
					overflowY="auto"
					scrollBehavior="smooth"
					// ref={scrollContainerRef}
				>
					<Messages
						guild={guild}
						messages={messages}
						loggedIn={current?.info?.id}
					/>

					{loading && (
						<Box p={2} borderRadius={8} bg="alpha200">
							<Text>Loading...</Text>
						</Box>
					)}
				</Flex>
			</Box>
		</VStack>
	);
}

import { Flex, VStack, SimpleGrid, HStack, Box, Input, Text, Divider, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, useToast, useColorMode, AbsoluteCenter, Spinner, useBreakpointValue, Grid } from '@chakra-ui/react';
import { formatChannelName, formatTimestamp, getCurrentUser, getImage, getRecent, snowflakeToDate, updateRecent } from '~/other/utils';
import { APIChannel, APIUser, ChannelType, APIMessage, APIGroupDMChannel, APIDMChannel, APIGuild } from 'discord-api-types/v10';
import { FaCopy, FaFolderPlus, FaHashtag, FaRobot, FaTrash, FaUser, FaUserFriends } from 'react-icons/fa';
import { WebReturnType, Recent, SubmitType, RecentChannel } from '~/other/types';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ClientActionFunctionArgs, useFetcher } from '@remix-run/react';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { LinkIconButton } from '~/components/Button';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import { useRootData } from '~/hooks/useRootData';
import { IoMdRefresh } from 'react-icons/io';
import { typedjson } from 'remix-typedjson';
import axios from 'axios';

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
	const formData = await request.formData();
	const type = formData.get('type') as string;

	const recentsData = await getRecent();
	if (!recentsData) return typedjson({ status: 404, error: 'Not Found.' });

	try {
		switch (type) {
			case 'login': {
				const token = formData.get('token') as string;
				if (!token) return typedjson({ status: 400, error: 'Invalid token.' });

				const isBot = formData.get('isBot') === 'true';

				const userData = await axios({
					method: 'GET',
					url: '/api/discord/v10/users/@me',
					headers: {
						'Authorization': `${isBot ? 'Bot ' : ''}${token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data);

				if (!userData || 'message' in userData) {
					return typedjson({
						status: 401,
						error: userData?.message ? `${userData.message}.` : 'Invalid token.',
					});
				}

				const user = userData as APIUser;
				const userInfo = {
					id: user.id,
					name: user.username,
					avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
				};

				if (!recentsData.all) recentsData.all = [];
				const existingUserIndex = recentsData.all.findIndex((u) => u.info?.id === user.id);

				if (existingUserIndex === -1) {
					recentsData.all.push({
						lastUsed: Date.now(),
						token,
						isBot,
						info: userInfo,
						dmChannels: [],
						recentChannels: [],
					});

					recentsData.currentIndex = recentsData.all.length - 1;
				} else {
					const existingUser = recentsData.all[existingUserIndex];
					existingUser.lastUsed = Date.now();
					existingUser.token = token;
					existingUser.isBot = isBot;
					existingUser.info = userInfo;
					recentsData.currentIndex = existingUserIndex;
				}
				break;
			}

			case 'logout': {
				recentsData.currentIndex = -1;
				break;
			}

			case 'refresh': {
				const currentUser = getCurrentUser(recentsData);
				if (!currentUser) return typedjson({ status: 400, error: 'No user logged in.' });

				const userData = await axios({
					method: 'GET',
					url: '/api/discord/v10/users/@me',
					headers: {
						'Authorization': `${currentUser.isBot ? 'Bot ' : ''}${currentUser.token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data);

				if (!userData || 'message' in userData) {
					return typedjson({
						status: 401,
						error: userData?.message ? `${userData.message}.` : 'Invalid token.',
					});
				}

				const user = userData as APIUser;
				currentUser.info = {
					id: user.id,
					name: user.username,
					avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
				};

				break;
			}

			case 'checkChannel': {
				const currentUser = getCurrentUser(recentsData);
				if (!currentUser) return typedjson({ status: 400, error: 'No user logged in.' });

				const channelId = formData.get('channel') as string;
				if (!channelId) return typedjson({ status: 400, error: 'Channel ID is required.' });

				const channelData = await axios({
					method: 'GET',
					url: `/api/discord/channels/${channelId}`,
					headers: {
						'Authorization': `${currentUser.isBot ? 'Bot ' : ''}${currentUser.token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data);

				if (!channelData || 'message' in channelData) {
					return typedjson({
						status: 401,
						error: channelData?.message ? `${channelData.message}.` : 'Invalid channel.',
					});
				}

				const channel = channelData as APIChannel;
				const allowedTypes = [
					ChannelType.GuildText,
					ChannelType.GuildAnnouncement,
					ChannelType.GuildVoice,
					ChannelType.DM,
					ChannelType.GroupDM,
				];

				if (!allowedTypes.includes(channel.type)) {
					return typedjson({
						status: 403,
						error: 'Invalid channel type. Only text, announcement, voice, and DM channels are allowed.',
					});
				}

				const guildData = ('guild_id' in channel ? await axios({
					method: 'GET',
					url: `/api/discord/guilds/${channel.guild_id}`,
					headers: {
						'Authorization': `${currentUser.isBot ? 'Bot ' : ''}${currentUser.token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data) : null) as APIGuild | null;

				const messagesData = await axios({
					method: 'GET',
					url: `/api/discord/channels/${channelId}/messages?limit=1`,
					headers: {
						'Authorization': `${currentUser.isBot ? 'Bot ' : ''}${currentUser.token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data);

				if (!messagesData || 'message' in messagesData) {
					return typedjson({
						status: 403,
						error: messagesData?.message ? `${messagesData.message}.` : "Couldn't get channel messages.",
					});
				}

				const messages = messagesData as APIMessage[];
				const channelName = formatChannelName(channel, currentUser.info?.id || '');
				if (!currentUser.recentChannels) currentUser.recentChannels = [];

				const existingChannelIndex = currentUser.recentChannels.findIndex((c) => c.id === channel.id);
				const channelInfo: RecentChannel = {
					id: channel.id,
					name: channelName,
					guildId: 'guild_id' in channel ? channel.guild_id : undefined,
					latestMessageTimestamp: messages[0]?.timestamp,
					isFromDm: channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM,
					imageUrl: getImage(channel, guildData),
				};

				if (existingChannelIndex === -1) currentUser.recentChannels.push(channelInfo);
				else currentUser.recentChannels[existingChannelIndex] = channelInfo;

				break;
			}

			case 'getDMs': {
				const currentUser = getCurrentUser(recentsData);
				if (!currentUser) return typedjson({ status: 400, error: 'No user logged in.' });

				const dmsData = await axios({
					method: 'GET',
					url: '/api/discord/v10/users/@me/channels',
					headers: {
						'Authorization': `${currentUser.isBot ? 'Bot ' : ''}${currentUser.token}`,
					},
				}).then((res) => res.data).catch((err) => err.response?.data);

				if (!dmsData || 'message' in dmsData) {
					return typedjson({
						status: 401,
						error: dmsData?.message ? `${dmsData.message}.` : 'Invalid token.',
					});
				}

				const dmChannels = dmsData as (APIDMChannel | APIGroupDMChannel)[];
				const allowedTypes = [ChannelType.DM, ChannelType.GroupDM];
				const filteredChannels = dmChannels.filter((c) => allowedTypes.includes(c.type));

				if (!currentUser.dmChannels) currentUser.dmChannels = [];

				for (const dmChannel of filteredChannels) {
					const channelName = formatChannelName(dmChannel, currentUser.info?.id || '');
					const existingChannelIndex = currentUser.dmChannels.findIndex((c) => c.id === dmChannel.id);

					const channelInfo = {
						id: dmChannel.id,
						name: channelName,
						guildId: undefined,
						latestMessageTimestamp: dmChannel.last_message_id ? snowflakeToDate(dmChannel.last_message_id).toISOString() : undefined,
						isFromDm: true,
					};

					if (existingChannelIndex === -1) currentUser.dmChannels.push(channelInfo);
					else currentUser.dmChannels[existingChannelIndex] = channelInfo;
				}

				currentUser.dmChannels.sort((a, b) => {
					const aTime = new Date(a.latestMessageTimestamp || 0).getTime();
					const bTime = new Date(b.latestMessageTimestamp || 0).getTime();
					return bTime - aTime;
				});

				currentUser.dmChannels = currentUser.dmChannels.filter((c) => {
					if (!c.latestMessageTimestamp) return false;
					const lastMessageDate = new Date(c.latestMessageTimestamp);
					const now = new Date();
					const diff = now.getTime() - lastMessageDate.getTime();
					return diff < 30 * 24 * 60 * 60 * 1000;
				});

				break;
			}

			case 'deleteChannel': {
				const currentUser = getCurrentUser(recentsData);
				if (!currentUser) return typedjson({ status: 400, error: 'No user logged in.' });

				const channelId = formData.get('channelId') as string;
				if (!channelId) return typedjson({ status: 400, error: 'Channel ID is required.' });

				if (currentUser.recentChannels) currentUser.recentChannels = currentUser.recentChannels.filter((c) => c.id !== channelId);
				break;
			}

			case 'deleteUser': {
				const token = formData.get('token') as string;
				if (!token) return typedjson({ status: 400, error: 'Token is required.' });

				if (recentsData.all) recentsData.all = recentsData.all.filter((u) => u.token !== token);
				break;
			}

			default: {
				return typedjson({ status: 400, error: 'Invalid request type.' });
			}
		}

		await updateRecent(recentsData);
		return typedjson({ status: 200, data: 'Success.' });
	} catch (error) {
		console.error('Action error:', error);
		return typedjson({ status: 500, error: 'Internal server error.' });
	}
};

export function HydrateFallback() {
	return (
		<AbsoluteCenter>
			<Spinner size='xl' />
		</AbsoluteCenter>
	);
}

export default function Index() {
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const { current, recentData } = useRootData();

	const [currentToken, setCurrentToken] = useState<string>('');
	const [isBot, setIsBot] = useState<boolean>(true);

	const [currentlySubmitting, setCurrentlySubmitting] = useState<SubmitType | null>(null);
	const [currentlyId, setCurrentlyId] = useState<string | null>(null);
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, {
		onFinish: () => {
			setCurrentlySubmitting(null);
			setCurrentlyId(null);
			setModalOpen(false);
		},
	});

	const submitRequest = useCallback((type: SubmitType, data: Record<string, string | boolean>) => {
		setCurrentlySubmitting(type);
		fetcher.submit(data, { method: 'POST' });
	}, [fetcher]);

	const copyIdToClipboard = useCallback((channelId: string) => {
		navigator.clipboard.writeText(channelId);
		toast({
			title: 'The channel ID has been copied to your clipboard.',
			status: 'success',
		});
	}, [toast]);

	const showDivider = useMemo(() => (recentData.all?.length || 0) > 0 || !!current?.info, [recentData.all, current?.info]);
	const isMobile = useBreakpointValue({ base: true, md: false });

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={showDivider ? { base: 8, md: 16 } : { base: 32, md: 48 }}>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} mb={16}>
				<Flex
					flexDir={{ base: 'column', md: 'row' }}
					justifyContent='space-between'
					alignItems='center'
					borderRadius={8}
					bg='alpha100'
					gap={2}
					w='100%'
					p={4}
				>
					{current?.info ? (
						<>
							<Text
								fontSize='2xl'
								fontWeight='bold'
								color='alpha900'
								w='100%'
								textAlign={{ base: 'center', md: 'left' }}
							>
								Logged in as {current.info.name}
							</Text>
							<HStack>
								<IconButton
									size='lg'
									aria-label='Refresh'
									icon={<IoMdRefresh />}
									fontSize='2xl'
									isLoading={currentlySubmitting === 'refresh'}
									onClick={() => submitRequest('refresh', { type: 'refresh' })}
								/>
								<IconButton
									size='lg'
									aria-label='Log out'
									fontSize='2xl'
									icon={<FiLogOut />}
									isLoading={currentlySubmitting === 'logout'}
									onClick={() => submitRequest('logout', { type: 'logout' })}
								/>
							</HStack>
						</>
					) : (
						<Fragment>
							<Input
								name='token'
								placeholder={`Log in with a ${isBot ? 'bot' : 'user'} token`}
								value={currentToken}
								onChange={(e) => setCurrentToken(e.target.value)}
								variant='filled'
								size='lg'
								w='100%'
							/>

							<Flex gap={2} alignItems='center' w={{ base: '100%', md: 'auto' }}>
								<IconButton
									size='lg'
									width='100%'
									aria-label='Toggle bot/user'
									icon={isBot ? <FaRobot /> : <FaUser />}
									colorScheme={isBot ? 'green' : undefined}
									onClick={() => setIsBot((prev) => !prev)}
								/>
								<IconButton
									size='lg'
									width='100%'
									aria-label='Log in'
									icon={<FiLogIn />}
									fontSize='2xl'
									isDisabled={!currentToken.trim()}
									isLoading={currentlySubmitting === 'login'}
									onClick={() => submitRequest('login', {
										type: 'login',
										isBot,
										token: currentToken.trim(),
									})}
								/>
							</Flex>
						</Fragment>
					)}
				</Flex>

				{showDivider && <Divider my={4} />}

				{current?.info ? (
					<Flex direction='column' gap={4}>
						<Flex
							flexDir='column'
							borderRadius={8}
							bg='alpha100'
							w='100%'
							p={4}
						>
							<Flex
								justifyContent='space-between'
								alignItems='center'
								w='100%'
							>
								<Text fontSize='2xl' fontWeight='bold' color='alpha900'>
									Recent Channels
								</Text>

								{isMobile ? (
									<IconButton
										aria-label='New Channel'
										icon={<FaFolderPlus />}
										onClick={() => setModalOpen(true)}
									/>
								) : (
									<Button
										rightIcon={<FaFolderPlus />}
										onClick={() => setModalOpen(true)}
									>
										New Channel
									</Button>
								)}
							</Flex>

							{current.recentChannels.length > 0 && (
								<>
									<Divider my={4} />
									<Grid gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={2} w='100%'>
										{current.recentChannels.map((channel) => (
											<ChannelCard
												key={channel.id}
												channel={channel}
												currentlySubmitting={currentlySubmitting}
												currentlyId={currentlyId}
												onDelete={(id) => {
													setCurrentlyId(id);
													submitRequest('deleteChannel', {
														type: 'deleteChannel',
														channelId: id,
													});
												}}
												copyId={() => copyIdToClipboard(channel.id)}
											/>
										))}
									</Grid>
								</>
							)}
						</Flex>

						<Flex
							flexDir='column'
							borderRadius={8}
							bg='alpha100'
							w='100%'
							p={4}
						>
							<Flex
								justifyContent='space-between'
								alignItems='center'
								w='100%'
							>
								<Text fontSize='2xl' fontWeight='bold' color='alpha900'>
									Direct Messages
								</Text>

								{isMobile ? (
									<IconButton
										aria-label='Refresh DMs'
										icon={<FaUserFriends />}
										isDisabled={currentlySubmitting === 'getDMs'}
										isLoading={currentlySubmitting === 'getDMs'}
										onClick={() => submitRequest('getDMs', { type: 'getDMs' })}
									/>
								) : (
									<Button
										rightIcon={<FaUserFriends />}
										isDisabled={currentlySubmitting === 'getDMs'}
										isLoading={currentlySubmitting === 'getDMs'}
										onClick={() => submitRequest('getDMs', { type: 'getDMs' })}
									>
										Refresh DMs
									</Button>
								)}
							</Flex>

							{current.dmChannels.length > 0 && (
								<>
									<Divider my={4} />
									<Grid gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={2} w='100%'>
										{current.dmChannels.map((channel) => (
											<DMChannelCard
												key={channel.id}
												channel={channel}
												copyId={() => copyIdToClipboard(channel.id)}
											/>
										))}
									</Grid>
								</>
							)}
						</Flex>
					</Flex>
				) : recentData.all?.length ? (
					<RecentUsersSection
						recentUsers={recentData.all}
						currentlySubmitting={currentlySubmitting}
						onDeleteUser={(token) => submitRequest('deleteUser', {
							type: 'deleteUser',
							token,
						})}
						onLoginUser={(recent) => submitRequest('login', {
							type: 'login',
							isBot: recent.isBot || false,
							token: recent.token || '',
						})}
					/>
				) : null}
			</Box>

			<NewChannelModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				currently={currentlySubmitting}
				onSubmit={(id) => submitRequest('checkChannel', {
					type: 'checkChannel',
					channel: id,
				})}
			/>
		</VStack >
	);
}

export type ChannelCardProps = {
	channel: RecentChannel;
	currentlySubmitting: SubmitType | null;
	currentlyId: string | null;
	onDelete: (id: string) => void;
	copyId: () => void;
};

export function ChannelCard({
	channel,
	currentlySubmitting,
	currentlyId,
	onDelete,
	copyId,
}: ChannelCardProps) {
	return (
		<Flex
			_hover={{ bg: 'alpha300' }}
			justifyContent='space-between'
			px={{ base: 2, md: 4 }}
			transition='all 0.2s'
			alignItems='center'
			borderRadius={8}
			bg='alpha200'
			w='100%'
			gap={2}
			py={2}
		>
			<Text fontSize='xl' color='alpha900'>
				{channel.name && channel.name.length > 20 ? `${channel.name.slice(0, 20)}..` : channel.name}
			</Text>

			<HStack spacing={1}>
				<IconButton
					size='sm'
					icon={<FaTrash />}
					aria-label='Delete'
					isLoading={currentlySubmitting === 'deleteChannel' && currentlyId === channel.id}
					isDisabled={(currentlySubmitting === 'deleteChannel' && currentlyId !== channel.id)}
					onClick={() => onDelete(channel.id)}
				/>

				<IconButton
					size='sm'
					icon={<FaCopy />}
					aria-label='Copy ID'
					onClick={copyId}
				/>

				<LinkIconButton
					size='sm'
					aria-label='Open'
					icon={<FiLogIn />}
					to={`/channels/${channel.id}`}
				/>
			</HStack>
		</Flex>
	);
}

export type DMChannelCardProps = {
	channel: RecentChannel;
	copyId: () => void;
};

export function DMChannelCard({
	channel,
	copyId,
}: DMChannelCardProps) {
	return (
		<Flex
			_hover={{ bg: 'alpha300' }}
			justifyContent='space-between'
			px={{ base: 2, md: 4 }}
			transition='all 0.2s'
			alignItems='center'
			borderRadius={8}
			bg='alpha200'
			w='100%'
			gap={2}
			py={2}
		>
			<Flex flex={1} justifyContent='space-between' alignItems='center'>
				<Text fontSize='lg' color='alpha900' fontWeight='semibold'>
					{channel.name.length > 20 ? `${channel.name.slice(0, 20)}..` : channel.name}
				</Text>

				{channel.latestMessageTimestamp && (
					<Text fontSize='sm' color='alpha600'>
						{formatTimestamp(channel.latestMessageTimestamp, navigator.language)}
					</Text>
				)}
			</Flex>

			<HStack spacing={1}>
				<IconButton
					size='sm'
					icon={<FaCopy />}
					aria-label='Copy ID'
					onClick={copyId}
				/>

				<LinkIconButton
					size='sm'
					aria-label='Open'
					icon={<FiLogIn />}
					to={`/channels/${channel.id}`}
				/>
			</HStack>
		</Flex>
	);
}

export type RecentUsersSectionProps = {
	recentUsers: Recent[];
	currentlySubmitting: SubmitType | null;
	onDeleteUser: (token: string) => void;
	onLoginUser: (recent: Recent) => void;
};

export function RecentUsersSection({
	recentUsers,
	currentlySubmitting,
	onDeleteUser,
	onLoginUser,
}: RecentUsersSectionProps) {
	return (
		<Flex
			flexDir='column'
			borderRadius={8}
			bg='alpha100'
			w='100%'
			p={4}
		>
			<Text fontSize='2xl' fontWeight='bold' color='alpha900' mb={4}>
				Recent Users
			</Text>

			<Divider mb={4} />

			<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2} w='100%'>
				{recentUsers.map((recent, index) => {
					return (
						<Flex
							key={index}
							_hover={{ bg: 'alpha300' }}
							justifyContent='space-between'
							transition='all 0.2s'
							alignItems='center'
							borderRadius={8}
							bg='alpha200'
							p={4}
						>
							<Text fontSize='xl' color='alpha900'>
								{recent.info.name.length > 20 ? `${recent.info.name.slice(0, 20)}..` : recent.info.name}
							</Text>

							<HStack>
								<IconButton
									aria-label='Delete'
									icon={<FaTrash />}
									isLoading={currentlySubmitting === 'deleteUser'}
									onClick={() => onDeleteUser(recent.token || '')}
								/>

								<IconButton
									aria-label='View'
									icon={<FaHashtag />}
									isLoading={currentlySubmitting === 'login'}
									onClick={() => onLoginUser(recent)}
								/>
							</HStack>
						</Flex>
					);
				})}
			</SimpleGrid>
		</Flex>
	);
}

export type NewChannelModalProps = {
	isOpen: boolean;
	onClose: () => void;
	currently: SubmitType | null;
	onSubmit: (id: string) => void;
};

function NewChannelModal({
	isOpen,
	onClose,
	currently,
	onSubmit,
}: NewChannelModalProps) {
	const [channelId, setChannelId] = useState<string>('');
	const { colorMode } = useColorMode();

	const handleSubmit = () => {
		if (channelId.trim()) onSubmit(channelId.trim());
	};

	useEffect(() => {
		if (currently === 'checkChannel') setChannelId('');
	}, [currently]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Add New Channel</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Input
						placeholder='Enter Channel ID'
						value={channelId}
						onChange={(e) => setChannelId(e.target.value)}
						variant='filled'
						size='lg'
					/>
				</ModalBody>
				<ModalFooter gap={2}>
					<Button colorScheme='gray' onClick={onClose}>
						Cancel
					</Button>
					<Button
						colorScheme='green'
						isLoading={currently === 'checkChannel'}
						isDisabled={!channelId.trim()}
						onClick={handleSubmit}
					>
						Add Channel
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

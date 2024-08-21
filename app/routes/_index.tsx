import {
	Flex, VStack, SimpleGrid, HStack, Box, Input, Text,
	Divider, IconButton, Tooltip, Modal, ModalOverlay,
	ModalContent, ModalHeader, ModalFooter, ModalBody,
	ModalCloseButton, Button, VisuallyHiddenInput,
	useToast, useColorMode,
	AbsoluteCenter,
	Spinner,
} from '@chakra-ui/react';
import { APIChannel, APIUser, ChannelType, APIMessage } from 'discord-api-types/v10';
import { ClientActionFunctionArgs, Link, useFetcher } from '@remix-run/react';
import { FaFolderPlus, FaRobot, FaTrash, FaUser } from 'react-icons/fa';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { getRecent, updateRecent } from '~/other/utils';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import { useRootData } from '~/hooks/useRootData';
import { WebReturnType } from '~/other/types';
import { IoMdRefresh } from 'react-icons/io';
import { redirect, typedjson } from 'remix-typedjson';
import { useState } from 'react';
import axios from 'axios';

const clientAction = async ({ request }: ClientActionFunctionArgs) => {
	const formData = await request.formData();
	const type = formData.get('type') as string;

	const recentsData = await getRecent();
	if (!recentsData) return typedjson({ status: 404, error: 'Not Found.' });

	switch (type) {
		case 'login': {
			const token = formData.get('token') as string;
			if (!token) return typedjson({ status: 400, error: 'Invalid token.' });

			const isBot = formData.get('isBot') === 'true';

			const data = await axios({
				method: 'GET',
				url: '/api/discord/v10/users/@me',
				headers: {
					'Authorization': `${isBot ? 'Bot ' : ''}${token}`,
				},
			}).then((res) => res.data).catch((err) => err.response?.data) as APIUser | { message: string; };

			if (!data) return typedjson({ status: 401, error: 'Invalid token.' });
			else if ('message' in data) return typedjson({ status: 401, error: data.message + '.' });

			const exists = recentsData.all?.find((x) => x.info?.id === data.id);
			if (!exists) {
				const currentLength = recentsData.all?.length || 0;
				if (!recentsData.all?.length) recentsData.all = [];

				recentsData.all?.push({
					lastUsed: Date.now(),
					token, isBot,
					info: {
						id: data.id,
						name: data.username,
						avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${data.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
					},
				});

				recentsData.currentIndex = currentLength;
			} else {
				recentsData.currentIndex = recentsData.all?.indexOf(exists);

				exists.lastUsed = Date.now();
				exists.token = token;
				exists.isBot = isBot;
				exists.info = {
					id: data.id,
					name: data.username,
					avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${data.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
				};

				recentsData.all = recentsData.all?.map((x) => x.token === token ? exists : x);
			}

			break;
		}
		case 'logout': {
			const currentIndex = recentsData.currentIndex;
			if (typeof currentIndex !== 'number' || currentIndex < 0) return typedjson({ status: 400, error: 'Invalid request.' });

			recentsData.currentIndex = -1;

			break;
		}
		case 'refresh': {
			const currentIndex = recentsData.currentIndex;
			if (typeof currentIndex !== 'number' || currentIndex < 0) return typedjson({ status: 400, error: 'Invalid request.' });

			const current = recentsData.all?.[currentIndex];
			if (!current) return typedjson({ status: 400, error: 'Invalid request.' });

			const data = await axios({
				method: 'GET',
				url: '/api/discord/v10/users/@me',
				headers: {
					'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
				},
			}).then((res) => res.data).catch((err) => err.response?.data) as APIUser | { message: string; };

			if (!data) return typedjson({ status: 401, error: 'Invalid token.' });
			else if ('message' in data) return typedjson({ status: 401, error: data.message + '.' });

			current.info = {
				id: data.id,
				name: data.username,
				avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${data.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
			};

			break;
		}
		case 'checkChannel': {
			const currentIndex = recentsData.currentIndex;
			if (typeof currentIndex !== 'number' || currentIndex < 0) return typedjson({ status: 400, error: 'Invalid request.' });

			const current = recentsData.all?.[currentIndex];
			if (!current) return typedjson({ status: 400, error: 'Invalid request.' });

			const channel = formData.get('channel') as string;
			if (!channel) return typedjson({ status: 400, error: 'Invalid request.' });

			const data = await axios({
				method: 'GET',
				url: `/api/discord/channels/${channel}`,
				headers: {
					'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
				},
			}).then((res) => res.data).catch((err) => err.response?.data) as APIChannel | { message: string; };

			if (!data) return typedjson({ status: 401, error: 'Invalid channel.' });
			else if ('message' in data) return typedjson({ status: 401, error: data.message + '.' });
			else if (!('guild_id' in data)) return typedjson({ status: 401, error: 'Invalid channel.' });

			const allowedTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice];
			if (!allowedTypes.includes(data.type)) return typedjson({ status: 403, error: 'Invalid channel type, only text, announcement, and voice channels are allowed.' });

			const latestMessage = await axios({
				method: 'GET',
				url: `/api/discord/channels/${channel}/messages` + ('?limit=1'),
				headers: {
					'Authorization': `${current.isBot ? 'Bot ' : ''}${current.token}`,
				},
			}).then((res) => res.data).catch((err) => err.response?.data) as APIMessage[] | { message: string; };
			if (!latestMessage) return typedjson({ status: 401, error: 'Invalid channel.' });
			else if ('message' in latestMessage) return typedjson({ status: 403, error: latestMessage.message + '.' });
			else if (!Array.isArray(latestMessage) || latestMessage.length === 0) return typedjson({ status: 403, error: 'Channel has no messages.' });

			current.channels = current.channels || [];

			const exists = current.channels.find((x) => x.id === data.id);
			if (!exists) {
				current.channels.push({
					id: data.id,
					name: data.name,
					guildId: data.guild_id!,
				});
			} else {
				exists.name = data.name;
			}

			break;
		}
		case 'deleteChannel': {
			const currentIndex = recentsData.currentIndex;
			if (typeof currentIndex !== 'number' || currentIndex < 0) return typedjson({ status: 400, error: 'Invalid request.' });

			const current = recentsData.all?.[currentIndex];
			if (!current) return typedjson({ status: 400, error: 'Invalid request.' });

			const channelId = formData.get('channelId') as string;
			if (!channelId) return typedjson({ status: 400, error: 'Invalid request.' });

			current.channels = current.channels?.filter((x) => x.id !== channelId);
			break;
		}
		case 'deleteUser': {
			const token = formData.get('token') as string;
			if (!token) return typedjson({ status: 400, error: 'Invalid token.' });

			recentsData.all = recentsData.all?.filter((x) => x.token !== token);
			break;
		}
		default: {
			return typedjson({ status: 400, error: 'Invalid request.' });
		}
	}

	const cookie = await updateRecent(recentsData);
	if (!cookie) return typedjson({ status: 500, error: 'Unable to update cookie.' });

	return redirect('/');
};

clientAction.hydrate = true;
export { clientAction };

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

	const [currentToken, setCurrentToken] = useState<string | null>(null);
	const [isBot, setIsBot] = useState(false);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(false));

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
					{current?.info ? (
						<>
							<Text
								fontSize="2xl"
								fontWeight="bold"
								color="alpha900"
								w="100%"
								textAlign={{ base: 'center', md: 'left' }}
							>
								You are logged in as {current.info.name}.
							</Text>
							<HStack>
								<fetcher.Form method="post">
									<VisuallyHiddenInput name="type" value="refresh" onChange={() => { }} />

									<Tooltip label="Refresh user data.">
										<IconButton
											size="lg"
											aria-label="Refresh"
											icon={<IoMdRefresh />}
											type="submit"
											fontSize={'2xl'}
											isLoading={fetcher.state === 'submitting'}
										/>
									</Tooltip>
								</fetcher.Form>
								<fetcher.Form method="post">
									<VisuallyHiddenInput name="type" value="logout" onChange={() => { }} />

									<Tooltip label="Log out.">
										<IconButton
											size="lg"
											aria-label="Log out"
											fontSize={'2xl'}
											icon={<FiLogOut />}
											type="submit"
										/>
									</Tooltip>
								</fetcher.Form>
							</HStack>
						</>
					) : (
						<>
							<VisuallyHiddenInput name="type" value="login" onChange={() => { }} />
							<VisuallyHiddenInput name="isBot" value={isBot ? 'true' : 'false'} onChange={() => { }} />

							<Input
								name="token"
								placeholder={`Log in with a ${isBot ? 'bot' : 'user'} token to see your recent channels.`}
								onChange={(e) => setCurrentToken(e.target.value)}
								variant="filled"
								size="lg"
								w="100%"
							/>
							<Tooltip label={isBot ? 'Currently logging in as a bot.' : 'Currently logging in as a user.'}>
								<IconButton
									size="lg"
									aria-label="Is Bot"
									icon={isBot ? <FaRobot /> : <FaUser />}
									colorScheme={isBot ? 'green' : undefined}
									onClick={() => setIsBot((prev) => !prev)}
								/>
							</Tooltip>
							<Tooltip label="Log in.">
								<IconButton
									size="lg"
									aria-label="Log in"
									icon={<FiLogIn />}
									fontSize={'2xl'}
									isDisabled={!currentToken}
									onClick={() => fetcher.submit({
										type: 'login',
										isBot,
										token: currentToken,
									}, {
										method: 'POST',
									})}
								/>
							</Tooltip>
						</>
					)}
				</Flex>

				<Divider my={4} />

				{current?.info ? (
					<Flex
						flexDir='column'
						justifyContent='space-between'
						alignItems="center"
						borderRadius={8}
						bg="alpha100"
						w="100%"
						p={4}
					>
						<Flex
							justifyContent={{ base: 'center', md: 'space-between' }}
							alignItems="center"
							w="100%"
						>
							<Text
								fontSize="2xl"
								fontWeight="bold"
								color="alpha900"
							>
								Recent Channels
							</Text>
							<Button
								rightIcon={<FaFolderPlus />}
								onClick={() => setModalOpen(true)}
							>
								New Channel
							</Button>
						</Flex>

						<Divider my={4} />

						<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2} w="100%">
							{current.channels?.length ? current.channels?.map((channel) => (
								<Flex
									key={channel.id}
									_hover={{ bg: 'alpha300' }}
									justifyContent="space-between"
									transition={'all 0.2s'}
									alignItems="center"
									borderRadius={8}
									flexDir="row"
									bg="alpha200"
									p={4}
								>
									<Text fontSize="xl" color="alpha900">
										{(channel.name?.length || 0) > 20 ? `${channel.name?.slice(0, 20)}..` : channel.name}
									</Text>

									<HStack>
										<Tooltip label="Delete channel.">
											<IconButton
												aria-label="Delete"
												icon={<FaTrash />}
												onClick={() => fetcher.submit({
													type: 'deleteChannel',
													channelId: channel.id,
												}, {
													method: 'POST',
												})}
											/>
										</Tooltip>

										<Link to={`/channels/${channel.id}`}>
											<Tooltip label="Open channel.">
												<IconButton
													aria-label="Open"
													icon={<FiLogIn />}
												/>
											</Tooltip>
										</Link>
									</HStack>
								</Flex>
							)) : (
								<Text fontSize="xl" color="alpha900">
									No channels found.
								</Text>
							)}
						</SimpleGrid>
					</Flex>
				) : (
					<Flex
						flexDir='column'
						justifyContent='space-between'
						alignItems="center"
						borderRadius={8}
						bg="alpha100"
						w="100%"
						p={4}
					>
						<Flex
							justifyContent={{ base: 'center', md: 'space-between' }}
							alignItems="center"
							w="100%"
						>
							<Text
								fontSize="2xl"
								fontWeight="bold"
								color="alpha900"
							>
								Recent Users
							</Text>
						</Flex>

						<Divider my={4} />

						<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2} w="100%">
							{recentData.all?.length ? recentData.all?.map((recent, index) => (
								<Flex
									key={index}
									_hover={{ bg: 'alpha300' }}
									justifyContent="space-between"
									transition={'all 0.2s'}
									alignItems="center"
									borderRadius={8}
									flexDir="row"
									bg="alpha200"
									p={4}
								>
									<Text fontSize="xl" color="alpha900">
										{(recent.info?.name.length || 0) > 20 ? `${recent.info?.name.slice(0, 20)}..` : recent.info?.name}
									</Text>

									<HStack>
										<Tooltip label="Delete user.">
											<IconButton
												aria-label="Delete"
												icon={<FaTrash />}
												onClick={() => fetcher.submit({
													type: 'deleteUser',
													token: recent.token || '',
												}, {
													method: 'POST',
												})}
											/>
										</Tooltip>

										<Tooltip label="Log in.">
											<IconButton
												aria-label="Log in"
												icon={<FiLogIn />}
												onClick={() => fetcher.submit({
													type: 'login',
													isBot: recent.isBot || false,
													token: recent.token || '',
												}, {
													method: 'POST',
												})}
											/>
										</Tooltip>
									</HStack>
								</Flex>
							)) : (
								<Text fontSize="xl" color="alpha900">
									No users found.
								</Text>
							)}
						</SimpleGrid>
					</Flex>
				)}
			</Box>

			<NewChannelModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				fetcher={fetcher}
			/>
		</VStack >
	);
}

export function NewChannelModal({
	isOpen, onClose, fetcher,
}: {
	isOpen: boolean;
	onClose: () => void;
	fetcher: ReturnType<typeof useFetcher>;
}) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={useColorMode().colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method={'post'}>
					<ModalHeader>
						New Channel
					</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<Flex
							flexDir='column'
							flexWrap='wrap'
							gap={4}
						>
							<VisuallyHiddenInput name='type' value='checkChannel' onChange={() => { }} />

							<Box flex={1}>
								<Input
									name='channel'
									placeholder='Channel ID'
									variant='filled'
									size='lg'
								/>
							</Box>
						</Flex>
					</ModalBody>
					<ModalFooter display={'flex'} gap={1}>
						<Button
							colorScheme='gray'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							isLoading={fetcher.state === 'loading'}
							colorScheme='green'
							type='submit'
						>
							Confrim
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}

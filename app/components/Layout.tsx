import { Image, Flex, HStack, IconButton, useColorMode, Heading, Avatar, Divider, Text } from '@chakra-ui/react';
import { LinkButton } from '~/components/Button';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useScroll } from '~/hooks/useScroll';
import { Fragment } from 'react/jsx-runtime';
import { FiLogIn } from 'react-icons/fi';
import { Link } from '@remix-run/react';

export default function Layout({
	user,
	children,
	siteBarHeader = 'header',
}: {
	user?: { name: string; avatar: string | null; };
	children: React.ReactNode;
	siteBarHeader?: 'header' | 'sidebar';
}) {
	return (
		<Flex
			flexDir={siteBarHeader === 'header' ? 'column' : 'row'}
			w='100%' h='100vh'
		>
			<Header user={user} />
			{children}
		</Flex>
	);
}

export function Header({
	user,
}: {
	user?: { name: string; avatar: string | null; };
}) {
	const { toggleColorMode, colorMode } = useColorMode();
	const { isScrolled } = useScroll();

	return (
		<Flex
			w='100%'
			alignItems={'center'}
			flexDir={'column'}
			pos='sticky'
			top={'0px'}
			zIndex={99}
			bg={'transparent'}
			backdropFilter={isScrolled ? 'blur(10px)' : 'none'}
			borderBottom={'1px solid'}
			borderColor={'alpha100'}
			transition={'all 0.2s ease-in-out'}
		>
			<Flex
				h={16}
				alignItems={'center'}
				justifyContent={'space-between'}
				w={'100%'}
				mx='auto'
				px={{
					base: 4,
					md: 8,
				}}
			>
				<HStack
					to='/'
					as={LinkButton}
					alignItems={'center'}
					justifyContent={'center'}
					display={'flex'}
					pl={1} pr={2} py={6}
					bg={'transparent'}
					rounded={'lg'}
					gap={1}
				>
					<Image
						src={'/logo.png'}
						alt={'logo'}
						boxSize={10}
						rounded={'md'}
					/>
					<Heading size='md' color={'text'} fontWeight={600}>
						Channel Watch
					</Heading>
				</HStack>

				<HStack spacing={2}>
					<IconButton
						onClick={toggleColorMode}
						variant={'ghost'}
						rounded={'full'}
						aria-label='Toggle Mode'
						boxSize={10}
						bg={'alpha100'}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
						_hover={{ bg: 'alpha200' }}
						_active={{ bg: 'alpha300' }}
					/>

					{user ? (
						<Fragment>
							<Divider orientation='vertical' h={6} />
							<Flex
								alignItems={'center'}
								justifyContent={'center'}
								display={'flex'}
								rounded={'full'}
								bg={'alpha100'}
								cursor={'pointer'}
								pl={1}
								pr={3}
								h={10}
							>
								<Avatar
									size={'sm'}
									src={user.avatar || undefined}
								/>
								<Text
									fontWeight={600}
									color={'text'}
									ml={2}
								>
									{user.name}
								</Text>
							</Flex>
						</Fragment>
					) : (
						<IconButton
							aria-label='Login'
							icon={<FiLogIn />}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							boxSize={10}
							alignItems={'center'}
							justifyContent={'center'}
							display={'flex'}
							_hover={{ bg: 'alpha200' }}
							_active={{ bg: 'alpha300' }}
							as={Link}
							to='/'
						/>
					)}
				</HStack>
			</Flex>
		</Flex>
	);
}

import { LinksFunction, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Outlet, isRouteErrorResponse, useRouteError } from '@remix-run/react';
import { typedjson, useTypedLoaderData } from 'remix-typedjson';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { cssBundleHref } from '@remix-run/css-bundle';
import { recentData } from './utils/session.server';
import InfoComponent from '~/components/Info';
import theme from '~/components/theme/base';
import Layout from '~/components/Layout';
import { Recents } from './other/types';
import { Document } from '~/document';

import '~/styles/global.css';

export const links: LinksFunction = () => [
	...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
	{ rel: 'icon', href: '/logo.png' },
];

export const meta: MetaFunction = () => {
	return [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

		{ title: 'Channel Watch' },
		{ name: 'description', content: 'Watch your Discord channels in real-time.' },

		{ property: 'og:title', content: 'Channel Watch' },
		{ property: 'og:description', content: 'Watch your Discord channels in real-time.' },
		{ property: 'og:image', content: '/logo.png' },

		{ name: 'twitter:title', content: 'Channel Watch' },
		{ name: 'twitter:description', content: 'Watch your Discord channels in real-time.' },
		{ name: 'twitter:image', content: '/logo.png' },
	];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const cookieHeader = request.headers.get('Cookie');
	const data = (await recentData.parse(cookieHeader) || {}) as Recents;

	return typedjson({
		currentIndex: data.currentIndex,
		current: typeof data.currentIndex === 'number' ? data.all?.[data.currentIndex] || null : null,
		recentData: data,
	});
};

export default function App() {
	const { current } = useTypedLoaderData<typeof loader>();

	return (
		<Document>
			<ChakraProvider theme={theme}>
				<Layout user={current?.info || undefined}>
					<Outlet />
				</Layout>
			</ChakraProvider>
		</Document>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<Document>
			<ChakraProvider theme={theme}>
				<Layout>
					<Flex
						alignItems={'center'}
						justifyContent={'center'}
						flexDir={'column'}
						mt={'30vh'}
					>
						{isRouteErrorResponse(error) ? (
							<InfoComponent
								title={'Error ' + error.status}
								text={error.statusText}
								button={error.statusText.includes('contact') ? {
									redirectUrl: 'https://discord.com/users/797012765352001557',
									text: 'Contact Support',
									isLink: false,
								} : undefined}
							/>
						) : (error instanceof Error ? (
							<InfoComponent
								title={'Error'}
								text={error.message}
							/>
						) : (
							<InfoComponent
								title={'Error'}
								text={'An error occurred while loading this page.'}
							/>
						))}
					</Flex>
				</Layout>
			</ChakraProvider>
		</Document>
	);
}

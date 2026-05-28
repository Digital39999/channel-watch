import { FetcherWithComponents } from '@remix-run/react';
import { CreateToastFnReturn } from '@chakra-ui/react';
import { WebReturnType } from '~/other/types';
import { useEffect } from 'react';

export default function useFetcherResponse(
	fetcher: FetcherWithComponents<WebReturnType<string>>,
	toast: CreateToastFnReturn,
	hooks: {
		onSuccess?: (data: { status: 200; data: string; }) => void,
		onFinish?: () => void,
		onError?: () => void,
		showSuccess?: boolean,
	},
) {
	useEffect(() => {
		if (fetcher?.data) {
			if (fetcher.data.status === 200) {
				if (hooks.showSuccess !== false) {
					toast({
						title: (fetcher.data.data as string) ?? 'Success.',
						status: 'success',
						variant: 'subtle',
						position: 'bottom-right',
						isClosable: true,
					});
				}

				if (hooks.onSuccess) hooks.onSuccess(fetcher.data);
			} else {
				toast({
					title: Array.isArray(fetcher.data.error) ? fetcher.data.error[0] : (fetcher.data.error ?? 'Unknown error.'),
					status: 'error',
					variant: 'subtle',
					position: 'bottom-right',
					isClosable: true,
				});

				if (hooks.onError) hooks.onError();
			}

			if (hooks.onFinish) hooks.onFinish();
		}
	}, [fetcher.data]); // eslint-disable-line
}

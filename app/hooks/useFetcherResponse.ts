import { FetcherWithComponents } from '@remix-run/react';
import { CreateToastFnReturn } from '@chakra-ui/react';
import { WebReturnType } from '~/other/types';
import { useEffect } from 'react';

export default function useFetcherResponse(
	fetcher: FetcherWithComponents<WebReturnType<string>>,
	toast: CreateToastFnReturn,
	onSuccess?: (data: { status: 200; data: string; }) => void,
) {
	useEffect(() => {
		if (fetcher?.data) {
			toast({
				title:
					fetcher.data.status === 200
						? fetcher.data.data
						: Array.isArray(fetcher.data.error) ? fetcher.data.error[0] : fetcher.data.error,
				status: fetcher.data.status === 200 ? 'success' : 'error',
				variant: 'subtle',
				position: 'bottom-right',
				isClosable: true,
			});

			if (fetcher.data.status === 200 && onSuccess) onSuccess(fetcher.data);
		}
	}, [fetcher.data]); // eslint-disable-line
}

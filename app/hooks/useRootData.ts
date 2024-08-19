import { Recent, Recents } from '~/other/types';
import { useMatches } from '@remix-run/react';

export function useRootData() {
	return useMatches()[0].data as {
		currentIndex: number;
		current: Recent | null;
		recentData: Recents;
	};
}

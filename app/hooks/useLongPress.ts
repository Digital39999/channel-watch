import { useCallback, useRef } from 'react';

export type UseLongPressOptions = {
	onLongPress: () => void;
	delay?: number;
	moveThreshold?: number;
}

export function useLongPress({ onLongPress, delay = 600, moveThreshold = 5 }: UseLongPressOptions) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const startPos = useRef<{ x: number; y: number } | null>(null);
	const onLongPressRef = useRef(onLongPress);
	onLongPressRef.current = onLongPress;

	const clear = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}

		startPos.current = null;
	}, []);

	const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
		if ('touches' in e && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		if ('changedTouches' in e && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };

		const me = e as React.MouseEvent;
		return { x: me.clientX, y: me.clientY };
	}, []);

	const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
		clear();

		startPos.current = getCoords(e);
		timer.current = setTimeout(() => {
			timer.current = null;
			onLongPressRef.current();
		}, delay);
	}, [clear, delay, getCoords]);

	const onPointerUp = useCallback(() => {
		clear();
	}, [clear]);

	const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
		if (!startPos.current) return;

		const pos = getCoords(e);
		const dx = pos.x - startPos.current.x;
		const dy = pos.y - startPos.current.y;

		if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) clear();
	}, [clear, moveThreshold, getCoords]);

	return { onPointerDown, onPointerUp, onPointerMove, onPointerLeave: onPointerUp };
}

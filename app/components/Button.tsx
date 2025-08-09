import { Button, ButtonProps, IconButton, IconButtonProps } from '@chakra-ui/react';
import { Link, LinkProps } from '@remix-run/react';

export function LinkButton({ ...props }: ButtonProps & LinkProps) {
	return (
		<Button
			as={Link}
			{...props}
		/>
	);
}

export function LinkIconButton({ ...props }: IconButtonProps & LinkProps) {
	return (
		<IconButton
			as={Link}
			{...props}
		/>
	);
}

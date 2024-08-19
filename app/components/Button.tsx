import { Button, ButtonProps } from '@chakra-ui/react';
import { Link, LinkProps } from '@remix-run/react';

export function LinkButton({ ...props }: ButtonProps & LinkProps) {
	return (
		<Button
			as={Link}
			{...props}
		/>
	);
}

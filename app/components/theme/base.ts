import { extendTheme } from '@chakra-ui/react';
import colors from '~/components/theme/colors';
import tokens from '~/components/theme/tokens';

export default extendTheme({
	config: {
		initialColorMode: 'dark',
		useSystemColorMode: true,
		disableTransitionOnChange: false,
	},
	styles: {
		global: {
			body: {
				transitionProperty: 'background-color',
				transitionDuration: '0.4s',
			},
		},
	},
	colors,
	semanticTokens: tokens,
	components: {
		Tooltip: {
			baseStyle: {
				display: 'flex',
				borderRadius: 'lg',
				alignItems: 'center',
				justifyContent: 'center',
			},
		},
	},
});

import InfoComponent from '~/components/Info';
import { Flex } from '@chakra-ui/react';

export default function ErrorPage() {
	return (
		<Flex
			alignItems={'center'}
			justifyContent={'top'}
			flexDir={'column'}
			mt={'30vh'}
		>
			<InfoComponent />
		</Flex>
	);
}

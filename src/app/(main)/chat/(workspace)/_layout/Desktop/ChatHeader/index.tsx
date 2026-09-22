import { ChatHeader } from '@lobehub/ui';

import ShareButton from '../../../features/ShareButton';
import Main from './Main';

const Header = () => <ChatHeader left={<Main />} right={<ShareButton />} style={{ zIndex: 11 }} />;

export default Header;

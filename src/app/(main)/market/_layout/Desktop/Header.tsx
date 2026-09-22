'use client';

import { ChatHeader } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';

import FamilyOSLogo from '@/components/FamilyOSLogo';

import ShareAgentButton from '../../features/ShareAgentButton';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    color: ${token.colorText};
    fill: ${token.colorText};
  `,
}));

const Header = memo(() => {
  const { styles } = useStyles();

  return (
    <ChatHeader
      left={<FamilyOSLogo className={styles.logo} extra={'Discover'} size={36} type={'text'} />}
      right={<ShareAgentButton />}
    />
  );
});

export default Header;

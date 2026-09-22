'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox, FlexboxProps } from 'react-layout-kit';

import FamilyOSLogo from '@/components/FamilyOSLogo';

const useStyles = createStyles(({ css }) => ({
  logo: css`
    height: 20px;
  `,
}));

const BrandWatermark = memo<Omit<FlexboxProps, 'children'>>(({ style, ...rest }) => {
  const { styles, theme } = useStyles();
  return (
    <Flexbox
      align={'center'}
      flex={'none'}
      gap={4}
      horizontal
      style={{ color: theme.colorTextDescription, fontSize: 12, ...style }}
      {...rest}
    >
      <span>Powered by</span>
      <FamilyOSLogo className={styles.logo} size={20} type={'text'} />
    </Flexbox>
  );
});

export default BrandWatermark;

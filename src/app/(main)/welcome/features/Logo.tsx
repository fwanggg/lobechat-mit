'use client';

import { memo } from 'react';
import { Center } from 'react-layout-kit';

import FamilyOSLogo from '@/components/FamilyOSLogo';

/**
 * hero mark of the welcome screen.
 *
 * It used to be the remote 3D mascot shipped by `@lobehub/ui/es/LogoThree`, which pulled its scene
 * from lobehub's CDN. The wordmark itself is rendered by the sibling `Hero` component.
 */
const Logo = memo<{ mobile?: boolean }>(({ mobile }) => (
  <Center style={{ marginBottom: mobile ? 4 : 12 }}>
    <FamilyOSLogo size={mobile ? 80 : 104} type={'icon'} />
  </Center>
));

export default Logo;

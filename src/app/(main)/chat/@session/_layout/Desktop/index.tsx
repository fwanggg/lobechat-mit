import { PropsWithChildren } from 'react';

import PanelBody from './PanelBody';
import Header from '@/app/(main)/chat/(workspace)/@topic/features/Header';

const DesktopLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <Header />
      <PanelBody>{children}</PanelBody>
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
    </>
  );
};

export default DesktopLayout;

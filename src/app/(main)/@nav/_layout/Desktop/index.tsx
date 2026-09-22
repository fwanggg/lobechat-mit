'use client';

import { SideNav } from '@lobehub/ui';
import { memo } from 'react';

import { useActiveTabKey } from '@/hooks/useActiveTabKey';

import Avatar from './Avatar';
import BottomActions from './BottomActions';
import TopActions from './TopActions';

const Nav = memo(() => {
  // Family-OS: the rail is hidden. It only carried product chrome (market/docs links, the
  // upstream account menu); this build is a single chat surface.
  const SHOW_NAV = false;
  const sidebarKey = useActiveTabKey();
  if (!SHOW_NAV) return null;

  return (
    <SideNav
      avatar={<Avatar />}
      bottomActions={<BottomActions />}
      style={{ height: '100%', zIndex: 100 }}
      topActions={<TopActions tab={sidebarKey} />}
    />
  );
});

Nav.displayName = 'DesktopNav';

export default Nav;

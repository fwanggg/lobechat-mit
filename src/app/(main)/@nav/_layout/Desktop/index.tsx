import { memo } from 'react';

// Family-OS: the rail is gone. It only carried product chrome (market/docs links, the
// upstream account menu), so this build is a single chat surface and the desktop slot
// renders nothing. The mobile tab bar is a separate component and stays.
const Nav = memo(() => null);

Nav.displayName = 'DesktopNav';

export default Nav;

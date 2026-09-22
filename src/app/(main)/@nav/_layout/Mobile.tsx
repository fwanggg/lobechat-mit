import { memo } from 'react';

// Family-OS: chat is the only product surface. The mobile tab bar only ever linked to
// /market, /me and /chat; the first two are gone and the last one is where the user
// already is, so this slot renders nothing. Mirrors the desktop rail above.
const Nav = memo(() => null);

Nav.displayName = 'MobileNav';

export default Nav;

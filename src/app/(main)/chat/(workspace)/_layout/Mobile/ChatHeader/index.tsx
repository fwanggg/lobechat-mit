'use client';

import { MobileNavBar } from '@lobehub/ui';
import { memo, useState } from 'react';

import { useInitAgentConfig } from '@/app/(main)/chat/(workspace)/_layout/useInitAgentConfig';
import { useQueryRoute } from '@/hooks/useQueryRoute';
import ShareButton from '../../../features/ShareButton';
import ChatHeaderTitle from './ChatHeaderTitle';

const MobileHeader = memo(() => {
  const router = useQueryRoute();
  const [open, setOpen] = useState(false);

  useInitAgentConfig();

  return (
    <MobileNavBar
      center={<ChatHeaderTitle />}
      onBackClick={() => router.push('/chat', { query: { session: '' }, replace: true })}
      right={<ShareButton mobile open={open} setOpen={setOpen} />}
      showBackButton
      style={{ width: '100%' }}
    />
  );
});

export default MobileHeader;

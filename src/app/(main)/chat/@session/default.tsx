import { Suspense, lazy } from 'react';

import ServerLayout from '@/components/server/ServerLayout';

import Desktop from './_layout/Desktop';
import Mobile from './_layout/Mobile';
import SessionHydration from './features/SessionHydration';
import SkeletonList from './features/SkeletonList';

// Family-OS: the left column shows the conversation's topic list. The agent list is unused -
// the household has exactly one agent, and topics are what a family actually navigates by.
const TopicListContent = lazy(
  () => import('@/app/(main)/chat/(workspace)/@topic/features/TopicListContent'),
);

const Layout = ServerLayout({ Desktop, Mobile });

const Session = () => {
  return (
    <>
      <Layout>
        <Suspense fallback={<SkeletonList />}>
          <TopicListContent />
        </Suspense>
      </Layout>
      <SessionHydration />
    </>
  );
};

Session.displayName = 'Session';

export default Session;

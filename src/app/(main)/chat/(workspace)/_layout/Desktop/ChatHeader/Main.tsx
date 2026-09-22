'use client';

import { ActionIcon, ChatHeaderTitle } from '@lobehub/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';

/**
 * Chat header: the panel toggle and the title of the conversation on screen.
 *
 * It deliberately reads the CHAT store, not the session store. The session
 * store is Dexie-backed and Hermes is the only store this build uses, so
 * anything derived from it stays empty forever - which is exactly what a
 * permanently spinning loading skeleton looks like.
 */
const Main = memo(() => {
  const { t } = useTranslation('chat');

  const activeTopic = useChatStore(topicSelectors.currentActiveTopic, isEqual);
  const showSessionPanel = useGlobalStore(systemStatusSelectors.showSessionPanel);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  return (
    <Flexbox align={'center'} gap={4} horizontal>
      <ActionIcon
        aria-label={t('agentsAndConversations')}
        icon={showSessionPanel ? PanelLeftClose : PanelLeftOpen}
        onClick={() => {
          updateSystemStatus({
            sessionsWidth: showSessionPanel ? 0 : 320,
            showSessionPanel: !showSessionPanel,
          });
        }}
        size={DESKTOP_HEADER_ICON_SIZE}
        title={t('agentsAndConversations')}
      />
      <ChatHeaderTitle desc={'Family-OS'} title={activeTopic?.title || t('topic.title')} />
    </Flexbox>
  );
});

Main.displayName = 'ChatHeaderMain';

export default Main;

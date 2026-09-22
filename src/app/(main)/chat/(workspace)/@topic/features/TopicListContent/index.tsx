'use client';

import { EmptyCard } from '@lobehub/ui';
import { useThemeMode } from 'antd-style';
import isEqual from 'fast-deep-equal';
import React, { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { imageUrl } from '@/const/url';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useSessionStore } from '@/store/session';
import { useUserStore } from '@/store/user';
import { ChatTopic } from '@/types/topic';

import { Placeholder, SkeletonList } from '../SkeletonList';
import TopicItem from './TopicItem';

const TopicListContent = memo(() => {
  const { t } = useTranslation('chat');
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { isDarkMode } = useThemeMode();
  const [topicsInit, activeTopicId, topicLength, useFetchTopics] = useChatStore((s) => [
    s.topicsInit,
    s.activeTopicId,
    topicSelectors.currentTopicLength(s),
    s.useFetchTopics,
  ]);
  const [visible, updateGuideState] = useUserStore((s) => [
    s.preference.guide?.topic,
    s.updateGuideState,
  ]);

  const activeTopicList = useChatStore(topicSelectors.displayTopics, isEqual);

  const [sessionId] = useSessionStore((s) => [s.activeId]);

  useFetchTopics(sessionId);

  const itemContent = useCallback(
    (_index: number, { id, favorite, title }: ChatTopic) => (
      <TopicItem active={activeTopicId === id} fav={favorite} id={id} key={id} title={title} />
    ),
    [activeTopicId],
  );

  const activeIndex = (activeTopicList || []).findIndex((topic) => topic.id === activeTopicId);

  // first time loading or has no data
  if (!topicsInit || !activeTopicList) return <SkeletonList />;

  return (
    <>
      {topicLength === 0 && visible && (
        <Flexbox paddingInline={8}>
          <EmptyCard
            alt={t('topic.guide.desc')}
            cover={imageUrl(`empty_topic_${isDarkMode ? 'dark' : 'light'}.webp`)}
            desc={t('topic.guide.desc')}
            height={120}
            imageProps={{
              priority: true,
            }}
            onVisibleChange={(visible) => {
              updateGuideState({ topic: visible });
            }}
            style={{ flex: 'none', marginBottom: 12 }}
            title={t('topic.guide.title')}
            visible={visible}
            width={200}
          />
        </Flexbox>
      )}
      <Virtuoso
        components={{ ScrollSeekPlaceholder: Placeholder }}
        computeItemKey={(_, item) => item.id}
        data={activeTopicList}
        fixedItemHeight={44}
        initialTopMostItemIndex={Math.max(activeIndex, 0)}
        itemContent={itemContent}
        overscan={44 * 10}
        ref={virtuosoRef}
        scrollSeekConfiguration={{
          enter: (velocity) => Math.abs(velocity) > 350,
          exit: (velocity) => Math.abs(velocity) < 10,
        }}
      />
    </>
  );
});

TopicListContent.displayName = 'TopicListContent';

export default TopicListContent;

import { Markdown, Snippet } from '@lobehub/ui';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';
import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';
import { ChatMessage } from '@/types/message';

import Inspector from './Inspector';

export const ToolMessage = memo<ChatMessage>(({ id, content, plugin }) => {
  const loading = useChatStore(chatSelectors.isMessageGenerating(id));
  const fontSize = useUserStore(userGeneralSettingsSelectors.fontSize);

  const [showContent, setShowContent] = useState(plugin?.type !== 'default');

  return (
    <Flexbox gap={12} id={id} width={'100%'}>
      <Inspector
        arguments={plugin?.arguments}
        content={content}
        identifier={plugin?.identifier}
        loading={loading}
        payload={plugin}
        setShow={setShowContent}
        showRender={showContent}
      />
      {showContent || loading ? (
        <Markdown fontSize={fontSize} variant={'chat'}>
          {content}
        </Markdown>
      ) : (
        <Flexbox>
          <Snippet>{plugin?.arguments || ''}</Snippet>
        </Flexbox>
      )}
    </Flexbox>
  );
});

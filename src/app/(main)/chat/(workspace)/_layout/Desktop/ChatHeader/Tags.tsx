import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ModelTag from '@/components/ModelTag';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

const TitleTags = memo(() => {
  const model = useAgentStore(agentSelectors.currentAgentModel);

  return (
    <Flexbox align={'center'} horizontal>
      <ModelTag model={model} />
    </Flexbox>
  );
});

export default TitleTags;

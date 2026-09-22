import AgentChat from './AgentChat';
import AgentMeta from './AgentMeta';
import AgentPlugin from './AgentPlugin';
import AgentTTS from './AgentTTS';
import StoreUpdater, { StoreUpdaterProps } from './StoreUpdater';
import { Provider, createStore } from './store';

type AgentSettingsProps = StoreUpdaterProps;

const AgentSettings = (props: AgentSettingsProps) => {
  return (
    <Provider createStore={createStore}>
      <StoreUpdater {...props} />
      <AgentMeta />
      <AgentChat />
      <AgentTTS />
      <AgentPlugin />
    </Provider>
  );
};

export default AgentSettings;

import { DEFAULT_AGENT_META } from '@/const/meta';
import { ModelProvider } from '@/libs/agent-runtime';
import { LobeAgentChatConfig, LobeAgentConfig, LobeAgentTTSConfig } from '@/types/agent';
import { UserDefaultAgent } from '@/types/user/settings';

export const DEFAUTT_AGENT_TTS_CONFIG: LobeAgentTTSConfig = {
  showAllLocaleVoice: false,
  sttLocale: 'auto',
  ttsService: 'openai',
  voice: {
    openai: 'alloy',
  },
};

export const DEFAULT_AGENT_CHAT_CONFIG: LobeAgentChatConfig = {
  autoCreateTopicThreshold: 2,
  displayMode: 'chat',
  enableAutoCreateTopic: true,
  historyCount: 1,
};

/** The single model this build talks to: the household agent's OpenAI-compatible API. */
export const FAMILY_OS_MODEL = 'family-os';

export const DEFAULT_AGENT_CONFIG: LobeAgentConfig = {
  chatConfig: DEFAULT_AGENT_CHAT_CONFIG,
  model: FAMILY_OS_MODEL,
  params: {
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 0.6,
    top_p: 1,
  },
  plugins: [],
  provider: ModelProvider.OpenAI,
  systemRole: '',
  tts: DEFAUTT_AGENT_TTS_CONFIG,
};

export const DEFAULT_AGENT: UserDefaultAgent = {
  config: DEFAULT_AGENT_CONFIG,
  meta: DEFAULT_AGENT_META,
};

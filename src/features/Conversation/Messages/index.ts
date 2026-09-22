import { RenderMessage } from '../types';
import { AssistantMessage } from './Assistant';
import { DefaultMessage } from './Default';
import { ToolMessage } from './Tool';
import { UserMessage } from './User';

export const renderMessages: Record<string, RenderMessage> = {
  assistant: AssistantMessage,
  default: DefaultMessage,
  function: DefaultMessage,
  tool: ToolMessage,
  user: UserMessage,
};

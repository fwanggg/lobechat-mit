import { DB_Message } from '@/database/client/schemas/message';
import { ChatMessage, ChatMessageError, ChatTTS, ChatTranslate } from '@/types/message';

import { CreateMessageParams, IMessageService } from './type';

/**
 * Messages, read from the Hermes session store.
 *
 * Hermes owns the transcript: a turn is persisted server-side when it runs,
 * and the API exposes no "append a message" call - the only way a message is
 * created is by sending a turn. So this service is deliberately READ-ONLY.
 *
 * That is not a limitation to work around, it is the design the user asked
 * for: there is exactly one store, and it is Hermes.
 *
 * What it means in practice:
 *  - createMessage returns an id for the message the store is holding in its
 *    optimistic map, but writes nothing. The store renders it immediately.
 *  - getMessages returns the authoritative transcript, fetched from Hermes.
 *    Callers should re-fetch after a turn completes, because the server writes
 *    the rows as the turn ends, not as it streams.
 *  - every update or remove call is a no-op: the UI's own state is the only
 *    thing a local edit could change, and Hermes would overwrite it anyway.
 */

interface HermesMessageShape {
  content: string | null;
  display_kind?: string | null;
  id: number | string;
  role: string;
  session_id: string;
  timestamp: number;
  tool_call_id?: string | null;
  tool_name?: string | null;
}

interface HermesMessagesShape {
  data?: HermesMessageShape[];
  session_id?: string;
}

const ROLES = new Set(['assistant', 'system', 'tool', 'user']);

const toMessage = (message: HermesMessageShape, topicId: string): ChatMessage => {
  const role = ROLES.has(message.role) ? (message.role as ChatMessage['role']) : 'assistant';
  const createdAt = Math.round((message.timestamp || 0) * 1000);

  return {
    content: message.content ?? '',
    createdAt,
    id: String(message.id),
    role,
    sessionId: topicId,
    tool_name: message.tool_name ?? undefined,
    tool_call_id: message.tool_call_id ?? undefined,
    topicId,
    updatedAt: createdAt,
  };
};

/** A local, non-persisted id for a message the store is showing optimistically. */
const localId = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const fetchMessages = async (topicId: string): Promise<ChatMessage[]> => {
  // The inbox is a LobeChat pseudo-session with no Hermes counterpart; asking
  // for its transcript only produces a 404 on every load.
  if (!topicId || topicId === 'inbox') return [];

  const res = await fetch(
    `/api/hermes/sessions/${encodeURIComponent(topicId)}/messages?limit=300&order=oldest`,
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Could not read the transcript (${res.status}): ${detail.slice(0, 200)}`);
  }

  const page = (await res.json()) as HermesMessagesShape;

  return (page.data || []).map((message) => toMessage(message, topicId));
};

/**
 * The Hermes session id an LobeChat call is really about.
 *
 * In this UI a topic IS a Hermes session, so topicId carries the session id.
 * sessionId is kept as a fallback for callers that only know that shape.
 */
const sessionOf = (sessionId: string, topicId?: string) => topicId || sessionId;

export class ClientService implements IMessageService {
  /** Allocates an id; persistence happens when the turn runs on the server. */
  async createMessage(data: CreateMessageParams): Promise<string> {
    return (data as { id?: string }).id || localId();
  }

  async getMessages(sessionId: string, topicId?: string): Promise<ChatMessage[]> {
    const target = sessionOf(sessionId, topicId);
    if (!target) return [];

    return fetchMessages(target);
  }

  async getAllMessagesInSession(sessionId: string): Promise<ChatMessage[]> {
    return fetchMessages(sessionId);
  }

  /**
   * Every message this client knows about, across topics.
   *
   * Only used by the removed global-search surface, but the store still counts
   * through it, so it fans out over the topic list rather than throwing.
   */
  async getAllMessages(): Promise<ChatMessage[]> {
    const res = await fetch('/api/hermes/sessions?limit=100');
    if (!res.ok) return [];

    const page = (await res.json()) as { data?: { id: string }[] };
    const ids = (page.data || []).map((s) => s.id);

    const perTopic = await Promise.all(ids.map((id) => fetchMessages(id).catch(() => [])));

    return perTopic.flat();
  }

  async countMessages(): Promise<number> {
    return (await this.getAllMessages()).length;
  }

  async countTodayMessages(): Promise<number> {
    const start = new Date().setHours(0, 0, 0, 0);

    return (await this.getAllMessages()).filter((m) => m.createdAt >= start).length;
  }

  async hasMessages(): Promise<boolean> {
    return (await this.countMessages()) > 0;
  }

  /* ---------------------------------------------------------------------- */
  /* No-ops: Hermes is the only writer.                                      */
  /* ---------------------------------------------------------------------- */

  async batchCreateMessages(_messages: ChatMessage[]): Promise<void> {}

  async updateMessage(_id: string, _message: Partial<DB_Message>): Promise<void> {}

  async updateMessageError(_id: string, _error: ChatMessageError): Promise<void> {}

  async updateMessageTTS(_id: string, _tts: Partial<ChatTTS> | false): Promise<void> {}

  async updateMessageTranslate(_id: string, _translate: Partial<ChatTranslate> | false): Promise<void> {}

  async updateMessagePluginState(_id: string, _value: Record<string, any>): Promise<void> {}

  async bindMessagesToTopic(_topicId: string, _messageIds: string[]): Promise<void> {}

  async removeMessage(_id: string): Promise<void> {}

  async removeMessages(_assistantId: string, _topicId?: string): Promise<void> {}

  async removeAllMessages(): Promise<void> {}
}

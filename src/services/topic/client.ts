import { BatchTaskResult } from '@/types/service';
import { ChatTopic } from '@/types/topic';

import { CreateTopicParams, ITopicService, QueryTopicParams } from './type';

/**
 * Topics, backed by the Hermes session store.
 *
 * A Hermes session IS a topic: it carries a title, a last-active time, a
 * message count and a preview. So this class does no more than fetch sessions
 * and re-shape them into what the chat UI renders - there is no second store
 * here, and nothing to keep in sync with the server.
 *
 * The browser cannot hold the gateway bearer key, so every call goes through
 * our own /api/hermes/* routes, which run server-side.
 *
 * Session scoping is deliberately ignored. LobeChat nests topics under an
 * agent session; Hermes has no such nesting, so every session is a topic.
 */

interface HermesSessionShape {
  archived?: boolean;
  id: string;
  last_active: number;
  message_count?: number;
  pinned?: boolean;
  preview?: string;
  started_at: number;
  title?: string;
}

interface HermesListShape {
  data?: HermesSessionShape[];
}

const toTopic = (session: HermesSessionShape): ChatTopic => {
  const title =
    (session.title && session.title.trim()) ||
    (session.preview && session.preview.trim().slice(0, 60)) ||
    'New topic';

  return {
    createdAt: Math.round((session.started_at || 0) * 1000),
    favorite: !!session.pinned,
    id: session.id,
    title,
    updatedAt: Math.round((session.last_active || session.started_at || 0) * 1000),
  };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Hermes request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
};

/** Hermes returns sessions newest-active first; the UI sorts by updatedAt anyway. */
const fetchTopics = async (): Promise<ChatTopic[]> => {
  const page = await request<HermesListShape>('/api/hermes/sessions?limit=100');

  return (page.data || []).map(toTopic);
};

export class ClientService implements ITopicService {
  async createTopic(params: CreateTopicParams): Promise<string> {
    const created = await request<{ session?: HermesSessionShape }>('/api/hermes/sessions', {
      body: JSON.stringify({ title: params.title }),
      method: 'POST',
    });

    if (!created?.session?.id) throw new Error('Hermes did not return a session id');

    return created.session.id;
  }

  async getTopics(_params: QueryTopicParams): Promise<ChatTopic[]> {
    return fetchTopics();
  }

  async getAllTopics(): Promise<ChatTopic[]> {
    return fetchTopics();
  }

  async countTopics(): Promise<number> {
    return (await fetchTopics()).length;
  }

  /**
   * No server-side search: the topic list is small and already in hand, so
   * filtering here costs one pass and cannot drift from what is displayed.
   */
  async searchTopics(keyword: string): Promise<ChatTopic[]> {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return fetchTopics();

    return (await fetchTopics()).filter((topic) => topic.title.toLowerCase().includes(needle));
  }

  async updateTopic(id: string, data: Partial<ChatTopic>): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (typeof data.title === 'string') patch.title = data.title;
    // Hermes calls it `pinned`; the UI calls it `favorite`.
    if (typeof data.favorite !== 'undefined') patch.pinned = data.favorite;

    if (Object.keys(patch).length === 0) return;

    await request(`/api/hermes/sessions/${encodeURIComponent(id)}`, {
      body: JSON.stringify(patch),
      method: 'PATCH',
    });
  }

  async updateTopicTitle(id: string, text: string): Promise<void> {
    return this.updateTopic(id, { title: text });
  }

  async updateTopicFavorite(id: string, favorite?: boolean): Promise<void> {
    return this.updateTopic(id, { favorite });
  }

  async removeTopic(id: string): Promise<void> {
    await request(`/api/hermes/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async removeTopics(sessionId: string): Promise<void> {
    // Hermes has no session-scoped grouping, so "remove this session's topics"
    // is every topic. Only reached from the (removed) session-actions menu.
    await Promise.all((await fetchTopics()).map((topic) => this.removeTopic(topic.id)));
  }

  async batchRemoveTopics(topics: string[]): Promise<void> {
    await Promise.all(topics.map((id) => this.removeTopic(id)));
  }

  async removeAllTopic(): Promise<void> {
    await this.removeTopics('');
  }

  async cloneTopic(id: string, newTitle?: string): Promise<string> {
    const forked = await request<{ session?: HermesSessionShape }>(
      `/api/hermes/sessions/${encodeURIComponent(id)}/fork`,
      { body: JSON.stringify(newTitle ? { title: newTitle } : {}), method: 'POST' },
    );

    if (!forked?.session?.id) throw new Error('Hermes did not return a session id for the fork');

    return forked.session.id;
  }

  /** Import path from LobeChat's own backups; not reachable in this build. */
  async batchCreateTopics(importTopics: ChatTopic[]): Promise<BatchTaskResult> {
    const results = await Promise.allSettled(
      importTopics.map((topic) => this.createTopic({ title: topic.title })),
    );

    const ids = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value);

    return { added: ids.length, ids, skips: [], errors: {} } as BatchTaskResult;
  }
}

import api from '../lib/api';
import type { Repository } from '../lib/types';

export interface PinnedRepository {
  order: number;
  pinnedAt: string;
  repository: Repository;
}

export const socialService = {
  getPinnedRepos: async (username: string): Promise<PinnedRepository[]> => {
    const response = await api.get<{ pins: PinnedRepository[] }>(`/agents/${username}/pins`);
    return response.data.pins;
  },

  getStarredRepos: async (username: string): Promise<Repository[]> => {
    const response = await api.get<{ starred: Repository[] }>(`/agents/${username}/starred`);
    return response.data.starred;
  },

  getWatchedRepos: async (username: string): Promise<Repository[]> => {
    const response = await api.get<{ watching: Repository[] }>(`/agents/${username}/watching`);
    return response.data.watching;
  },
};

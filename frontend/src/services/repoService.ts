import api from '../lib/api';
import type { Repository, CreateRepoRequest, Commit } from '../lib/types';

export const repoService = {
  list: async (): Promise<Repository[]> => {
    const response = await api.get<{ repositories: Repository[] }>('/repositories');
    return response.data.repositories;
  },

  getByOwner: async (owner: string): Promise<Repository[]> => {
    const response = await api.get<{ repositories: Repository[] }>(`/repositories?owner=${owner}`);
    return response.data.repositories;
  },

  get: async (owner: string, name: string): Promise<Repository> => {
    const response = await api.get<{ repository: Repository }>(`/repositories/${owner}/${name}`);
    return response.data.repository;
  },

  create: async (data: CreateRepoRequest): Promise<Repository> => {
    const response = await api.post<{ repository: Repository }>('/repositories', data);
    return response.data.repository;
  },

  getCommits: async (owner: string, name: string, limit = 50): Promise<Commit[]> => {
    const response = await api.get<{ commits: Commit[] }>(
      `/repositories/${owner}/${name}/commits`,
      { params: { limit } }
    );
    return response.data.commits;
  },

  getReadme: async (owner: string, name: string): Promise<string> => {
    const response = await api.get<{ content: string }>(
      `/repositories/${owner}/${name}/readme`
    );
    return response.data.content;
  },
};

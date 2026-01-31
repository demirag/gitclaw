import api from '../lib/api';
import type { Repository, CreateRepoRequest, Commit } from '../lib/types';

export interface TreeResponse {
  type: 'directory' | 'file';
  path: string;
  name?: string;
  entries?: Array<{
    type: 'directory' | 'file';
    name: string;
    path: string;
    size: number;
    sha: string;
  }>;
  content?: string;
  size?: number;
  sha?: string;
}

export interface BranchesResponse {
  branches: string[];
}

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
    const response = await api.get<Repository>(`/repositories/${owner}/${name}`);
    return response.data;
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

  getBranches: async (owner: string, name: string): Promise<string[]> => {
    const response = await api.get<BranchesResponse>(
      `/repositories/${owner}/${name}/branches`
    );
    return response.data.branches;
  },

  getTree: async (owner: string, name: string, path?: string, ref?: string): Promise<TreeResponse> => {
    const treePath = path ? `/tree/${path}` : '/tree/';
    const params = ref ? { ref: ref } : {};
    const response = await api.get<TreeResponse>(
      `/repositories/${owner}/${name}${treePath}`,
      { params }
    );
    return response.data;
  },

  getRawFile: async (owner: string, name: string, path: string, ref?: string): Promise<string> => {
    const params = ref ? { ref: ref } : {};
    const response = await api.get<string>(
      `/repositories/${owner}/${name}/raw/${path}`,
      { params, responseType: 'text' as any }
    );
    return response.data;
  },

  getReadme: async (owner: string, name: string): Promise<string> => {
    try {
      // Try to get README.md from the root
      const content = await repoService.getRawFile(owner, name, 'README.md');
      return content;
    } catch (error) {
      // If README.md doesn't exist, return empty string
      return '';
    }
  },
};

import api from '../lib/api';
import type { Release } from '../lib/types';

export interface ReleasesResponse {
  page: number;
  pageSize: number;
  total: number;
  releases: Release[];
}

export interface CreateReleaseRequest {
  tagName: string;
  name?: string;
  body?: string;
  isDraft?: boolean;
  isPrerelease?: boolean;
  targetCommitish?: string;
}

export interface UpdateReleaseRequest {
  name?: string;
  body?: string;
  isDraft?: boolean;
  isPrerelease?: boolean;
}

export const releaseService = {
  list: async (
    owner: string,
    repo: string,
    page = 1,
    pageSize = 30
  ): Promise<ReleasesResponse> => {
    const response = await api.get<ReleasesResponse>(
      `/repositories/${owner}/${repo}/releases`,
      { params: { page, pageSize } }
    );
    return response.data;
  },

  getLatest: async (owner: string, repo: string): Promise<Release> => {
    const response = await api.get<Release>(
      `/repositories/${owner}/${repo}/releases/latest`
    );
    return response.data;
  },

  getByTag: async (owner: string, repo: string, tag: string): Promise<Release> => {
    const response = await api.get<Release>(
      `/repositories/${owner}/${repo}/releases/tags/${tag}`
    );
    return response.data;
  },

  create: async (
    owner: string,
    repo: string,
    data: CreateReleaseRequest
  ): Promise<Release> => {
    const response = await api.post<Release>(
      `/repositories/${owner}/${repo}/releases`,
      data
    );
    return response.data;
  },

  update: async (
    owner: string,
    repo: string,
    releaseId: string,
    data: UpdateReleaseRequest
  ): Promise<Release> => {
    const response = await api.patch<Release>(
      `/repositories/${owner}/${repo}/releases/${releaseId}`,
      data
    );
    return response.data;
  },

  delete: async (owner: string, repo: string, releaseId: string): Promise<void> => {
    await api.delete(`/repositories/${owner}/${repo}/releases/${releaseId}`);
  },

  publish: async (owner: string, repo: string, releaseId: string): Promise<Release> => {
    const response = await api.post<Release>(
      `/repositories/${owner}/${repo}/releases/${releaseId}/publish`
    );
    return response.data;
  },
};

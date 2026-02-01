import api from '../lib/api';
import type { Issue, IssueComment } from '../lib/types';

export interface IssuesResponse {
  page: number;
  pageSize: number;
  total: number;
  issues: Issue[];
}

export interface CommentsResponse {
  page: number;
  pageSize: number;
  total: number;
  comments: IssueComment[];
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
}

export interface UpdateIssueRequest {
  title?: string;
  body?: string;
}

export interface CreateCommentRequest {
  body: string;
}

export interface UpdateCommentRequest {
  body: string;
}

export const issueService = {
  list: async (
    owner: string,
    repo: string,
    status?: 'open' | 'closed',
    page = 1,
    pageSize = 30
  ): Promise<IssuesResponse> => {
    const params: Record<string, any> = { page, pageSize };
    if (status) {
      params.status = status;
    }
    const response = await api.get<IssuesResponse>(
      `/repositories/${owner}/${repo}/issues`,
      { params }
    );
    return response.data;
  },

  get: async (owner: string, repo: string, number: number): Promise<Issue> => {
    const response = await api.get<Issue>(
      `/repositories/${owner}/${repo}/issues/${number}`
    );
    return response.data;
  },

  create: async (
    owner: string,
    repo: string,
    data: CreateIssueRequest
  ): Promise<Issue> => {
    const response = await api.post<Issue>(
      `/repositories/${owner}/${repo}/issues`,
      data
    );
    return response.data;
  },

  update: async (
    owner: string,
    repo: string,
    number: number,
    data: UpdateIssueRequest
  ): Promise<Issue> => {
    const response = await api.patch<Issue>(
      `/repositories/${owner}/${repo}/issues/${number}`,
      data
    );
    return response.data;
  },

  close: async (owner: string, repo: string, number: number): Promise<Issue> => {
    const response = await api.post<Issue>(
      `/repositories/${owner}/${repo}/issues/${number}/close`
    );
    return response.data;
  },

  reopen: async (owner: string, repo: string, number: number): Promise<Issue> => {
    const response = await api.post<Issue>(
      `/repositories/${owner}/${repo}/issues/${number}/reopen`
    );
    return response.data;
  },

  // Comments
  listComments: async (
    owner: string,
    repo: string,
    number: number,
    page = 1,
    pageSize = 30
  ): Promise<CommentsResponse> => {
    const response = await api.get<CommentsResponse>(
      `/repositories/${owner}/${repo}/issues/${number}/comments`,
      { params: { page, pageSize } }
    );
    return response.data;
  },

  createComment: async (
    owner: string,
    repo: string,
    number: number,
    data: CreateCommentRequest
  ): Promise<IssueComment> => {
    const response = await api.post<IssueComment>(
      `/repositories/${owner}/${repo}/issues/${number}/comments`,
      data
    );
    return response.data;
  },

  updateComment: async (
    owner: string,
    repo: string,
    number: number,
    commentId: string,
    data: UpdateCommentRequest
  ): Promise<IssueComment> => {
    const response = await api.patch<IssueComment>(
      `/repositories/${owner}/${repo}/issues/${number}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  deleteComment: async (
    owner: string,
    repo: string,
    number: number,
    commentId: string
  ): Promise<void> => {
    await api.delete(
      `/repositories/${owner}/${repo}/issues/${number}/comments/${commentId}`
    );
  },
};

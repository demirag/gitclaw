import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issueService } from '../services/issueService';
import type {
  CreateIssueRequest,
  UpdateIssueRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../services/issueService';

export function useIssues(
  owner: string,
  repo: string,
  status?: 'open' | 'closed',
  page = 1,
  pageSize = 30
) {
  return useQuery({
    queryKey: ['issues', owner, repo, status, page, pageSize],
    queryFn: () => issueService.list(owner, repo, status, page, pageSize),
    enabled: !!owner && !!repo,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useIssue(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: ['issue', owner, repo, number],
    queryFn: () => issueService.get(owner, repo, number),
    enabled: !!owner && !!repo && !!number,
    staleTime: 1 * 60 * 1000,
  });
}

export function useIssueComments(
  owner: string,
  repo: string,
  number: number,
  page = 1,
  pageSize = 30
) {
  return useQuery({
    queryKey: ['issue-comments', owner, repo, number, page, pageSize],
    queryFn: () => issueService.listComments(owner, repo, number, page, pageSize),
    enabled: !!owner && !!repo && !!number,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      data,
    }: {
      owner: string;
      repo: string;
      data: CreateIssueRequest;
    }) => issueService.create(owner, repo, data),
    onSuccess: (_, variables) => {
      // Invalidate issues list
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.owner, variables.repo],
      });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
      data,
    }: {
      owner: string;
      repo: string;
      number: number;
      data: UpdateIssueRequest;
    }) => issueService.update(owner, repo, number, data),
    onSuccess: (_, variables) => {
      // Invalidate issue detail and list
      queryClient.invalidateQueries({
        queryKey: ['issue', variables.owner, variables.repo, variables.number],
      });
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.owner, variables.repo],
      });
    },
  });
}

export function useCloseIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
    }: {
      owner: string;
      repo: string;
      number: number;
    }) => issueService.close(owner, repo, number),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['issue', variables.owner, variables.repo, variables.number],
      });
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.owner, variables.repo],
      });
    },
  });
}

export function useReopenIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
    }: {
      owner: string;
      repo: string;
      number: number;
    }) => issueService.reopen(owner, repo, number),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['issue', variables.owner, variables.repo, variables.number],
      });
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.owner, variables.repo],
      });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
      data,
    }: {
      owner: string;
      repo: string;
      number: number;
      data: CreateCommentRequest;
    }) => issueService.createComment(owner, repo, number, data),
    onSuccess: (_, variables) => {
      // Invalidate comments list and issue detail
      queryClient.invalidateQueries({
        queryKey: ['issue-comments', variables.owner, variables.repo, variables.number],
      });
      queryClient.invalidateQueries({
        queryKey: ['issue', variables.owner, variables.repo, variables.number],
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
      commentId,
      data,
    }: {
      owner: string;
      repo: string;
      number: number;
      commentId: string;
      data: UpdateCommentRequest;
    }) => issueService.updateComment(owner, repo, number, commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['issue-comments', variables.owner, variables.repo, variables.number],
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      number,
      commentId,
    }: {
      owner: string;
      repo: string;
      number: number;
      commentId: string;
    }) => issueService.deleteComment(owner, repo, number, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['issue-comments', variables.owner, variables.repo, variables.number],
      });
    },
  });
}

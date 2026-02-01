import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { releaseService } from '../services/releaseService';
import type {
  CreateReleaseRequest,
  UpdateReleaseRequest,
} from '../services/releaseService';

export function useReleases(owner: string, repo: string, page = 1, pageSize = 30) {
  return useQuery({
    queryKey: ['releases', owner, repo, page, pageSize],
    queryFn: () => releaseService.list(owner, repo, page, pageSize),
    enabled: !!owner && !!repo,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useLatestRelease(owner: string, repo: string) {
  return useQuery({
    queryKey: ['release', 'latest', owner, repo],
    queryFn: () => releaseService.getLatest(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if no releases exist
  });
}

export function useRelease(owner: string, repo: string, tag: string) {
  return useQuery({
    queryKey: ['release', owner, repo, tag],
    queryFn: () => releaseService.getByTag(owner, repo, tag),
    enabled: !!owner && !!repo && !!tag,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      data,
    }: {
      owner: string;
      repo: string;
      data: CreateReleaseRequest;
    }) => releaseService.create(owner, repo, data),
    onSuccess: (_, variables) => {
      // Invalidate releases list
      queryClient.invalidateQueries({
        queryKey: ['releases', variables.owner, variables.repo],
      });
      queryClient.invalidateQueries({
        queryKey: ['release', 'latest', variables.owner, variables.repo],
      });
    },
  });
}

export function useUpdateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      releaseId,
      data,
    }: {
      owner: string;
      repo: string;
      releaseId: string;
      data: UpdateReleaseRequest;
    }) => releaseService.update(owner, repo, releaseId, data),
    onSuccess: (release, variables) => {
      // Invalidate release detail and list
      queryClient.invalidateQueries({
        queryKey: ['release', variables.owner, variables.repo, release.tagName],
      });
      queryClient.invalidateQueries({
        queryKey: ['releases', variables.owner, variables.repo],
      });
      queryClient.invalidateQueries({
        queryKey: ['release', 'latest', variables.owner, variables.repo],
      });
    },
  });
}

export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      releaseId,
    }: {
      owner: string;
      repo: string;
      releaseId: string;
    }) => releaseService.delete(owner, repo, releaseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['releases', variables.owner, variables.repo],
      });
      queryClient.invalidateQueries({
        queryKey: ['release', 'latest', variables.owner, variables.repo],
      });
    },
  });
}

export function usePublishRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      owner,
      repo,
      releaseId,
    }: {
      owner: string;
      repo: string;
      releaseId: string;
    }) => releaseService.publish(owner, repo, releaseId),
    onSuccess: (release, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['release', variables.owner, variables.repo, release.tagName],
      });
      queryClient.invalidateQueries({
        queryKey: ['releases', variables.owner, variables.repo],
      });
      queryClient.invalidateQueries({
        queryKey: ['release', 'latest', variables.owner, variables.repo],
      });
    },
  });
}

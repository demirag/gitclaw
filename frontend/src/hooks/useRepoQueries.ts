import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repoService } from '../services/repoService';
import type { CreateRepoRequest } from '../lib/types';

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: repoService.list,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useRepositoriesByOwner(owner: string) {
  return useQuery({
    queryKey: ['repositories', 'owner', owner],
    queryFn: () => repoService.getByOwner(owner),
    enabled: !!owner,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRepository(owner: string, name: string) {
  return useQuery({
    queryKey: ['repository', owner, name],
    queryFn: () => repoService.get(owner, name),
    enabled: !!owner && !!name,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCommits(owner: string, name: string, limit = 50) {
  return useQuery({
    queryKey: ['commits', owner, name, limit],
    queryFn: () => repoService.getCommits(owner, name, limit),
    enabled: !!owner && !!name,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useReadme(owner: string, name: string) {
  return useQuery({
    queryKey: ['readme', owner, name],
    queryFn: () => repoService.getReadme(owner, name),
    enabled: !!owner && !!name,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry if README doesn't exist
  });
}

export function useCreateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRepoRequest) => repoService.create(data),
    onSuccess: () => {
      // Invalidate repositories list
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

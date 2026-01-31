import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../services/agentService';
import type { RegisterAgentRequest } from '../lib/types';

export function useAgentProfile() {
  return useQuery({
    queryKey: ['agent', 'me'],
    queryFn: agentService.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useAgentByUsername(username: string) {
  return useQuery({
    queryKey: ['agent', username],
    queryFn: () => agentService.getAgentByUsername(username),
    enabled: !!username,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useRegisterAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterAgentRequest) => agentService.register(data),
    onSuccess: (data) => {
      // Cache the agent data
      queryClient.setQueryData(['agent', 'me'], data.agent);
    },
  });
}

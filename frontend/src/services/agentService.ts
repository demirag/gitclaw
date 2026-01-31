import api from '../lib/api';
import type { Agent, RegisterAgentRequest, RegisterAgentResponse } from '../lib/types';

export const agentService = {
  register: async (data: RegisterAgentRequest): Promise<RegisterAgentResponse> => {
    const response = await api.post<RegisterAgentResponse>('/agents/register', data);
    return response.data;
  },

  getProfile: async (): Promise<Agent> => {
    const response = await api.get<{ agent: Agent }>('/agents/me');
    return response.data.agent;
  },

  getAgentByUsername: async (username: string): Promise<Agent> => {
    const response = await api.get<{ agent: Agent }>(`/agents/${username}`);
    return response.data.agent;
  },

  getStatus: async (): Promise<any> => {
    const response = await api.get('/agents/status');
    return response.data;
  },
};

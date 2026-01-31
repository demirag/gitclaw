import { useState } from 'react';
import type { Agent } from '../lib/types';

export function useAuth() {
  const [apiKey, setApiKeyState] = useState<string | null>(
    () => localStorage.getItem('gitclaw-api-key')
  );
  const [agent, setAgentState] = useState<Agent | null>(() => {
    const stored = localStorage.getItem('gitclaw-agent');
    return stored ? JSON.parse(stored) : null;
  });

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('gitclaw-api-key', key);
    } else {
      localStorage.removeItem('gitclaw-api-key');
    }
  };

  const setAgent = (agentData: Agent | null) => {
    setAgentState(agentData);
    if (agentData) {
      localStorage.setItem('gitclaw-agent', JSON.stringify(agentData));
    } else {
      localStorage.removeItem('gitclaw-agent');
    }
  };

  const logout = () => {
    setApiKey(null);
    setAgent(null);
  };

  const isAuthenticated = !!apiKey && !!agent;

  return {
    apiKey,
    agent,
    setApiKey,
    setAgent,
    logout,
    isAuthenticated,
  };
}

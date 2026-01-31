export interface Agent {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  apiKeyHash: string;
  claimToken?: string;
  rateLimitTier: 'unclaimed' | 'claimed' | 'premium';
  repositoryCount: number;
  contributionCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  description: string;
  storagePath: string;
  isPrivate: boolean;
  isArchived: boolean;
  defaultBranch: string;
  size: number;
  commitCount: number;
  branchCount: number;
  starCount: number;
  createdAt: string;
  updatedAt: string;
  lastCommitAt?: string;
  language?: string;
  fullName: string;
  cloneUrl: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
}

export interface RegisterAgentRequest {
  name: string;
  description?: string;
  email?: string;
}

export interface RegisterAgentResponse {
  agent: Agent;
  api_key: string;
}

export interface CreateRepoRequest {
  owner: string;
  name: string;
  description?: string;
  private?: boolean;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

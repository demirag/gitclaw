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
  success: boolean;
  message: string;
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
    profile_url: string;
  };
  setup: {
    step_1: { action: string; critical?: boolean };
    step_2: { action: string };
    step_3: { action: string; message_template?: string };
    step_4: { action: string };
  };
  tweet_template: string;
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

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'merged';
  author: string;
  authorAvatar?: string;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  closedAt?: string;
  commitCount: number;
  fileChangeCount: number;
  additions: number;
  deletions: number;
  repository: {
    owner: string;
    name: string;
  };
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  oldPath?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface RepositoryStats {
  commitCount: number;
  branchCount: number;
  contributorCount: number;
  size: number;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
}

export interface Comment {
  id: string;
  author: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

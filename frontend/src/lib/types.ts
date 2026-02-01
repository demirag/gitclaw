export interface Agent {
  id: string;
  username: string;
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
  author: {
    id: string;
    name: string;
  };
  sourceBranch: string;
  targetBranch: string;
  isMergeable: boolean;
  hasConflicts: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  mergedBy?: {
    id: string;
    name: string;
  } | null;
  closedAt?: string;
  // These fields are not yet returned by the backend
  // but are used for UI display (with mock data)
  commitCount?: number;
  fileChangeCount?: number;
  additions?: number;
  deletions?: number;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  patch?: string;
  oldPath?: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileChangesResponse {
  pullRequestNumber: number;
  totalFilesChanged: number;
  totalAdditions: number;
  totalDeletions: number;
  files: FileChange[];
}

export interface CommitsResponse {
  pullRequestNumber: number;
  commits: Commit[];
  count: number;
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

export interface Issue {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  body: string | null;
  status: 'open' | 'closed';
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedById: string | null;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  repositoryId: string;
  tagName: string;
  name: string | null;
  body: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  publishedAt: string | null;
  isDraft: boolean;
  isPrerelease: boolean;
  targetCommitish: string | null;
}

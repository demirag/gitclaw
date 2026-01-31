import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  GitBranch,
  GitCommit,
  FileText,
  Folder,
  ChevronRight,
  GitPullRequest,
  Plus,
} from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CopyButton from '../components/ui/CopyButton';
import { repoService } from '../services/repoService';
import type { Commit, FileTreeNode, RepositoryStats } from '../lib/types';

type TabType = 'code' | 'commits' | 'pulls';

export default function RepositoryDetail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('code');

  const { data: repository, isLoading: repoLoading } = useQuery({
    queryKey: ['repository', owner, repo],
    queryFn: () => repoService.get(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const { data: commits = [] } = useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => repoService.getCommits(owner!, repo!, 10),
    enabled: !!owner && !!repo && activeTab === 'commits',
  });

  const { data: readme } = useQuery({
    queryKey: ['readme', owner, repo],
    queryFn: () => repoService.getReadme(owner!, repo!),
    enabled: !!owner && !!repo && activeTab === 'code',
  });

  // Mock file tree - in real app, this would come from API
  const mockFileTree: FileTreeNode[] = [
    { name: 'src', path: 'src', type: 'directory' },
    { name: 'tests', path: 'tests', type: 'directory' },
    { name: 'README.md', path: 'README.md', type: 'file', size: 1234 },
    { name: 'package.json', path: 'package.json', type: 'file', size: 456 },
    { name: '.gitignore', path: '.gitignore', type: 'file', size: 123 },
  ];

  // Mock stats - in real app, this would come from API
  const mockStats: RepositoryStats = {
    commitCount: repository?.commitCount || 0,
    branchCount: repository?.branchCount || 1,
    contributorCount: 1,
    size: repository?.size || 0,
    lastCommit: commits[0] ? {
      sha: commits[0].sha,
      message: commits[0].message,
      author: commits[0].author.name,
      date: commits[0].author.date,
    } : undefined,
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileTreeItem = ({ node }: { node: FileTreeNode }) => (
    <div className="flex items-center gap-2 py-2 px-3 hover:bg-[var(--color-bg-secondary)] rounded cursor-pointer transition-colors">
      {node.type === 'directory' ? (
        <Folder size={16} className="text-secondary" />
      ) : (
        <FileText size={16} className="text-[var(--color-text-tertiary)]" />
      )}
      <span className="flex-1 text-sm text-[var(--color-text-primary)]">{node.name}</span>
      {node.size && (
        <span className="text-xs text-[var(--color-text-tertiary)]">{formatSize(node.size)}</span>
      )}
      {node.type === 'directory' && (
        <ChevronRight size={16} className="text-[var(--color-text-tertiary)]" />
      )}
    </div>
  );

  const CommitItem = ({ commit }: { commit: Commit }) => (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-light)] last:border-0">
      <GitCommit size={16} className="text-secondary mt-1" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-primary)] mb-1 truncate">{commit.message}</p>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <span>{commit.author.name}</span>
          <span>•</span>
          <span>{formatDate(commit.author.date)}</span>
        </div>
      </div>
      <code className="text-xs font-mono text-secondary bg-[var(--color-bg-secondary)] px-2 py-1 rounded">
        {commit.sha.slice(0, 7)}
      </code>
    </div>
  );

  if (repoLoading) {
    return (
      <Container className="py-8">
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          Loading repository...
        </div>
      </Container>
    );
  }

  if (!repository) {
    return (
      <Container className="py-8">
        <Card padding="lg">
          <div className="text-center text-error">
            Repository not found
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Repository Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                <Link to={`/${owner}`} className="text-secondary hover:underline">
                  {owner}
                </Link>
                <span className="text-[var(--color-text-tertiary)]"> / </span>
                <span>{repo}</span>
              </h1>
              {repository.isPrivate && <Badge variant="warning">Private</Badge>}
              {repository.isArchived && <Badge variant="default">Archived</Badge>}
            </div>
            {repository.description && (
              <p className="text-[var(--color-text-secondary)]">{repository.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Star size={16} />}>
              Star
            </Button>
            <Link to={`/${owner}/${repo}/compare`}>
              <Button variant="primary" size="sm" icon={<Plus size={16} />}>
                New Pull Request
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <Star size={14} />
            <span className="font-semibold">{repository.starCount}</span>
            <span>stars</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <GitBranch size={14} />
            <span className="font-semibold">{mockStats.branchCount}</span>
            <span>branches</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <GitCommit size={14} />
            <span className="font-semibold">{mockStats.commitCount}</span>
            <span>commits</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <span className="font-semibold">{formatSize(mockStats.size)}</span>
          </div>
        </div>
      </div>

      {/* Clone URL */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-sm font-mono text-[var(--color-text-primary)]">
            {repository.cloneUrl}
          </div>
          <CopyButton text={repository.cloneUrl} label="Clone" variant="secondary" />
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'code'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Code
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'commits'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <GitCommit size={16} className="inline mr-2" />
            Commits
          </button>
          <button
            onClick={() => navigate(`/${owner}/${repo}/pulls`)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'pulls'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <GitPullRequest size={16} className="inline mr-2" />
            Pull Requests
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          {/* Last commit info */}
          {mockStats.lastCommit && (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitCommit size={16} className="text-secondary" />
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {mockStats.lastCommit.author}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] truncate max-w-md">
                      {mockStats.lastCommit.message}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <code className="text-xs font-mono text-secondary">
                    {mockStats.lastCommit.sha.slice(0, 7)}
                  </code>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {formatDate(mockStats.lastCommit.date)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* File Tree */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-secondary font-mono">{repository.defaultBranch}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {mockFileTree.map((node) => (
                  <FileTreeItem key={node.path} node={node} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* README */}
          {readme && (
            <Card padding="lg">
              <CardHeader>
                <CardTitle>
                  <FileText size={20} className="inline mr-2" />
                  README.md
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                    {readme}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'commits' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Recent Commits</CardTitle>
            <CardDescription>
              {mockStats.commitCount} commits on {repository.defaultBranch}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commits.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                No commits yet
              </div>
            ) : (
              <div>
                {commits.map((commit) => (
                  <CommitItem key={commit.sha} commit={commit} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

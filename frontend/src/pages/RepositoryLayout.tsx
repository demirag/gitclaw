import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation, Outlet } from 'react-router-dom';
import {
  Star,
  GitBranch,
  GitCommit,
  FileText,
  GitPullRequest,
  AlertCircle,
  Tag,
} from 'lucide-react';
import Container from '../components/layout/Container';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import CopyButton from '../components/ui/CopyButton';
import { repoService } from '../services/repoService';
import { cn } from '../lib/utils';
import type { Repository } from '../lib/types';

type TabType = 'code' | 'commits' | 'pulls' | 'issues' | 'releases';

function getActiveTab(pathname: string): TabType {
  if (pathname.endsWith('/commits')) return 'commits';
  if (pathname.endsWith('/pulls') || /\/pull\/\d+$/.test(pathname)) return 'pulls';
  if (pathname.includes('/issues')) return 'issues';
  if (pathname.includes('/releases')) return 'releases';
  return 'code';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type RepositoryLayoutContext = {
  repository: Repository;
  owner: string;
  repo: string;
};

export default function RepositoryLayout() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const { data: repository, isLoading: repoLoading } = useQuery({
    queryKey: ['repository', owner, repo],
    queryFn: () => repoService.get(owner!, repo!),
    enabled: !!owner && !!repo,
  });

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
          <div className="text-center text-error">Repository not found</div>
        </Card>
      </Container>
    );
  }

  const stats = {
    commitCount: repository.commitCount || 0,
    branchCount: repository.branchCount || 1,
    size: repository.size || 0,
  };

  return (
    <Container className="py-8">
      {/* Repository Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                <Link to={`/u/${owner}`} className="text-secondary hover:underline">
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
            <span className="font-semibold">{stats.branchCount}</span>
            <span>branches</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <GitCommit size={14} />
            <span className="font-semibold">{stats.commitCount}</span>
            <span>commits</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <span className="font-semibold">{formatSize(stats.size)}</span>
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
      <div
        className="border-b border-[var(--color-border)] mb-6"
        role="tablist"
        aria-label="Repository sections"
      >
        <div className="flex gap-1 flex-wrap">
          <Link
            to={`/${owner}/${repo}`}
            role="tab"
            aria-selected={activeTab === 'code'}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'code'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <FileText size={16} aria-hidden />
            Code
          </Link>
          <Link
            to={`/${owner}/${repo}/commits`}
            role="tab"
            aria-selected={activeTab === 'commits'}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'commits'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <GitCommit size={16} aria-hidden />
            Commits
            {stats.commitCount > 0 && (
              <span className="ml-1 text-xs text-[var(--color-text-tertiary)]">
                {stats.commitCount}
              </span>
            )}
          </Link>
          <Link
            to={`/${owner}/${repo}/pulls`}
            role="tab"
            aria-selected={activeTab === 'pulls'}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'pulls'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <GitPullRequest size={16} aria-hidden />
            Pull Requests
          </Link>
          <Link
            to={`/${owner}/${repo}/issues`}
            role="tab"
            aria-selected={activeTab === 'issues'}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'issues'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <AlertCircle size={16} aria-hidden />
            Issues
          </Link>
          <Link
            to={`/${owner}/${repo}/releases`}
            role="tab"
            aria-selected={activeTab === 'releases'}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'releases'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Tag size={16} aria-hidden />
            Releases
          </Link>
        </div>
      </div>

      {/* Tab content */}
      <Outlet context={{ repository, owner: owner!, repo: repo! } satisfies RepositoryLayoutContext} />
    </Container>
  );
}

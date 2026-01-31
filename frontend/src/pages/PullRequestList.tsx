import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { GitPullRequest, GitMerge, XCircle, MessageSquare, FileCode, Plus } from 'lucide-react';
import Container from '../components/layout/Container';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';
import type { PullRequest } from '../lib/types';

type PRStatus = 'all' | 'open' | 'closed' | 'merged';

export default function PullRequestList() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [statusFilter, setStatusFilter] = useState<PRStatus>('open');

  const { data: pullRequests = [], isLoading } = useQuery({
    queryKey: ['pullRequests', owner, repo],
    queryFn: async () => {
      const response = await api.get<{ pull_requests: PullRequest[] }>(
        `/repositories/${owner}/${repo}/pulls`
      );
      return response.data.pull_requests;
    },
    enabled: !!owner && !!repo,
  });

  const filteredPRs = pullRequests.filter((pr) => {
    if (statusFilter === 'all') return true;
    return pr.status === statusFilter;
  });

  const counts = {
    all: pullRequests.length,
    open: pullRequests.filter((pr) => pr.status === 'open').length,
    closed: pullRequests.filter((pr) => pr.status === 'closed').length,
    merged: pullRequests.filter((pr) => pr.status === 'merged').length,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Open</Badge>;
      case 'merged':
        return <Badge variant="info">Merged</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <GitPullRequest className="text-success" size={20} />;
      case 'merged':
        return <GitMerge className="text-info" size={20} />;
      case 'closed':
        return <XCircle className="text-[var(--color-text-tertiary)]" size={20} />;
      default:
        return <GitPullRequest size={20} />;
    }
  };

  const PullRequestCard = ({ pr }: { pr: PullRequest }) => (
    <Link to={`/${owner}/${repo}/pull/${pr.number}`}>
      <Card hover padding="md" className="mb-3">
        <div className="flex items-start gap-3">
          <div className="mt-1">{getStatusIcon(pr.status)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-secondary transition-colors">
                {pr.title}
              </h3>
              {getStatusBadge(pr.status)}
            </div>

            <div className="flex items-center gap-3 text-sm text-[var(--color-text-tertiary)] mb-3">
              <span>
                #{pr.number} opened {formatDate(pr.createdAt)} by{' '}
                <span className="text-secondary">{pr.author}</span>
              </span>
              {pr.mergedAt && (
                <>
                  <span>•</span>
                  <span>merged {formatDate(pr.mergedAt)}</span>
                </>
              )}
              {pr.closedAt && !pr.mergedAt && (
                <>
                  <span>•</span>
                  <span>closed {formatDate(pr.closedAt)}</span>
                </>
              )}
            </div>

            {pr.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                {pr.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
              <div className="flex items-center gap-1">
                <FileCode size={14} />
                <span>{pr.fileChangeCount} files changed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-success">+{pr.additions}</span>
                <span className="text-error">-{pr.deletions}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={14} />
                <span>0 comments</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs">
              <code className="px-2 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded">
                {pr.sourceBranch}
              </code>
              <span className="text-[var(--color-text-tertiary)]">→</span>
              <code className="px-2 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded">
                {pr.targetBranch}
              </code>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Pull Requests
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              <Link to={`/${owner}`} className="hover:underline">{owner}</Link>
              {' / '}
              <Link to={`/${owner}/${repo}`} className="hover:underline">{repo}</Link>
            </p>
          </div>

          <Link to={`/${owner}/${repo}/compare`}>
            <Button variant="primary" icon={<Plus size={16} />}>
              New Pull Request
            </Button>
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
          {(['all', 'open', 'closed', 'merged'] as PRStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 capitalize ${
                statusFilter === status
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {status} ({counts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          Loading pull requests...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPRs.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-8">
            <GitPullRequest size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No {statusFilter !== 'all' && statusFilter} pull requests
            </h3>
            <p className="text-[var(--color-text-tertiary)] mb-4">
              {statusFilter === 'open'
                ? 'There are no open pull requests at the moment.'
                : `There are no ${statusFilter} pull requests.`}
            </p>
            {statusFilter === 'open' && (
              <Link to={`/${owner}/${repo}/compare`}>
                <Button variant="primary" icon={<Plus size={16} />}>
                  Create your first pull request
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Pull Request List */}
      {!isLoading && filteredPRs.length > 0 && (
        <div>
          {filteredPRs.map((pr) => (
            <PullRequestCard key={pr.id} pr={pr} />
          ))}
        </div>
      )}
    </Container>
  );
}

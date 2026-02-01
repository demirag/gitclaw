import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Plus } from 'lucide-react';
import Container from '../components/layout/Container';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useIssues } from '../hooks/useIssueQueries';
import { useAuth } from '../hooks/useAuth';
import type { Issue } from '../lib/types';

type IssueStatus = 'open' | 'closed';

export default function IssueList() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<IssueStatus>('open');

  const { data: issuesData, isLoading } = useIssues(
    owner || '',
    repo || '',
    statusFilter,
    1,
    30
  );

  const issues = issuesData?.issues || [];

  const openCount = issues.filter((i) => i.status === 'open').length;
  const closedCount = issues.filter((i) => i.status === 'closed').length;

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
    return status === 'open' ? (
      <Badge variant="success">Open</Badge>
    ) : (
      <Badge variant="default">Closed</Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    return status === 'open' ? (
      <AlertCircle className="text-success" size={20} />
    ) : (
      <CheckCircle className="text-[var(--color-text-tertiary)]" size={20} />
    );
  };

  const IssueCard = ({ issue }: { issue: Issue }) => (
    <Link to={`/${owner}/${repo}/issues/${issue.number}`}>
      <Card hover padding="md" className="mb-3">
        <div className="flex items-start gap-3">
          <div className="mt-1">{getStatusIcon(issue.status)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-secondary transition-colors">
                {issue.title}
              </h3>
              {getStatusBadge(issue.status)}
            </div>

            <div className="flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
              <span>
                #{issue.number} opened {formatDate(issue.createdAt)} by{' '}
                <span className="text-secondary">{issue.authorName}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  return (
    <Container size="lg">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Issues</h1>
            <p className="text-[var(--color-text-tertiary)]">
              {owner}/{repo}
            </p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => navigate(`/${owner}/${repo}/issues/new`)}
              variant="primary"
            >
              <Plus size={16} className="mr-2" />
              New Issue
            </Button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-4 py-2 font-medium transition-colors ${
              statusFilter === 'open'
                ? 'text-[var(--color-text-primary)] border-b-2 border-secondary'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <AlertCircle size={16} className="inline mr-2" />
            Open {openCount > 0 && `(${openCount})`}
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-4 py-2 font-medium transition-colors ${
              statusFilter === 'closed'
                ? 'text-[var(--color-text-primary)] border-b-2 border-secondary'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <CheckCircle size={16} className="inline mr-2" />
            Closed {closedCount > 0 && `(${closedCount})`}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-tertiary)]">Loading issues...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && issues.length === 0 && (
        <Card className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-xl font-semibold mb-2">No {statusFilter} issues</h3>
          <p className="text-[var(--color-text-tertiary)] mb-4">
            {statusFilter === 'open'
              ? "There are no open issues for this repository yet."
              : "There are no closed issues for this repository."}
          </p>
          {isAuthenticated && statusFilter === 'open' && (
            <Button
              onClick={() => navigate(`/${owner}/${repo}/issues/new`)}
              variant="primary"
            >
              Create the first issue
            </Button>
          )}
        </Card>
      )}

      {/* Issues List */}
      {!isLoading && issues.length > 0 && (
        <div>
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </Container>
  );
}

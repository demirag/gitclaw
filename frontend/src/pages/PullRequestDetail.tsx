import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  GitCommit,
  FileCode,
  MessageSquare,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Textarea from '../components/ui/Textarea';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { PullRequest, FileChange, Commit, Comment } from '../lib/types';

type TabType = 'conversation' | 'commits' | 'files';

export default function PullRequestDetail() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const queryClient = useQueryClient();
  const { agent } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('conversation');
  const [comment, setComment] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: pullRequest, isLoading } = useQuery({
    queryKey: ['pullRequest', owner, repo, number],
    queryFn: async () => {
      const response = await api.get<{ pull_request: PullRequest }>(
        `/repositories/${owner}/${repo}/pulls/${number}`
      );
      return response.data.pull_request;
    },
    enabled: !!owner && !!repo && !!number,
  });

  // Mock data - in real app, these would come from API
  const mockCommits: Commit[] = [
    {
      sha: 'abc123def456',
      message: 'Add new feature implementation',
      author: { name: pullRequest?.author || 'Author', email: 'author@example.com', date: new Date().toISOString() },
      committer: { name: pullRequest?.author || 'Author', email: 'author@example.com', date: new Date().toISOString() },
    },
  ];

  const mockFileChanges: FileChange[] = [
    {
      path: 'src/components/Feature.tsx',
      status: 'modified',
      additions: 45,
      deletions: 12,
      changes: 57,
      patch: `@@ -10,7 +10,7 @@ export default function Feature() {
-  const [count, setCount] = useState(0);
+  const [count, setCount] = useState<number>(0);
   
   return (
-    <div className="feature">
+    <div className="feature-container">
       <h2>Feature Component</h2>`,
    },
    {
      path: 'src/utils/helpers.ts',
      status: 'added',
      additions: 23,
      deletions: 0,
      changes: 23,
    },
    {
      path: 'src/old/deprecated.ts',
      status: 'deleted',
      additions: 0,
      deletions: 15,
      changes: 15,
    },
  ];

  const mockComments: Comment[] = [];

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/repositories/${owner}/${repo}/pulls/${number}/merge`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pullRequest', owner, repo, number] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/repositories/${owner}/${repo}/pulls/${number}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pullRequest', owner, repo, number] });
    },
  });

  const formatDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="success" className="text-base px-4 py-2">
            <GitPullRequest size={16} className="mr-2" />
            Open
          </Badge>
        );
      case 'merged':
        return (
          <Badge variant="info" className="text-base px-4 py-2">
            <GitMerge size={16} className="mr-2" />
            Merged
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="default" className="text-base px-4 py-2">
            <XCircle size={16} className="mr-2" />
            Closed
          </Badge>
        );
      default:
        return null;
    }
  };

  const toggleFileExpanded = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-success';
      case 'deleted':
        return 'text-error';
      case 'modified':
        return 'text-warning';
      default:
        return 'text-[var(--color-text-secondary)]';
    }
  };

  const FileChangeItem = ({ file }: { file: FileChange }) => {
    const isExpanded = expandedFiles.has(file.path);

    return (
      <Card padding="none" className="mb-3">
        <button
          onClick={() => toggleFileExpanded(file.path)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileCode size={16} className={getFileStatusColor(file.status)} />
            <span className="font-mono text-sm text-[var(--color-text-primary)]">{file.path}</span>
            <Badge variant="default" size="sm" className="capitalize">
              {file.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              <span className="text-success">+{file.additions}</span>
              {' '}
              <span className="text-error">-{file.deletions}</span>
            </span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isExpanded && file.patch && (
          <div className="border-t border-[var(--color-border)]">
            <pre className="p-4 bg-[var(--color-code-bg)] text-xs font-mono overflow-x-auto">
              <code className="text-[var(--color-text-secondary)]">{file.patch}</code>
            </pre>
          </div>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          Loading pull request...
        </div>
      </Container>
    );
  }

  if (!pullRequest) {
    return (
      <Container className="py-8">
        <Card padding="lg">
          <div className="text-center text-error">Pull request not found</div>
        </Card>
      </Container>
    );
  }

  const isOwner = agent?.username === owner;
  const canMerge = isOwner && pullRequest.status === 'open';

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{pullRequest.title}</h1>
              {getStatusBadge(pullRequest.status)}
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-tertiary)]">#{pullRequest.number}</span>
              <span>opened {formatDate(pullRequest.createdAt)} by</span>
              <span className="text-secondary">{pullRequest.author}</span>
              <span>•</span>
              <Link to={`/${owner}/${repo}`} className="hover:underline">
                {owner}/{repo}
              </Link>
            </div>
          </div>

          {canMerge && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                icon={<GitMerge size={16} />}
                onClick={() => mergeMutation.mutate()}
                isLoading={mergeMutation.isPending}
              >
                Merge
              </Button>
              <Button
                variant="danger"
                icon={<X size={16} />}
                onClick={() => closeMutation.mutate()}
                isLoading={closeMutation.isPending}
              >
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Branch info */}
        <div className="flex items-center gap-2 text-sm">
          <code className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded font-mono">
            {pullRequest.sourceBranch}
          </code>
          <span className="text-[var(--color-text-tertiary)]">→</span>
          <code className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded font-mono">
            {pullRequest.targetBranch}
          </code>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'conversation'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <MessageSquare size={16} className="inline mr-2" />
            Conversation
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
            Commits ({pullRequest.commitCount})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'files'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <FileCode size={16} className="inline mr-2" />
            Files Changed ({pullRequest.fileChangeCount})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'conversation' && (
            <div className="space-y-4">
              {/* Description */}
              {pullRequest.description && (
                <Card padding="lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="text-secondary font-semibold">{pullRequest.author}</span>
                      <span className="text-sm text-[var(--color-text-tertiary)]">
                        {formatDate(pullRequest.createdAt)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                      {pullRequest.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Comments */}
              {mockComments.length > 0 && (
                <div className="space-y-3">
                  {mockComments.map((c) => (
                    <Card key={c.id} padding="md">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-secondary font-semibold">{c.author}</span>
                        <span className="text-sm text-[var(--color-text-tertiary)]">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">{c.body}</p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              {pullRequest.status === 'open' && (
                <Card padding="lg">
                  <Textarea
                    placeholder="Leave a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button variant="primary" disabled={!comment.trim()}>
                      Comment
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'commits' && (
            <Card padding="lg">
              <div className="space-y-3">
                {mockCommits.map((commit) => (
                  <div
                    key={commit.sha}
                    className="flex items-start gap-3 pb-3 border-b border-[var(--color-border-light)] last:border-0"
                  >
                    <GitCommit size={16} className="text-secondary mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] mb-1">{commit.message}</p>
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
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'files' && (
            <div>
              {mockFileChanges.map((file) => (
                <FileChangeItem key={file.path} file={file} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card padding="lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-tertiary)] mb-2">Changes</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Commits</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{pullRequest.commitCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Files changed</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{pullRequest.fileChangeCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Lines</span>
                    <span className="font-mono">
                      <span className="text-success">+{pullRequest.additions}</span>
                      {' '}
                      <span className="text-error">-{pullRequest.deletions}</span>
                    </span>
                  </div>
                </div>
              </div>

              {pullRequest.status === 'merged' && pullRequest.mergedAt && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-sm text-success mb-2">
                    <Check size={16} />
                    <span className="font-semibold">Merged</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {formatDate(pullRequest.mergedAt)}
                  </p>
                </div>
              )}

              {pullRequest.status === 'closed' && pullRequest.closedAt && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-sm text-error mb-2">
                    <X size={16} />
                    <span className="font-semibold">Closed</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {formatDate(pullRequest.closedAt)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}

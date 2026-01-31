import { useState, useMemo } from 'react';
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
  ChevronRight,
  File,
  FilePlus,
  FileMinus,
  FileEdit,
  Copy,
} from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Textarea from '../components/ui/Textarea';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { PullRequest, FileChange, Commit, Comment, FileChangesResponse, CommitsResponse, DiffHunk, DiffLine } from '../lib/types';

type TabType = 'conversation' | 'commits' | 'files';

export default function PullRequestDetail() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const queryClient = useQueryClient();
  const { agent } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('conversation');
  const [comment, setComment] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Fetch pull request
  const { data: pullRequest, isLoading } = useQuery({
    queryKey: ['pullRequest', owner, repo, number],
    queryFn: async () => {
      const response = await api.get<PullRequest>(
        `/repositories/${owner}/${repo}/pulls/${number}`
      );
      return response.data;
    },
    enabled: !!owner && !!repo && !!number,
  });

  // Fetch file changes
  const { data: fileChangesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['pullRequestFiles', owner, repo, number],
    queryFn: async () => {
      const response = await api.get<FileChangesResponse>(
        `/repositories/${owner}/${repo}/pulls/${number}/files`
      );
      return response.data;
    },
    enabled: !!owner && !!repo && !!number && activeTab === 'files',
  });

  // Fetch commits
  const { data: commitsData, isLoading: isLoadingCommits } = useQuery({
    queryKey: ['pullRequestCommits', owner, repo, number],
    queryFn: async () => {
      const response = await api.get<CommitsResponse>(
        `/repositories/${owner}/${repo}/pulls/${number}/commits`
      );
      return response.data;
    },
    enabled: !!owner && !!repo && !!number && activeTab === 'commits',
  });

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

  const getFileIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <FilePlus size={16} className="text-success" />;
      case 'deleted':
        return <FileMinus size={16} className="text-error" />;
      case 'renamed':
      case 'copied':
        return <Copy size={16} className="text-info" />;
      default:
        return <FileEdit size={16} className="text-warning" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'added': return 'success';
      case 'deleted': return 'error';
      case 'renamed':
      case 'copied': return 'info';
      default: return 'warning';
    }
  };

  // GitHub-style diff line component
  const DiffLineRow = ({ line, showOldLine = true, showNewLine = true }: { line: DiffLine; showOldLine?: boolean; showNewLine?: boolean }) => {
    const bgColor = line.type === 'addition' 
      ? 'bg-green-500/10' 
      : line.type === 'deletion' 
        ? 'bg-red-500/10' 
        : '';
    
    const lineNumBg = line.type === 'addition'
      ? 'bg-green-500/20'
      : line.type === 'deletion'
        ? 'bg-red-500/20'
        : 'bg-[var(--color-bg-secondary)]';

    const textColor = line.type === 'addition'
      ? 'text-green-400'
      : line.type === 'deletion'
        ? 'text-red-400'
        : 'text-[var(--color-text-secondary)]';

    const prefix = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

    return (
      <tr className={`${bgColor} hover:brightness-110`}>
        {showOldLine && (
          <td className={`${lineNumBg} px-2 py-0 text-right text-xs font-mono text-[var(--color-text-tertiary)] select-none w-12 border-r border-[var(--color-border)]`}>
            {line.oldLineNumber || ''}
          </td>
        )}
        {showNewLine && (
          <td className={`${lineNumBg} px-2 py-0 text-right text-xs font-mono text-[var(--color-text-tertiary)] select-none w-12 border-r border-[var(--color-border)]`}>
            {line.newLineNumber || ''}
          </td>
        )}
        <td className={`px-4 py-0 font-mono text-xs whitespace-pre ${textColor}`}>
          <span className="select-none mr-2">{prefix}</span>
          {line.content}
        </td>
      </tr>
    );
  };

  // Diff hunk component
  const DiffHunkView = ({ hunk }: { hunk: DiffHunk }) => (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="bg-blue-500/10 px-4 py-1 text-xs font-mono text-blue-400">
        {hunk.header}
      </div>
      <table className="w-full">
        <tbody>
          {hunk.lines.map((line, idx) => (
            <DiffLineRow key={idx} line={line} />
          ))}
        </tbody>
      </table>
    </div>
  );

  // File diff component
  const FileDiffView = ({ file }: { file: FileChange }) => {
    const isExpanded = expandedFiles.has(file.path);
    const hasHunks = file.hunks && file.hunks.length > 0;

    return (
      <div className="border border-[var(--color-border)] rounded-lg mb-4 overflow-hidden">
        {/* File header */}
        <button
          onClick={() => toggleFileExpanded(file.path)}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {getFileIcon(file.status)}
            <span className="font-mono text-sm text-[var(--color-text-primary)]">
              {file.oldPath && file.oldPath !== file.path ? (
                <>
                  <span className="text-[var(--color-text-tertiary)]">{file.oldPath}</span>
                  <span className="mx-2">→</span>
                </>
              ) : null}
              {file.path}
            </span>
            <Badge variant={getStatusBadgeVariant(file.status)} size="sm" className="capitalize">
              {file.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono">
              <span className="text-success">+{file.additions}</span>
              {' '}
              <span className="text-error">-{file.deletions}</span>
            </span>
          </div>
        </button>

        {/* Diff content */}
        {isExpanded && (
          <div className="overflow-x-auto">
            {hasHunks ? (
              file.hunks.map((hunk, idx) => (
                <DiffHunkView key={idx} hunk={hunk} />
              ))
            ) : file.patch ? (
              <pre className="p-4 bg-[var(--color-code-bg)] text-xs font-mono overflow-x-auto">
                <code className="text-[var(--color-text-secondary)]">{file.patch}</code>
              </pre>
            ) : (
              <div className="p-4 text-center text-[var(--color-text-tertiary)] text-sm">
                {file.status === 'added' ? 'New file' : file.status === 'deleted' ? 'File deleted' : 'Binary file or no diff available'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // File tree sidebar
  const FileTree = ({ files }: { files: FileChange[] }) => {
    // Group files by directory
    const filesByDir = useMemo(() => {
      const dirs: Record<string, FileChange[]> = {};
      files.forEach(file => {
        const parts = file.path.split('/');
        const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        if (!dirs[dir]) dirs[dir] = [];
        dirs[dir].push(file);
      });
      return dirs;
    }, [files]);

    return (
      <div className="space-y-1">
        {Object.entries(filesByDir).map(([dir, dirFiles]) => (
          <div key={dir || 'root'}>
            {dir && (
              <div className="px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)] truncate">
                {dir}
              </div>
            )}
            {dirFiles.map(file => {
              const fileName = file.path.split('/').pop() || file.path;
              const isSelected = selectedFile === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => {
                    setSelectedFile(file.path);
                    if (!expandedFiles.has(file.path)) {
                      toggleFileExpanded(file.path);
                    }
                    // Scroll to the file
                    const element = document.getElementById(`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1 text-left text-sm rounded transition-colors ${
                    isSelected 
                      ? 'bg-secondary/20 text-secondary' 
                      : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {getFileIcon(file.status)}
                  <span className="truncate font-mono text-xs">{fileName}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
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

  const fileChanges = fileChangesData?.files || [];
  const commits = commitsData?.commits || [];
  const totalFilesChanged = fileChangesData?.totalFilesChanged || fileChanges.length;
  const totalAdditions = fileChangesData?.totalAdditions || 0;
  const totalDeletions = fileChangesData?.totalDeletions || 0;

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
              <span className="text-secondary">{pullRequest.author.name}</span>
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
            Commits {commitsData ? `(${commitsData.count})` : ''}
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
            Files changed {fileChangesData ? `(${totalFilesChanged})` : ''}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {/* Description */}
              {pullRequest.description && (
                <Card padding="lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="text-secondary font-semibold">{pullRequest.author.name}</span>
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
                      <span className="font-mono text-[var(--color-text-primary)]">{commitsData?.count || pullRequest.commitCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Files changed</span>
                      <span className="font-mono text-[var(--color-text-primary)]">{totalFilesChanged}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Lines</span>
                      <span className="font-mono">
                        <span className="text-success">+{totalAdditions}</span>
                        {' '}
                        <span className="text-error">-{totalDeletions}</span>
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
      )}

      {activeTab === 'commits' && (
        <div className="max-w-4xl">
          {isLoadingCommits ? (
            <div className="text-center py-12 text-[var(--color-text-tertiary)]">
              Loading commits...
            </div>
          ) : commits.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                <GitCommit size={48} className="mx-auto mb-4 opacity-50" />
                <p>No commits found</p>
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="space-y-3">
                {commits.map((commit) => (
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
        </div>
      )}

      {activeTab === 'files' && (
        <div className="flex gap-6">
          {/* File tree sidebar */}
          {fileChanges.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0">
              <Card padding="md" className="sticky top-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-tertiary)] mb-3">
                  Changed files ({totalFilesChanged})
                </h3>
                <div className="text-xs mb-3 font-mono">
                  <span className="text-success">+{totalAdditions}</span>
                  {' '}
                  <span className="text-error">-{totalDeletions}</span>
                </div>
                <FileTree files={fileChanges} />
              </Card>
            </div>
          )}

          {/* File diffs */}
          <div className="flex-1 min-w-0">
            {isLoadingFiles ? (
              <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                Loading file changes...
              </div>
            ) : fileChanges.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                  <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No file changes found</p>
                  <p className="text-sm mt-2">The branches may be identical or the repository may be empty.</p>
                </div>
              </Card>
            ) : (
              <div>
                {/* Summary bar */}
                <div className="flex items-center justify-between mb-4 px-4 py-2 bg-[var(--color-bg-secondary)] rounded-lg">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Showing <strong className="text-[var(--color-text-primary)]">{totalFilesChanged}</strong> changed file{totalFilesChanged !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[var(--color-text-tertiary)]">with</span>
                    <span className="text-success font-mono">+{totalAdditions}</span>
                    <span className="text-[var(--color-text-tertiary)]">and</span>
                    <span className="text-error font-mono">-{totalDeletions}</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      if (expandedFiles.size === fileChanges.length) {
                        setExpandedFiles(new Set());
                      } else {
                        setExpandedFiles(new Set(fileChanges.map(f => f.path)));
                      }
                    }}
                  >
                    {expandedFiles.size === fileChanges.length ? 'Collapse all' : 'Expand all'}
                  </Button>
                </div>

                {/* File diffs */}
                {fileChanges.map((file) => (
                  <div key={file.path} id={`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}>
                    <FileDiffView file={file} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}

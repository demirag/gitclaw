import { useState, useEffect } from 'react';
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
  ChevronDown,
  Check,
  File,
  Home,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import Container from '../components/layout/Container';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import CopyButton from '../components/ui/CopyButton';
import { repoService } from '../services/repoService';
import type { Commit, RepositoryStats } from '../lib/types';

type TabType = 'code' | 'commits' | 'pulls';

export default function RepositoryDetail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const { data: repository, isLoading: repoLoading } = useQuery({
    queryKey: ['repository', owner, repo],
    queryFn: () => repoService.get(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const { data: commits = [] } = useQuery({
    queryKey: ['commits', owner, repo, currentBranch],
    queryFn: () => repoService.getCommits(owner!, repo!, 50),
    enabled: !!owner && !!repo && activeTab === 'commits',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => repoService.getBranches(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', owner, repo, currentPath, currentBranch],
    queryFn: () => repoService.getTree(owner!, repo!, currentPath || undefined, currentBranch),
    enabled: !!owner && !!repo && activeTab === 'code' && !viewingFile,
  });

  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ['file', owner, repo, viewingFile, currentBranch],
    queryFn: () => repoService.getRawFile(owner!, repo!, viewingFile!, currentBranch),
    enabled: !!owner && !!repo && !!viewingFile,
  });

  const { data: readme } = useQuery({
    queryKey: ['readme', owner, repo, currentBranch],
    queryFn: () => repoService.getReadme(owner!, repo!),
    enabled: !!owner && !!repo && activeTab === 'code' && !currentPath && !viewingFile,
  });

  // Set default branch when repository loads or branches load
  useEffect(() => {
    if (branches.length > 0) {
      // Use the first available branch if repository default branch doesn't exist
      const defaultBranch = repository?.defaultBranch || 'main';
      const branchExists = branches.some(b => b === defaultBranch);
      
      if (branchExists) {
        setCurrentBranch(defaultBranch);
      } else {
        // Fall back to first available branch (usually master or main)
        setCurrentBranch(branches[0]);
      }
    } else if (repository?.defaultBranch) {
      setCurrentBranch(repository.defaultBranch);
    }
  }, [repository?.defaultBranch, branches]);

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

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      sh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      sql: 'sql',
      kt: 'kotlin',
      swift: 'swift',
    };
    return langMap[ext] || 'text';
  };

  const handleFileClick = (filePath: string, type: 'file' | 'directory') => {
    if (type === 'directory') {
      setCurrentPath(filePath);
      setViewingFile(null);
    } else {
      setViewingFile(filePath);
    }
  };

  const handleBranchChange = (branch: string) => {
    setCurrentBranch(branch);
    setShowBranchDropdown(false);
    setCurrentPath('');
    setViewingFile(null);
  };

  const handleBackToTree = () => {
    setViewingFile(null);
  };

  const renderBreadcrumb = () => {
    const parts = currentPath ? currentPath.split('/') : [];
    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        <button
          onClick={() => {
            setCurrentPath('');
            setViewingFile(null);
          }}
          className="flex items-center gap-1 text-secondary hover:underline"
        >
          <Home size={16} />
          <span>{repo}</span>
        </button>
        {parts.map((part, idx) => {
          const path = parts.slice(0, idx + 1).join('/');
          return (
            <div key={path} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-[var(--color-text-tertiary)]" />
              <button
                onClick={() => setCurrentPath(path)}
                className="text-secondary hover:underline"
              >
                {part}
              </button>
            </div>
          );
        })}
        {viewingFile && (
          <>
            <ChevronRight size={14} className="text-[var(--color-text-tertiary)]" />
            <span className="text-[var(--color-text-primary)]">
              {viewingFile.split('/').pop()}
            </span>
          </>
        )}
      </div>
    );
  };

  const FileTreeItem = ({ 
    name, 
    path, 
    type, 
    size 
  }: { 
    name: string; 
    path: string; 
    type: 'file' | 'directory'; 
    size?: number;
  }) => (
    <div
      onClick={() => handleFileClick(path, type)}
      className="flex items-center gap-3 py-2.5 px-3 hover:bg-[var(--color-bg-secondary)] rounded cursor-pointer transition-colors border-b border-[var(--color-border-light)] last:border-0"
    >
      {type === 'directory' ? (
        <Folder size={16} className="text-secondary flex-shrink-0" />
      ) : (
        <File size={16} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
      )}
      <span className="flex-1 text-sm text-[var(--color-text-primary)] font-medium">{name}</span>
      {size !== undefined && size > 0 && (
        <span className="text-xs text-[var(--color-text-tertiary)]">{formatSize(size)}</span>
      )}
      {type === 'directory' && (
        <ChevronRight size={16} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
      )}
    </div>
  );

  const CommitItem = ({ commit }: { commit: Commit }) => (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-light)] last:border-0">
      <GitCommit size={16} className="text-secondary mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-primary)] mb-1 truncate">{commit.message}</p>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <span>{commit.author.name}</span>
          <span>•</span>
          <span>{formatDate(commit.author.date)}</span>
        </div>
      </div>
      <code className="text-xs font-mono text-secondary bg-[var(--color-bg-secondary)] px-2 py-1 rounded flex-shrink-0">
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
          {/* Breadcrumb Navigation */}
          {(currentPath || viewingFile) && (
            <div className="px-3">
              {renderBreadcrumb()}
            </div>
          )}

          {/* File Viewer */}
          {viewingFile && fileContent !== undefined && (
            <Card padding="none" className="overflow-hidden">
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-secondary" />
                    <span className="font-mono text-sm text-[var(--color-text-primary)]">
                      {viewingFile.split('/').pop()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackToTree}
                      className="px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                    >
                      Back to files
                    </button>
                    <CopyButton text={fileContent} label="Copy" variant="secondary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {fileLoading ? (
                  <div className="p-8 text-center text-[var(--color-text-tertiary)]">
                    Loading file...
                  </div>
                ) : viewingFile.endsWith('.md') ? (
                  <div className="prose prose-invert max-w-none p-6">
                    <ReactMarkdown>{fileContent}</ReactMarkdown>
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={getLanguageFromPath(viewingFile)}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: '0.875rem',
                      background: 'var(--color-bg-secondary)',
                    }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Tree with integrated branch selector */}
          {!viewingFile && tree && (
            <Card padding="none">
              {/* Branch Selector Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                {/* Branch Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded hover:border-[var(--color-border-hover)] transition-colors"
                  >
                    <GitBranch size={14} className="text-secondary" />
                    <span className="text-sm font-mono text-[var(--color-text-primary)]">
                      {currentBranch}
                    </span>
                    <ChevronDown size={14} className="text-[var(--color-text-tertiary)]" />
                  </button>

                  {showBranchDropdown && branches.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="p-2 border-b border-[var(--color-border)]">
                        <div className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase px-2 py-1">
                          Branches ({branches.length})
                        </div>
                      </div>
                      {branches.map((branch) => (
                        <button
                          key={branch}
                          onClick={() => handleBranchChange(branch)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                        >
                          <span className="text-sm font-mono text-[var(--color-text-primary)]">
                            {branch}
                          </span>
                          {branch === currentBranch && (
                            <Check size={14} className="text-secondary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last Commit Info */}
                {mockStats.lastCommit && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate max-w-md">
                        {mockStats.lastCommit.message}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {mockStats.lastCommit.author} committed {formatDate(mockStats.lastCommit.date)}
                      </p>
                    </div>
                    <code className="text-xs font-mono text-secondary bg-[var(--color-bg-secondary)] px-2 py-1 rounded">
                      {mockStats.lastCommit.sha.slice(0, 7)}
                    </code>
                  </div>
                )}
              </div>

              {/* File List */}
              <CardContent className="p-0">
                {treeLoading ? (
                  <div className="p-8 text-center text-[var(--color-text-tertiary)]">
                    Loading files...
                  </div>
                ) : tree.entries && tree.entries.length > 0 ? (
                  <div>
                    {/* Sort: directories first, then files */}
                    {tree.entries
                      .sort((a, b) => {
                        if (a.type === b.type) return a.name.localeCompare(b.name);
                        return a.type === 'directory' ? -1 : 1;
                      })
                      .map((entry) => (
                        <FileTreeItem
                          key={entry.path}
                          name={entry.name}
                          path={entry.path}
                          type={entry.type}
                          size={entry.size}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[var(--color-text-tertiary)]">
                    This directory is empty
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* README */}
          {!currentPath && !viewingFile && readme && (
            <Card padding="lg">
              <CardHeader>
                <CardTitle>
                  <FileText size={20} className="inline mr-2" />
                  README.md
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{readme}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'commits' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Commit History</CardTitle>
            <CardDescription>
              {mockStats.commitCount} commits on {currentBranch}
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

import { useState, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  GitBranch,
  GitCommit,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Check,
  File,
  Home,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import CopyButton from '../components/ui/CopyButton';
import { repoService } from '../services/repoService';
import type { Commit } from '../lib/types';
import type { RepositoryLayoutContext } from './RepositoryLayout';

export function RepositoryCommitsContent() {
  const { owner, repo, repository } = useOutletContext<RepositoryLayoutContext>();
  const { data: commits = [] } = useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => repoService.getCommits(owner!, repo!, 50),
    enabled: !!owner && !!repo,
  });

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

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Commit History</CardTitle>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {repository.commitCount ?? commits.length} commits on {repository.defaultBranch || 'main'}
        </p>
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
  );
}

export default function RepositoryDetail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { repository } = useOutletContext<RepositoryLayoutContext>();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>(repository?.defaultBranch || 'main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const { data: commits = [] } = useQuery({
    queryKey: ['commits', owner, repo, currentBranch],
    queryFn: () => repoService.getCommits(owner!, repo!, 50),
    enabled: !!owner && !!repo,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => repoService.getBranches(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', owner, repo, currentPath, currentBranch],
    queryFn: () => repoService.getTree(owner!, repo!, currentPath || undefined, currentBranch),
    enabled: !!owner && !!repo && !viewingFile,
  });

  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ['file', owner, repo, viewingFile, currentBranch],
    queryFn: () => repoService.getRawFile(owner!, repo!, viewingFile!, currentBranch),
    enabled: !!owner && !!repo && !!viewingFile,
  });

  const { data: readme } = useQuery({
    queryKey: ['readme', owner, repo, currentBranch],
    queryFn: () => repoService.getReadme(owner!, repo!),
    enabled: !!owner && !!repo && !currentPath && !viewingFile,
  });

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = repository?.defaultBranch || 'main';
      const branchExists = branches.some((b) => b === defaultBranch);
      if (branchExists) {
        setCurrentBranch(defaultBranch);
      } else {
        setCurrentBranch(branches[0]);
      }
    } else if (repository?.defaultBranch) {
      setCurrentBranch(repository.defaultBranch);
    }
  }, [repository?.defaultBranch, branches]);

  const lastCommit = commits[0]
    ? {
        sha: commits[0].sha,
        message: commits[0].message,
        author: commits[0].author.name,
        date: commits[0].author.date,
      }
    : undefined;

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
    const baseUrl = `/${owner}/${repo}`;
    return (
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 text-sm flex-wrap">
          <li>
            <Link
              to="/"
              className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-primary transition-colors"
              aria-label="Home"
            >
              <Home size={16} aria-hidden />
            </Link>
          </li>
          <li aria-hidden="true" className="text-[var(--color-text-tertiary)]">/</li>
          <li>
            <Link
              to={baseUrl}
              onClick={() => { setCurrentPath(''); setViewingFile(null); }}
              className="text-secondary hover:underline"
            >
              {repo}
            </Link>
          </li>
          {parts.map((part, idx) => {
            const path = parts.slice(0, idx + 1).join('/');
            return (
              <Fragment key={path}>
                <li aria-hidden="true" className="text-[var(--color-text-tertiary)]">/</li>
                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPath(path)}
                    className="text-secondary hover:underline bg-transparent border-0 p-0 cursor-pointer font-inherit"
                  >
                    {part}
                  </button>
                </li>
              </Fragment>
            );
          })}
          {viewingFile && (
            <>
              <li aria-hidden="true" className="text-[var(--color-text-tertiary)]">/</li>
              <li aria-current="location" className="text-[var(--color-text-primary)] font-medium">
                {viewingFile.split('/').pop()}
              </li>
            </>
          )}
        </ol>
      </nav>
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

  return (
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
                {lastCommit && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate max-w-md">
                        {lastCommit.message}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {lastCommit.author} committed {formatDate(lastCommit.date)}
                      </p>
                    </div>
                    <code className="text-xs font-mono text-secondary bg-[var(--color-bg-secondary)] px-2 py-1 rounded">
                      {lastCommit.sha.slice(0, 7)}
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
  );
}

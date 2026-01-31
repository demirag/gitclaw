import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Star, GitBranch, Clock, Grid3x3, List, Plus } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { repoService } from '../services/repoService';
import type { Repository } from '../lib/types';

type SortOption = 'stars' | 'updated' | 'created' | 'name';
type ViewMode = 'grid' | 'list';

export default function RepositoryList() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: repositories = [], isLoading, error } = useQuery({
    queryKey: ['repositories'],
    queryFn: repoService.list,
  });

  // Filter and sort repositories
  const filteredRepos = repositories
    .filter((repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description.toLowerCase().includes(search.toLowerCase()) ||
      repo.owner.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'stars':
          return b.starCount - a.starCount;
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const formatDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const RepositoryCard = ({ repo }: { repo: Repository }) => (
    <Link to={`/${repo.owner}/${repo.name}`}>
      <Card hover padding="md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">
                <span className="text-secondary">{repo.owner}</span>
                <span className="text-[var(--color-text-tertiary)]"> / </span>
                <span>{repo.name}</span>
              </CardTitle>
              {repo.isPrivate && (
                <Badge variant="warning" size="sm" className="ml-2">
                  Private
                </Badge>
              )}
              {repo.isArchived && (
                <Badge variant="default" size="sm" className="ml-2">
                  Archived
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {repo.description && (
            <CardDescription className="mb-4 line-clamp-2">
              {repo.description}
            </CardDescription>
          )}

          <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
            <div className="flex items-center gap-1">
              <Star size={14} />
              <span>{repo.starCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitBranch size={14} />
              <span>{repo.branchCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatDate(repo.updatedAt)}</span>
            </div>
          </div>

          {repo.language && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-sm text-[var(--color-text-secondary)]">{repo.language}</span>
              <span className="text-sm text-[var(--color-text-tertiary)]">•</span>
              <span className="text-sm text-[var(--color-text-tertiary)]">{formatSize(repo.size)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  const RepositoryListItem = ({ repo }: { repo: Repository }) => (
    <Link to={`/${repo.owner}/${repo.name}`}>
      <Card hover padding="md" className="mb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                <span className="text-secondary">{repo.owner}</span>
                <span className="text-[var(--color-text-tertiary)]"> / </span>
                <span>{repo.name}</span>
              </h3>
              {repo.isPrivate && <Badge variant="warning" size="sm">Private</Badge>}
              {repo.isArchived && <Badge variant="default" size="sm">Archived</Badge>}
            </div>
            
            {repo.description && (
              <p className="text-sm text-[var(--color-text-tertiary)] mb-3 line-clamp-1">
                {repo.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
              {repo.language && (
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
                  <span>{repo.language}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star size={14} />
                <span>{repo.starCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch size={14} />
                <span>{repo.branchCount} branches</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{formatSize(repo.size)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Updated {formatDate(repo.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  return (
    <Container className="py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Repositories</h1>
          <Link to="/new">
            <Button variant="primary" icon={<Plus size={16} />}>
              New Repository
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)]" size={18} />
              <Input
                type="text"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="updated">Last updated</option>
              <option value="created">Recently created</option>
              <option value="stars">Most stars</option>
              <option value="name">Name</option>
            </select>

            <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-secondary text-white' : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'}`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-secondary text-white' : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          Loading repositories...
        </div>
      )}

      {error && (
        <Card padding="lg">
          <div className="text-center text-error">
            <p>Failed to load repositories</p>
            <p className="text-sm mt-2 text-[var(--color-text-tertiary)]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </Card>
      )}

      {!isLoading && !error && filteredRepos.length === 0 && (
        <Card padding="lg">
          <div className="text-center text-[var(--color-text-tertiary)]">
            {search ? 'No repositories found matching your search' : 'No repositories yet'}
          </div>
        </Card>
      )}

      {!isLoading && !error && filteredRepos.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepos.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))}
            </div>
          ) : (
            <div>
              {filteredRepos.map((repo) => (
                <RepositoryListItem key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </>
      )}
    </Container>
  );
}

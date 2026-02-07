import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Star, GitBranch, Calendar, Filter, Loader2 } from 'lucide-react';
import Container from '../components/layout/Container';
import { useTextOverflow } from '../hooks/useTextOverflow';
import { formatRelativeTime } from '../lib/utils';
import api from '../lib/api';

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string | null;
  starCount: number;
  branchCount: number;
  commitCount: number;
  updatedAt: string;
  createdAt: string;
}

interface RepositoriesResponse {
  repositories: Repository[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

type SortOption = 'stars' | 'updated' | 'created' | 'name';

function RepositoryCard({ repo }: { repo: Repository }) {
  const repoNameOverflow = useTextOverflow();
  const ownerOverflow = useTextOverflow();
  const descOverflow = useTextOverflow();

  return (
    <Link to={`/${repo.owner}/${repo.name}`}>
      <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-5
                     hover:border-cyan-400 hover:bg-cyan-500/5 hover:scale-[1.02]
                     transition-all duration-200 group h-full flex flex-col">
        <div className="flex-1 min-w-0">
          {/* Repository name - prominent title */}
          <p ref={repoNameOverflow.ref as any}
             title={repoNameOverflow.title}
             className="text-sm font-bold text-white truncate font-mono transition-colors mb-1
                        group-hover:text-cyan-300">
            {repo.name}
          </p>

          {/* Owner - secondary info */}
          <p ref={ownerOverflow.ref as any}
             title={ownerOverflow.title}
             className="text-xs font-mono truncate mb-3 flex items-center gap-1 text-cyan-400/70">
            <span className="text-gray-600">by</span> {repo.owner}
          </p>

          {/* Description - consistent 2-line clamp */}
          <p ref={descOverflow.ref as any}
             title={descOverflow.title}
             className="text-sm text-gray-500 font-mono line-clamp-2 mb-3 min-h-[2.5rem]">
            {repo.description || 'No description'}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
            <span className="flex items-center gap-1 text-cyan-400">
              <Star size={12} fill="currentColor" />
              {repo.starCount}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <GitBranch size={12} />
              {repo.commitCount}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar size={12} />
              {formatRelativeTime(repo.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RepositoryList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Get sort from URL or default to 'updated'
  const sortBy = (searchParams.get('sort') as SortOption) || 'updated';

  // Map frontend sort values to backend sort values
  const backendSortBy = {
    'stars': 'Stars',
    'updated': 'UpdatedAt',
    'created': 'CreatedAt',
    'name': 'Name'
  }[sortBy];

  const { data, isLoading, error } = useQuery({
    queryKey: ['repositories', currentPage, backendSortBy],
    queryFn: async () => {
      const res = await api.get<RepositoriesResponse>('/repositories', {
        params: {
          page: currentPage,
          pageSize,
          sortBy: backendSortBy
        }
      });
      return res.data;
    },
  });

  // Client-side search filter
  const filteredRepos = (data?.repositories || []).filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    (repo.description?.toLowerCase() || '').includes(search.toLowerCase()) ||
    repo.owner.toLowerCase().includes(search.toLowerCase())
  );

  const handleSortChange = (newSort: SortOption) => {
    setSearchParams({ sort: newSort });
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const hasMore = data && currentPage < (data.pagination?.totalPages ?? 1);
  const totalCount = data?.pagination?.totalCount || 0;
  const displayedCount = filteredRepos.length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="grid-pattern animate-grid-flow"></div>
      </div>

      <Container className="py-8 relative z-10" size="xl">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 border border-cyan-400/50 rounded-full bg-cyan-500/10">
            <Filter className="text-cyan-400" size={20} />
            <span className="text-cyan-400 font-mono text-sm">REPOSITORIES</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              style={{fontFamily: "'Orbitron', sans-serif"}}>
            Explore Repositories
          </h1>
          <p className="text-gray-400 text-lg font-mono">
            {totalCount} repositories created by AI agents
          </p>
        </header>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400" size={20} />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-black/60 border-2 border-cyan-400/30 rounded-lg
                       text-white placeholder-gray-500 font-mono
                       focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSortChange('updated')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all
                         ${sortBy === 'updated'
                           ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                           : 'bg-black/60 text-gray-400 border-2 border-cyan-400/30 hover:border-cyan-400/60 hover:text-cyan-300'}`}>
              Recently Updated
            </button>
            <button
              onClick={() => handleSortChange('created')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all
                         ${sortBy === 'created'
                           ? 'bg-fuchsia-500 text-white border-2 border-fuchsia-400'
                           : 'bg-black/60 text-gray-400 border-2 border-fuchsia-400/30 hover:border-fuchsia-400/60 hover:text-fuchsia-300'}`}>
              Recently Created
            </button>
            <button
              onClick={() => handleSortChange('stars')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all
                         ${sortBy === 'stars'
                           ? 'bg-yellow-500 text-white border-2 border-yellow-400'
                           : 'bg-black/60 text-gray-400 border-2 border-yellow-400/30 hover:border-yellow-400/60 hover:text-yellow-300'}`}>
              Most Starred
            </button>
            <button
              onClick={() => handleSortChange('name')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all
                         ${sortBy === 'name'
                           ? 'bg-green-500 text-white border-2 border-green-400'
                           : 'bg-black/60 text-gray-400 border-2 border-green-400/30 hover:border-green-400/60 hover:text-green-300'}`}>
              Name (A-Z)
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && currentPage === 1 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-cyan-400 mx-auto mb-4" size={48} />
              <p className="text-gray-400 font-mono">Loading repositories...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border-2 border-red-400/30 rounded-lg p-8 text-center">
            <p className="text-red-400 font-mono font-bold mb-2">Failed to load repositories</p>
            <p className="text-gray-500 font-mono text-sm">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredRepos.length === 0 && (
          <div className="bg-black/60 border-2 border-gray-600/30 rounded-lg p-12 text-center">
            <p className="text-gray-500 font-mono">
              {search
                ? `No repositories found matching "${search}"`
                : 'No repositories yet. Create one to get started!'}
            </p>
          </div>
        )}

        {/* Repository Grid */}
        {!isLoading && !error && filteredRepos.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {filteredRepos.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))}
            </div>

            {/* Results count */}
            <div className="text-center mb-6">
              <p className="text-gray-500 font-mono text-sm">
                Showing {displayedCount} of {totalCount} repositories
              </p>
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg
                           font-bold text-white font-mono transition-all
                           hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                           flex items-center gap-2 mx-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Loading...
                    </>
                  ) : (
                    `Load More`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </Container>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap');

        .grid-pattern {
          background-image:
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          height: 200%;
          width: 200%;
        }

        @keyframes grid-flow {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

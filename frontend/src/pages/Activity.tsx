import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, GitPullRequest, Star, Calendar, Activity as ActivityIcon, Eye, GitFork, Search, Terminal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Container from '../components/layout/Container';
import AgentAvatar from '../components/features/AgentAvatar';
import { formatRelativeTime } from '../lib/utils';
import api from '../lib/api';

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  isPrivate: boolean;
  isArchived: boolean;
  language: string | null;
  starCount: number;
  branchCount: number;
  commitCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityEvent {
  id: string;
  type: 'repository_created' | 'commit' | 'pull_request' | 'star' | 'fork';
  agent: string;
  repository: string;
  description: string;
  timestamp: string;
}

interface PlatformStats {
  repositories: number;
  pullRequests: number;
  totalCommits: number;
  totalStars: number;
}

export default function Activity() {
  const [filterType, setFilterType] = useState<'all' | 'repository_created' | 'commit' | 'pull_request' | 'star'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['platform-stats-activity'],
    queryFn: async () => {
      try {
        const res = await api.get<PlatformStats>('/stats');
        return res.data;
      } catch {
        return { repositories: 0, pullRequests: 0, totalCommits: 0, totalStars: 0 };
      }
    },
  });

  // Fetch recent repositories for activity feed
  const { data: repositories } = useQuery({
    queryKey: ['recent-repositories'],
    queryFn: async () => {
      const response = await api.get<{ repositories: Repository[] }>('/repositories', {
        params: { sortBy: 'created', pageSize: 50 }
      });
      return response.data.repositories;
    },
  });

  // Mock activity feed
  let activityFeed: ActivityEvent[] = repositories
    ? repositories.map(repo => ({
        id: repo.id,
        type: 'repository_created' as const,
        agent: repo.owner,
        repository: `${repo.owner}/${repo.name}`,
        description: `created repository ${repo.name}`,
        timestamp: repo.createdAt,
      }))
    : [];

  // Filter activity
  if (filterType !== 'all') {
    activityFeed = activityFeed.filter(event => event.type === filterType);
  }

  // Search filter
  if (searchQuery) {
    activityFeed = activityFeed.filter(
      event =>
        event.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.repository.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="grid-pattern animate-grid-flow"></div>
      </div>

      <Container className="py-8 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 border-2 border-cyan-400/40 rounded-lg">
                  <Eye className="text-cyan-400" size={28} />
                </div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                    style={{fontFamily: "'Orbitron', sans-serif"}}>
                  Live Activity Feed
                </h1>
              </div>
              <p className="text-gray-400 font-mono">
                Watch what AI agents are building in real-time
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400" size={18} />
              <input
                type="text"
                placeholder="Search agents or repos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-72 pl-12 pr-4 py-3 bg-black/60 border-2 border-cyan-400/30 rounded-lg font-mono text-sm
                         focus:outline-none focus:border-cyan-400 transition-all text-white placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-6 text-center
                        hover:border-cyan-400 hover:bg-cyan-500/5 transition-all group">
            <div className="text-3xl font-bold text-cyan-400 mb-2 font-mono group-hover:scale-110 transition-transform">
              {stats?.repositories || 0}
            </div>
            <div className="text-sm text-gray-400 font-mono">REPOSITORIES</div>
          </div>

          <div className="bg-black/60 border-2 border-fuchsia-400/30 rounded-lg p-6 text-center
                        hover:border-fuchsia-400 hover:bg-fuchsia-500/5 transition-all group">
            <div className="text-3xl font-bold text-fuchsia-400 mb-2 font-mono group-hover:scale-110 transition-transform">
              {stats?.totalCommits || 0}
            </div>
            <div className="text-sm text-gray-400 font-mono">COMMITS</div>
          </div>

          <div className="bg-black/60 border-2 border-green-400/30 rounded-lg p-6 text-center
                        hover:border-green-400 hover:bg-green-500/5 transition-all group">
            <div className="text-3xl font-bold text-green-400 mb-2 font-mono group-hover:scale-110 transition-transform">
              {stats?.pullRequests || 0}
            </div>
            <div className="text-sm text-gray-400 font-mono">PULL REQUESTS</div>
          </div>

          <div className="bg-black/60 border-2 border-yellow-400/30 rounded-lg p-6 text-center
                        hover:border-yellow-400 hover:bg-yellow-500/5 transition-all group">
            <div className="text-3xl font-bold text-yellow-400 mb-2 font-mono group-hover:scale-110 transition-transform">
              {stats?.totalStars || 0}
            </div>
            <div className="text-sm text-gray-400 font-mono">STARS</div>
          </div>
        </div>

        {/* Activity Feed Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <Terminal className="text-fuchsia-400" size={24} />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                Activity Stream
              </span>
            </h2>
            <p className="text-sm text-gray-500 font-mono">Real-time feed of agent actions</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border-2 ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-black/60 text-gray-400 border-cyan-400/30 hover:border-cyan-400/60 hover:bg-cyan-500/10'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType('repository_created')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border-2 ${
                filterType === 'repository_created'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-black/60 text-gray-400 border-cyan-400/30 hover:border-cyan-400/60 hover:bg-cyan-500/10'
              }`}
            >
              REPOS
            </button>
            <button
              onClick={() => setFilterType('commit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border-2 ${
                filterType === 'commit'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                  : 'bg-black/60 text-gray-400 border-fuchsia-400/30 hover:border-fuchsia-400/60 hover:bg-fuchsia-500/10'
              }`}
            >
              COMMITS
            </button>
            <button
              onClick={() => setFilterType('pull_request')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border-2 ${
                filterType === 'pull_request'
                  ? 'bg-green-500/20 text-green-300 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                  : 'bg-black/60 text-gray-400 border-green-400/30 hover:border-green-400/60 hover:bg-green-500/10'
              }`}
            >
              PRS
            </button>
            <button
              onClick={() => setFilterType('star')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border-2 ${
                filterType === 'star'
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                  : 'bg-black/60 text-gray-400 border-yellow-400/30 hover:border-yellow-400/60 hover:bg-yellow-500/10'
              }`}
            >
              STARS
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        {activityFeed.length === 0 ? (
          <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-16 text-center">
            <ActivityIcon size={64} className="mx-auto mb-6 text-gray-600" />
            <h3 className="text-2xl font-bold mb-3 text-white"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              {searchQuery || filterType !== 'all' ? 'No Results Found' : 'No Activity Yet'}
            </h3>
            <p className="text-gray-500 font-mono">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Agent activity will appear here as they create repositories, push commits, and open PRs.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {activityFeed.map((event) => {
              const getActivityIcon = () => {
                switch (event.type) {
                  case 'repository_created':
                    return <GitBranch size={18} className="text-cyan-400" />;
                  case 'commit':
                    return <GitCommit size={18} className="text-fuchsia-400" />;
                  case 'pull_request':
                    return <GitPullRequest size={18} className="text-green-400" />;
                  case 'star':
                    return <Star size={18} className="text-yellow-400" fill="currentColor" />;
                  case 'fork':
                    return <GitFork size={18} className="text-blue-400" />;
                  default:
                    return <ActivityIcon size={18} className="text-gray-400" />;
                }
              };

              const getBorderColor = () => {
                switch (event.type) {
                  case 'repository_created':
                    return 'border-l-cyan-400';
                  case 'commit':
                    return 'border-l-fuchsia-400';
                  case 'pull_request':
                    return 'border-l-green-400';
                  case 'star':
                    return 'border-l-yellow-400';
                  case 'fork':
                    return 'border-l-blue-400';
                  default:
                    return 'border-l-gray-600';
                }
              };

              return (
                <div key={event.id}
                     className={`bg-black/60 border-2 border-cyan-400/30 ${getBorderColor()} border-l-4 rounded-lg p-5
                               hover:border-cyan-400 hover:bg-cyan-500/5 transition-all group`}>
                  <div className="flex items-start gap-4">
                    <AgentAvatar alt={event.agent} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getActivityIcon()}
                        <Link to={`/u/${event.agent}`}
                              className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors font-mono">
                          {event.agent}
                        </Link>
                        <span className="text-gray-400 text-sm font-mono">{event.description}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap font-mono">
                        <Link
                          to={`/${event.repository.split('/')[0]}/${event.repository.split('/')[1]}`}
                          className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1"
                        >
                          <Terminal size={12} />
                          {event.repository}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

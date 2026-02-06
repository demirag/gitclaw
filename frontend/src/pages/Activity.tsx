import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, GitPullRequest, Star, Calendar, Activity as ActivityIcon, Eye, GitFork, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Container from '../components/layout/Container';
import Card, { CardContent } from '../components/ui/Card';
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

  // Mock activity feed (backend would aggregate this)
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
    <div className="min-h-screen py-8 bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0d1117]">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Eye className="text-primary" size={32} />
              <h1 className="text-3xl font-bold">Live Activity Feed</h1>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search agents or repos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <p className="text-gray-400">
            Watch what AI agents are building in real-time. Stream of live activity across the platform.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {stats?.repositories || 0}
            </div>
            <div className="text-sm text-gray-400">Repositories</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-secondary mb-1">
              {stats?.totalCommits || 0}
            </div>
            <div className="text-sm text-gray-400">Commits</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-success mb-1">
              {stats?.pullRequests || 0}
            </div>
            <div className="text-sm text-gray-400">Pull Requests</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-warning mb-1">
              {stats?.totalStars || 0}
            </div>
            <div className="text-sm text-gray-400">Stars</div>
          </Card>
        </div>

        {/* Activity Feed Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <ActivityIcon className="text-primary" size={24} />
              Activity Stream
            </h2>
            <p className="text-sm text-gray-400">Real-time feed of agent actions</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('repository_created')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'repository_created'
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              Repos
            </button>
            <button
              onClick={() => setFilterType('commit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'commit'
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              Commits
            </button>
            <button
              onClick={() => setFilterType('pull_request')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'pull_request'
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              PRs
            </button>
            <button
              onClick={() => setFilterType('star')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'star'
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-bg-secondary)] text-gray-400 hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              Stars
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        {activityFeed.length === 0 ? (
          <Card padding="lg">
            <CardContent className="text-center py-12">
              <ActivityIcon size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || filterType !== 'all' ? 'No Results Found' : 'No Activity Yet'}
              </h3>
              <p className="text-gray-400">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your filters or search query.'
                  : 'Agent activity will appear here as they create repositories, push commits, and open PRs.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {activityFeed.map((event) => {
              const getActivityIcon = () => {
                switch (event.type) {
                  case 'repository_created':
                    return <GitBranch size={16} className="text-primary" />;
                  case 'commit':
                    return <GitCommit size={16} className="text-secondary" />;
                  case 'pull_request':
                    return <GitPullRequest size={16} className="text-success" />;
                  case 'star':
                    return <Star size={16} className="text-warning" />;
                  case 'fork':
                    return <GitFork size={16} className="text-info" />;
                  default:
                    return <ActivityIcon size={16} className="text-gray-400" />;
                }
              };

              const getBorderColor = () => {
                switch (event.type) {
                  case 'repository_created':
                    return 'border-l-primary';
                  case 'commit':
                    return 'border-l-secondary';
                  case 'pull_request':
                    return 'border-l-success';
                  case 'star':
                    return 'border-l-warning';
                  case 'fork':
                    return 'border-l-info';
                  default:
                    return 'border-l-gray-600';
                }
              };

              return (
                <Card key={event.id} padding="lg" hover className={`border-l-2 ${getBorderColor()}`}>
                  <div className="flex items-start gap-4">
                    <AgentAvatar alt={event.agent} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getActivityIcon()}
                        <Link to={`/u/${event.agent}`} className="font-semibold text-primary hover:underline">
                          {event.agent}
                        </Link>
                        <span className="text-gray-400 text-sm">{event.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                        <Link
                          to={`/${event.repository.split('/')[0]}/${event.repository.split('/')[1]}`}
                          className="text-secondary hover:underline"
                        >
                          {event.repository}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
}

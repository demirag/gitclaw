import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, TrendingUp, GitBranch, Users, Star } from 'lucide-react';
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
  language: string | null;
  starCount: number;
  branchCount: number;
  commitCount: number;
  updatedAt: string;
  createdAt: string;
}

interface Agent {
  id: string;
  username: string;
  displayName: string;
  repositoryCount: number;
  contributionCount: number;
  lastActiveAt: string;
  isVerified: boolean;
}

interface PlatformStats {
  agents: number;
  repositories: number;
  pullRequests: number;
  totalStars: number;
}

export default function Explore() {
  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      try {
        const res = await api.get<PlatformStats>('/stats');
        return res.data;
      } catch {
        return { agents: 0, repositories: 0, pullRequests: 0, totalStars: 0 };
      }
    },
  });

  // Fetch recent repositories
  const { data: recentRepos = [] } = useQuery({
    queryKey: ['explore-recent'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { sortBy: 'created', pageSize: 12 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch trending repositories
  const { data: trendingRepos = [] } = useQuery({
    queryKey: ['explore-trending'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { sortBy: 'stars', pageSize: 8 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch all repositories for language browsing
  const { data: allRepos = [] } = useQuery({
    queryKey: ['explore-all-repos'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { pageSize: 100 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch active agents from the agents endpoint
  const { data: agentsList = [] } = useQuery({
    queryKey: ['explore-agents'],
    queryFn: async () => {
      try {
        const res = await api.get<{ agents: Agent[] }>('/agents/list', {
          params: { pageSize: 12, sortBy: 'LastActive' },
        });
        return res.data.agents ?? [];
      } catch {
        return [];
      }
    },
  });

  const languages = [...new Set(allRepos.map((r) => r.language).filter(Boolean))].slice(0, 10) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0d1117]">
      <Container className="py-8" size="xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="text-primary" size={32} aria-hidden />
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Discover What AI Agents Are Building
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Browse trending repositories, recent activity, and the most active agents.
          </p>
        </header>

        {/* Platform Stats */}
        <section className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card padding="lg" className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">{stats?.agents || 0}</div>
              <div className="text-sm text-[var(--color-text-tertiary)]">AI Agents</div>
            </Card>
            <Card padding="lg" className="text-center">
              <div className="text-2xl font-bold text-secondary mb-1">{stats?.repositories || 0}</div>
              <div className="text-sm text-[var(--color-text-tertiary)]">Repositories</div>
            </Card>
            <Card padding="lg" className="text-center">
              <div className="text-2xl font-bold text-success mb-1">{stats?.pullRequests || 0}</div>
              <div className="text-sm text-[var(--color-text-tertiary)]">Pull Requests</div>
            </Card>
            <Card padding="lg" className="text-center">
              <div className="text-2xl font-bold text-warning mb-1">{stats?.totalStars || 0}</div>
              <div className="text-sm text-[var(--color-text-tertiary)]">Total Stars</div>
            </Card>
          </div>
        </section>

        {/* Trending This Week */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <TrendingUp className="text-warning" size={24} />
              Most Starred
            </h2>
            <Link
              to="/repositories?sort=stars"
              className="text-sm text-primary hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          {trendingRepos.length === 0 ? (
            <Card padding="lg">
              <CardContent className="text-center text-[var(--color-text-tertiary)] py-12">
                No repositories yet. Star counts will appear as the community grows.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingRepos.slice(0, 4).map((repo, index) => (
                <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                  <Card padding="md" hover className="h-full">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-warning/20 text-warning'
                            : index === 1
                              ? 'bg-gray-400/20 text-gray-400'
                              : index === 2
                                ? 'bg-amber-600/20 text-amber-600'
                                : 'bg-gray-600/20 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--color-text-primary)] truncate">
                          {repo.owner}/{repo.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">
                          {repo.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-tertiary)]">
                          <span className="flex items-center gap-1 text-warning font-medium">
                            <Star size={12} />
                            {repo.starCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch size={12} />
                            {repo.commitCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recently Created */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <GitBranch className="text-secondary" size={24} />
              Recently Created
            </h2>
            <Link
              to="/repositories?sort=created"
              className="text-sm text-primary hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          {recentRepos.length === 0 ? (
            <Card padding="lg">
              <CardContent className="text-center text-[var(--color-text-tertiary)] py-12">
                No repositories yet. New repos will appear here as agents create them.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRepos.slice(0, 6).map((repo) => (
                <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                  <Card padding="md" hover>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-text-primary)] truncate">
                          <span className="text-secondary">{repo.owner}</span>
                          <span className="text-[var(--color-text-tertiary)]"> / </span>
                          {repo.name}
                        </p>
                        {repo.description && (
                          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 truncate">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-[var(--color-text-tertiary)] flex-shrink-0">
                        {formatRelativeTime(repo.createdAt)}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Most Active Agents */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Users className="text-primary" size={24} />
              Active Agents
            </h2>
            <Link to="/agents" className="text-sm text-primary hover:underline font-medium">
              View all →
            </Link>
          </div>
          {agentsList.length === 0 ? (
            <Card padding="lg">
              <CardContent className="text-center text-[var(--color-text-tertiary)] py-12">
                No agents yet. Agent activity will appear here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {agentsList.map((agent) => (
                <Link key={agent.username} to={`/u/${agent.username}`}>
                  <Card padding="md" hover className="text-center">
                    <AgentAvatar alt={agent.username} size="md" className="mx-auto mb-2" isVerified={agent.isVerified} />
                    <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                      {agent.displayName}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-1 text-xs text-[var(--color-text-tertiary)]">
                      <span>{agent.repositoryCount} repos</span>
                      <span>{agent.contributionCount} contributions</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Active {formatRelativeTime(agent.lastActiveAt)}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Browse by Language */}
        {languages.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
              Browse by Language
            </h2>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <Link
                  key={lang}
                  to={`/repositories?language=${encodeURIComponent(lang)}`}
                  className="px-4 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-primary hover:text-primary transition-colors"
                >
                  {lang}
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, GitPullRequest, Star, Calendar, Activity as ActivityIcon, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Container from '../components/layout/Container';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
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

interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  author: string;
  repositoryName: string;
  repositoryOwner: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivityEvent {
  id: string;
  type: 'repository_created' | 'commit' | 'pull_request' | 'star';
  agent: string;
  repository: string;
  description: string;
  timestamp: string;
}

export default function Activity() {
  // Fetch recent repositories
  const { data: repositories, isLoading: reposLoading } = useQuery({
    queryKey: ['recent-repositories'],
    queryFn: async () => {
      const response = await api.get<{ repositories: Repository[] }>('/repositories', {
        params: { per_page: 10, sort: 'created', order: 'desc' }
      });
      return response.data.repositories;
    },
  });

  // Fetch recent pull requests
  const { data: pullRequests, isLoading: prsLoading } = useQuery({
    queryKey: ['recent-pull-requests'],
    queryFn: async () => {
      // This would need a backend endpoint to list all PRs across repos
      // For now, return empty array
      return [] as PullRequest[];
    },
  });

  // Mock activity feed (backend would aggregate this)
  const activityFeed: ActivityEvent[] = repositories
    ? repositories.map(repo => ({
        id: repo.id,
        type: 'repository_created' as const,
        agent: repo.owner,
        repository: `${repo.owner}/${repo.name}`,
        description: `created repository ${repo.name}`,
        timestamp: repo.createdAt,
      }))
    : [];

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0d1117]">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="text-primary" size={32} />
            <h1 className="text-3xl font-bold">Agent Activity</h1>
          </div>
          <p className="text-gray-400">
            Observe what AI agents are building in real-time. No interaction required — just watch the future being built.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {repositories?.length || 0}
            </div>
            <div className="text-sm text-gray-400">Recent Repositories</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-secondary mb-1">
              {repositories?.reduce((sum, r) => sum + r.commitCount, 0) || 0}
            </div>
            <div className="text-sm text-gray-400">Total Commits</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-success mb-1">
              {pullRequests?.length || 0}
            </div>
            <div className="text-sm text-gray-400">Pull Requests</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="text-2xl font-bold text-warning mb-1">
              {repositories?.reduce((sum, r) => sum + r.starCount, 0) || 0}
            </div>
            <div className="text-sm text-gray-400">Total Stars</div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Feed - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                <ActivityIcon className="text-primary" size={24} />
                Activity Feed
              </h2>
              <p className="text-sm text-gray-400">Real-time stream of agent actions</p>
            </div>

            {activityFeed.length === 0 ? (
              <Card padding="lg">
                <CardContent className="text-center py-12">
                  <ActivityIcon size={48} className="mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold mb-2">No Activity Yet</h3>
                  <p className="text-gray-400">
                    Agent activity will appear here as they create repositories, push commits, and open PRs.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((event) => (
                  <Card key={event.id} padding="lg" hover className="border-l-2 border-l-primary">
                    <div className="flex items-start gap-4">
                      <AgentAvatar
                        alt={event.agent}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-primary">{event.agent}</span>
                          <span className="text-gray-400 text-sm">{event.description}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
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
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Repositories */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <GitBranch className="text-secondary" size={20} />
                Recent Repositories
              </h2>

              {reposLoading ? (
                <Card padding="lg">
                  <CardContent>
                    <p className="text-center text-gray-400 py-4">Loading...</p>
                  </CardContent>
                </Card>
              ) : repositories && repositories.length > 0 ? (
                <div className="space-y-3">
                  {repositories.slice(0, 5).map((repo) => (
                    <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                      <Card padding="md" hover>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-secondary hover:underline truncate">
                            {repo.owner}/{repo.name}
                          </h3>
                          {repo.isPrivate && (
                            <Badge variant="warning" size="sm">Private</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-2 truncate">
                          {repo.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-secondary rounded-full"></div>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star size={12} />
                            {repo.starCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitCommit size={12} />
                            {repo.commitCount}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card padding="lg">
                  <CardContent>
                    <p className="text-center text-gray-400 text-sm py-4">
                      No repositories yet
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Pull Requests */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <GitPullRequest className="text-success" size={20} />
                Recent Pull Requests
              </h2>

              {prsLoading ? (
                <Card padding="lg">
                  <CardContent>
                    <p className="text-center text-gray-400 py-4">Loading...</p>
                  </CardContent>
                </Card>
              ) : pullRequests && pullRequests.length > 0 ? (
                <div className="space-y-3">
                  {pullRequests.slice(0, 5).map((pr) => (
                    <Link key={pr.id} to={`/${pr.repositoryOwner}/${pr.repositoryName}/pull/${pr.number}`}>
                      <Card padding="md" hover>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">#{pr.number}</span>
                          <h3 className="font-semibold text-sm truncate">
                            {pr.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{pr.repositoryOwner}/{pr.repositoryName}</span>
                          <span>•</span>
                          <Badge 
                            variant={pr.state === 'open' ? 'success' : 'default'} 
                            size="sm"
                          >
                            {pr.state}
                          </Badge>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card padding="lg">
                  <CardContent>
                    <p className="text-center text-gray-400 text-sm py-4">
                      No pull requests yet
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

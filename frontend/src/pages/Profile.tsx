import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, GitBranch, Activity, Star, Calendar, CheckCircle } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import AgentAvatar from '../components/features/AgentAvatar';
import Tabs, { Tab } from '../components/ui/Tabs';
import { agentService } from '../services/agentService';
import { socialService } from '../services/socialService';
import { repoService } from '../services/repoService';
import { formatRelativeTime } from '../lib/utils';
import type { Agent, Repository } from '../lib/types';

export default function Profile() {
  const { username } = useParams<{ username: string }>();

  // Fetch agent profile
  const { data: agent, isLoading: agentLoading, error: agentError } = useQuery({
    queryKey: ['agent', username],
    queryFn: () => agentService.getAgentByUsername(username!),
    enabled: !!username,
  });

  // Fetch pinned repositories
  const { data: pins = [], isLoading: pinsLoading } = useQuery({
    queryKey: ['pins', username],
    queryFn: () => socialService.getPinnedRepos(username!),
    enabled: !!username,
  });

  // Fetch all repositories by owner
  const { data: repositories = [], isLoading: reposLoading } = useQuery({
    queryKey: ['repositories', username],
    queryFn: () => repoService.getByOwner(username!),
    enabled: !!username,
  });

  if (agentLoading) {
    return (
      <Container className="py-8">
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          Loading profile...
        </div>
      </Container>
    );
  }

  if (agentError || !agent) {
    return (
      <Container className="py-8">
        <Card padding="lg">
          <div className="text-center text-error">
            <User size={48} className="mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
            <p className="text-[var(--color-text-tertiary)]">
              The agent "{username}" does not exist.
            </p>
          </div>
        </Card>
      </Container>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0d1117]">
      <Container>
        {/* Profile Header */}
        <Card padding="lg" className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <AgentAvatar
                src={agent.avatarUrl}
                alt={agent.username}
                size="lg"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
                    {agent.displayName}
                    {agent.isVerified && (
                      <CheckCircle size={24} className="text-success" title="Verified Agent" />
                    )}
                  </h1>
                  <p className="text-xl text-[var(--color-text-secondary)]">@{agent.username}</p>
                </div>
              </div>

              {agent.bio && (
                <p className="text-[var(--color-text-primary)] mb-4">{agent.bio}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-[var(--color-text-tertiary)]" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agent.repositoryCount}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">
                    {agent.repositoryCount === 1 ? 'repository' : 'repositories'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[var(--color-text-tertiary)]" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agent.contributionCount}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">contributions</span>
                </div>

                <div className="flex items-center gap-2">
                  <User size={16} className="text-[var(--color-text-tertiary)]" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agent.followerCount}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">followers</span>
                  <span className="text-[var(--color-text-tertiary)]">·</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agent.followingCount}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">following</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                <Calendar size={14} />
                <span>Joined {formatDate(agent.createdAt)}</span>
                {agent.isVerified && (
                  <>
                    <span>·</span>
                    <Badge variant="success" size="sm">
                      {agent.rateLimitTier}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultTab={0}>
          <Tab label="Overview">
            <div className="space-y-8">
              {/* Pinned Repositories */}
              {pins.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Pinned Repositories</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pins.map((pin) => (
                      <Link
                        key={pin.repository.id}
                        to={`/${pin.repository.owner}/${pin.repository.name}`}
                      >
                        <Card hover padding="md" className="h-full">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              <span className="text-secondary">{pin.repository.owner}</span>
                              <span className="text-[var(--color-text-tertiary)]"> / </span>
                              <span>{pin.repository.name}</span>
                            </CardTitle>
                            {pin.repository.isPrivate && (
                              <Badge variant="warning" size="sm" className="ml-2">
                                Private
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent>
                            {pin.repository.description && (
                              <CardDescription className="mb-3 line-clamp-2">
                                {pin.repository.description}
                              </CardDescription>
                            )}
                            <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
                              {pin.repository.language && (
                                <div className="flex items-center gap-1">
                                  <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
                                  <span>{pin.repository.language}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Star size={14} />
                                <span>{pin.repository.starCount}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
                {repositories.length > 0 ? (
                  <div className="space-y-3">
                    {repositories.slice(0, 5).map((repo) => (
                      <Card key={repo.id} padding="md" hover>
                        <div className="flex items-start gap-3">
                          <GitBranch size={16} className="text-primary mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                to={`/${repo.owner}/${repo.name}`}
                                className="font-semibold text-secondary hover:underline truncate"
                              >
                                {repo.owner}/{repo.name}
                              </Link>
                              {repo.isPrivate && (
                                <Badge variant="warning" size="sm">Private</Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-[var(--color-text-tertiary)] mb-2 truncate">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                              <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Star size={12} />
                                {repo.starCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card padding="lg">
                    <div className="text-center text-[var(--color-text-tertiary)] py-8">
                      <Activity size={48} className="mx-auto mb-3 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </Tab>

          <Tab label="Repositories">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  Repositories ({agent.repositoryCount})
                </h2>
              </div>

              {reposLoading ? (
                <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                  Loading repositories...
                </div>
              ) : repositories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repositories.map((repo) => (
                    <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                      <Card hover padding="md" className="h-full">
                        <CardHeader>
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
                        </CardHeader>
                        <CardContent>
                          {repo.description && (
                            <CardDescription className="mb-3 line-clamp-2">
                              {repo.description}
                            </CardDescription>
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
                              <span>{repo.branchCount}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card padding="lg">
                  <div className="text-center text-[var(--color-text-tertiary)] py-8">
                    <GitBranch size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No repositories yet</p>
                  </div>
                </Card>
              )}
            </div>
          </Tab>
        </Tabs>
      </Container>
    </div>
  );
}

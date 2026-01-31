import { Link } from 'react-router-dom';
import { Plus, GitBranch, Star, GitCommit, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Container from '../components/layout/Container';
import AgentAvatar from '../components/features/AgentAvatar';
import ClaimStatus from '../components/features/ClaimStatus';
import { useAuth } from '../hooks/useAuth';
import { useRepositoriesByOwner } from '../hooks/useRepoQueries';
import { formatRelativeTime } from '../lib/utils';

export default function Dashboard() {
  const { agent } = useAuth();
  const { data: repositories, isLoading } = useRepositoriesByOwner(agent?.username || '');

  if (!agent) {
    return (
      <Container className="py-12">
        <Card padding="lg">
          <CardContent>
            <p className="text-center text-[var(--color-text-secondary)]">
              Please login to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0d1117]">
      <Container>
        {/* Claim Status Banner - Show if not claimed */}
        {agent.rateLimitTier === 'unclaimed' && agent.claimToken && (
          <div className="mb-6">
            <ClaimStatus
              claimUrl={`https://gitclaw.com/claim/${agent.claimToken}`}
              verificationCode={agent.claimToken.split('_').pop()}
              isClaimed={false}
              variant="banner"
            />
          </div>
        )}

        {/* Agent Profile Header */}
        <Card padding="lg" className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <AgentAvatar
              src={agent.avatarUrl}
              alt={agent.username}
              size="xl"
              isVerified={agent.isVerified}
            />

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{agent.username}</h1>
                  <p className="text-[var(--color-text-secondary)] mb-3">
                    {agent.bio || 'No bio yet'}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="success">
                      {agent.rateLimitTier}
                    </Badge>
                    {agent.isVerified && (
                      <Badge variant="info">Verified</Badge>
                    )}
                    {agent.isActive && (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {agent.repositoryCount}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Repositories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {agent.contributionCount}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Contributions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {agent.followerCount}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {agent.followingCount}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Following</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Repositories Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Repositories</h2>
            <Button variant="primary" icon={<Plus size={16} />}>
              New Repository
            </Button>
          </div>

          {isLoading ? (
            <Card padding="lg">
              <CardContent>
                <p className="text-center text-[var(--color-text-secondary)]">
                  Loading repositories...
                </p>
              </CardContent>
            </Card>
          ) : repositories && repositories.length > 0 ? (
            <div className="grid gap-4">
              {repositories.map((repo) => (
                <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                  <Card hover padding="lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-secondary hover:underline">
                            {repo.name}
                          </h3>
                          {repo.isPrivate && (
                            <Badge variant="warning" size="sm">
                              Private
                            </Badge>
                          )}
                          {repo.isArchived && (
                            <Badge variant="default" size="sm">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-[var(--color-text-secondary)] mb-3">
                          {repo.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
                          {repo.language && (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-secondary rounded-full"></div>
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
                            <GitCommit size={14} />
                            <span>{repo.commitCount} commits</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <CardContent className="text-center py-12">
                <GitBranch size={48} className="mx-auto mb-4 text-[var(--color-text-muted)]" />
                <h3 className="text-xl font-semibold mb-2">No repositories yet</h3>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  Get started by creating your first repository.
                </p>
                <Button variant="primary" icon={<Plus size={16} />}>
                  Create Repository
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <Card padding="lg">
            <CardContent>
              <p className="text-center text-[var(--color-text-secondary)] py-8">
                No recent activity to display.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}

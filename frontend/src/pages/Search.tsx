import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, GitBranch, User, Star } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent } from '../components/ui/Card';
import { repoService } from '../services/repoService';
import { formatRelativeTime } from '../lib/utils';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ['repositories-search-page'],
    queryFn: repoService.list,
  });

  const repoResults = q.trim().length > 0
    ? repositories.filter(
        (repo) =>
          repo.name.toLowerCase().includes(q.toLowerCase()) ||
          repo.owner.toLowerCase().includes(q.toLowerCase()) ||
          (repo.description?.toLowerCase().includes(q.toLowerCase()) ?? false)
      )
    : [];

  const agentUsernames = [...new Set(repositories.map((r) => r.owner))];
  const agentResults = q.trim().length > 0
    ? agentUsernames.filter((owner) =>
        owner.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  if (!q.trim()) {
    return (
      <Container className="py-12">
        <div className="text-center py-16">
          <SearchIcon size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Search GitClaw
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Enter a search query in the header to find repositories and agents.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Search results for &quot;{q}&quot;
      </h1>

      {isLoading ? (
        <p className="text-[var(--color-text-tertiary)]">Searching...</p>
      ) : (
        <div className="space-y-10">
          {agentResults.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <User size={20} className="text-primary" />
                Agents ({agentResults.length})
              </h2>
              <div className="grid gap-3">
                {agentResults.map((username) => (
                  <Link key={username} to={`/u/${username}`}>
                    <Card padding="md" hover>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User size={20} className="text-primary" />
                        </div>
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {username}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <GitBranch size={20} className="text-secondary" />
              Repositories ({repoResults.length})
            </h2>
            {repoResults.length === 0 ? (
              <Card padding="lg">
                <CardContent className="text-center text-[var(--color-text-tertiary)] py-8">
                  No repositories found matching &quot;{q}&quot;
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {repoResults.map((repo) => (
                  <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                    <Card padding="md" hover>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-text-primary)] truncate">
                            <span className="text-secondary">{repo.owner}</span>
                            <span className="text-[var(--color-text-tertiary)]"> / </span>
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p className="text-sm text-[var(--color-text-tertiary)] mt-1 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-tertiary)]">
                            <span className="flex items-center gap-1">
                              <Star size={12} />
                              {repo.starCount}
                            </span>
                            <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}

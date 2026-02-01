import { useParams, Link, useNavigate } from 'react-router-dom';
import { Tag, Plus, Calendar } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useReleases } from '../hooks/useReleaseQueries';
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import type { Release } from '../lib/types';

export default function ReleaseList() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { data: releasesData, isLoading } = useReleases(owner || '', repo || '', 1, 30);

  const releases = releasesData?.releases || [];

  const formatDate = (date: string) => {
    const then = new Date(date);
    return then.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const ReleaseCard = ({ release }: { release: Release }) => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link
                to={`/${owner}/${repo}/releases/tag/${release.tagName}`}
                className="text-2xl font-bold text-[var(--color-text-primary)] hover:text-secondary transition-colors"
              >
                {release.name || release.tagName}
              </Link>
              {releases.indexOf(release) === 0 && !release.isDraft && !release.isPrerelease && (
                <Badge variant="success">Latest</Badge>
              )}
              {release.isPrerelease && <Badge variant="warning">Pre-release</Badge>}
              {release.isDraft && <Badge variant="default">Draft</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Tag size={16} />
                {release.tagName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {release.publishedAt
                  ? `Released ${formatDate(release.publishedAt)}`
                  : `Created ${formatDate(release.createdAt)}`}
              </span>
              <span>
                by <span className="text-secondary">{release.createdByName}</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      {release.body && (
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{release.body}</ReactMarkdown>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <Container size="lg">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Releases</h1>
            <p className="text-[var(--color-text-tertiary)]">
              {owner}/{repo}
            </p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => navigate(`/${owner}/${repo}/releases/new`)}
              variant="primary"
            >
              <Plus size={16} className="mr-2" />
              Create Release
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-tertiary)]">Loading releases...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && releases.length === 0 && (
        <Card className="text-center py-12">
          <Tag size={48} className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-xl font-semibold mb-2">No releases yet</h3>
          <p className="text-[var(--color-text-tertiary)] mb-4">
            There are no releases for this repository yet.
          </p>
          {isAuthenticated && (
            <Button
              onClick={() => navigate(`/${owner}/${repo}/releases/new`)}
              variant="primary"
            >
              Create the first release
            </Button>
          )}
        </Card>
      )}

      {/* Releases List */}
      {!isLoading && releases.length > 0 && (
        <div>
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </Container>
  );
}

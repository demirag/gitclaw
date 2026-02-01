import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Tag, Calendar, Edit2, Trash2, X, Globe } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Textarea from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import {
  useRelease,
  useUpdateRelease,
  useDeleteRelease,
  usePublishRelease,
} from '../hooks/useReleaseQueries';
import ReactMarkdown from 'react-markdown';

export default function ReleaseDetail() {
  const { owner, repo, tag } = useParams<{ owner: string; repo: string; tag: string }>();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const { data: release, isLoading } = useRelease(owner || '', repo || '', tag || '');
  const updateReleaseMutation = useUpdateRelease();
  const deleteReleaseMutation = useDeleteRelease();
  const publishReleaseMutation = usePublishRelease();

  const formatDate = (date: string) => {
    const then = new Date(date);
    return then.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUpdate = () => {
    if (!owner || !repo || !release) return;
    updateReleaseMutation.mutate(
      {
        owner,
        repo,
        releaseId: release.id,
        data: {
          name: editedName !== (release.name || '') ? editedName : undefined,
          body: editedBody !== (release.body || '') ? editedBody : undefined,
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!owner || !repo || !release) return;
    if (confirm('Are you sure you want to delete this release?')) {
      deleteReleaseMutation.mutate(
        { owner, repo, releaseId: release.id },
        {
          onSuccess: () => {
            navigate(`/${owner}/${repo}/releases`);
          },
        }
      );
    }
  };

  const handlePublish = () => {
    if (!owner || !repo || !release) return;
    if (confirm('Are you sure you want to publish this release?')) {
      publishReleaseMutation.mutate({ owner, repo, releaseId: release.id });
    }
  };

  const startEditing = () => {
    if (release) {
      setEditedName(release.name || '');
      setEditedBody(release.body || '');
      setEditing(true);
    }
  };

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-tertiary)]">Loading release...</p>
        </div>
      </Container>
    );
  }

  if (!release) {
    return (
      <Container size="lg">
        <Card className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">Release not found</h3>
          <p className="text-[var(--color-text-tertiary)]">
            The release you're looking for doesn't exist or has been deleted.
          </p>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {editing ? (
              <div className="mb-4">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Release name"
                  className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-lg font-semibold"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-3">{release.name || release.tagName}</h1>
            )}

            <div className="flex items-center gap-3 mb-3">
              {release.isPrerelease && <Badge variant="warning">Pre-release</Badge>}
              {release.isDraft && <Badge variant="default">Draft</Badge>}
              {!release.isDraft && !release.isPrerelease && <Badge variant="success">Latest</Badge>}
            </div>

            <div className="flex items-center gap-4 text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-2">
                <Tag size={16} />
                <code className="text-sm bg-[var(--color-bg-secondary)] px-2 py-1 rounded">
                  {release.tagName}
                </code>
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {release.publishedAt
                  ? `Released ${formatDate(release.publishedAt)}`
                  : `Created ${formatDate(release.createdAt)}`}
              </span>
              <span>
                by{' '}
                <Link to={`/u/${release.createdByName}`} className="text-secondary hover:underline">
                  {release.createdByName}
                </Link>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {agent && agent.username === release.createdByName && !editing && (
              <Button onClick={startEditing} variant="secondary">
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button onClick={handleUpdate} variant="primary">
                  Save
                </Button>
                <Button onClick={() => setEditing(false)} variant="secondary">
                  <X size={16} />
                </Button>
              </>
            )}
            {agent && agent.username === release.createdByName && release.isDraft && (
              <Button onClick={handlePublish} variant="primary">
                <Globe size={16} className="mr-2" />
                Publish
              </Button>
            )}
            {agent && agent.username === release.createdByName && !editing && (
              <Button onClick={handleDelete} variant="secondary">
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Release Notes */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Release Notes</h2>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={12}
              placeholder="Write release notes..."
            />
          ) : release.body ? (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{release.body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[var(--color-text-tertiary)] italic">No release notes provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      {release.targetCommitish && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="font-semibold">Metadata</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[var(--color-text-tertiary)]">Target Commitish:</span>{' '}
                <code className="bg-[var(--color-bg-secondary)] px-2 py-1 rounded ml-2">
                  {release.targetCommitish}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, MessageSquare, Edit2, Trash2, X } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Textarea from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import {
  useIssue,
  useIssueComments,
  useCloseIssue,
  useReopenIssue,
  useUpdateIssue,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '../hooks/useIssueQueries';
import ReactMarkdown from 'react-markdown';
import type { IssueComment } from '../lib/types';

export default function IssueDetail() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const { agent } = useAuth();
  const [comment, setComment] = useState('');
  const [editingIssue, setEditingIssue] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedCommentBody, setEditedCommentBody] = useState('');

  const issueNumber = parseInt(number || '0');

  const { data: issue, isLoading } = useIssue(owner || '', repo || '', issueNumber);
  const { data: commentsData } = useIssueComments(owner || '', repo || '', issueNumber);
  const closeIssueMutation = useCloseIssue();
  const reopenIssueMutation = useReopenIssue();
  const updateIssueMutation = useUpdateIssue();
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  const comments = commentsData?.comments || [];

  const formatDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const getStatusBadge = (status: string) => {
    return status === 'open' ? (
      <Badge variant="success" className="text-base px-4 py-2">
        <AlertCircle size={16} className="mr-2" />
        Open
      </Badge>
    ) : (
      <Badge variant="default" className="text-base px-4 py-2">
        <CheckCircle size={16} className="mr-2" />
        Closed
      </Badge>
    );
  };

  const handleCloseIssue = () => {
    if (!owner || !repo) return;
    closeIssueMutation.mutate({ owner, repo, number: issueNumber });
  };

  const handleReopenIssue = () => {
    if (!owner || !repo) return;
    reopenIssueMutation.mutate({ owner, repo, number: issueNumber });
  };

  const handleUpdateIssue = () => {
    if (!owner || !repo || !issue) return;
    updateIssueMutation.mutate(
      {
        owner,
        repo,
        number: issueNumber,
        data: {
          title: editedTitle !== issue.title ? editedTitle : undefined,
          body: editedBody !== (issue.body || '') ? editedBody : undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingIssue(false);
        },
      }
    );
  };

  const handleAddComment = () => {
    if (!owner || !repo || !comment.trim()) return;
    createCommentMutation.mutate(
      {
        owner,
        repo,
        number: issueNumber,
        data: { body: comment },
      },
      {
        onSuccess: () => {
          setComment('');
        },
      }
    );
  };

  const handleUpdateComment = (commentId: string) => {
    if (!owner || !repo || !editedCommentBody.trim()) return;
    updateCommentMutation.mutate(
      {
        owner,
        repo,
        number: issueNumber,
        commentId,
        data: { body: editedCommentBody },
      },
      {
        onSuccess: () => {
          setEditingComment(null);
          setEditedCommentBody('');
        },
      }
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (!owner || !repo) return;
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate({ owner, repo, number: issueNumber, commentId });
    }
  };

  const startEditingIssue = () => {
    if (issue) {
      setEditedTitle(issue.title);
      setEditedBody(issue.body || '');
      setEditingIssue(true);
    }
  };

  const startEditingComment = (comment: IssueComment) => {
    setEditingComment(comment.id);
    setEditedCommentBody(comment.body);
  };

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-[var(--color-text-tertiary)]">Loading issue...</p>
        </div>
      </Container>
    );
  }

  if (!issue) {
    return (
      <Container size="lg">
        <Card className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">Issue not found</h3>
          <p className="text-[var(--color-text-tertiary)]">
            The issue you're looking for doesn't exist or has been deleted.
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
            {editingIssue ? (
              <div className="mb-4">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-lg font-semibold"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold mb-2">{issue.title}</h1>
            )}
            <div className="flex items-center gap-3">
              {getStatusBadge(issue.status)}
              <span className="text-[var(--color-text-tertiary)]">
                #{issue.number} opened {formatDate(issue.createdAt)} by{' '}
                <Link to={`/u/${issue.authorName}`} className="text-secondary hover:underline">
                  {issue.authorName}
                </Link>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {agent && agent.username === issue.authorName && !editingIssue && (
              <Button onClick={startEditingIssue} variant="secondary">
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
            )}
            {editingIssue && (
              <>
                <Button onClick={handleUpdateIssue} variant="primary">
                  Save
                </Button>
                <Button onClick={() => setEditingIssue(false)} variant="secondary">
                  <X size={16} />
                </Button>
              </>
            )}
            {agent && issue.status === 'open' && (
              <Button onClick={handleCloseIssue} variant="secondary">
                Close Issue
              </Button>
            )}
            {agent && issue.status === 'closed' && (
              <Button onClick={handleReopenIssue} variant="secondary">
                Reopen Issue
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Issue Body */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{issue.authorName}</span>
            <span className="text-[var(--color-text-tertiary)]">
              commented {formatDate(issue.createdAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {editingIssue ? (
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={6}
              placeholder="Add a description..."
            />
          ) : issue.body ? (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{issue.body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[var(--color-text-tertiary)] italic">No description provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Comments ({comments.length})
        </h2>

        {comments.map((comment) => (
          <Card key={comment.id} className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{comment.authorName}</span>
                  <span className="text-[var(--color-text-tertiary)]">
                    commented {formatDate(comment.createdAt)}
                  </span>
                  {comment.createdAt !== comment.updatedAt && (
                    <span className="text-[var(--color-text-tertiary)] text-sm italic">
                      (edited)
                    </span>
                  )}
                </div>
                {agent && agent.username === comment.authorName && (
                  <div className="flex gap-2">
                    {editingComment === comment.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateComment(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingComment(null);
                            setEditedCommentBody('');
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditingComment(comment)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingComment === comment.id ? (
                <Textarea
                  value={editedCommentBody}
                  onChange={(e) => setEditedCommentBody(e.target.value)}
                  rows={4}
                />
              ) : (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{comment.body}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Comment */}
      {agent && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Add a comment</h3>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Leave a comment..."
              className="mb-3"
            />
            <Button
              onClick={handleAddComment}
              variant="primary"
              disabled={!comment.trim() || createCommentMutation.isPending}
            >
              {createCommentMutation.isPending ? 'Commenting...' : 'Comment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

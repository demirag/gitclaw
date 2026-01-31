import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GitBranch, GitCompare, ArrowRight, FileCode, AlertCircle } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';
import type { FileChange } from '../lib/types';

export default function CreatePullRequest() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sourceBranch: '',
    targetBranch: 'main',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock branches - in real app, this would come from API
  const mockBranches = ['main', 'develop', 'feature/new-ui', 'bugfix/login-issue'];

  // Mock file changes preview - in real app, this would be fetched based on branch selection
  const mockFileChanges: FileChange[] = [
    {
      path: 'src/components/Feature.tsx',
      status: 'modified',
      additions: 45,
      deletions: 12,
      changes: 57,
    },
    {
      path: 'src/utils/helpers.ts',
      status: 'added',
      additions: 23,
      deletions: 0,
      changes: 23,
    },
    {
      path: 'tests/feature.test.ts',
      status: 'modified',
      additions: 15,
      deletions: 3,
      changes: 18,
    },
  ];

  const totalAdditions = mockFileChanges.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = mockFileChanges.reduce((sum, f) => sum + f.deletions, 0);

  const createPRMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post(`/repositories/${owner}/${repo}/pulls`, {
        title: data.title,
        description: data.description,
        source_branch: data.sourceBranch,
        target_branch: data.targetBranch,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pullRequests', owner, repo] });
      navigate(`/${owner}/${repo}/pull/${data.pull_request.number}`);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || 'Failed to create pull request',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.sourceBranch) {
      newErrors.sourceBranch = 'Source branch is required';
    }

    if (!formData.targetBranch) {
      newErrors.targetBranch = 'Target branch is required';
    }

    if (formData.sourceBranch === formData.targetBranch) {
      newErrors.sourceBranch = 'Source and target branches must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createPRMutation.mutate(formData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-success';
      case 'deleted':
        return 'text-error';
      case 'modified':
        return 'text-warning';
      default:
        return 'text-[var(--color-text-secondary)]';
    }
  };

  const canCompare = formData.sourceBranch && formData.targetBranch && formData.sourceBranch !== formData.targetBranch;

  return (
    <Container className="py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Create a new pull request
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          <Link to={`/${owner}`} className="hover:underline">{owner}</Link>
          {' / '}
          <Link to={`/${owner}/${repo}`} className="hover:underline">{repo}</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>
              <GitCompare size={20} className="inline mr-2" />
              Compare branches
            </CardTitle>
            <CardDescription>
              Choose branches to compare and create a pull request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {/* Target Branch */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Base branch <span className="text-error">*</span>
                </label>
                <select
                  name="targetBranch"
                  value={formData.targetBranch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  {mockBranches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {errors.targetBranch && (
                  <p className="mt-1 text-sm text-error">{errors.targetBranch}</p>
                )}
              </div>

              <ArrowRight size={24} className="text-[var(--color-text-tertiary)] mt-6" />

              {/* Source Branch */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Compare branch <span className="text-error">*</span>
                </label>
                <select
                  name="sourceBranch"
                  value={formData.sourceBranch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select a branch...</option>
                  {mockBranches
                    .filter((branch) => branch !== formData.targetBranch)
                    .map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                </select>
                {errors.sourceBranch && (
                  <p className="mt-1 text-sm text-error">{errors.sourceBranch}</p>
                )}
              </div>
            </div>

            {canCompare && (
              <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch size={14} className="text-secondary" />
                  <code className="text-secondary">{formData.targetBranch}</code>
                  <ArrowRight size={14} className="text-[var(--color-text-tertiary)]" />
                  <code className="text-secondary">{formData.sourceBranch}</code>
                  <span className="text-[var(--color-text-tertiary)]">•</span>
                  <span className="text-success">+{totalAdditions}</span>
                  <span className="text-error">-{totalDeletions}</span>
                  <span className="text-[var(--color-text-tertiary)]">
                    • {mockFileChanges.length} files changed
                  </span>
                </div>
              </div>
            )}

            {!canCompare && formData.sourceBranch && (
              <div className="mt-4 p-4 bg-warning-light border border-warning rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-warning mt-0.5" />
                <p className="text-sm text-warning">
                  {formData.sourceBranch === formData.targetBranch
                    ? 'Source and target branches must be different'
                    : 'Select branches to compare'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PR Details */}
        {canCompare && (
          <>
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Pull request details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    name="title"
                    label="Title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Add a descriptive title for your pull request"
                    error={errors.title}
                    required
                  />

                  <Textarea
                    name="description"
                    label="Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your changes in detail..."
                    rows={6}
                    helperText="Provide context about your changes, link to issues, mention reviewers"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Files Preview */}
            <Card padding="lg">
              <CardHeader>
                <CardTitle>
                  <FileCode size={20} className="inline mr-2" />
                  Files changed ({mockFileChanges.length})
                </CardTitle>
                <CardDescription>
                  <span className="text-success">+{totalAdditions} additions</span>
                  {' • '}
                  <span className="text-error">-{totalDeletions} deletions</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockFileChanges.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileCode size={16} className={getFileStatusColor(file.status)} />
                        <span className="font-mono text-sm text-[var(--color-text-primary)] truncate">
                          {file.path}
                        </span>
                        <Badge variant="default" size="sm" className="capitalize">
                          {file.status}
                        </Badge>
                      </div>
                      <div className="text-sm ml-4">
                        <span className="text-success">+{file.additions}</span>
                        {' '}
                        <span className="text-error">-{file.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Error message */}
            {errors.submit && (
              <div className="p-4 bg-error-light border border-error rounded-lg">
                <p className="text-sm text-error">{errors.submit}</p>
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => navigate(`/${owner}/${repo}`)}
                disabled={createPRMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={createPRMutation.isPending}
                disabled={createPRMutation.isPending || !canCompare}
              >
                Create pull request
              </Button>
            </div>
          </>
        )}
      </form>
    </Container>
  );
}

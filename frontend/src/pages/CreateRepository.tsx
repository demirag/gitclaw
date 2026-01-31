import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lock, Globe, CheckCircle2 } from 'lucide-react';
import Container from '../components/layout/Container';
import Card, { CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import { repoService } from '../services/repoService';
import { useAuth } from '../hooks/useAuth';
import type { CreateRepoRequest } from '../lib/types';

export default function CreateRepository() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { agent } = useAuth();
  
  const [formData, setFormData] = useState<CreateRepoRequest>({
    owner: agent?.username || '',
    name: '',
    description: '',
    private: false,
  });
  
  const [initWithReadme, setInitWithReadme] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: repoService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      navigate(`/${data.owner}/${data.name}`);
    },
    onError: (error: any) => {
      setErrors({
        submit: error.response?.data?.message || 'Failed to create repository',
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Repository name is required';
    } else if (!/^[a-zA-Z0-9-_.]+$/.test(formData.name)) {
      newErrors.name = 'Repository name can only contain letters, numbers, hyphens, underscores, and periods';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    createMutation.mutate({
      ...formData,
      owner: agent?.username || formData.owner,
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  return (
    <Container className="py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Create a new repository
        </h1>
        <p className="text-[var(--color-text-tertiary)]">
          A repository contains all project files, including the revision history.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <CardContent>
            <div className="space-y-6">
              {/* Owner/Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Owner / Repository name <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]">
                    {agent?.username || formData.owner}
                  </div>
                  <span className="text-[var(--color-text-tertiary)]">/</span>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="my-awesome-repo"
                    error={errors.name}
                    className="flex-1"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                  Great repository names are short and memorable.
                </p>
              </div>

              {/* Description */}
              <div>
                <Textarea
                  name="description"
                  label="Description (optional)"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="A brief description of your repository"
                  rows={3}
                  helperText="Help others understand what your repository is about"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                  Visibility
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, private: false }))}
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      !formData.private
                        ? 'border-secondary bg-secondary/10'
                        : 'border-[var(--color-border)] hover:border-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Globe className="mt-1 text-success" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[var(--color-text-primary)]">
                            Public
                          </h4>
                          {!formData.private && <CheckCircle2 className="text-secondary" size={16} />}
                        </div>
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                          Anyone on the internet can see this repository. You choose who can commit.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, private: true }))}
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      formData.private
                        ? 'border-secondary bg-secondary/10'
                        : 'border-[var(--color-border)] hover:border-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Lock className="mt-1 text-warning" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[var(--color-text-primary)]">
                            Private
                          </h4>
                          {formData.private && <CheckCircle2 className="text-secondary" size={16} />}
                        </div>
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                          You choose who can see and commit to this repository.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Initialize with README */}
              <div className="border-t border-[var(--color-border)] pt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={initWithReadme}
                    onChange={(e) => setInitWithReadme(e.target.checked)}
                    className="mt-1 w-4 h-4 text-secondary border-[var(--color-border)] rounded focus:ring-2 focus:ring-secondary"
                  />
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)] mb-1">
                      Initialize this repository with a README
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      This will let you immediately clone the repository. Skip this if you're importing an existing repository.
                    </p>
                  </div>
                </label>
              </div>

              {/* Error message */}
              {errors.submit && (
                <div className="p-4 bg-error-light border border-error rounded-lg">
                  <p className="text-sm text-error">{errors.submit}</p>
                </div>
              )}

              {/* Submit buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  Create repository
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate('/repositories')}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Container>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { agentService } from '../services/agentService';
import Button from '../components/ui/Button';
import CopyButton from '../components/ui/CopyButton';
import { ExternalLink, Twitter, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ClaimAgent() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tweetUrl, setTweetUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch claim info
  const { data: claimInfo, isLoading, error } = useQuery({
    queryKey: ['claim', token],
    queryFn: () => agentService.getClaimInfo(token!),
    enabled: !!token,
    retry: 1,
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: (tweetUrl: string) => agentService.claimAgent(token!, tweetUrl),
    onSuccess: (data) => {
      // Redirect to agent profile after 2 seconds
      setTimeout(() => {
        navigate(`/u/${data.agent.username}`);
      }, 2000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to claim agent. Please try again.';
      setErrorMessage(message);
    },
  });

  const handleClaim = () => {
    setErrorMessage('');

    if (!tweetUrl.trim()) {
      setErrorMessage('Please enter your tweet URL');
      return;
    }

    // Basic URL validation
    if (!tweetUrl.match(/^https?:\/\/(www\.|mobile\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/i)) {
      setErrorMessage('Invalid tweet URL. Expected format: https://twitter.com/user/status/123 or https://x.com/user/status/123');
      return;
    }

    claimMutation.mutate(tweetUrl);
  };

  const openTwitter = () => {
    if (!claimInfo) return;

    const encodedText = encodeURIComponent(claimInfo.tweet_template);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[var(--color-text-secondary)]">Loading claim information...</p>
        </div>
      </div>
    );
  }

  if (error || !claimInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Claim Not Found</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            This claim link is invalid or the agent has already been claimed.
          </p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  // Success state
  if (claimMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-success rounded-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Successfully Claimed! 🎉</h1>
          <p className="text-[var(--color-text-secondary)] mb-2">
            Welcome, <span className="text-success font-semibold">{claimMutation.data.agent.human_owner}</span>!
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Your agent <strong>{claimMutation.data.agent.username}</strong> is now verified.
            Rate limit upgraded to <strong>{claimMutation.data.agent.rate_limit_tier}</strong> tier.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Redirecting to profile page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Claim Your AI Agent
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Agent: <span className="font-semibold text-[var(--color-text)]">{claimInfo.username}</span>
          </p>
        </div>

        {/* Verification Code Display */}
        <div className="bg-[var(--color-code-bg)] border-2 border-secondary rounded-lg p-6 mb-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            Verification Code
          </p>
          <p className="text-4xl font-bold text-secondary tracking-wider">
            {claimInfo.verification_code}
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-sm">
                1
              </span>
              Tweet the verification code
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4 ml-8">
              Post this message to your Twitter/X account to verify ownership:
            </p>
            <div className="ml-8 space-y-2">
              <div className="bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {claimInfo.tweet_template}
                </pre>
              </div>
              <div className="flex gap-2">
                <CopyButton text={claimInfo.tweet_template} label="Copy Tweet" />
                <Button
                  variant="secondary"
                  onClick={openTwitter}
                  className="flex items-center gap-2"
                >
                  <Twitter size={16} />
                  Tweet Now
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-sm">
                2
              </span>
              Paste your tweet URL
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4 ml-8">
              After tweeting, paste the URL of your tweet here:
            </p>
            <div className="ml-8 space-y-2">
              <input
                type="url"
                value={tweetUrl}
                onChange={(e) => {
                  setTweetUrl(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="https://twitter.com/yourusername/status/123456789"
                className="w-full px-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                disabled={claimMutation.isPending}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Example: https://twitter.com/user/status/123 or https://x.com/user/status/123
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-sm">
                3
              </span>
              Verify and claim
            </h2>
            <div className="ml-8">
              <Button
                onClick={handleClaim}
                disabled={claimMutation.isPending || !tweetUrl.trim()}
                className="w-full"
                size="lg"
              >
                {claimMutation.isPending ? (
                  <>
                    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  'Verify & Claim Agent'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-danger-light border border-danger rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-danger mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm text-danger font-semibold">
                  Verification Failed
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 text-sm">
          <p className="text-[var(--color-text-secondary)]">
            <strong>Why claim your agent?</strong> Claiming verifies you own the AI agent and upgrades your rate limits from <strong>unclaimed</strong> (100 requests/hour) to <strong>claimed</strong> (1000 requests/hour). Your agent will be associated with your Twitter/X account.
          </p>
        </div>
      </div>
    </div>
  );
}

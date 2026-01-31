import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Container from '../components/layout/Container';
import { useAuth } from '../hooks/useAuth';
import { agentService } from '../services/agentService';

export default function Login() {
  const navigate = useNavigate();
  const { setApiKey, setAgent } = useAuth();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Set API key temporarily to test it
      setApiKey(apiKeyInput);

      // Try to fetch agent profile with this API key
      const agent = await agentService.getProfile();

      // Success! Save the agent data
      setAgent(agent);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError('Invalid API key. Please check and try again.');
      setApiKey(null); // Clear the invalid API key
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a] relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <Container size="sm" className="relative z-10">
        <Card padding="lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <LogIn size={48} className="text-secondary" />
            </div>
            <CardTitle className="text-center text-2xl">Login to GitClaw</CardTitle>
            <CardDescription className="text-center">
              Enter your API key to access your agent dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="API Key *"
                type="password"
                placeholder="gitclaw_sk_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                required
                error={error || undefined}
                helperText="Your GitClaw API key from registration"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              <p className="text-center text-sm text-[var(--color-text-muted)]">
                Don't have an account?{' '}
                <a href="/register" className="text-secondary hover:underline">
                  Register here
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}

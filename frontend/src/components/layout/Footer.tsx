import { Link } from 'react-router-dom';
import Container from './Container';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      <Container className="py-8" size="xl">
        <div className="grid grid-cols-2 gap-8 md:gap-12 mb-6">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link to="/repositories" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  Repositories
                </Link>
              </li>
              <li>
                <Link to="/agents" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  AI Agents
                </Link>
              </li>
              <li>
                <Link to="/activity" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  Activity
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/skill.md" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/skill.md#api" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <Link to="/search" className="text-[var(--color-text-secondary)] hover:text-primary transition-colors">
                  Search
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-tertiary)]">
          <p>
            © {new Date().getFullYear()} GitClaw · Made for AI Agents
          </p>
        </div>
      </Container>
    </footer>
  );
}

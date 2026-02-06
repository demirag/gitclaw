import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, GitBranch, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { repoService } from '../../services/repoService';
import { cn } from '../../lib/utils';

const MAX_QUICK_RESULTS = 5;

interface GlobalSearchProps {
  onNavigate?: () => void;
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query.trim(), 300);

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ['repositories-search'],
    queryFn: repoService.list,
    enabled: isOpen && debouncedQuery.length > 0,
  });

  const searchResults = debouncedQuery.length > 0
    ? repositories.filter(
        (repo) =>
          repo.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          repo.owner.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          (repo.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ?? false)
      ).slice(0, MAX_QUICK_RESULTS)
    : [];

  const agentMatches = debouncedQuery.length > 0
    ? [...new Set(repositories.map((r) => r.owner))].filter((owner) =>
        owner.toLowerCase().includes(debouncedQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && (isFocused || query.length > 0);
  const hasResults = searchResults.length > 0 || agentMatches.length > 0;

  const handleSelectResult = () => {
    setIsOpen(false);
    setQuery('');
    onNavigate?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debouncedQuery) {
      navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`);
      handleSelectResult();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="global-search" className="sr-only">
          Search repositories and agents
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            size={18}
            aria-hidden
          />
          <input
            id="global-search"
            ref={inputRef}
            type="search"
            placeholder="Search repositories, agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setIsOpen(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setIsOpen(false), 200);
            }}
            className={cn(
              'w-full pl-10 pr-16 py-2 rounded-lg text-sm',
              'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
            )}
            autoComplete="off"
            aria-expanded={showDropdown}
            aria-controls="global-search-results"
            aria-autocomplete="list"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center w-6 h-5 px-1 text-xs font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded">
            /
          </kbd>
        </div>
      </form>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
        >
          {debouncedQuery.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
              Type to search repositories and agents. Press <kbd className="font-mono text-xs px-1 py-0.5 bg-[var(--color-bg-secondary)] rounded">/</kbd> to focus.
            </p>
          ) : isLoading ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">Searching...</p>
          ) : hasResults ? (
            <>
              {searchResults.length > 0 && (
                <div className="mb-2">
                  <p className="px-4 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                    Repositories
                  </p>
                  {searchResults.map((repo) => (
                    <Link
                      key={repo.id}
                      to={`/${repo.owner}/${repo.name}`}
                      onClick={handleSelectResult}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-secondary)] transition-colors"
                      role="option"
                    >
                      <GitBranch size={16} className="text-secondary flex-shrink-0" />
                      <span className="text-sm truncate">
                        <span className="text-secondary">{repo.owner}</span>
                        <span className="text-[var(--color-text-tertiary)]"> / </span>
                        <span className="text-[var(--color-text-primary)]">{repo.name}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {agentMatches.length > 0 && (
                <div>
                  <p className="px-4 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                    Agents
                  </p>
                  {agentMatches.map((username) => (
                    <Link
                      key={username}
                      to={`/u/${username}`}
                      onClick={handleSelectResult}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-secondary)] transition-colors"
                      role="option"
                    >
                      <User size={16} className="text-primary flex-shrink-0" />
                      <span className="text-sm text-[var(--color-text-primary)]">{username}</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                onClick={handleSelectResult}
                className="block px-4 py-2 mt-2 border-t border-[var(--color-border)] text-sm text-primary hover:underline"
              >
                View all results for &quot;{debouncedQuery}&quot; →
              </Link>
            </>
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
              No results for &quot;{debouncedQuery}&quot;. Try a different search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

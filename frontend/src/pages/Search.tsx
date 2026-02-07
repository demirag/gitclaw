import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, GitBranch, User, Star, Terminal } from 'lucide-react';
import Container from '../components/layout/Container';
import AgentAvatar from '../components/features/AgentAvatar';
import { repoService } from '../services/repoService';
import { formatRelativeTime } from '../lib/utils';
import { useTextOverflow } from '../hooks/useTextOverflow';
import type { Repository } from '../lib/types';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data: repositories = [], isLoading } = useQuery<Repository[]>({
    queryKey: ['repositories-search-page'],
    queryFn: () => repoService.list(),
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
      <div className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 opacity-10">
          <div className="grid-pattern animate-grid-flow"></div>
        </div>
        <Container className="py-20 relative z-10">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8
                          bg-cyan-500/10 border-2 border-cyan-400/30">
              <SearchIcon size={48} className="text-cyan-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              Search GitClaw
            </h1>
            <p className="text-gray-400 text-lg font-mono max-w-md mx-auto">
              Enter a search query in the header to find repositories and agents.
            </p>
          </div>
        </Container>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap');

          .grid-pattern {
            background-image:
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            height: 200%;
            width: 200%;
          }

          @keyframes grid-flow {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }

          .animate-grid-flow {
            animation: grid-flow 20s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="grid-pattern animate-grid-flow"></div>
      </div>

      {/* Neon glow effects */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-slow"></div>
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>

      <Container className="py-8 relative z-10" size="xl">
        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 border border-cyan-400/50 rounded-full bg-cyan-500/10">
            <SearchIcon className="text-cyan-400" size={20} />
            <span className="text-cyan-400 font-mono text-sm">SEARCH.RESULTS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2"
              style={{fontFamily: "'Orbitron', sans-serif"}}>
            Results for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
              "{q}"
            </span>
          </h1>
          <p className="text-gray-400 font-mono">
            Found {agentResults.length} agents and {repoResults.length} repositories
          </p>
        </header>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-cyan-400 font-mono">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              <span className="ml-2">Searching...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Agents Results */}
            {agentResults.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"
                    style={{fontFamily: "'Orbitron', sans-serif"}}>
                  <User className="text-cyan-400" size={28} />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                    Agents
                  </span>
                  <span className="text-gray-500">({agentResults.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agentResults.map((username) => (
                    <Link key={username} to={`/u/${username}`}>
                      <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-5
                                     hover:border-cyan-400 hover:bg-cyan-500/5 hover:scale-[1.02]
                                     transition-all duration-200 group">
                        <div className="flex items-center gap-4">
                          <AgentAvatar alt={username} size="md" />
                          <div>
                            <p className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
                              {username}
                            </p>
                            <p className="text-xs text-cyan-400/70 font-mono">
                              @{username}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Repositories Results */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"
                  style={{fontFamily: "'Orbitron', sans-serif"}}>
                <GitBranch className="text-fuchsia-400" size={28} />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                  Repositories
                </span>
                <span className="text-gray-500">({repoResults.length})</span>
              </h2>

              {repoResults.length === 0 ? (
                <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-12 text-center">
                  <GitBranch size={64} className="mx-auto mb-6 text-gray-600" />
                  <h3 className="text-2xl font-bold mb-3 text-white"
                      style={{fontFamily: "'Orbitron', sans-serif"}}>
                    No Repositories Found
                  </h3>
                  <p className="text-gray-500 font-mono">
                    No repositories matching "{q}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repoResults.map((repo) => {
                    const RepositoryCard = () => {
                      const nameOverflow = useTextOverflow();
                      const ownerOverflow = useTextOverflow();
                      const descOverflow = useTextOverflow();

                      return (
                        <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                          <div className="bg-black/60 border-2 border-fuchsia-400/30 rounded-lg p-5
                                         hover:border-fuchsia-400 hover:bg-fuchsia-500/5 hover:scale-[1.02]
                                         transition-all duration-200 group h-full flex flex-col">
                            <div className="flex-1 min-w-0">
                              {/* Repository name */}
                              <p ref={nameOverflow.ref as any}
                                 title={nameOverflow.title}
                                 className="text-sm font-bold text-white truncate font-mono transition-colors mb-1
                                            group-hover:text-fuchsia-300">
                                {repo.name}
                              </p>

                              {/* Owner */}
                              <p ref={ownerOverflow.ref as any}
                                 title={ownerOverflow.title}
                                 className="text-xs font-mono truncate mb-3 text-fuchsia-400/70">
                                <span className="text-gray-600">by</span> {repo.owner}
                              </p>

                              {/* Description */}
                              <p ref={descOverflow.ref as any}
                                 title={descOverflow.title}
                                 className="text-sm text-gray-500 font-mono line-clamp-2 mb-3 min-h-[2.5rem]">
                                {repo.description || 'No description'}
                              </p>

                              {/* Metadata row */}
                              <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                                <span className="flex items-center gap-1 text-fuchsia-400">
                                  <Star size={12} fill="currentColor" />
                                  {repo.starCount}
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                  <Terminal size={12} />
                                  {formatRelativeTime(repo.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    };
                    return <RepositoryCard key={repo.id} />;
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </Container>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap');

        .grid-pattern {
          background-image:
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          height: 200%;
          width: 200%;
        }

        @keyframes grid-flow {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

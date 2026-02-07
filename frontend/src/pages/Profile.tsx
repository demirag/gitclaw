import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, GitBranch, Star, Calendar, CheckCircle } from 'lucide-react';
import Container from '../components/layout/Container';
import AgentAvatar from '../components/features/AgentAvatar';
import { agentService } from '../services/agentService';
import { socialService } from '../services/socialService';
import { repoService } from '../services/repoService';
import { useTextOverflow } from '../hooks/useTextOverflow';

export default function Profile() {
  const { username } = useParams<{ username: string }>();

  // Fetch agent profile
  const { data: agent, isLoading: agentLoading, error: agentError } = useQuery({
    queryKey: ['agent', username],
    queryFn: () => agentService.getAgentByUsername(username!),
    enabled: !!username,
  });

  // Fetch pinned repositories
  const { data: _pins = [] } = useQuery({
    queryKey: ['pins', username],
    queryFn: () => socialService.getPinnedRepos(username!),
    enabled: !!username,
  });

  // Fetch all repositories by owner
  const { data: repositories = [], isLoading: reposLoading } = useQuery({
    queryKey: ['repositories', username],
    queryFn: () => repoService.getByOwner(username!),
    enabled: !!username,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 opacity-10">
          <div className="grid-pattern animate-grid-flow"></div>
        </div>
        <Container className="py-20 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 text-cyan-400 font-mono">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              <span className="ml-2">Loading profile...</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (agentError || !agent) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 opacity-10">
          <div className="grid-pattern animate-grid-flow"></div>
        </div>
        <Container className="py-20 relative z-10">
          <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-12 text-center">
            <User size={64} className="mx-auto mb-6 text-red-400" />
            <h2 className="text-3xl font-bold mb-3 text-white" style={{fontFamily: "'Orbitron', sans-serif"}}>
              Agent Not Found
            </h2>
            <p className="text-gray-400 font-mono">
              The agent "{username}" does not exist.
            </p>
          </div>
        </Container>
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
      <div className="fixed top-20 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-slow"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>

      <Container className="py-8 relative z-10" size="xl">
        {/* Profile Header */}
        <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative">
                <AgentAvatar
                  src={agent.avatarUrl}
                  alt={agent.username}
                  size="xl"
                  isVerified={agent.isVerified}
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2 flex items-center gap-3"
                      style={{fontFamily: "'Orbitron', sans-serif"}}>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                      {agent.displayName}
                    </span>
                    {agent.isVerified && (
                      <CheckCircle size={28} className="text-cyan-400" />
                    )}
                  </h1>
                  <p className="text-xl text-cyan-400/70 font-mono">@{agent.username}</p>
                </div>
              </div>

              {agent.bio && (
                <p className="text-gray-400 font-mono mb-6 text-lg">{agent.bio}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-cyan-500/10 border-2 border-cyan-400/30 rounded-lg p-4 text-center
                              hover:border-cyan-400 hover:bg-cyan-500/20 transition-all group">
                  <div className="text-2xl font-bold text-cyan-400 mb-1 font-mono group-hover:scale-110 transition-transform">
                    {agent.repositoryCount}
                  </div>
                  <div className="text-xs text-gray-400 font-mono uppercase">Repos</div>
                </div>

                <div className="bg-fuchsia-500/10 border-2 border-fuchsia-400/30 rounded-lg p-4 text-center
                              hover:border-fuchsia-400 hover:bg-fuchsia-500/20 transition-all group">
                  <div className="text-2xl font-bold text-fuchsia-400 mb-1 font-mono group-hover:scale-110 transition-transform">
                    {agent.contributionCount}
                  </div>
                  <div className="text-xs text-gray-400 font-mono uppercase">Contributions</div>
                </div>

                <div className="bg-yellow-500/10 border-2 border-yellow-400/30 rounded-lg p-4 text-center
                              hover:border-yellow-400 hover:bg-yellow-500/20 transition-all group">
                  <div className="text-2xl font-bold text-yellow-400 mb-1 font-mono group-hover:scale-110 transition-transform">
                    {agent.followerCount}
                  </div>
                  <div className="text-xs text-gray-400 font-mono uppercase">Followers</div>
                </div>

                <div className="bg-green-500/10 border-2 border-green-400/30 rounded-lg p-4 text-center
                              hover:border-green-400 hover:bg-green-500/20 transition-all group">
                  <div className="text-2xl font-bold text-green-400 mb-1 font-mono group-hover:scale-110 transition-transform">
                    {agent.followingCount}
                  </div>
                  <div className="text-xs text-gray-400 font-mono uppercase">Following</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-mono">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-cyan-400" />
                  Joined {formatDate(agent.createdAt)}
                </span>
                {agent.isVerified && (
                  <>
                    <span>·</span>
                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-400 text-xs font-bold">
                      {agent.rateLimitTier}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Repositories Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-3"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <GitBranch className="text-cyan-400" size={32} />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                Repositories
              </span>
              <span className="text-gray-500 text-2xl">({agent.repositoryCount})</span>
            </h2>
          </div>

          {reposLoading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-cyan-400 font-mono">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <span className="ml-2">Loading repositories...</span>
              </div>
            </div>
          ) : repositories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {repositories.map((repo) => {
                const RepositoryCard = () => {
                  const nameOverflow = useTextOverflow();
                  const descOverflow = useTextOverflow();

                  return (
                    <Link key={repo.id} to={`/${repo.owner}/${repo.name}`}>
                      <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-5
                                     hover:border-cyan-400 hover:bg-cyan-500/5 hover:scale-[1.02]
                                     transition-all duration-200 group h-full flex flex-col">
                        <div className="flex-1 min-w-0">
                          {/* Repository name */}
                          <p ref={nameOverflow.ref as any}
                             title={nameOverflow.title}
                             className="text-sm font-bold text-white truncate font-mono transition-colors mb-1
                                        group-hover:text-cyan-300">
                            {repo.name}
                          </p>

                          {/* Owner */}
                          <p className="text-xs font-mono truncate mb-3 text-cyan-400/70">
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
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Star size={12} fill="currentColor" />
                              {repo.starCount}
                            </span>
                            <span className="flex items-center gap-1 text-gray-400">
                              <GitBranch size={12} />
                              {repo.branchCount}
                            </span>
                            {repo.language && (
                              <span className="flex items-center gap-1 text-fuchsia-400">
                                <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400"></span>
                                {repo.language}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                };
                return <RepositoryCard key={repo.id} />;
              })}
            </div>
          ) : (
            <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-16 text-center">
              <GitBranch size={64} className="mx-auto mb-6 text-gray-600" />
              <h3 className="text-2xl font-bold mb-3 text-white"
                  style={{fontFamily: "'Orbitron', sans-serif"}}>
                No Repositories Yet
              </h3>
              <p className="text-gray-500 font-mono">
                This agent hasn't created any repositories.
              </p>
            </div>
          )}
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

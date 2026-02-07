import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, TrendingUp, GitBranch, Users, Star, Terminal, Sparkles, Calendar } from 'lucide-react';
import Container from '../components/layout/Container';
import AgentAvatar from '../components/features/AgentAvatar';
import { formatRelativeTime } from '../lib/utils';
import { useTextOverflow } from '../hooks/useTextOverflow';
import api from '../lib/api';

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string | null;
  starCount: number;
  branchCount: number;
  commitCount: number;
  updatedAt: string;
  createdAt: string;
}

interface Agent {
  id: string;
  username: string;
  displayName: string;
  repositoryCount: number;
  contributionCount: number;
  lastActiveAt: string;
  isVerified: boolean;
}

interface PlatformStats {
  agents: number;
  repositories: number;
  pullRequests: number;
  totalStars: number;
}

// Unified Repository Card Component
function RepositoryCard({ repo, borderColor, hoverColor }: {
  repo: Repository;
  borderColor: string;
  hoverColor: string;
}) {
  const repoNameOverflow = useTextOverflow();
  const ownerOverflow = useTextOverflow();
  const descOverflow = useTextOverflow();

  return (
    <Link to={`/${repo.owner}/${repo.name}`}>
      <div className={`bg-black/60 border-2 ${borderColor} rounded-lg p-5
                     hover:${hoverColor} hover:scale-[1.02]
                     transition-all duration-200 group h-full flex flex-col`}>
        <div className="flex-1 min-w-0">
          {/* Repository name - prominent title */}
          <p ref={repoNameOverflow.ref as any}
             title={repoNameOverflow.title}
             className={`text-sm font-bold text-white truncate font-mono transition-colors mb-1
                        ${hoverColor.includes('yellow') ? 'group-hover:text-yellow-300' :
                          hoverColor.includes('fuchsia') ? 'group-hover:text-fuchsia-300' :
                          'group-hover:text-cyan-300'}`}>
            {repo.name}
          </p>

          {/* Owner - secondary info */}
          <p ref={ownerOverflow.ref as any}
             title={ownerOverflow.title}
             className={`text-xs font-mono truncate mb-3 flex items-center gap-1
                        ${hoverColor.includes('yellow') ? 'text-yellow-400/70' :
                          hoverColor.includes('fuchsia') ? 'text-fuchsia-400/70' :
                          'text-cyan-400/70'}`}>
            <span className="text-gray-600">by</span> {repo.owner}
          </p>

          {/* Description - consistent 2-line clamp everywhere */}
          <p ref={descOverflow.ref as any}
             title={descOverflow.title}
             className="text-sm text-gray-500 font-mono line-clamp-2 mb-3 min-h-[2.5rem]">
            {repo.description || 'No description'}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
            <span className={`flex items-center gap-1 ${
              hoverColor.includes('yellow') ? 'text-yellow-400' :
              hoverColor.includes('fuchsia') ? 'text-fuchsia-400' :
              'text-cyan-400'
            }`}>
              <Star size={12} fill="currentColor" />
              {repo.starCount}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <GitBranch size={12} />
              {repo.commitCount}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar size={12} />
              {formatRelativeTime(repo.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Agent Card Component - Horizontal Layout
function AgentCard({ agent }: { agent: Agent }) {
  const nameOverflow = useTextOverflow();

  return (
    <Link to={`/u/${agent.username}`}>
      <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-4
                    hover:border-cyan-400 hover:bg-cyan-500/5 hover:scale-[1.02]
                    transition-all duration-200 group h-full flex items-center gap-4">
        <AgentAvatar
          alt={agent.username}
          size="md"
          className="flex-shrink-0"
          isVerified={agent.isVerified}
        />

        <div className="flex-1 min-w-0">
          <p ref={nameOverflow.ref as any}
             title={nameOverflow.title}
             className="font-bold text-sm text-white truncate font-mono group-hover:text-cyan-300 transition-colors mb-1">
            {agent.displayName}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
            <span className="flex items-center gap-1">
              <GitBranch size={11} />
              {agent.repositoryCount}
            </span>
            <span className="flex items-center gap-1">
              <Terminal size={11} />
              {agent.contributionCount}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              <Sparkles size={10} />
              {formatRelativeTime(agent.lastActiveAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Explore() {
  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      try {
        const res = await api.get<PlatformStats>('/stats');
        return res.data;
      } catch {
        return { agents: 0, repositories: 0, pullRequests: 0, totalStars: 0 };
      }
    },
  });

  // Fetch recent repositories
  const { data: recentRepos = [] } = useQuery({
    queryKey: ['explore-recent'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { sortBy: 'created', pageSize: 12 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch trending repositories
  const { data: trendingRepos = [] } = useQuery({
    queryKey: ['explore-trending'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { sortBy: 'stars', pageSize: 8 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch all repositories for language browsing
  const { data: allRepos = [] } = useQuery({
    queryKey: ['explore-all-repos'],
    queryFn: async () => {
      try {
        const res = await api.get<{ repositories: Repository[] }>('/repositories', {
          params: { pageSize: 100 },
        });
        return res.data.repositories ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch active agents
  const { data: agentsList = [] } = useQuery({
    queryKey: ['explore-agents'],
    queryFn: async () => {
      try {
        const res = await api.get<{ agents: Agent[] }>('/agents/list', {
          params: { pageSize: 12, sortBy: 'LastActive' },
        });
        return res.data.agents ?? [];
      } catch {
        return [];
      }
    },
  });

  const languages = [...new Set(allRepos.map((r) => r.language).filter(Boolean))].slice(0, 10) as string[];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="grid-pattern animate-grid-flow"></div>
      </div>

      <Container className="py-8 relative z-10" size="xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 border border-cyan-400/50 rounded-full bg-cyan-500/10">
            <Compass className="text-cyan-400" size={24} />
            <span className="text-cyan-400 font-mono text-sm">EXPLORE.NETWORK</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              style={{fontFamily: "'Orbitron', sans-serif"}}>
            Discover What AI Agents Are Building
          </h1>
          <p className="text-gray-400 text-lg font-mono max-w-2xl mx-auto">
            Browse trending repositories, recent activity, and the most active agents.
          </p>
        </header>

        {/* Platform Stats */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/60 border-2 border-cyan-400/30 rounded-lg p-6 text-center
                          hover:border-cyan-400 hover:bg-cyan-500/5 transition-all group">
              <div className="text-3xl font-bold text-cyan-400 mb-2 font-mono group-hover:scale-110 transition-transform">
                {stats?.agents || 0}
              </div>
              <div className="text-sm text-gray-400 font-mono">AI AGENTS</div>
            </div>

            <div className="bg-black/60 border-2 border-fuchsia-400/30 rounded-lg p-6 text-center
                          hover:border-fuchsia-400 hover:bg-fuchsia-500/5 transition-all group">
              <div className="text-3xl font-bold text-fuchsia-400 mb-2 font-mono group-hover:scale-110 transition-transform">
                {stats?.repositories || 0}
              </div>
              <div className="text-sm text-gray-400 font-mono">REPOSITORIES</div>
            </div>

            <div className="bg-black/60 border-2 border-green-400/30 rounded-lg p-6 text-center
                          hover:border-green-400 hover:bg-green-500/5 transition-all group">
              <div className="text-3xl font-bold text-green-400 mb-2 font-mono group-hover:scale-110 transition-transform">
                {stats?.pullRequests || 0}
              </div>
              <div className="text-sm text-gray-400 font-mono">PULL REQUESTS</div>
            </div>

            <div className="bg-black/60 border-2 border-yellow-400/30 rounded-lg p-6 text-center
                          hover:border-yellow-400 hover:bg-yellow-500/5 transition-all group">
              <div className="text-3xl font-bold text-yellow-400 mb-2 font-mono group-hover:scale-110 transition-transform">
                {stats?.totalStars || 0}
              </div>
              <div className="text-sm text-gray-400 font-mono">TOTAL STARS</div>
            </div>
          </div>
        </section>

        {/* Most Starred - Unified Cards */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <TrendingUp className="text-yellow-400" size={28} />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Most Starred
              </span>
            </h2>
            <Link
              to="/repositories?sort=stars"
              className="text-cyan-400 hover:text-cyan-300 font-mono text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <Terminal size={14} />
            </Link>
          </div>
          {trendingRepos.length === 0 ? (
            <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-12 text-center">
              <p className="text-gray-500 font-mono">
                No repositories yet. Star counts will appear as the community grows.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingRepos.slice(0, 4).map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repo={repo}
                  borderColor="border-yellow-400/30"
                  hoverColor="border-yellow-400 hover:bg-yellow-500/5"
                />
              ))}
            </div>
          )}
        </section>

        {/* Recently Created - Unified Cards in Grid */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <GitBranch className="text-fuchsia-400" size={28} />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                Recently Created
              </span>
            </h2>
            <Link
              to="/repositories?sort=created"
              className="text-cyan-400 hover:text-cyan-300 font-mono text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <Terminal size={14} />
            </Link>
          </div>
          {recentRepos.length === 0 ? (
            <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-12 text-center">
              <p className="text-gray-500 font-mono">
                No repositories yet. New repos will appear here as agents create them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentRepos.slice(0, 4).map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repo={repo}
                  borderColor="border-fuchsia-400/30"
                  hoverColor="border-fuchsia-400 hover:bg-fuchsia-500/5"
                />
              ))}
            </div>
          )}
        </section>

        {/* Active Agents */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <Users className="text-cyan-400" size={28} />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                Active Agents
              </span>
            </h2>
            <Link
              to="/agents"
              className="text-cyan-400 hover:text-cyan-300 font-mono text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <Terminal size={14} />
            </Link>
          </div>
          {agentsList.length === 0 ? (
            <div className="bg-black/40 border-2 border-gray-600/30 rounded-lg p-12 text-center">
              <p className="text-gray-500 font-mono">
                No agents yet. Agent activity will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {agentsList.slice(0, 4).map((agent) => (
                <AgentCard key={agent.username} agent={agent} />
              ))}
            </div>
          )}
        </section>

        {/* Browse by Language */}
        {languages.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6"
                style={{fontFamily: "'Orbitron', sans-serif"}}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                Browse by Language
              </span>
            </h2>
            <div className="flex flex-wrap gap-3">
              {languages.map((lang) => (
                <Link
                  key={lang}
                  to={`/repositories?language=${encodeURIComponent(lang)}`}
                  className="px-4 py-2 rounded-lg bg-black/60 border-2 border-cyan-400/30
                           text-sm text-gray-400 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10
                           transition-all font-mono font-bold"
                >
                  {lang}
                </Link>
              ))}
            </div>
          </section>
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
      `}</style>
    </div>
  );
}

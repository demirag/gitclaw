import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import Explore from './pages/Explore';
import Activity from './pages/Activity';
import RepositoryList from './pages/RepositoryList';
import RepositoryLayout from './pages/RepositoryLayout';
import RepositoryDetail, { RepositoryCommitsContent } from './pages/RepositoryDetail';
import PullRequestList from './pages/PullRequestList';
import PullRequestDetail from './pages/PullRequestDetail';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import ReleaseList from './pages/ReleaseList';
import ReleaseDetail from './pages/ReleaseDetail';
import Profile from './pages/Profile';
import AgentList from './pages/AgentList';
import Search from './pages/Search';
import ClaimAgent from './pages/ClaimAgent';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  // Initialize theme - DARK MODE IS DEFAULT!
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    // Dark mode is default, only remove if user explicitly chose light mode
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
      <Header />
      <main className="flex-1">
        <Routes>
          {/* Main Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/search" element={<Search />} />

          {/* Repository list and agent list */}
          <Route path="/repositories" element={<RepositoryList />} />
          <Route path="/agents" element={<AgentList />} />

          {/* Profile Route */}
          <Route path="/u/:username" element={<Profile />} />

          {/* Claim Agent Route */}
          <Route path="/claim/:token" element={<ClaimAgent />} />

          {/* Repository routes: shared layout (header, clone URL, tabs) + outlet */}
          <Route path="/:owner/:repo" element={<RepositoryLayout />}>
            <Route index element={<RepositoryDetail />} />
            <Route path="commits" element={<RepositoryCommitsContent />} />
            <Route path="pulls" element={<PullRequestList />} />
            <Route path="pull/:number" element={<PullRequestDetail />} />
            <Route path="issues" element={<IssueList />} />
            <Route path="issues/:number" element={<IssueDetail />} />
            <Route path="releases" element={<ReleaseList />} />
            <Route path="releases/tag/:tag" element={<ReleaseDetail />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

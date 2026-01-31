import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Activity from './pages/Activity';
import RepositoryList from './pages/RepositoryList';
import RepositoryDetail from './pages/RepositoryDetail';
import PullRequestList from './pages/PullRequestList';
import PullRequestDetail from './pages/PullRequestDetail';
import Profile from './pages/Profile';
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
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Header />
      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/activity" element={<Activity />} />
        
        {/* Repository Routes - Read-only for humans */}
        <Route path="/repositories" element={<RepositoryList />} />
        
        {/* Profile Route */}
        <Route path="/u/:username" element={<Profile />} />
        
        {/* Repository Detail Routes */}
        <Route path="/:owner/:repo" element={<RepositoryDetail />} />
        <Route path="/:owner/:repo/pulls" element={<PullRequestList />} />
        <Route path="/:owner/:repo/pull/:number" element={<PullRequestDetail />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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

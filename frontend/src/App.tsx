import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RepositoryList from './pages/RepositoryList';
import RepositoryDetail from './pages/RepositoryDetail';
import PullRequestList from './pages/PullRequestList';
import PullRequestDetail from './pages/PullRequestDetail';
import CreateRepository from './pages/CreateRepository';
import CreatePullRequest from './pages/CreatePullRequest';
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated, agent, logout } = useAuth();

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
      <Header isAuthenticated={isAuthenticated} agent={agent} onLogout={logout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Repository routes */}
        <Route
          path="/repositories"
          element={
            <ProtectedRoute>
              <RepositoryList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <CreateRepository />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:owner/:repo"
          element={
            <ProtectedRoute>
              <RepositoryDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:owner/:repo/pulls"
          element={
            <ProtectedRoute>
              <PullRequestList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:owner/:repo/pull/:number"
          element={
            <ProtectedRoute>
              <PullRequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:owner/:repo/compare"
          element={
            <ProtectedRoute>
              <CreatePullRequest />
            </ProtectedRoute>
          }
        />
        
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

import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, Compass, GitBranch, Users, Activity, X, Terminal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import GlobalSearch from './GlobalSearch';

const navItems = [
  { label: 'Home', href: '/', icon: Terminal },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Repositories', href: '/repositories', icon: GitBranch },
  { label: 'Agents', href: '/agents', icon: Users },
  { label: 'Activity', href: '/activity', icon: Activity },
];

export default function Header() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b-2 border-cyan-400/30">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="text-2xl font-bold flex items-center gap-2"
                 style={{fontFamily: "'Orbitron', sans-serif"}}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400
                             group-hover:from-fuchsia-400 group-hover:to-cyan-400 transition-all">
                GitClaw
              </span>
              <span className="text-cyan-400 text-sm animate-pulse">🦉</span>
            </div>
          </Link>

          {/* Global Search - Desktop */}
          <div className="hidden md:block flex-1 max-w-xl min-w-0">
            <GlobalSearch />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2 flex-shrink-0" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all font-mono',
                  isActive(item.href)
                    ? 'text-white bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 border-2 border-transparent hover:border-cyan-400/30'
                )}
              >
                {item.icon && <item.icon size={18} aria-hidden />}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-fuchsia-400
                       border-2 border-transparent hover:border-fuchsia-400/40
                       hover:bg-fuchsia-500/10 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-cyan-400
                       border-2 border-transparent hover:border-cyan-400/40
                       hover:bg-cyan-500/10 transition-all"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden py-4 border-t-2 border-cyan-400/30"
            role="dialog"
            aria-label="Mobile navigation"
          >
            {/* Mobile search */}
            <div className="mb-4 px-2">
              <GlobalSearch onNavigate={() => setIsMobileMenuOpen(false)} />
            </div>
            <nav className="flex flex-col gap-2" aria-label="Mobile navigation links">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-all font-mono',
                    isActive(item.href)
                      ? 'text-white bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-2 border-cyan-400'
                      : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 border-2 border-transparent'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon size={20} aria-hidden />}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </header>
  );
}

import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../lib/authService';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { path: '/today', label: 'Dashboard' },
    { path: '/library', label: 'Library' },
    { path: '/progress', label: 'Progress' },
    { path: '/settings', label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const activeIndex = useMemo(() => Math.max(0, navItems.findIndex(n => isActive(n.path))), [location.pathname]);

  const handleSignOut = async () => {
    try {
      const confirmed = window.confirm('Sign out of Manzil?');
      if (!confirmed) return;
      setIsSigningOut(true);
      await AuthService.signOut();
      // After sign-out, send user to Today (which will render AuthScreen)
      navigate('/today');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const userEmail = AuthService.getUserEmail();
  const userDisplayName = AuthService.getUserDisplayName();
  const userInitial = (userDisplayName || userEmail || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and App Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-dark-text text-sm font-medium">م</span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-dark-text">Manzil</h1>
            </div>
          </div>

          {/* Profile */}
          <div className="hidden md:flex items-center gap-3 relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full bg-dark-surface-hover text-dark-text flex items-center justify-center border border-dark-border"
              aria-label="Profile menu"
            >
              <span className="text-sm">{userInitial}</span>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-10 w-56 bg-dark-surface border border-dark-border rounded-xl shadow-lg p-3 z-40">
                <div className="mb-2">
                  <div className="text-sm text-dark-text">{userDisplayName || 'User'}</div>
                  <div className="text-xs text-dark-text-secondary">{userEmail || '—'}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full text-left px-3 py-2 text-sm text-dark-text-secondary hover:text-dark-text hover:bg-dark-surface-hover rounded-lg disabled:opacity-50"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden w-8 h-8 bg-dark-surface-hover rounded-xl flex items-center justify-center text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Tab Bar Overlay */}
        <div className="hidden md:flex justify-center mt-3">
          <div className="relative w-full max-w-xl bg-dark-surface-hover border border-dark-border rounded-2xl p-1">
            {/* Slider */}
            <div
              className="absolute top-1 bottom-1 w-1/4 rounded-xl bg-accent/20 transition-transform duration-300"
              style={{ transform: `translateX(${(activeIndex >= 0 ? activeIndex : 0) * 100}%)` }}
            />
            <div className="relative grid grid-cols-4 gap-1">
              {navItems.map((item, idx) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`z-10 px-3 py-2 text-sm rounded-xl transition-colors ${
                    isActive(item.path)
                      ? 'text-accent'
                      : 'text-dark-text-secondary hover:text-dark-text'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="absolute right-0 top-0 h-full w-64 bg-dark-surface border-l border-dark-border p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-accent rounded-xl flex items-center justify-center">
                  <span className="text-dark-text text-xs font-medium">م</span>
                </div>
                <h2 className="text-base font-medium text-dark-text">Manzil</h2>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-6 h-6 bg-dark-surface-hover rounded-xl flex items-center justify-center text-dark-text-secondary hover:text-dark-text transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 rounded-lg ${
                    isActive(item.path)
                      ? 'bg-accent text-dark-text'
                      : 'text-dark-text-secondary hover:text-dark-text hover:bg-dark-surface-hover'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              {/* Mobile User Info and Sign Out */}
              <div className="pt-4 mt-4 border-t border-dark-border">
                <div className="px-3 py-2 text-sm text-dark-text-secondary">
                  <div className="text-dark-text">{userDisplayName || 'User'}</div>
                  <div className="text-xs">{userEmail}</div>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsSidebarOpen(false);
                  }}
                  disabled={isSigningOut}
                  className="w-full text-left px-3 py-2 text-sm text-dark-text-secondary hover:text-dark-text hover:bg-dark-surface-hover transition-colors duration-200 rounded-lg disabled:opacity-50"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;

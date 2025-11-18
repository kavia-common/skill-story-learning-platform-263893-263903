import React, { useState, useEffect } from 'react';
import './App.css';
import StoryBrowser from './components/StoryBrowser';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';

// PUBLIC_INTERFACE
function Header({ theme, onToggle }) {
  /** App header with theme switch and user status with logout. */
  const { user, logout } = useAuth();
  return (
    <header className="App-header" style={{ minHeight: 'auto', padding: '16px', position: 'relative' }}>
      <button
        className="theme-toggle"
        onClick={onToggle}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      <h1 style={{ margin: 0 }}>Skill Story LMS</h1>
      <p style={{ marginTop: 4 }}>A minimal end-to-end demo: stories, choices, progress, and journal.</p>
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>
          {user ? `Signed in as ${user.display_name || user.username || user.email}` : 'Not signed in'}
        </span>
        {user ? (
          <button onClick={logout} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
function AppBody() {
  /** Renders either auth forms (login/signup) or the main StoryBrowser. */
  const { user, initializing } = useAuth();
  const [tab, setTab] = useState('login');
  if (initializing) {
    return <div style={{ padding: 16 }}>Initializing…</div>;
  }
  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setTab('login')} className="choice" style={{ background: tab === 'login' ? 'var(--button-bg)' : 'var(--bg-secondary)', color: tab === 'login' ? 'var(--button-text)' : 'var(--text-primary)' }}>
            Login
          </button>
          <button onClick={() => setTab('signup')} className="choice" style={{ background: tab === 'signup' ? 'var(--button-bg)' : 'var(--bg-secondary)', color: tab === 'signup' ? 'var(--button-text)' : 'var(--text-primary)' }}>
            Sign up
          </button>
        </div>
        {tab === 'login' ? <Login onSuccess={() => setTab('')} /> : <Signup onSuccess={() => setTab('')} />}
        <div className="card" style={{ marginTop: 12 }}>
          <p className="muted">
            Tip: After signing in, you can submit choices, update your profile, and add journal entries.
          </p>
        </div>
      </div>
    );
  }
  return <StoryBrowser />;
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Root application including theme toggle, AuthProvider, and the StoryBrowser demo UI wired to FastAPI.
   */
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <AuthProvider>
        <Header theme={theme} onToggle={toggleTheme} />
        <AppBody />
      </AuthProvider>
    </div>
  );
}

export default App;

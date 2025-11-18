import React, { useState, useEffect } from 'react';
import './App.css';
import StoryBrowser from './components/StoryBrowser';

// PUBLIC_INTERFACE
function App() {
  /**
   * Root application including theme toggle and the StoryBrowser demo UI wired to FastAPI.
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
      <header className="App-header" style={{ minHeight: 'auto', padding: '16px', position: 'relative' }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 style={{ margin: 0 }}>Skill Story LMS</h1>
        <p style={{ marginTop: 4 }}>A minimal end-to-end demo: stories, choices, progress, and journal.</p>
      </header>
      <StoryBrowser />
    </div>
  );
}

export default App;

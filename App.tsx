import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/shared/Navigation';
import Today from './pages/Today';
import Landing from './pages/Landing';
import Library from './pages/Library';
import Session from './pages/Session';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Mushaf from './pages/Mushaf';
import './App.css';
import { AuthService } from './lib/authService';

function AppContent() {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    AuthService.initializeAuth().then(() => {
      setIsAuthed(!!AuthService.getCurrentUser());
      setReady(true);
    });
  }, []);

  // Hide navigation on Mushaf and Session pages for immersive experience
  const showNavigation = !location.pathname.startsWith('/mushaf') && 
                         !location.pathname.startsWith('/session');

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      {showNavigation && <Navigation />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={ready ? (isAuthed ? <Today /> : <Landing />) : <div />} />
          <Route path="/today" element={<Today />} />
          <Route path="/library" element={<Library />} />
          <Route path="/session" element={<Session />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/mushaf/:surahId" element={<Mushaf />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

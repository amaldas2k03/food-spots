import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';

import Layout from './components/Layout.jsx';
import { Spinner } from './components/Feedback.jsx';
import { useAuthStore } from './store/authStore.js';
import { useNotificationStore } from './store/notificationStore.js';

import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
import MapView from './pages/MapView.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SpotDetail from './pages/SpotDetail.jsx';
import AddSpot from './pages/AddSpot.jsx';
import EditSpot from './pages/EditSpot.jsx';
import WriteReview from './pages/WriteReview.jsx';
import CrawlPlanner from './pages/CrawlPlanner.jsx';
import Lists from './pages/Lists.jsx';
import ListDetail from './pages/ListDetail.jsx';
import Social from './pages/Social.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

/** Sends signed-out visitors to /login, remembering where they were headed. */
function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

/**
 * Signed-in visitors get the feed at `/`; everyone else gets the landing page.
 * It redirects rather than rendering in place so the URL always matches what's
 * on screen and `/welcome` stays independently linkable.
 */
function HomeOrLanding() {
  const user = useAuthStore((s) => s.user);
  return user ? <Home /> : <Navigate to="/welcome" replace />;
}

export default function App() {
  const { user, loading, init } = useAuthStore();
  const { connect, disconnect } = useNotificationStore();

  useEffect(() => {
    init();
  }, [init]);

  // The notification socket lives as long as the session does.
  useEffect(() => {
    if (user) connect();
    else disconnect();
  }, [user, connect, disconnect]);

  if (loading) return <Spinner label="Setting the table…" />;

  return (
    /*
     * `reducedMotion="user"` is the global accessibility backstop: when the OS
     * asks for less motion, Framer drops every transform and layout animation
     * across the app while keeping opacity, so content still arrives softly
     * instead of popping. Individual components only need to handle the cases
     * this can't reach — scroll-linked parallax and looping ambient effects.
     */
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100]"
      >
        Skip to content
      </a>

      <Routes>
        {/* Auth pages render without the app chrome. */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* One Layout for every chrome route — see the note in Layout.jsx.
            Pages that need the full width (landing, map, spot hero) break out
            with <Bleed> rather than mounting a second shell. */}
        <Route element={<Layout />}>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/" element={<HomeOrLanding />} />
          <Route path="/search" element={<SearchPage />} />
          {/* Router ranking puts the static "new" ahead of /spots/:id already;
              it is listed first here to keep the spot routes reading in order. */}
          <Route
            path="/spots/new"
            element={
              <RequireAuth>
                <AddSpot />
              </RequireAuth>
            }
          />
          <Route path="/spots/:id" element={<SpotDetail />} />
          <Route
            path="/spots/:id/edit"
            element={
              <RequireAuth>
                <EditSpot />
              </RequireAuth>
            }
          />
          <Route
            path="/spots/:id/review/new"
            element={
              <RequireAuth>
                <WriteReview />
              </RequireAuth>
            }
          />
          <Route path="/crawl" element={<CrawlPlanner />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route
            path="/social"
            element={
              <RequireAuth>
                <Social />
              </RequireAuth>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}

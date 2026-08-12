import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import { Spinner } from './components/Feedback.jsx';
import { useAuthStore } from './store/authStore.js';
import { useNotificationStore } from './store/notificationStore.js';

import Home from './pages/Home.jsx';
import MapView from './pages/MapView.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SpotDetail from './pages/SpotDetail.jsx';
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

  if (loading) return <Spinner label="Starting FoodSpots…" />;

  return (
    <Routes>
      {/* Auth pages render without the app chrome. */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Map view needs the full viewport, so it uses a full-bleed layout. */}
      <Route element={<Layout fullBleed />}>
        <Route path="/map" element={<MapView />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/spots/:id" element={<SpotDetail />} />
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
  );
}

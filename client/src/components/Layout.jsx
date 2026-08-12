import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

/** Fixed navbar + fixed sidebar, with the routed page scrolling in the remaining space. */
export default function Layout({ fullBleed = false }) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="mt-(--spacing-navbar) ml-(--spacing-sidebar) min-h-[calc(100vh-var(--spacing-navbar))]">
        {/* Map view manages its own full-height layout, so it opts out of padding. */}
        <div className={fullBleed ? '' : 'mx-auto max-w-6xl p-6'}>
          <Outlet />
        </div>
      </main>
    </>
  );
}

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders Google Identity Services' own button. The script is loaded on demand
 * so the app doesn't pull it in when Google sign-in isn't configured.
 */
export default function GoogleButton({ onError, redirectTo = '/' }) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const navigate = useNavigate();
  const container = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    function render() {
      if (cancelled || !window.google || !container.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await loginWithGoogle(credential);
            navigate(redirectTo, { replace: true });
          } catch (err) {
            onError?.(err.message);
          }
        },
      });
      window.google.accounts.id.renderButton(container.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    }

    if (window.google?.accounts?.id) return render();

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    script.onerror = () => onError?.('Could not load Google sign-in');
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate, onError, redirectTo]);

  if (!CLIENT_ID) {
    return (
      <p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-center text-xs text-muted">
        Google sign-in is unavailable — set <code>VITE_GOOGLE_CLIENT_ID</code> in{' '}
        <code>client/.env</code>
      </p>
    );
  }

  return <div ref={container} className="flex justify-center" />;
}

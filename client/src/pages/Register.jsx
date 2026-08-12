import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { CUISINES } from '../utils/format.js';
import GoogleButton from '../components/GoogleButton.jsx';

export default function Register() {
  const registerUser = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  // Two-step: credentials, then the taste-profile onboarding from the spec.
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [tastes, setTastes] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggleTaste = (c) =>
    setTastes((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]));

  function goToStep2(e) {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setError(null);
    setStep(2);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await registerUser({ ...form, tasteProfile: tastes });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setStep(1); // errors here are almost always email/password related
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-center font-display text-xl font-bold">
          Food<span className="text-accent">Spots</span>
        </h1>

        {step === 1 ? (
          <>
            <p className="mt-1 text-center text-sm text-muted">Create your account</p>

            <form onSubmit={goToStep2} className="mt-6 space-y-3">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted">At least 8 characters</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Continue
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-muted">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <GoogleButton onError={setError} />

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-center text-sm text-muted">
              What do you like to eat? Pick a few — we'll use these to suggest spots.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {CUISINES.map((c) => {
                const on = tastes.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleTaste(c)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line hover:border-accent'
                    }`}
                  >
                    {on && <Check size={13} />}
                    {c}
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-bg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {busy ? 'Creating account…' : `Finish${tastes.length ? ` (${tastes.length} picked)` : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

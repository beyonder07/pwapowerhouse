'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BrandLogo, ThemeToggle, useThemeState } from '@/components/chrome';
import { API_URL } from '@/lib/auth';

type SetupState = {
  ready: boolean;
  supabaseConfigured: boolean;
  ownerExists: boolean;
  requiresSetupCode: boolean;
};

const defaultSetupState: SetupState = {
  ready: false,
  supabaseConfigured: false,
  ownerExists: false,
  requiresSetupCode: false
};

export default function OwnerSetupPage() {
  const { theme, toggleTheme } = useThemeState();
  const [setupState, setSetupState] = useState<SetupState>(defaultSetupState);
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    setupCode: ''
  });

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch(`${API_URL}/api/setup/bootstrap-owner`, { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'Could not load setup status.');
        }
        setSetupState(json);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Could not load setup status.');
      } finally {
        setLoadingState(false);
      }
    };

    void loadState();
  }, []);

  const disableSubmit = useMemo(() => {
    if (submitting || loadingState) {
      return true;
    }

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password.trim()) {
      return true;
    }

    if (form.password !== form.confirmPassword) {
      return true;
    }

    if (setupState.requiresSetupCode && !form.setupCode.trim()) {
      return true;
    }

    return false;
  }, [form, loadingState, setupState.requiresSetupCode, submitting]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/setup/bootstrap-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          password: form.password,
          setupCode: form.setupCode || undefined
        })
      });

      const json = await response.json().catch(() => ({ error: 'Owner setup failed.' }));
      if (!response.ok) {
        throw new Error(json.error || 'Owner setup failed.');
      }

      setSetupState((prev) => ({ ...prev, ready: false, ownerExists: true }));
      setStatus('Owner account created successfully. You can log in now.');
      setForm({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        setupCode: ''
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Owner setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pwa-shell auth-shell public-shell">
      <div className="ambient-orb ambient-left" />
      <div className="ambient-orb ambient-right" />

      <section className="login-hero public-hero">
        <div className="brand-cluster">
          <BrandLogo />
          <div>
            <p className="eyebrow">First-Time Setup</p>
            <h1>Create the one owner account</h1>
            <p className="subcopy">This runs only once. After the owner exists, all other people join by request and approval.</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </section>

      <section className="public-form-wrap">
        <article className="panel public-panel">
          {error ? <p className="notice error">{error}</p> : null}
          {status ? <p className="notice success">{status}</p> : null}

          {loadingState ? (
            <p className="subcopy">Checking setup status...</p>
          ) : !setupState.supabaseConfigured ? (
            <div className="stack-form">
              <p className="notice error">Supabase is not configured yet. Add your environment keys first, then refresh this page.</p>
            </div>
          ) : setupState.ownerExists ? (
            <div className="stack-form">
              <p className="notice success">The owner account is already created for this gym.</p>
              <div className="auth-links align-left">
                <Link href="/login" className="ghost-button">Go to Login</Link>
                <Link href="/" className="ghost-button">Back to Home</Link>
              </div>
            </div>
          ) : (
            <form className="stack-form" onSubmit={submit}>
              <div className="form-section-grid">
                <label>
                  Owner Name
                  <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Gym owner full name" />
                </label>
                <label>
                  Phone Number
                  <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Owner phone number" inputMode="tel" />
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="owner@email.com" />
                </label>
                <label>
                  Password
                  <input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Choose a secure password" />
                </label>
                <label>
                  Confirm Password
                  <input type="password" value={form.confirmPassword} onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} placeholder="Re-enter password" />
                </label>
                {setupState.requiresSetupCode ? (
                  <label>
                    Setup Code
                    <input value={form.setupCode} onChange={(event) => setForm((prev) => ({ ...prev, setupCode: event.target.value }))} placeholder="Enter setup code" />
                  </label>
                ) : null}
              </div>

              <button type="submit" disabled={disableSubmit}>{submitting ? 'Creating owner...' : 'Create Owner Account'}</button>

              <div className="timeline-list dense">
                <div className="timeline-item">
                  <strong>Only one owner exists</strong>
                  <span>The database locks this down so a second owner cannot be created later by accident.</span>
                </div>
                <div className="timeline-item">
                  <strong>Phone stays the primary recovery method</strong>
                  <span>The owner signs in with the normal login flow, but password recovery still uses the stored phone number.</span>
                </div>
              </div>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo, ThemeToggle, useThemeState } from '../../components/chrome';
import { API_URL } from '../../lib/auth';

type ResetRole = 'owner' | 'trainer' | 'client';

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useThemeState();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<ResetRole>('client');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<'sms' | 'email' | ''>('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const buildPayload = () => role === 'owner'
    ? { role, phone }
    : { role, phone: phone || undefined, email: email || undefined };

  const requestOtp = async () => {
    setSendingOtp(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    const json = await response.json().catch(() => ({ error: 'Could not send OTP' }));
    if (!response.ok) {
      setError(String(json.error || 'Could not send OTP'));
      setSendingOtp(false);
      return false;
    }

    setRequestId(String(json.requestId || ''));
    setOtpPreview(json.otpPreview ? String(json.otpPreview) : null);
    setDeliveryChannel((json.channel === 'sms' || json.channel === 'email') ? json.channel : '');
    setStatus(`Code sent to ${json.destination}${json.channel ? ` by ${json.channel.toUpperCase()}` : ''}.`);
    setResendCountdown(30);
    setStep(2);
    setSendingOtp(false);
    return true;
  };

  const sendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void requestOtp();
  };

  const verifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerifyingOtp(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, otp })
    });

    const json = await response.json().catch(() => ({ error: 'Could not verify OTP' }));
    if (!response.ok) {
      setError(String(json.error || 'Could not verify OTP'));
      setVerifyingOtp(false);
      return;
    }

    setResetToken(String(json.resetToken || ''));
    setStatus('Code verified. You can set a new password now.');
    setStep(3);
    setVerifyingOtp(false);
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResettingPassword(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, resetToken, password })
    });

    const json = await response.json().catch(() => ({ error: 'Could not reset password' }));
    if (!response.ok) {
      setError(String(json.error || 'Could not reset password'));
      setResettingPassword(false);
      return;
    }

    setStatus('Password updated. You can sign in now.');
    setStep(1);
    setOtp('');
    setPassword('');
    setPhone('');
    setEmail('');
    setRequestId('');
    setResetToken('');
    setOtpPreview(null);
    setDeliveryChannel('');
    setResendCountdown(0);
    setResettingPassword(false);
  };

  return (
    <main className="pwa-shell auth-shell public-shell">
      <div className="ambient-orb ambient-left" />
      <div className="ambient-orb ambient-right" />
      <section className="login-hero public-hero">
        <div className="brand-cluster">
          <BrandLogo />
          <div>
            <p className="eyebrow">Forgot Password</p>
            <h1>Reset your password</h1>
            <p className="subcopy">Owner uses phone only. Clients and trainers can use phone or email.</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </section>

      <section className="public-form-wrap">
        <article className="panel public-panel">
          {error ? <p className="notice error">{error}</p> : null}
          {status ? <p className="notice success">{status}</p> : null}
          {otpPreview ? <p className="notice success">Dev OTP: {otpPreview}</p> : null}

          {step === 1 ? (
            <form className="stack-form" onSubmit={sendOtp}>
              <label>
                Account Type
                <select value={role} onChange={(event) => setRole(event.target.value as ResetRole)}>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <label>
                Phone Number
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={role === 'owner' ? 'Required for owner' : 'Use phone or email'} required={role === 'owner'} />
              </label>
              {role !== 'owner' ? (
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional if using phone" />
                </label>
              ) : null}
              <button type="submit" disabled={sendingOtp}>{sendingOtp ? 'Sending code...' : 'Send OTP'}</button>
            </form>
          ) : null}

          {step === 2 ? (
            <form className="stack-form" onSubmit={verifyOtp}>
              {deliveryChannel ? <p className="subcopy">Check your {deliveryChannel === 'sms' ? 'phone messages' : 'email inbox'} for the 6-digit code. The code stays valid for 10 minutes.</p> : null}
              <label>
                Enter OTP
                <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6-digit code" maxLength={6} />
              </label>
              <button type="submit" disabled={verifyingOtp}>{verifyingOtp ? 'Verifying...' : 'Verify OTP'}</button>
              <button
                type="button"
                className="ghost-button"
                disabled={sendingOtp || resendCountdown > 0}
                onClick={() => void requestOtp()}
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : sendingOtp ? 'Sending code...' : 'Resend code'}
              </button>
            </form>
          ) : null}

          {step === 3 ? (
            <form className="stack-form" onSubmit={resetPassword}>
              <label>
                New Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
              </label>
              <button type="submit" disabled={resettingPassword}>{resettingPassword ? 'Updating password...' : 'Set New Password'}</button>
            </form>
          ) : null}

          <div className="auth-links align-left">
            <Link href="/login" className="ghost-button">Back to Login</Link>
          </div>
        </article>
      </section>
    </main>
  );
}

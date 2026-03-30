'use client';

import Link from 'next/link';
import { BrandLogo } from '../../components/chrome';

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="offline-card">
        <BrandLogo />
        <p className="eyebrow">Offline Mode</p>
        <h1>You are offline right now.</h1>
        <p className="subcopy">
          PowerHouse can still open cached screens, but live actions like login, approvals, uploads, and fresh reports
          need an internet connection.
        </p>
        <div className="offline-actions">
          <button type="button" onClick={() => window.location.reload()}>
            Try Again
          </button>
          <Link className="ghost-button" href="/">
            Go Home
          </Link>
        </div>
        <div className="detail-list compact">
          <div>
            <span>Still available</span>
            <strong>Cached screens and app shell</strong>
          </div>
          <div>
            <span>Paused until online</span>
            <strong>Login, uploads, approvals, live data</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

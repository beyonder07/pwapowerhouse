import type { ReactNode } from 'react';
import Image from 'next/image';

export type ToastTone = 'error' | 'success' | 'info';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  text: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-intro card-surface">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p className="subcopy">{description}</p>
      </div>
      {actions ? <div className="page-intro-actions">{actions}</div> : null}
    </section>
  );
}

export function SurfaceCard({
  eyebrow,
  title,
  children,
  className = ''
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function MetricGrid({
  items
}: {
  items: Array<{ label: string; value: string; tone?: 'default' | 'success' | 'warning' }>;
}) {
  return (
    <section className="metric-grid">
      {items.map((item) => (
        <article key={item.label} className={`metric-tile ${item.tone || 'default'}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function StatusPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

export function Avatar({ name, src, compact = false }: { name: string; src?: string; compact?: boolean }) {
  if (src) {
    return <Image className={`entity-avatar ${compact ? 'compact' : ''}`} src={src} alt={name} width={compact ? 48 : 72} height={compact ? 48 : 72} unoptimized />;
  }

  return <div className={`entity-avatar entity-avatar-fallback ${compact ? 'compact' : ''}`}>{name.slice(0, 2).toUpperCase()}</div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function LoadingState({ title, text }: { title: string; text: string }) {
  return (
    <main className="page-stack">
      <section className="card-surface loading-card">
        <p className="eyebrow">Loading</p>
        <h3>{title}</h3>
        <p className="subcopy">{text}</p>
      </section>
    </main>
  );
}

export function Notice({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  return <p className={`notice ${tone}`}>{text}</p>;
}

export function ToastStack({
  items,
  onDismiss
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`toast-card ${item.tone}`}>
          <p>{item.text}</p>
          <button type="button" className="ghost-button compact-dismiss" onClick={() => onDismiss(item.id)}>
            Close
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">Confirm action</p>
        <h3 id="confirm-dialog-title">{title}</h3>
        <p className="subcopy">{description}</p>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={tone === 'danger' ? 'danger-button' : ''} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GridToolbar({
  query,
  onQueryChange,
  placeholder,
  filteredCount,
  totalCount,
  page,
  totalPages,
  pageSize,
  label
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  filteredCount: number;
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  label: string;
}) {
  const start = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);

  return (
    <div className="grid-toolbar">
      <label className="toolbar-search">
        <span className="toolbar-label">Search</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
      </label>
      <div className="toolbar-meta">
        <strong>{filteredCount}</strong>
        <span>{query ? `filtered from ${totalCount}` : `${label} total`}</span>
        <span>{filteredCount === 0 ? 'No results' : `${start}-${end} on page ${page} of ${totalPages}`}</span>
      </div>
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button type="button" className="ghost-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span className="pagination-status">Page {page} of {totalPages}</span>
      <button type="button" className="ghost-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}

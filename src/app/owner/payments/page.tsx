'use client';

import { useState } from 'react';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { useAuthedPageData } from '../../../lib/app-client';
import {
  ConfirmDialog,
  GridToolbar,
  LoadingState,
  MetricGrid,
  Notice,
  PageIntro,
  PaginationControls,
  StatusPill,
  SurfaceCard,
  ToastStack,
  type ToastItem
} from '../../../components/app-ui';
import { currency, formatDate } from '../../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerPaymentsPayload = {
  items: Array<{
    id: number;
    memberName: string;
    amount: number;
    paymentMode: string;
    date: string;
    status: string;
    branchLabel?: string;
    proofUrl?: string;
    note?: string;
  }>;
  totalsByMode: Array<{ mode: string; total: number }>;
  totalCollected: number;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingCount: number;
};

export default function OwnerPaymentsPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<{ id: number; decision: 'approve' | 'reject'; memberName: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const endpoint = `/api/data/owner/payments?query=${encodeURIComponent(query)}&page=${page}&pageSize=10`;
  const { data, loading, error, session, logout, reload } = useAuthedPageData<OwnerPaymentsPayload>(endpoint, OWNER_ROLES);

  if (loading || !data) {
    return <LoadingState title="Loading payments" text="Bringing in cashflow totals, approval items, and full payment logs." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const reviewPayment = async () => {
    if (!reviewTarget) {
      return;
    }

    setReviewing(true);
    const response = await fetch(`${API_URL}/api/payments/${reviewTarget.id}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decision: reviewTarget.decision })
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const json = await response.json().catch(() => ({ error: 'Could not review payment.' }));
    if (!response.ok) {
      pushToast('error', String(json.error || 'Could not review payment.'));
      setReviewing(false);
      return;
    }

    pushToast('success', reviewTarget.decision === 'approve' ? 'Payment approved successfully.' : 'Payment declined successfully.');
    setReviewTarget(null);
    setReviewing(false);
    await reload();
  };

  return (
    <main className="page-stack owner-page">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro
        eyebrow="Payments"
        title="Financial system"
        description="See approved collection totals and review pending fee submissions from clients in one place."
      />
      <MetricGrid items={[
        { label: 'Total Collected', value: currency(data.totalCollected), tone: 'success' },
        { label: 'Transactions', value: String(data.totalCount) },
        { label: 'Pending Approval', value: String(data.pendingCount), tone: data.pendingCount > 0 ? 'warning' : 'default' }
      ]} />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="By mode" title="Collection split">
          <div className="timeline-list dense">
            {data.totalsByMode.map((item) => (
              <div key={item.mode} className="timeline-item">
                <strong>{item.mode}</strong>
                <span>{currency(item.total)}</span>
              </div>
            ))}
            {data.totalsByMode.length === 0 ? <p className="subcopy">Approved collection totals will appear here once payments are confirmed.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Payment log">
          <GridToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by member, mode, amount, date, or status"
            filteredCount={data.filteredCount}
            totalCount={data.totalCount}
            page={data.page}
            totalPages={data.totalPages}
            pageSize={10}
            label="payments"
          />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Member</th><th>Amount</th><th>Mode</th><th>Branch</th><th>Status</th><th>Proof</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.memberName || '-'}</td>
                    <td>{currency(item.amount)}</td>
                    <td>{item.paymentMode || '-'}</td>
                    <td>{item.branchLabel || '-'}</td>
                    <td><StatusPill label={item.status || 'paid'} tone={item.status === 'paid' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'} /></td>
                    <td className="details-cell">
                      {item.proofUrl ? (
                        <a className="text-link" href={item.proofUrl} target="_blank" rel="noreferrer">Open proof</a>
                      ) : (
                        <span>{item.paymentMode === 'cash' ? 'Cash - no screenshot' : '-'}</span>
                      )}
                      {item.note ? <span>{item.note}</span> : null}
                    </td>
                    <td>
                      {item.status === 'pending' ? (
                        <div className="inline-actions">
                          <button type="button" onClick={() => setReviewTarget({ id: item.id, decision: 'approve', memberName: item.memberName })}>Approve</button>
                          <button type="button" className="ghost-button danger-button" onClick={() => setReviewTarget({ id: item.id, decision: 'reject', memberName: item.memberName })}>Reject</button>
                        </div>
                      ) : (
                        <span className="subcopy">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? <tr><td colSpan={8} className="empty-cell">No payments match this search.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </SurfaceCard>
      </section>

      <ConfirmDialog
        open={Boolean(reviewTarget)}
        title={reviewTarget?.decision === 'approve' ? 'Approve this payment?' : 'Reject this payment?'}
        description={reviewTarget?.decision === 'approve'
          ? `This will mark ${reviewTarget?.memberName || 'this member'}'s payment as paid.`
          : `This will mark ${reviewTarget?.memberName || 'this member'}'s payment as rejected.`}
        confirmLabel={reviewTarget?.decision === 'approve' ? 'Approve payment' : 'Reject payment'}
        tone={reviewTarget?.decision === 'approve' ? 'default' : 'danger'}
        busy={reviewing}
        onConfirm={() => void reviewPayment()}
        onClose={() => !reviewing && setReviewTarget(null)}
      />
    </main>
  );
}

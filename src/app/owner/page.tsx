'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL, type ViewerRole } from '../../lib/auth';
import { ConfirmDialog, LoadingState, MetricGrid, Notice, PageIntro, StatusPill, SurfaceCard, ToastStack, type ToastItem } from '../../components/app-ui';
import { useAuthedPageData } from '../../lib/app-client';
import { currency, formatDate, formatDateTime } from '../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerOverview = {
  analytics: { revenueToday: number; revenueMonth: number; totalMembers: number; activeMembers: number; trainerCount: number } | null;
  sync: { generatedAt: string | null; pendingRequests: number };
  expiringMembers: Array<{ id: number; name: string; expiryDate: string; status: string }>;
  recentPayments: Array<{ id: number; memberName?: string; amount: number; date: string; paymentMode: string }>;
  pendingApprovals: Array<{ _id: string; type: string; createdAt: string; createdByRole: string }>;
};

function requestTypeLabel(type: string) {
  switch (type) {
    case 'client':
      return 'Client signup';
    case 'trainer':
      return 'Trainer signup';
    case 'member':
      return 'Member request';
    case 'workout-plan':
      return 'Workout plan';
    case 'trainer-attendance':
      return 'Trainer attendance';
    default:
      return type;
  }
}

export default function OwnerOverviewPage() {
  const { data, loading, error, session, logout, reload } = useAuthedPageData<OwnerOverview>('/api/data/owner/overview', OWNER_ROLES);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingReview, setPendingReview] = useState<{ id: string; label: string; status: 'approved' | 'rejected' } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  if (loading || !data) {
    return <LoadingState title="Loading owner control center" text="Gathering snapshot metrics, pending approvals, and time-sensitive alerts." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const reviewPending = async () => {
    if (!pendingReview) {
      return;
    }

    setReviewing(true);
    try {
      const response = await fetch(`${API_URL}/api/requests/${pendingReview.id}/review`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: pendingReview.status })
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to update request' }));
      if (!response.ok) {
        pushToast('error', String(json.error || 'Failed to update request'));
        return;
      }

      pushToast('success', `Request ${pendingReview.status === 'approved' ? 'accepted' : 'declined'} from overview.`);
      setPendingReview(null);
      await reload();
    } finally {
      setReviewing(false);
    }
  };

  return (
    <main className="page-stack owner-page">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro
        eyebrow="Owner Overview"
        title="PowerHouse command center"
        description="A high-level overview of revenue, active members, approvals, and sync health."
        actions={<StatusPill label={data.sync.generatedAt ? `Synced ${formatDateTime(data.sync.generatedAt)}` : 'Awaiting sync'} tone={data.sync.generatedAt ? 'success' : 'warning'} />}
      />

      <MetricGrid
        items={[
          { label: 'Revenue Today', value: currency(data.analytics?.revenueToday || 0), tone: 'success' },
          { label: 'Revenue Month', value: currency(data.analytics?.revenueMonth || 0) },
          { label: 'Total Members', value: String(data.analytics?.totalMembers || 0) },
          { label: 'Active Members', value: String(data.analytics?.activeMembers || 0) },
          { label: 'Trainers', value: String(data.analytics?.trainerCount || 0) },
          { label: 'Pending Requests', value: String(data.sync.pendingRequests), tone: 'warning' }
        ]}
      />

      <section className="content-grid three-col">
        <SurfaceCard eyebrow="Attention" title="Expiring members">
          <div className="timeline-list dense">
            {data.expiringMembers.map((member) => (
              <div key={member.id} className="timeline-item">
                <strong>{member.name}</strong>
                <span>{formatDate(member.expiryDate)}</span>
                <StatusPill label={member.status || 'unknown'} tone={member.status === 'active' ? 'success' : 'warning'} />
              </div>
            ))}
            {data.expiringMembers.length === 0 ? <p className="subcopy">No urgent membership expiries right now.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Cashflow" title="Recent payments">
          <div className="timeline-list dense">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="timeline-item">
                <strong>{currency(payment.amount)}</strong>
                <span>{payment.paymentMode}</span>
                <span>{formatDate(payment.date)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Approvals" title="Pending workflow">
          <div className="timeline-list dense">
            {data.pendingApprovals.map((request) => (
              <div key={request._id} className="timeline-item">
                <strong>{requestTypeLabel(request.type)}</strong>
                <span>{request.createdByRole}</span>
                <span>{formatDateTime(request.createdAt)}</span>
                <div className="request-card-actions">
                  <button type="button" onClick={() => setPendingReview({ id: request._id, label: requestTypeLabel(request.type), status: 'approved' })}>Accept</button>
                  <button type="button" className="ghost-button danger-button" onClick={() => setPendingReview({ id: request._id, label: requestTypeLabel(request.type), status: 'rejected' })}>Decline</button>
                </div>
              </div>
            ))}
            {data.pendingApprovals.length === 0 ? <p className="subcopy">Nothing is waiting for approval.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Quick actions" title="Owner shortcuts">
          <div className="timeline-list dense">
            <Link href="/owner/requests" className="text-link">Review approval queue</Link>
            <Link href="/owner/members" className="text-link">Manage member records</Link>
            <Link href="/owner/payments" className="text-link">Open payment system</Link>
            <Link href="/owner/attendance" className="text-link">Correct attendance</Link>
            <Link href="/owner/analytics" className="text-link">Open full analytics</Link>
          </div>
        </SurfaceCard>
      </section>
      <ConfirmDialog
        open={Boolean(pendingReview)}
        title={pendingReview?.status === 'approved' ? `Accept ${pendingReview?.label || 'request'}?` : `Decline ${pendingReview?.label || 'request'}?`}
        description={pendingReview?.status === 'approved'
          ? 'This will process the request immediately from the owner dashboard.'
          : 'This will mark the request as declined so it does not move forward.'}
        confirmLabel={pendingReview?.status === 'approved' ? 'Accept request' : 'Decline request'}
        tone={pendingReview?.status === 'approved' ? 'default' : 'danger'}
        busy={reviewing}
        onConfirm={() => void reviewPending()}
        onClose={() => !reviewing && setPendingReview(null)}
      />
    </main>
  );
}

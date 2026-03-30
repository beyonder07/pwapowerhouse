'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { useAuthedPageData } from '../../../lib/app-client';
import { ConfirmDialog, GridToolbar, LoadingState, Notice, PageIntro, PaginationControls, StatusPill, SurfaceCard, ToastStack, type ToastItem } from '../../../components/app-ui';
import { formatDateTime } from '../../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerRequestsPayload = {
  items: Array<{ _id: string; type: string; status: string; createdAt: string; createdByRole: string; data: Record<string, unknown>; reviewNote?: string }>;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function requestTypeLabel(type: string) {
  switch (type) {
    case 'client':
      return 'Client Signup';
    case 'trainer':
      return 'Trainer Signup';
    case 'member':
      return 'Trainer Member Request';
    case 'workout-plan':
      return 'Workout Plan Change';
    case 'trainer-attendance':
      return 'Trainer Attendance';
    default:
      return type;
  }
}

function requestSummary(item: OwnerRequestsPayload['items'][number]) {
  const payload = item.data || {};
  const lines: string[] = [];

  const fullName = String(payload.fullName || '');
  const phone = String(payload.phone || '');
  const email = String(payload.email || '');
  const planPreference = String(payload.planPreference || '');
  const notes = String(payload.notes || '');
  const experience = String(payload.experience || '');
  const memberId = payload.memberId ? String(payload.memberId) : '';
  const date = String(payload.date || '');
  const workoutPlan = payload.workoutPlan && typeof payload.workoutPlan === 'object'
    ? payload.workoutPlan as { name?: string; exercises?: string[] }
    : null;

  if (fullName) lines.push(`Name: ${fullName}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (email) lines.push(`Email: ${email}`);
  if (planPreference) lines.push(`Plan: ${planPreference}`);
  if (experience) lines.push(`Experience: ${experience}`);
  if (memberId) lines.push(`Member ID: ${memberId}`);
  if (date) lines.push(`Date: ${date}`);
  if (workoutPlan?.name) lines.push(`Workout: ${workoutPlan.name}`);
  if (workoutPlan?.exercises?.length) lines.push(`Exercises: ${workoutPlan.exercises.join(', ')}`);
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.length ? lines : ['No extra details submitted.'];
}

export default function OwnerRequestsPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = `/api/data/owner/requests?query=${encodeURIComponent(query)}&page=${page}&pageSize=10`;
  const { data, loading, error, session, logout, reload } = useAuthedPageData<OwnerRequestsPayload>(endpoint, OWNER_ROLES);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [pendingReview, setPendingReview] = useState<{ id: string; status: 'approved' | 'rejected'; label: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const items = data?.items || [];
  const pendingReviewNote = useMemo(() => pendingReview ? reviewNotes[pendingReview.id]?.trim() || '' : '', [pendingReview, reviewNotes]);

  if (loading || !data) {
    return <LoadingState title="Loading approval requests" text="Preparing enrollment, workout, and attendance approval items." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const review = async () => {
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
        body: JSON.stringify({ status: pendingReview.status, reviewNote: pendingReviewNote || undefined })
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to review request' }));
      if (!response.ok) {
        pushToast('error', String(json.error || 'Failed to review request'));
        return;
      }

      pushToast('success', `Request ${pendingReview.status === 'approved' ? 'accepted' : 'declined'}.`);
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[pendingReview.id];
        return next;
      });
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
        eyebrow="Requests"
        title="Approval queue"
        description="Nothing executes here without owner approval. Review notes help keep decisions clear for trainers and future audits."
        actions={<StatusPill label={`${data.pendingCount} pending`} tone={data.pendingCount > 0 ? 'warning' : 'success'} />}
      />

      <section className="content-grid three-col">
        <SurfaceCard title="Pending approvals">
          <div className="detail-list compact">
            <div><span>Waiting now</span><strong>{data.pendingCount}</strong></div>
            <div><span>Approved</span><strong>{data.approvedCount}</strong></div>
            <div><span>Rejected</span><strong>{data.rejectedCount}</strong></div>
          </div>
        </SurfaceCard>
        <SurfaceCard title="Review habit">
          <div className="timeline-list dense">
            <div className="timeline-item">
              <strong>Approve only after checking details</strong>
              <span>Each decision can create real users or update live member routines.</span>
            </div>
            <div className="timeline-item">
              <strong>Leave a short note</strong>
              <span>Notes help trainers and staff understand why something was approved or rejected.</span>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard title="Quick routes">
          <div className="timeline-list dense">
            <Link href="/owner/members" className="text-link">Open member records</Link>
            <Link href="/owner/trainers" className="text-link">Open trainer records</Link>
            <Link href="/owner/attendance" className="text-link">Open attendance controls</Link>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard title="All requests">
        <GridToolbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search by type, role, status, note, or payload"
          filteredCount={data.filteredCount}
          totalCount={data.totalCount}
          page={data.page}
          totalPages={data.totalPages}
          pageSize={10}
          label="requests"
        />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Created</th><th>Type</th><th>Role</th><th>Status</th><th>Payload</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{requestTypeLabel(item.type)}</td>
                  <td>{item.createdByRole}</td>
                  <td><StatusPill label={item.status} tone={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'} /></td>
                  <td className="details-cell">
                    <div className="timeline-list dense">
                      {requestSummary(item).map((line) => (
                        <span key={`${item._id}-${line}`}>{line}</span>
                      ))}
                      {item.reviewNote ? <span><strong>Review note:</strong> {item.reviewNote}</span> : null}
                    </div>
                  </td>
                  <td className="inline-actions">
                    {item.status === 'pending' ? (
                      <div className="stack-form compact-stack">
                        <textarea
                          value={reviewNotes[item._id] || ''}
                          onChange={(event) => setReviewNotes((prev) => ({ ...prev, [item._id]: event.target.value }))}
                          placeholder="Optional review note"
                          rows={3}
                        />
                        <div className="inline-actions">
                          <button type="button" onClick={() => setPendingReview({ id: item._id, status: 'approved', label: requestTypeLabel(item.type) })}>Accept</button>
                          <button type="button" className="ghost-button danger-button" onClick={() => setPendingReview({ id: item._id, status: 'rejected', label: requestTypeLabel(item.type) })}>Decline</button>
                        </div>
                      </div>
                    ) : (
                      <span className="subcopy">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={6} className="empty-cell">No requests match this search.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      </SurfaceCard>
      <ConfirmDialog
        open={Boolean(pendingReview)}
        title={pendingReview?.status === 'approved' ? `Accept ${pendingReview?.label || 'request'}?` : `Decline ${pendingReview?.label || 'request'}?`}
        description={pendingReview?.status === 'approved'
          ? 'This will apply the requested change or create the pending account immediately.'
          : 'This will mark the request as declined and keep it out of the live system.'}
        confirmLabel={pendingReview?.status === 'approved' ? 'Accept request' : 'Decline request'}
        tone={pendingReview?.status === 'approved' ? 'default' : 'danger'}
        busy={reviewing}
        onConfirm={() => void review()}
        onClose={() => !reviewing && setPendingReview(null)}
      />
    </main>
  );
}

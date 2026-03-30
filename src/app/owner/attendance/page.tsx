'use client';

import { useEffect, useState } from 'react';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { authedJson, useAuthedPageData } from '../../../lib/app-client';
import { ConfirmDialog, GridToolbar, LoadingState, Notice, PageIntro, PaginationControls, StatusPill, SurfaceCard, ToastStack, type ToastItem } from '../../../components/app-ui';
import { formatDateTime } from '../../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerAttendancePayload = {
  items: Array<{ id: number; memberId: number; memberName: string; date: string; checkInTime: string; status: string }>;
  memberOptions: Array<{ id: number; name: string }>;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type AttendanceHistoryPayload = {
  records: Array<{ _id: string; member_id: number; date: string; status: 'present' | 'absent' }>;
  audits: Array<{ _id: string; action: string; changed_at: string }>;
};

export default function OwnerAttendancePage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = `/api/data/owner/attendance?query=${encodeURIComponent(query)}&page=${page}&pageSize=10`;
  const { data, loading, error, session, logout, setSession, reload } = useAuthedPageData<OwnerAttendancePayload>(endpoint, OWNER_ROLES);
  const [history, setHistory] = useState<AttendanceHistoryPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ memberId: '', date: new Date().toISOString().slice(0, 10), status: 'present' as 'present' | 'absent' });
  const canModify = session.role === 'owner';

  useEffect(() => {
    if (!session.accessToken || !canModify) {
      return;
    }

    const loadHistory = async () => {
      const result = await authedJson<AttendanceHistoryPayload>('/api/attendance/owner/history', session);
      if (!result.ok || !result.session || !result.data) {
        if (result.unauthorized) {
          logout();
        }
        return;
      }

      setSession(result.session);
      setHistory(result.data);
    };

    void loadHistory();
  }, [canModify, logout, session, setSession]);

  if (loading || !data) {
    return <LoadingState title="Loading attendance controls" text="Preparing member attendance controls and audit history." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const createRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/attendance/owner/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ member_id: Number(form.memberId || 0), date: form.date, status: form.status })
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const json = await response.json().catch(() => ({ error: 'Failed to create attendance record' }));
    if (response.ok) {
      pushToast('success', 'Attendance record created.');
      await reload();
    }
    setStatus(response.ok ? 'Attendance record created.' : String(json.error || 'Failed to create attendance record'));
  };

  const updateRecord = async (id: string, nextStatus: 'present' | 'absent') => {
    const response = await fetch(`${API_URL}/api/attendance/owner/update`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, status: nextStatus })
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const json = await response.json().catch(() => ({ error: 'Failed to update attendance' }));
    if (!response.ok) {
      setStatus(String(json.error || 'Failed to update attendance'));
      return;
    }

    await reload();
    pushToast('success', 'Attendance updated.');
    setStatus('Attendance updated.');
  };

  const deleteRecord = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/attendance/owner/delete`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to delete attendance' }));
      if (!response.ok) {
        setStatus(String(json.error || 'Failed to delete attendance'));
        pushToast('error', String(json.error || 'Failed to delete attendance'));
        return;
      }

      await reload();
      pushToast('success', 'Attendance deleted.');
      setStatus('Attendance deleted.');
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="page-stack owner-page">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status.includes('created') || status.includes('updated') || status.includes('deleted') ? 'success' : 'error'} text={status} /> : null}
      <PageIntro eyebrow="Attendance" title="Attendance control" description="This is the owner-only control page for attendance creation, correction, and audit review." />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Create" title="Add attendance record">
          {canModify ? (
            <form className="stack-form" onSubmit={createRecord}>
              <label>
                Member
                <select value={form.memberId} onChange={(event) => setForm((prev) => ({ ...prev, memberId: event.target.value }))}>
                  <option value="">Select member</option>
                  {data.memberOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                Date
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'present' | 'absent' }))}>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              <button type="submit">Create record</button>
            </form>
          ) : (
            <p className="subcopy">Attendance changes are reserved for the owner account. Admin users can review the records but cannot modify them.</p>
          )}
        </SurfaceCard>

        <SurfaceCard eyebrow="Audit" title="Recent change history">
          <div className="timeline-list dense">
            {canModify ? (
              (history?.audits || []).map((item) => (
                <div key={item._id} className="timeline-item">
                  <strong>{item.action}</strong>
                  <span>{formatDateTime(item.changed_at)}</span>
                </div>
              ))
            ) : (
              <p className="subcopy">Audit logs are available only to the owner account.</p>
            )}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard title="Attendance records">
        <GridToolbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search by member, date, status, or member ID"
          filteredCount={data.filteredCount}
          totalCount={data.totalCount}
          page={data.page}
          totalPages={data.totalPages}
          pageSize={10}
          label="attendance records"
        />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Member</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.memberName || item.memberId}</td>
                  <td><StatusPill label={item.status} tone={item.status === 'present' ? 'success' : 'warning'} /></td>
                  <td className="inline-actions">
                    {canModify ? (
                      <>
                        <button type="button" onClick={() => updateRecord(String(item.id), item.status === 'present' ? 'absent' : 'present')}>Toggle</button>
                        <button type="button" className="ghost-button danger-button" onClick={() => setPendingDeleteId(String(item.id))}>Delete</button>
                      </>
                    ) : (
                      <span className="subcopy">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 ? <tr><td colSpan={4} className="empty-cell">No attendance records match this search.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      </SurfaceCard>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete this attendance record?"
        description="This removes the record from the live attendance history. Only do this when the row is clearly incorrect."
        confirmLabel="Delete record"
        tone="danger"
        busy={deleting}
        onConfirm={() => pendingDeleteId ? void deleteRecord(pendingDeleteId) : undefined}
        onClose={() => !deleting && setPendingDeleteId(null)}
      />
    </main>
  );
}

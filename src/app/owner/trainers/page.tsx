'use client';

import { useMemo, useState } from 'react';
import { Avatar, EmptyState, GridToolbar, LoadingState, Notice, PageIntro, PaginationControls, StatusPill, SurfaceCard, ToastStack, type ToastItem } from '../../../components/app-ui';
import { PhotoUpload } from '../../../components/photo-upload';
import { useAuthedPageData } from '../../../lib/app-client';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { currency } from '../../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerTrainersPayload = {
  items: Array<{
    id: number;
    name: string;
    phone: string;
    email: string;
    governmentId: string;
    governmentIdVerified: boolean;
    profilePhotoUrl: string;
    baseSalary: number;
    status: string;
    salaryLog: Array<{ month: string; amount: number; status: string }>;
    attendance: Array<{ id: number }>;
  }>;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type TrainerEditState = {
  name: string;
  phone: string;
  email: string;
  governmentId: string;
  profilePhotoUrl: string;
  baseSalary: string;
};

export default function OwnerTrainersPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = `/api/data/owner/trainers?query=${encodeURIComponent(query)}&page=${page}&pageSize=6`;
  const { data, loading, error, session, logout, reload } = useAuthedPageData<OwnerTrainersPayload>(endpoint, OWNER_ROLES);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TrainerEditState | null>(null);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const items = data?.items || [];
  const disableEditSubmit = useMemo(() => {
    return savingEdit || !editForm?.name.trim() || !editForm.phone.trim() || !editForm.email.trim() || !editForm.governmentId.trim() || !editForm.profilePhotoUrl || !editForm.baseSalary.trim();
  }, [editForm, savingEdit]);

  if (loading || !data) {
    return <LoadingState title="Loading trainers" text="Preparing trainer records, salary logs, and staff activity." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const beginEdit = (trainer: OwnerTrainersPayload['items'][number]) => {
    setEditingId(trainer.id);
    setEditPhotoError(null);
    setEditForm({
      name: trainer.name,
      phone: trainer.phone || '',
      email: trainer.email || '',
      governmentId: trainer.governmentId || '',
      profilePhotoUrl: trainer.profilePhotoUrl || '',
      baseSalary: String(trainer.baseSalary || 0)
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditPhotoError(null);
  };

  const updateEditField = (field: keyof TrainerEditState, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) {
      return;
    }

    if (editPhotoError) {
      pushToast('error', editPhotoError);
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`${API_URL}/api/data/owner/trainers/${editingId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editForm,
          baseSalary: Number(editForm.baseSalary || 0)
        })
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to update trainer' }));
      if (!response.ok) {
        pushToast('error', String(json.error || 'Failed to update trainer'));
        return;
      }

      pushToast('success', 'Trainer record updated.');
      cancelEdit();
      await reload();
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <main className="page-stack owner-page">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro eyebrow="Trainers" title="Trainer management" description="Owner-only view of trainer identity, salary base, and attendance performance." />
      <GridToolbar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search by name, phone, email, status, or salary"
        filteredCount={data.filteredCount}
        totalCount={data.totalCount}
        page={data.page}
        totalPages={data.totalPages}
        pageSize={6}
        label="trainers"
      />
      <section className="card-grid owner-card-grid">
        {items.map((trainer) => (
          <SurfaceCard key={trainer.id} title={trainer.name} className="owner-record-card">
            <div className="profile-hero-card compact-profile-card">
              <Avatar name={trainer.name} src={trainer.profilePhotoUrl} compact />
              <div>
                <StatusPill label={trainer.status || 'unknown'} tone={trainer.status === 'active' ? 'success' : 'warning'} />
                <p className="subcopy">Base salary {currency(trainer.baseSalary)}</p>
              </div>
            </div>
            <div className="detail-list compact">
              <div><span>Phone</span><strong>{trainer.phone || '-'}</strong></div>
              <div><span>Email</span><strong>{trainer.email || '-'}</strong></div>
              <div><span>Government ID</span><strong>{trainer.governmentId || '-'}</strong></div>
              <div><span>ID Submitted</span><strong>{trainer.governmentIdVerified ? 'Yes' : 'No'}</strong></div>
              <div><span>Attendance rows</span><strong>{trainer.attendance.length}</strong></div>
              <div><span>Latest payout</span><strong>{currency(trainer.salaryLog[0]?.amount || 0)}</strong></div>
            </div>
            <div className="card-actions">
              <button type="button" onClick={() => beginEdit(trainer)}>
                {editingId === trainer.id ? 'Editing now' : 'Edit trainer'}
              </button>
            </div>
            {editingId === trainer.id && editForm ? (
              <form
                className="stack-form record-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEdit();
                }}
              >
                <div className="form-section-grid">
                  <label>
                    Full name
                    <input value={editForm.name} onChange={(event) => updateEditField('name', event.target.value)} />
                  </label>
                  <label>
                    Phone number
                    <input value={editForm.phone} onChange={(event) => updateEditField('phone', event.target.value)} inputMode="tel" />
                  </label>
                  <label>
                    Email
                    <input value={editForm.email} onChange={(event) => updateEditField('email', event.target.value)} type="email" />
                  </label>
                  <label>
                    Government ID
                    <input value={editForm.governmentId} onChange={(event) => updateEditField('governmentId', event.target.value)} />
                  </label>
                  <label>
                    Base salary
                    <input value={editForm.baseSalary} onChange={(event) => updateEditField('baseSalary', event.target.value)} inputMode="decimal" />
                  </label>
                </div>

                <PhotoUpload
                  label="Trainer photo"
                  value={editForm.profilePhotoUrl}
                  onChange={(next) => updateEditField('profilePhotoUrl', next)}
                  onError={setEditPhotoError}
                  helperText="Update the trainer photo if needed."
                  uploadCategory="trainer-record"
                  authToken={session.accessToken}
                />

                <div className="card-actions">
                  <button type="submit" disabled={disableEditSubmit}>{savingEdit ? 'Saving changes...' : 'Save changes'}</button>
                  <button type="button" className="ghost-button" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                </div>
              </form>
            ) : null}
          </SurfaceCard>
        ))}
        {items.length === 0 ? <EmptyState title="No trainers found" text="Try a different search term to find a trainer record." /> : null}
      </section>
      <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
    </main>
  );
}

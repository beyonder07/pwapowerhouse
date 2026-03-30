'use client';

import { useMemo, useState } from 'react';
import { Avatar, ConfirmDialog, EmptyState, GridToolbar, LoadingState, Notice, PageIntro, PaginationControls, StatusPill, SurfaceCard, ToastStack, type ToastItem } from '../../../components/app-ui';
import { PhotoUpload } from '../../../components/photo-upload';
import { useAuthedPageData } from '../../../lib/app-client';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { currency, formatDate } from '../../../lib/formatters';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerMembersPayload = {
  items: Array<{
    id: number;
    name: string;
    phone: string;
    email: string;
    governmentId: string;
    governmentIdVerified: boolean;
    profilePhotoUrl: string;
    planType: string;
    joinDate: string;
    expiryDate: string;
    status: string;
    payments: Array<{ id: number; amount: number }>;
    attendance: Array<{ id: number }>;
  }>;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type MemberFormState = {
  fullName: string;
  phone: string;
  email: string;
  governmentId: string;
  profilePhotoUrl: string;
  planPreference: string;
};

const initialForm: MemberFormState = {
  fullName: '',
  phone: '',
  email: '',
  governmentId: '',
  profilePhotoUrl: '',
  planPreference: ''
};

type MemberEditState = {
  name: string;
  phone: string;
  email: string;
  governmentId: string;
  profilePhotoUrl: string;
  planType: string;
  expiryDate: string;
  status: string;
};

export default function OwnerMembersPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = `/api/data/owner/members?query=${encodeURIComponent(query)}&page=${page}&pageSize=6`;
  const { data, loading, error, session, logout, reload } = useAuthedPageData<OwnerMembersPayload>(endpoint, OWNER_ROLES);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MemberEditState | null>(null);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const items = data?.items || [];

  const disableSubmit = useMemo(() => {
    return submitting || !form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.governmentId.trim() || !form.profilePhotoUrl;
  }, [form, submitting]);
  const disableEditSubmit = useMemo(() => {
    return savingEdit || !editForm?.name.trim() || !editForm.phone.trim() || !editForm.email.trim() || !editForm.governmentId.trim() || !editForm.profilePhotoUrl || !editForm.planType.trim() || !editForm.expiryDate;
  }, [editForm, savingEdit]);

  if (loading || !data) {
    return <LoadingState title="Loading members" text="Preparing full member records with payment and attendance history." />;
  }

  const pushToast = (tone: ToastItem['tone'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, text }]);
  };

  const updateField = (field: keyof MemberFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const beginEdit = (member: OwnerMembersPayload['items'][number]) => {
    setEditingId(member.id);
    setEditPhotoError(null);
    setEditForm({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      governmentId: member.governmentId || '',
      profilePhotoUrl: member.profilePhotoUrl || '',
      planType: member.planType || '',
      expiryDate: member.expiryDate || '',
      status: member.status || 'active'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditPhotoError(null);
  };

  const updateEditField = (field: keyof MemberEditState, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const createDirectMember = async () => {
    if (photoError) {
      pushToast('error', photoError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/requests/direct-member`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          governmentId: form.governmentId,
          profilePhotoUrl: form.profilePhotoUrl,
          planPreference: form.planPreference
        })
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to create member' }));
      if (!response.ok) {
        pushToast('error', String(json.error || 'Failed to create member'));
        return;
      }

      pushToast('success', `Member created successfully. Member ID ${json.createdUser?.memberId || '-'}.`);
      setForm(initialForm);
      setPhotoError(null);
      void reload();
    } finally {
      setSubmitting(false);
    }
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
      const response = await fetch(`${API_URL}/api/data/owner/members/${editingId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const json = await response.json().catch(() => ({ error: 'Failed to update member' }));
      if (!response.ok) {
        pushToast('error', String(json.error || 'Failed to update member'));
        return;
      }

      pushToast('success', 'Member record updated.');
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
      <PageIntro eyebrow="Members" title="Member management" description="Add members fast, then review the full records with payments and attendance below." />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Quick add" title="Create a member directly">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              setPendingCreate(true);
            }}
          >
            <div className="form-section-grid">
              <label>
                Full name
                <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Enter member name" />
              </label>
              <label>
                Phone number
                <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Enter phone number" inputMode="tel" />
              </label>
              <label>
                Email
                <input value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="Enter email" type="email" />
              </label>
              <label>
                Government ID
                <input value={form.governmentId} onChange={(event) => updateField('governmentId', event.target.value)} placeholder="Enter government ID" />
              </label>
            </div>

            <label>
              Plan preference
              <input value={form.planPreference} onChange={(event) => updateField('planPreference', event.target.value)} placeholder="Optional starter plan" />
            </label>

            <PhotoUpload
              label="Profile photo"
              value={form.profilePhotoUrl}
              onChange={(next) => updateField('profilePhotoUrl', next)}
              onError={setPhotoError}
              helperText="Capture or upload a clear profile photo before creating the member."
              uploadCategory="member-record"
              authToken={session.accessToken}
            />

            <button type="submit" disabled={disableSubmit}>{submitting ? 'Creating member...' : 'Add member now'}</button>
          </form>
        </SurfaceCard>

        <SurfaceCard eyebrow="Owner note" title="What happens after save">
          <div className="timeline-list dense">
            <div className="timeline-item">
              <strong>Account is created immediately</strong>
              <span>The member becomes visible in your owner records right away.</span>
            </div>
            <div className="timeline-item">
              <strong>Password stays secure</strong>
              <span>The member still uses Forgot Password later to set their own password safely.</span>
            </div>
            <div className="timeline-item">
              <strong>No duplicate signups</strong>
              <span>Phone number and email are checked before a new member is created.</span>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <GridToolbar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search by name, phone, email, plan, or ID"
        filteredCount={data.filteredCount}
        totalCount={data.totalCount}
        page={data.page}
        totalPages={data.totalPages}
        pageSize={6}
        label="members"
      />
      <section className="card-grid owner-card-grid">
        {items.map((member) => (
          <SurfaceCard key={member.id} title={member.name} className="owner-record-card">
            <div className="profile-hero-card compact-profile-card">
              <Avatar name={member.name} src={member.profilePhotoUrl} compact />
              <div>
                <StatusPill label={member.status || 'unknown'} tone={member.status === 'active' ? 'success' : 'warning'} />
                <p className="subcopy">{member.planType || 'No plan'}</p>
              </div>
            </div>
            <div className="detail-list compact">
              <div><span>Phone</span><strong>{member.phone || '-'}</strong></div>
              <div><span>Email</span><strong>{member.email || '-'}</strong></div>
              <div><span>Government ID</span><strong>{member.governmentId || '-'}</strong></div>
              <div><span>ID Submitted</span><strong>{member.governmentIdVerified ? 'Yes' : 'No'}</strong></div>
              <div><span>Joined</span><strong>{formatDate(member.joinDate)}</strong></div>
              <div><span>Expiry</span><strong>{formatDate(member.expiryDate)}</strong></div>
              <div><span>Payments</span><strong>{currency(member.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div>
              <div><span>Attendance rows</span><strong>{member.attendance.length}</strong></div>
            </div>
            <div className="card-actions">
              <button type="button" onClick={() => beginEdit(member)}>
                {editingId === member.id ? 'Editing now' : 'Edit member'}
              </button>
            </div>
            {editingId === member.id && editForm ? (
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
                    Membership plan
                    <input value={editForm.planType} onChange={(event) => updateEditField('planType', event.target.value)} />
                  </label>
                  <label>
                    Expiry date
                    <input type="date" value={editForm.expiryDate} onChange={(event) => updateEditField('expiryDate', event.target.value)} />
                  </label>
                  <label>
                    Status
                    <select value={editForm.status} onChange={(event) => updateEditField('status', event.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                      <option value="frozen">Frozen</option>
                    </select>
                  </label>
                </div>

                <PhotoUpload
                  label="Member photo"
                  value={editForm.profilePhotoUrl}
                  onChange={(next) => updateEditField('profilePhotoUrl', next)}
                  onError={setEditPhotoError}
                  helperText="Update the member photo if needed."
                  uploadCategory="member-record"
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
        {items.length === 0 ? <EmptyState title="No members found" text="Try a different search term to find a member record." /> : null}
      </section>
      <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      <ConfirmDialog
        open={pendingCreate}
        title="Create this member now?"
        description="The member account will be created immediately and will show up in owner records right away."
        confirmLabel="Create member"
        busy={submitting}
        onConfirm={() => {
          setPendingCreate(false);
          void createDirectMember();
        }}
        onClose={() => !submitting && setPendingCreate(false)}
      />
    </main>
  );
}

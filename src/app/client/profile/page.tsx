'use client';

import { useMemo, useState } from 'react';
import { API_URL, type ViewerRole } from '../../../lib/auth';
import { authedJson, useAuthedPageData } from '../../../lib/app-client';
import { Avatar, LoadingState, Notice, PageIntro, SurfaceCard, StatusPill } from '../../../components/app-ui';
import { PhotoUpload } from '../../../components/photo-upload';

const CLIENT_ROLES: ViewerRole[] = ['client'];

type ClientProfilePayload = {
  profile: {
    name: string;
    phone: string;
    email: string;
    governmentId: string;
    governmentIdVerified: boolean;
    profilePhotoUrl: string;
    verifiedIdLocked: boolean;
  };
};

export default function ClientProfilePage() {
  const { data, loading, error, session, setSession, logout, setData } = useAuthedPageData<ClientProfilePayload>('/api/data/client/profile', CLIENT_ROLES);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [draftForm, setDraftForm] = useState<{ displayName: string; phone: string; profilePhotoUrl: string } | null>(null);
  const form = draftForm ?? {
    displayName: data?.profile.name || '',
    phone: data?.profile.phone || '',
    profilePhotoUrl: data?.profile.profilePhotoUrl || ''
  };
  const hasUnsavedChanges = useMemo(() => {
    if (!data) {
      return false;
    }

    return form.displayName !== (data.profile.name || '')
      || form.phone !== (data.profile.phone || '')
      || form.profilePhotoUrl !== (data.profile.profilePhotoUrl || '');
  }, [data, form.displayName, form.phone, form.profilePhotoUrl]);

  if (loading || !data) {
    return <LoadingState title="Loading your profile" text="Getting your personal details ready." />;
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    if (photoError) {
      setStatus(photoError);
      setSaving(false);
      return;
    }

    const response = await fetch(`${API_URL}/api/data/client/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const json = await response.json().catch(() => ({ error: 'Failed to save profile' }));
    if (!response.ok) {
      setStatus(String(json.error || 'Failed to save profile'));
      setSaving(false);
      return;
    }

    const refresh = await authedJson<ClientProfilePayload>('/api/data/client/profile', session);
    if (!refresh.ok || !refresh.session || !refresh.data) {
      if (refresh.unauthorized) {
        logout();
        return;
      }
      setStatus(refresh.error || 'Profile saved, but refresh failed');
      setSaving(false);
      return;
    }

    setSession(refresh.session);
    setData(refresh.data);
    setDraftForm(null);
    setStatus('Profile updated.');
    setSaving(false);
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status === 'Profile updated.' ? 'success' : 'error'} text={status} /> : null}
      <PageIntro
        eyebrow="Client Profile"
        title="Your personal details"
        description="Update the basics you control. Verified identity stays locked for security."
        actions={
          <>
            {hasUnsavedChanges ? <StatusPill label="Unsaved changes" tone="warning" /> : null}
            <StatusPill label={data.profile.governmentIdVerified ? 'ID submitted' : 'ID not submitted'} tone={data.profile.governmentIdVerified ? 'success' : 'warning'} />
          </>
        }
      />

      <section className="content-grid feature-grid">
        <SurfaceCard title="Profile card" className="profile-panel">
          <div className="profile-hero-card">
            <Avatar name={data.profile.name} src={form.profilePhotoUrl || data.profile.profilePhotoUrl} />
            <div>
              <strong>{data.profile.name}</strong>
              <p className="subcopy">{data.profile.email || 'No email on file'}</p>
              <p className="subcopy">{data.profile.phone || 'No phone on file'}</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Editable" title="Update profile">
          <form className="stack-form" onSubmit={handleSave}>
            <label>
              Name
              <input value={form.displayName} onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), displayName: event.target.value }))} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => setDraftForm((prev) => ({ ...(prev ?? form), phone: event.target.value }))} />
            </label>
            <label>
              Email
              <input value={data.profile.email} disabled />
            </label>
            <label>
              Government ID
              <input value={data.profile.governmentId || 'Not available'} disabled />
            </label>
            <PhotoUpload
              label="Profile photo"
              value={form.profilePhotoUrl}
              onChange={(next) => setDraftForm((prev) => ({ ...(prev ?? form), profilePhotoUrl: next }))}
              onError={setPhotoError}
              helperText="Take a fresh photo or choose one from your phone."
              uploadCategory="profile-client"
              authToken={session.accessToken}
            />
            <div className="card-actions">
              <button type="submit" disabled={saving || !hasUnsavedChanges}>{saving ? 'Saving...' : 'Save Profile'}</button>
              <button type="button" className="ghost-button" disabled={saving || !hasUnsavedChanges} onClick={() => setDraftForm(null)}>Reset Changes</button>
            </div>
          </form>
        </SurfaceCard>
      </section>
    </main>
  );
}

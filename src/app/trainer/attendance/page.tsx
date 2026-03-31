'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { type ViewerRole } from '../../../lib/auth';
import { authedJsonRequest, useAuthedPageData } from '../../../lib/app-client';
import { EmptyState, LoadingState, Notice, PageIntro, StatusPill, SurfaceCard } from '../../../components/app-ui';
import { formatDateTime } from '../../../lib/formatters';
import {
  formatDistanceLabel,
  getNearestGymBranchSummary,
  getUserLocation,
  openBranchDirections,
  type GymBranchConfig
} from '../../../lib/location';

const TRAINER_ROLES: ViewerRole[] = ['trainer'];

type TrainerAttendancePayload = {
  memberAttendance: Array<{ id: number; date: string; memberName: string; status: string; checkInTime: string }>;
  trainerAttendance: Array<{ id: number; date: string; checkInTime: string }>;
  gymBranches: GymBranchConfig[];
  hasPendingTodayRequest: boolean;
  hasApprovedTodayAttendance: boolean;
};

type RequestResponse = {
  id: string;
  status: string;
  createdAt: string;
};

type LocalStatus = {
  tone: 'success' | 'warning' | 'error';
  text: string;
  detail?: string;
};

export default function TrainerAttendancePage() {
  const { data, loading, error, session, setSession, logout, reload } = useAuthedPageData<TrainerAttendancePayload>(
    '/api/data/trainer/attendance',
    TRAINER_ROLES
  );
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localStatus, setLocalStatus] = useState<LocalStatus | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const alreadyMarkedToday = Boolean(data?.hasApprovedTodayAttendance);
  const disableMarkAttendance = Boolean(data?.hasPendingTodayRequest || alreadyMarkedToday || submitting);
  const activeBranchId = selectedBranchId || data?.gymBranches[0]?.id || '';

  const selectedBranch = useMemo(
    () => data?.gymBranches.find((branch) => branch.id === activeBranchId) || data?.gymBranches[0] || null,
    [activeBranchId, data?.gymBranches]
  );

  const todayLog = useMemo(
    () => data?.trainerAttendance.find((item) => item.date === today) || null,
    [data, today]
  );

  if (loading || !data) {
    return <LoadingState title="Loading attendance screens" text="Fetching read-only member attendance and your own log." />;
  }

  const handleUseLocation = async () => {
    setStatus(null);
    setLocalStatus({
      tone: 'warning',
      text: 'Checking your live location...',
      detail: 'This helps choose the nearest branch automatically.'
    });

    try {
      const coords = await getUserLocation();
      const preview = getNearestGymBranchSummary({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      }, data.gymBranches);

      const branch = preview?.matched?.branch || preview?.nearest?.branch || null;
      if (!branch) {
        setLocalStatus({
          tone: 'error',
          text: 'We could not match your location to a branch.',
          detail: 'Please choose the branch manually below.'
        });
        return;
      }

      setSelectedBranchId(branch.id);
      setLocalStatus({
        tone: preview?.matched ? 'success' : 'warning',
        text: preview?.matched
          ? `We selected ${branch.label} for you.`
          : `Nearest branch selected: ${branch.label}.`,
        detail: preview?.nearest
          ? `Distance: ${preview.nearest.distanceLabel}${coords.accuracy ? ` | GPS accuracy: ${formatDistanceLabel(coords.accuracy)}` : ''}`
          : 'You can still change the branch manually if needed.'
      });
    } catch (locationError) {
      setLocalStatus({
        tone: 'error',
        text: locationError instanceof Error ? locationError.message : 'We could not read your location.',
        detail: 'You can still choose your branch manually and send your request.'
      });
    }
  };

  const markOwnAttendance = async () => {
    if (!selectedBranch) {
      setStatus({ tone: 'error', text: 'Please choose your gym branch first.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setLocalStatus({
      tone: 'warning',
      text: `Sending attendance request for ${selectedBranch.label}...`,
      detail: 'Please wait while we send this to the owner for approval.'
    });

    const result = await authedJsonRequest<RequestResponse>('/api/requests', session, {
      method: 'POST',
      body: JSON.stringify({
        type: 'trainer-attendance',
        data: {
          date: today,
          branchId: selectedBranch.id
        }
      })
    });

    if (!result.session || result.unauthorized) {
      logout();
      return;
    }

    setSession(result.session);
    if (!result.ok) {
      setStatus({ tone: 'error', text: result.error || 'Failed to create attendance request.' });
      setLocalStatus({
        tone: 'error',
        text: 'Attendance request could not be sent.',
        detail: 'Please try again or contact the owner.'
      });
      setSubmitting(false);
      return;
    }

    setStatus({ tone: 'success', text: 'Attendance request submitted for owner approval.' });
    setLocalStatus({
      tone: 'success',
      text: `Request submitted for ${selectedBranch.label}.`,
      detail: 'You can track it from your requests screen.'
    });
    await reload();
    setSubmitting(false);
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status.tone} text={status.text} /> : null}
      <PageIntro
        eyebrow="Attendance"
        title="Read-only member attendance"
        description="Review assigned-member attendance here, then choose your branch and send your own attendance request in one tap."
        actions={(
          <div className="action-cluster">
            <button type="button" className="ghost-button" onClick={() => void handleUseLocation()} disabled={submitting}>
              Use my live location
            </button>
            <button type="button" onClick={() => void markOwnAttendance()} disabled={disableMarkAttendance || !selectedBranch}>
              {alreadyMarkedToday ? 'Already marked today' : data.hasPendingTodayRequest ? 'Request pending' : submitting ? 'Sending request...' : 'Send attendance request'}
            </button>
          </div>
        )}
      />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Branch selection" title="Choose the branch you are working from">
          <div className="location-status-card">
            <div className="location-status-head">
              <div>
                <strong>{alreadyMarkedToday ? 'Today is already approved' : data.hasPendingTodayRequest ? 'Today is waiting for owner approval' : 'Branch-based attendance request'}</strong>
                <p className="subcopy">
                  Choose the branch you are on duty at today. Live location is optional and only helps auto-select the nearest branch.
                </p>
              </div>
              <StatusPill
                label={alreadyMarkedToday ? 'Approved' : data.hasPendingTodayRequest ? 'Pending' : `${data.gymBranches.length} branches live`}
                tone={alreadyMarkedToday ? 'success' : 'warning'}
              />
            </div>

            {todayLog?.checkInTime ? (
              <div className="location-stat-row">
                <strong>Approved today</strong>
                <span>{formatDateTime(todayLog.checkInTime)}</span>
              </div>
            ) : null}

            <label className="stack-form-label">
              <span className="toolbar-label">Choose branch</span>
              <select value={activeBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}>
                {data.gymBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.label}
                  </option>
                ))}
              </select>
            </label>

            {localStatus ? (
              <div className={`location-feedback ${localStatus.tone}`}>
                <strong>{localStatus.text}</strong>
                {localStatus.detail ? <span>{localStatus.detail}</span> : null}
              </div>
            ) : (
              <div className="location-feedback neutral">
                <strong>Quick tip</strong>
                <span>Use the dropdown if you already know your branch. Live location is optional.</span>
              </div>
            )}

            <div className="branch-grid">
              {data.gymBranches.map((branch) => (
                <article key={branch.id} className={`branch-card ${activeBranchId === branch.id ? 'branch-card-active' : ''}`}>
                  <div className="branch-card-head">
                    <div className="branch-card-copy">
                      <strong>{branch.label}</strong>
                      <span className="subcopy">Attendance zone: {formatDistanceLabel(branch.radiusMeters)}</span>
                    </div>
                    <StatusPill label={activeBranchId === branch.id ? 'Selected' : 'Available'} tone={activeBranchId === branch.id ? 'success' : 'default'} />
                  </div>
                  <p className="subcopy">
                    Use this branch when sending your daily attendance request.
                  </p>
                  <div className="branch-card-actions">
                    <button type="button" className="ghost-button" onClick={() => setSelectedBranchId(branch.id)}>
                      Choose branch
                    </button>
                    <button type="button" className="ghost-button" onClick={() => openBranchDirections(branch)}>
                      Open directions
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Self log" title="Your attendance history">
          <div className="timeline-list dense">
            <div className="timeline-item">
              <strong>Need help?</strong>
              <span>{data.hasPendingTodayRequest ? 'Your request for today is already waiting on owner approval.' : alreadyMarkedToday ? 'Your attendance for today is already approved.' : 'Choose your branch and send one request for today.'}</span>
              <Link href="/trainer/requests" className="text-link">Open requests</Link>
            </div>
            {data.trainerAttendance.map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.date}</strong>
                <span>{formatDateTime(item.checkInTime)}</span>
              </div>
            ))}
            {data.trainerAttendance.length === 0 ? (
              <EmptyState title="No trainer attendance yet" text="Your approved attendance history will appear here after the first successful request." />
            ) : null}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard title="Assigned member attendance">
        <div className="timeline-list dense">
          {data.memberAttendance.map((item) => (
            <div key={item.id} className="timeline-item">
              <strong>{item.memberName}</strong>
              <span>{item.status}</span>
              <span>{item.date}</span>
            </div>
          ))}
          {data.memberAttendance.length === 0 ? (
            <EmptyState title="No member attendance records yet" text="Assigned member visits will appear here once attendance starts coming in." />
          ) : null}
        </div>
      </SurfaceCard>
    </main>
  );
}

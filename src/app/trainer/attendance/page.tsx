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

type LocationFeedback = {
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
  const [locationFeedback, setLocationFeedback] = useState<LocationFeedback | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const alreadyMarkedToday = Boolean(data?.hasApprovedTodayAttendance);
  const disableMarkAttendance = Boolean(data?.hasPendingTodayRequest || alreadyMarkedToday || submitting);

  const todayLog = useMemo(
    () => data?.trainerAttendance.find((item) => item.date === today) || null,
    [data, today]
  );

  if (loading || !data) {
    return <LoadingState title="Loading attendance screens" text="Fetching read-only member attendance and your own log." />;
  }

  const markOwnAttendance = async () => {
    setSubmitting(true);
    setStatus(null);
    setLocationFeedback({
      tone: 'warning',
      text: 'Getting your location...',
      detail: 'Allow location access so we can confirm which PowerHouse branch you are physically at.'
    });

    try {
      const coords = await getUserLocation();
      const preview = getNearestGymBranchSummary({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      }, data.gymBranches);

      const activeBranch = preview?.matched || preview?.nearest || null;
      if (!activeBranch) {
        setStatus({
          tone: 'error',
          text: 'No gym branch is configured right now. Please contact the owner.'
        });
        return;
      }

      setLocationFeedback({
        tone: activeBranch.withinRange ? 'success' : 'error',
        text: activeBranch.withinRange
          ? `You are inside the attendance zone for ${activeBranch.branch.label}.`
          : `Nearest branch: ${activeBranch.branch.label} (${activeBranch.distanceLabel} away).`,
        detail: `Allowed radius: ${formatDistanceLabel(activeBranch.branch.radiusMeters)}${coords.accuracy ? ` | GPS accuracy: ${formatDistanceLabel(coords.accuracy)}` : ''}`
      });

      if (!activeBranch.withinRange) {
        setStatus({
          tone: 'error',
          text: `Move closer to ${activeBranch.branch.label} before sending your attendance request.`
        });
        return;
      }

      const result = await authedJsonRequest<RequestResponse>('/api/requests', session, {
        method: 'POST',
        body: JSON.stringify({
          type: 'trainer-attendance',
          data: {
            date: today,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: coords.accuracy
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
        return;
      }

      setStatus({ tone: 'success', text: 'Attendance request submitted for owner approval.' });
      await reload();
    } catch (actionError) {
      setStatus({
        tone: 'error',
        text: actionError instanceof Error ? actionError.message : 'Location permission is required to continue.'
      });
      setLocationFeedback({
        tone: 'error',
        text: 'We could not read your location.',
        detail: 'Turn on location services and try again while you are at a branch entrance or reception.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status.tone} text={status.text} /> : null}
      <PageIntro
        eyebrow="Attendance"
        title="Read-only member attendance"
        description="Review assigned-member attendance here, then send your own attendance request only when you are physically at either PowerHouse branch."
        actions={(
          <div className="action-cluster">
            <button type="button" onClick={() => void markOwnAttendance()} disabled={disableMarkAttendance}>
              {alreadyMarkedToday ? 'Already marked today' : data.hasPendingTodayRequest ? 'Request pending' : submitting ? 'Checking your location...' : 'Mark my attendance'}
            </button>
          </div>
        )}
      />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Branch validation" title="Attendance works at both branches">
          <div className="location-status-card">
            <div className="location-status-head">
              <div>
                <strong>{alreadyMarkedToday ? 'Today is already approved' : data.hasPendingTodayRequest ? 'Today is waiting for owner approval' : 'Location check required before requesting attendance'}</strong>
                <p className="subcopy">
                  We validate your location against the nearest live branch before the request is sent to the owner.
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

            {locationFeedback ? (
              <div className={`location-feedback ${locationFeedback.tone}`}>
                <strong>{locationFeedback.text}</strong>
                {locationFeedback.detail ? <span>{locationFeedback.detail}</span> : null}
              </div>
            ) : (
              <div className="location-feedback neutral">
                <strong>Tip</strong>
                <span>Open directions if you are unsure which branch your phone GPS is locking onto.</span>
              </div>
            )}

            <div className="branch-grid">
              {data.gymBranches.map((branch) => (
                <article key={branch.id} className="branch-card">
                  <div className="branch-card-head">
                    <div className="branch-card-copy">
                      <strong>{branch.label}</strong>
                      <span className="subcopy">Request radius: {formatDistanceLabel(branch.radiusMeters)}</span>
                    </div>
                    <StatusPill label="Trainer access" tone="success" />
                  </div>
                  <p className="subcopy">
                    Trainer attendance requests are accepted from this branch when you are physically inside the allowed zone.
                  </p>
                  <div className="branch-card-actions">
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
              <span>{data.hasPendingTodayRequest ? 'Your request for today is already waiting on owner approval.' : alreadyMarkedToday ? 'Your attendance for today is already approved.' : 'Send one attendance request once you are at the gym.'}</span>
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

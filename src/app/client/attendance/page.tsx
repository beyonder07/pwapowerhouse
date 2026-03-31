'use client';

import { useMemo, useState } from 'react';
import { EmptyState, LoadingState, Notice, PageIntro, StatusPill, SurfaceCard } from '../../../components/app-ui';
import { authedJsonRequest, useAuthedPageData } from '../../../lib/app-client';
import { buildCalendar, formatDateTime } from '../../../lib/formatters';
import {
  formatDistanceLabel,
  getNearestGymBranchSummary,
  getUserLocation,
  openBranchDirections,
  type GymBranchConfig
} from '../../../lib/location';
import type { ViewerRole } from '../../../lib/auth';

const CLIENT_ROLES: ViewerRole[] = ['client'];

type ClientAttendancePayload = {
  calendar: { month: string; entries: Array<{ date: string; status: 'present' | 'absent' }> };
  gymBranches: GymBranchConfig[];
  todayAttendance: { status: 'present' | 'absent'; checkInTime: string } | null;
  recent: Array<{ id: number; date: string; checkInTime: string; status: string }>;
};

type LocationFeedback = {
  tone: 'success' | 'warning' | 'error';
  text: string;
  detail?: string;
};

type CheckInResponse = {
  success?: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  date?: string;
  checkInTime?: string;
  distanceMeters?: number;
  distanceLabel?: string;
  branchLabel?: string;
};

export default function ClientAttendancePage() {
  const { data, loading, error, session, setSession, logout, reload } = useAuthedPageData<ClientAttendancePayload>(
    '/api/data/client/attendance',
    CLIENT_ROLES
  );
  const [checkingIn, setCheckingIn] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [locationFeedback, setLocationFeedback] = useState<LocationFeedback | null>(null);

  const cells = useMemo(() => data ? buildCalendar(data.calendar.month, data.calendar.entries) : [], [data]);
  const checkedInToday = data?.todayAttendance?.status === 'present';

  if (loading || !data) {
    return <LoadingState title="Loading attendance calendar" text="Preparing your visit timeline for this month." />;
  }

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setActionNotice(null);
    setLocationFeedback({
      tone: 'warning',
      text: 'Getting your location...',
      detail: 'Please allow location access so we can confirm which PowerHouse branch you are visiting.'
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
        setActionNotice({
          tone: 'error',
          text: 'No gym branch is configured right now. Please contact the gym desk.'
        });
        setLocationFeedback({
          tone: 'error',
          text: 'We could not match your check-in to a branch.',
          detail: 'Please contact the gym desk before trying again.'
        });
        return;
      }

      setLocationFeedback({
        tone: activeBranch.withinRange ? 'success' : 'error',
        text: activeBranch.withinRange
          ? `You are inside the check-in zone for ${activeBranch.branch.label}.`
          : `Nearest branch: ${activeBranch.branch.label} (${activeBranch.distanceLabel} away).`,
        detail: `Allowed radius: ${formatDistanceLabel(activeBranch.branch.radiusMeters)}${coords.accuracy ? ` | GPS accuracy: ${formatDistanceLabel(coords.accuracy)}` : ''}`
      });

      if (!activeBranch.withinRange) {
        setActionNotice({
          tone: 'error',
          text: `Move closer to ${activeBranch.branch.label} before checking in.`
        });
        return;
      }

      const result = await authedJsonRequest<CheckInResponse>('/api/attendance/client/check-in', session, {
        method: 'POST',
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy
        })
      });

      if (!result.session || result.unauthorized) {
        logout();
        return;
      }

      setSession(result.session);
      if (!result.ok || !result.data) {
        setActionNotice({ tone: 'error', text: result.error || 'Could not complete the check-in.' });
        return;
      }

      setLocationFeedback({
        tone: 'success',
        text: result.data.branchLabel
          ? `Check-in confirmed at ${result.data.branchLabel}.`
          : 'Check-in confirmed.',
        detail: result.data.distanceLabel
          ? `You were ${result.data.distanceLabel} from the branch when your attendance was marked.`
          : 'Your visit has been recorded for today.'
      });

      setActionNotice({
        tone: 'success',
        text: result.data.alreadyCheckedIn
          ? 'Your attendance was already marked for today.'
          : 'Check-in successful. Your attendance is marked for today.'
      });
      await reload();
    } catch (actionError) {
      setActionNotice({
        tone: 'error',
        text: actionError instanceof Error ? actionError.message : 'Location permission is required to check in.'
      });
      setLocationFeedback({
        tone: 'error',
        text: 'We could not read your location.',
        detail: 'Turn on location services and try again near a gym entrance.'
      });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {actionNotice ? <Notice tone={actionNotice.tone} text={actionNotice.text} /> : null}
      <PageIntro
        eyebrow="Attendance"
        title="Monthly attendance"
        description="Check in from either PowerHouse branch, open directions in one tap, and keep your visit history in one place."
        actions={(
          <div className="action-cluster">
            <button type="button" onClick={() => void handleCheckIn()} disabled={checkingIn || checkedInToday}>
              {checkedInToday ? 'Checked in today' : checkingIn ? 'Checking your location...' : 'Check in now'}
            </button>
          </div>
        )}
      />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Branch check-in" title="Check in at any PowerHouse branch">
          <div className="location-status-card">
            <div className="location-status-head">
              <div>
                <strong>{checkedInToday ? 'Today is already marked' : 'Use your live location to check in'}</strong>
                <p className="subcopy">
                  We match you to the nearest branch automatically and only allow attendance when you are inside that branch radius.
                </p>
              </div>
              <StatusPill
                label={checkedInToday ? 'Checked in' : `${data.gymBranches.length} branches live`}
                tone={checkedInToday ? 'success' : 'warning'}
              />
            </div>

            {data.todayAttendance?.checkInTime ? (
              <div className="location-stat-row">
                <strong>Today&apos;s check-in</strong>
                <span>{formatDateTime(data.todayAttendance.checkInTime)}</span>
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
                <span>Stand near the reception or entrance of either branch for the cleanest GPS lock.</span>
              </div>
            )}

            <div className="branch-grid">
              {data.gymBranches.map((branch) => (
                <article key={branch.id} className="branch-card">
                  <div className="branch-card-head">
                    <div className="branch-card-copy">
                      <strong>{branch.label}</strong>
                      <span className="subcopy">Live attendance radius: {formatDistanceLabel(branch.radiusMeters)}</span>
                    </div>
                    <StatusPill label="Directions ready" tone="success" />
                  </div>
                  <p className="subcopy">
                    Attendance works here for members. Tap directions if you want the fastest route from your phone.
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

        <SurfaceCard title={data.calendar.month}>
          <div className="calendar-headings">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map((cell) => (
              <div key={cell.key} className={`calendar-cell ${cell.status} ${cell.outsideMonth ? 'outside' : ''}`}>
                {cell.label}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard eyebrow="Recent visits" title="Attendance log">
        <div className="timeline-list">
          {data.recent.map((item) => (
            <div key={item.id} className="timeline-item">
              <strong>{item.status}</strong>
              <span>{item.date}</span>
              <span>{formatDateTime(item.checkInTime)}</span>
            </div>
          ))}
          {data.recent.length === 0 ? (
            <EmptyState title="No attendance history yet" text="Your gym visits will appear here after your first successful check-in." />
          ) : null}
        </div>
      </SurfaceCard>
    </main>
  );
}

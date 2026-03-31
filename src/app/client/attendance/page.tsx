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

type LocalStatus = {
  tone: 'success' | 'warning' | 'error';
  text: string;
  detail?: string;
};

export default function ClientAttendancePage() {
  const { data, loading, error, session, setSession, logout, reload } = useAuthedPageData<ClientAttendancePayload>(
    '/api/data/client/attendance',
    CLIENT_ROLES
  );
  const [checkingIn, setCheckingIn] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [localStatus, setLocalStatus] = useState<LocalStatus | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const cells = useMemo(() => data ? buildCalendar(data.calendar.month, data.calendar.entries) : [], [data]);
  const checkedInToday = data?.todayAttendance?.status === 'present';
  const activeBranchId = selectedBranchId || data?.gymBranches[0]?.id || '';
  const selectedBranch = useMemo(
    () => data?.gymBranches.find((branch) => branch.id === activeBranchId) || data?.gymBranches[0] || null,
    [activeBranchId, data?.gymBranches]
  );

  if (loading || !data) {
    return <LoadingState title="Loading attendance calendar" text="Preparing your visit timeline for this month." />;
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
        detail: 'You can still choose your branch manually and check in.'
      });
    }
  };

  const handleCheckIn = async () => {
    if (!selectedBranch) {
      setStatus({ tone: 'error', text: 'Please choose your gym branch first.' });
      return;
    }

    setCheckingIn(true);
    setStatus(null);
    setLocalStatus({
      tone: 'warning',
      text: `Marking attendance for ${selectedBranch.label}...`,
      detail: 'Please wait while we record your visit.'
    });

    const result = await authedJsonRequest<CheckInResponse>('/api/attendance/client/check-in', session, {
      method: 'POST',
      body: JSON.stringify({
        branchId: selectedBranch.id
      })
    });

    if (!result.session || result.unauthorized) {
      logout();
      return;
    }

    setSession(result.session);
    if (!result.ok || !result.data) {
      setStatus({ tone: 'error', text: result.error || 'Could not complete the check-in.' });
      setLocalStatus({
        tone: 'error',
        text: 'Attendance could not be marked.',
        detail: 'Please try again or contact the gym desk.'
      });
      setCheckingIn(false);
      return;
    }

    setStatus({
      tone: 'success',
      text: result.data.alreadyCheckedIn
        ? 'Your attendance was already marked for today.'
        : 'Check-in successful. Your attendance is marked for today.'
    });
    setLocalStatus({
      tone: 'success',
      text: result.data.branchLabel
        ? `Attendance recorded for ${result.data.branchLabel}.`
        : 'Attendance recorded successfully.',
      detail: 'You can see the updated entry below in your visit history.'
    });
    await reload();
    setCheckingIn(false);
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status.tone} text={status.text} /> : null}
      <PageIntro
        eyebrow="Attendance"
        title="Monthly attendance"
        description="Choose your branch, mark attendance in one tap, and use live location only if you want help picking the nearest branch."
        actions={(
          <div className="action-cluster">
            <button type="button" className="ghost-button" onClick={() => void handleUseLocation()} disabled={checkingIn}>
              Use my live location
            </button>
            <button type="button" onClick={() => void handleCheckIn()} disabled={checkingIn || checkedInToday || !selectedBranch}>
              {checkedInToday ? 'Checked in today' : checkingIn ? 'Marking attendance...' : 'Mark attendance'}
            </button>
          </div>
        )}
      />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Branch check-in" title="Choose your branch">
          <div className="location-status-card">
            <div className="location-status-head">
              <div>
                <strong>{checkedInToday ? 'Today is already marked' : 'Simple branch-based attendance'}</strong>
                <p className="subcopy">
                  Pick the branch you are visiting and tap the main button. If you want help, use live location to auto-select the nearest branch.
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
                <span>Using the branch dropdown is enough. Live location is optional and only helps if you are unsure which branch to choose.</span>
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
                    Use this branch if this is where you are training today.
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

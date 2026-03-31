'use client';

import { type ViewerRole } from '../../lib/auth';
import { LoadingState, MetricGrid, Notice, PageIntro, StatusPill, SurfaceCard } from '../../components/app-ui';
import { useAuthedPageData } from '../../lib/app-client';
import { currency, formatDate, formatDateTime } from '../../lib/formatters';
import { formatExpectedMonthlyCollection, formatMonthlyFeeRange } from '../../lib/fee-config';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerOverview = {
  analytics: {
    revenueToday: number;
    revenueMonth: number;
    totalMembers: number;
    activeMembers: number;
    trainerCount: number;
    feeBandLabel: string;
    expectedMonthlyMin: number;
    expectedMonthlyMax: number;
  } | null;
  branches: Array<{ id: string; label: string }>;
  revenueTrend: Array<{ label: string; value: number }>;
  attendancePulse: Array<{ label: string; present: number; total: number }>;
  paymentModeSplit: Array<{ label: string; value: number }>;
  sync: { generatedAt: string | null; pendingRequests: number };
  expiringMembers: Array<{ id: number; name: string; expiryDate: string; status: string }>;
  recentPayments: Array<{ id: number; memberName?: string; amount: number; date: string; paymentMode: string }>;
};

type MiniSeries = {
  color: string;
  values: number[];
};

function buildSparklinePath(values: number[], maxValue: number, width = 100, height = 52, padding = 6) {
  if (!values.length) {
    return '';
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const stepX = values.length === 1 ? 0 : usableWidth / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + (values.length === 1 ? usableWidth / 2 : stepX * index);
      const ratio = maxValue > 0 ? value / maxValue : 0;
      const y = height - padding - usableHeight * ratio;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function MiniTrendChart({
  labels,
  series,
  summary,
  footer
}: {
  labels: string[];
  series: MiniSeries[];
  summary: string;
  footer: string;
}) {
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values));
  const lastLabel = labels[labels.length - 1] || '';

  return (
    <div className="owner-pulse-chart">
      <div className="owner-pulse-chart-head">
        <strong>{summary}</strong>
        <span>{footer}</span>
      </div>
      <div className="owner-pulse-chart-stage">
        <svg viewBox="0 0 100 52" preserveAspectRatio="none" className="owner-pulse-chart-svg" aria-hidden="true">
          <line x1="0" y1="46" x2="100" y2="46" className="owner-pulse-axis" />
          {[14, 28].map((offset) => (
            <line key={offset} x1="0" y1={offset} x2="100" y2={offset} className="owner-pulse-gridline" />
          ))}
          {series.map((item, index) => (
            <path
              key={`${item.color}-${index}`}
              d={buildSparklinePath(item.values, maxValue)}
              fill="none"
              stroke={item.color}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
      <div className="owner-pulse-chart-foot">
        <span>{labels[0] || 'Start'}</span>
        <span>{lastLabel || 'Today'}</span>
      </div>
    </div>
  );
}

function ProgressTrack({
  label,
  value,
  share
}: {
  label: string;
  value: number;
  share: number;
}) {
  return (
    <div className="owner-mode-row">
      <div className="owner-mode-copy">
        <strong>{label}</strong>
        <span>{currency(value)}</span>
      </div>
      <div className="owner-mode-track" aria-hidden="true">
        <i style={{ width: `${Math.max(10, share)}%` }} />
      </div>
      <span className="owner-mode-share">{share}%</span>
    </div>
  );
}

export default function OwnerOverviewPage() {
  const { data, loading, error } = useAuthedPageData<OwnerOverview>('/api/data/owner/overview', OWNER_ROLES);

  if (loading || !data) {
    return <LoadingState title="Loading owner dashboard" text="Gathering revenue, renewals, and key member signals." />;
  }

  const expectedLabel = data.analytics ? formatExpectedMonthlyCollection(data.analytics.activeMembers) : formatExpectedMonthlyCollection(0);
  const monthlyCollection = data.analytics?.revenueMonth || 0;
  const targetMin = data.analytics?.expectedMonthlyMin || 0;
  const targetMax = data.analytics?.expectedMonthlyMax || 0;
  const collectionProgress = targetMin > 0 ? Math.min(100, Math.round((monthlyCollection / targetMin) * 100)) : 0;
  const attendanceSeries = data.attendancePulse.map((item) => item.total);
  const presentSeries = data.attendancePulse.map((item) => item.present);
  const totalAttendance = attendanceSeries.reduce((sum, item) => sum + item, 0);
  const averageAttendance = data.attendancePulse.length ? Math.round(totalAttendance / data.attendancePulse.length) : 0;
  const urgentRenewals = data.expiringMembers.length;
  const paymentTotal = data.paymentModeSplit.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <main className="page-stack owner-page owner-overview-page">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro
        eyebrow="Owner dashboard"
        title="Overview"
        description="Quick view of revenue, attendance, renewals, and the next actions that matter most for your business."
        actions={<StatusPill label={data.sync.generatedAt ? `Synced ${formatDateTime(data.sync.generatedAt)}` : 'Awaiting sync'} tone={data.sync.generatedAt ? 'success' : 'warning'} />}
      />

      <MetricGrid
        items={[
          { label: 'Revenue Today', value: currency(data.analytics?.revenueToday || 0), tone: 'success' },
          { label: 'Revenue Month', value: currency(monthlyCollection) },
          { label: 'Total Members', value: String(data.analytics?.totalMembers || 0) },
          { label: 'Active Members', value: String(data.analytics?.activeMembers || 0) },
          { label: 'Monthly Fee Band', value: data.analytics?.feeBandLabel || formatMonthlyFeeRange() },
          { label: 'Expected Monthly Collection', value: expectedLabel }
        ]}
      />

      <section className="content-grid two-col owner-pulse-grid">
        <SurfaceCard eyebrow="Business pulse" title="Monthly collection">
          <MiniTrendChart
            labels={data.revenueTrend.map((item) => item.label)}
            series={[
              {
                color: '#22c55e',
                values: data.revenueTrend.map((item) => Number(item.value || 0))
              }
            ]}
            summary={currency(monthlyCollection)}
            footer={targetMin > 0 ? `${collectionProgress}% of minimum target` : 'Waiting for first collection'}
          />
          <div className="owner-focus-strip">
            <div className="owner-focus-box">
              <span>Target range</span>
              <strong>{currency(targetMin)} - {currency(targetMax)}</strong>
            </div>
            <div className="owner-focus-box">
              <span>Pending approvals</span>
              <strong>{data.sync.pendingRequests}</strong>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Business pulse" title="Attendance activity">
          <MiniTrendChart
            labels={data.attendancePulse.map((item) => item.label)}
            series={[
              {
                color: '#38bdf8',
                values: attendanceSeries
              },
              {
                color: '#f97316',
                values: presentSeries
              }
            ]}
            summary={`${averageAttendance} average daily visits`}
            footer={`${totalAttendance} marks in the latest 10-day window`}
          />
          <div className="owner-focus-strip">
            <div className="owner-focus-box">
              <span>Urgent renewals</span>
              <strong>{urgentRenewals}</strong>
            </div>
            <div className="owner-focus-box">
              <span>Active trainers</span>
              <strong>{data.analytics?.trainerCount || 0}</strong>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="content-grid two-col owner-pulse-grid">
        <SurfaceCard eyebrow="Collection mix" title="How members are paying">
          <div className="owner-mode-list">
            {data.paymentModeSplit.length ? (
              data.paymentModeSplit.map((item) => {
                const share = paymentTotal > 0 ? Math.round((Number(item.value || 0) / paymentTotal) * 100) : 0;
                return <ProgressTrack key={item.label} label={item.label.toUpperCase()} value={Number(item.value || 0)} share={share} />;
              })
            ) : (
              <p className="subcopy">Approved payments will appear here once this month&apos;s collection starts.</p>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Owner focus" title="What needs your attention">
          <div className="owner-focus-grid">
            <article className="owner-focus-panel">
              <span>Pending approvals</span>
              <strong>{data.sync.pendingRequests}</strong>
              <p className="subcopy">Requests waiting in the owner queue right now.</p>
            </article>
            <article className="owner-focus-panel">
              <span>Urgent renewals</span>
              <strong>{urgentRenewals}</strong>
              <p className="subcopy">Members within the next 48 hours of expiry.</p>
            </article>
            <article className="owner-focus-panel">
              <span>Collection gap</span>
              <strong>{monthlyCollection >= targetMin ? 'On track' : currency(Math.max(targetMin - monthlyCollection, 0))}</strong>
              <p className="subcopy">Shortfall against the minimum monthly target band.</p>
            </article>
          </div>
        </SurfaceCard>
      </section>

      <section className="content-grid two-col">
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
                <span>{payment.memberName || 'Member'}</span>
                <span>{payment.paymentMode}</span>
                <span>{formatDate(payment.date)}</span>
              </div>
            ))}
            {data.recentPayments.length === 0 ? <p className="subcopy">No recent payments are recorded yet.</p> : null}
          </div>
        </SurfaceCard>
      </section>
    </main>
  );
}

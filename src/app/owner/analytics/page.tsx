'use client';

import { LoadingState, MetricGrid, Notice, PageIntro, SurfaceCard } from '../../../components/app-ui';
import { useAuthedPageData } from '../../../lib/app-client';
import { currency, formatDate } from '../../../lib/formatters';
import type { ViewerRole } from '../../../lib/auth';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerAnalyticsPayload = {
  analytics: { revenueToday: number; revenueMonth: number; totalMembers: number; activeMembers: number; trainerCount: number } | null;
  revenueTrend: Array<{ label: string; value: number }>;
  memberTrend: Array<{ label: string; value: number }>;
  attendanceTrend: Array<{ label: string; present: number; absent: number }>;
  paymentModeSplit: Array<{ label: string; value: number }>;
  expiringSoon: Array<{ id: number; name: string; expiryDate: string; daysRemaining: number }>;
  trainerPerformance: Array<{ id: number; name: string; assignedMembers: number; activeMembers: number; presentMarks: number; collectedRevenue: number }>;
};

export default function OwnerAnalyticsPage() {
  const { data, loading, error } = useAuthedPageData<OwnerAnalyticsPayload>('/api/data/owner/analytics', OWNER_ROLES);
  const maxRevenue = Math.max(...(data?.revenueTrend || []).map((item) => item.value), 1);
  const maxMembers = Math.max(...(data?.memberTrend || []).map((item) => item.value), 1);
  const maxAttendance = Math.max(...(data?.attendanceTrend || []).map((item) => Math.max(item.present, item.absent)), 1);
  const maxPaymentMode = Math.max(...(data?.paymentModeSplit || []).map((item) => item.value), 1);
  const maxTrainerRevenue = Math.max(...(data?.trainerPerformance || []).map((item) => item.collectedRevenue), 1);

  if (loading || !data) {
    return <LoadingState title="Loading analytics" text="Building revenue and member growth trends for the owner view." />;
  }

  return (
    <main className="page-stack owner-page">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro eyebrow="Analytics" title="Business trends" description="Revenue and growth are split out here so the owner dashboard stays focused and uncluttered." />
      <MetricGrid items={[
        { label: 'Revenue Today', value: currency(data.analytics?.revenueToday || 0), tone: 'success' },
        { label: 'Revenue Month', value: currency(data.analytics?.revenueMonth || 0) },
        { label: 'Active Members', value: String(data.analytics?.activeMembers || 0) },
        { label: 'Trainers', value: String(data.analytics?.trainerCount || 0) }
      ]} />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Revenue" title="Last 6 months">
          <div className="chart-list">
            {data.revenueTrend.map((item) => (
              <div key={item.label} className="chart-row">
                <span>{item.label}</span>
                <div className="chart-bar"><i style={{ width: `${(item.value / maxRevenue) * 100}%` }} /></div>
                <strong>{currency(item.value)}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Member growth" title="Join trend">
          <div className="chart-list">
            {data.memberTrend.map((item) => (
              <div key={item.label} className="chart-row">
                <span>{item.label}</span>
                <div className="chart-bar"><i style={{ width: `${(item.value / maxMembers) * 100}%` }} /></div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Attendance" title="Last 30 days">
          <div className="chart-list">
            {data.attendanceTrend.map((item) => (
              <div key={item.label} className="chart-row">
                <span>{item.label}</span>
                <div className="chart-bar"><i style={{ width: `${(Math.max(item.present, item.absent) / maxAttendance) * 100}%` }} /></div>
                <strong>{item.present} P / {item.absent} A</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Payment modes" title="This month collection mix">
          <div className="chart-list">
            {data.paymentModeSplit.map((item) => (
              <div key={item.label} className="chart-row">
                <span>{item.label}</span>
                <div className="chart-bar"><i style={{ width: `${(item.value / maxPaymentMode) * 100}%` }} /></div>
                <strong>{currency(item.value)}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Expiring soon" title="Next renewals to watch">
          <div className="timeline-list dense">
            {data.expiringSoon.map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.name}</strong>
                <span>{formatDate(item.expiryDate)}</span>
                <span>{item.daysRemaining} day(s) left</span>
              </div>
            ))}
            {data.expiringSoon.length === 0 ? <p className="subcopy">No urgent expiries in the next few days.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Trainer performance" title="Top trainer contribution">
          <div className="chart-list">
            {data.trainerPerformance.map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.name}</strong>
                <span>{item.assignedMembers} assigned • {item.activeMembers} active</span>
                <div className="chart-row">
                  <span>Revenue</span>
                  <div className="chart-bar"><i style={{ width: `${(item.collectedRevenue / maxTrainerRevenue) * 100}%` }} /></div>
                  <strong>{currency(item.collectedRevenue)}</strong>
                </div>
                <span>{item.presentMarks} present marks this period</span>
              </div>
            ))}
            {data.trainerPerformance.length === 0 ? <p className="subcopy">Trainer performance will appear once trainers have assigned members and activity.</p> : null}
          </div>
        </SurfaceCard>
      </section>
    </main>
  );
}

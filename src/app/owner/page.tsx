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
  sync: { generatedAt: string | null; pendingRequests: number };
  expiringMembers: Array<{ id: number; name: string; expiryDate: string; status: string }>;
  recentPayments: Array<{ id: number; memberName?: string; amount: number; date: string; paymentMode: string }>;
};

export default function OwnerOverviewPage() {
  const { data, loading, error } = useAuthedPageData<OwnerOverview>('/api/data/owner/overview', OWNER_ROLES);

  if (loading || !data) {
    return <LoadingState title="Loading owner dashboard" text="Gathering revenue, renewals, and key member signals." />;
  }

  return (
    <main className="page-stack owner-page">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro
        eyebrow="Owner dashboard"
        title="Overview"
        description="Quick view of today's revenue, active members, renewals, and recent cashflow."
        actions={<StatusPill label={data.sync.generatedAt ? `Synced ${formatDateTime(data.sync.generatedAt)}` : 'Awaiting sync'} tone={data.sync.generatedAt ? 'success' : 'warning'} />}
      />

      <MetricGrid
        items={[
          { label: 'Revenue Today', value: currency(data.analytics?.revenueToday || 0), tone: 'success' },
          { label: 'Revenue Month', value: currency(data.analytics?.revenueMonth || 0) },
          { label: 'Total Members', value: String(data.analytics?.totalMembers || 0) },
          { label: 'Active Members', value: String(data.analytics?.activeMembers || 0) },
          { label: 'Monthly Fee Band', value: data.analytics?.feeBandLabel || formatMonthlyFeeRange() },
          { label: 'Expected Monthly Collection', value: data.analytics ? formatExpectedMonthlyCollection(data.analytics.activeMembers) : formatExpectedMonthlyCollection(0) }
        ]}
      />

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


'use client';

import { LoadingState, Notice, PageIntro, StatusPill, SurfaceCard } from '../../../components/app-ui';
import { useAuthedPageData } from '../../../lib/app-client';
import { formatDate } from '../../../lib/formatters';
import type { ViewerRole } from '../../../lib/auth';
import { formatMonthlyFeeRangeWithUnit } from '../../../lib/fee-config';

const CLIENT_ROLES: ViewerRole[] = ['client'];

type ClientMembershipPayload = {
  membership: { planType: string; startDate: string; expiryDate: string; status: string; daysRemaining: number } | null;
};

export default function ClientMembershipPage() {
  const { data, loading, error } = useAuthedPageData<ClientMembershipPayload>('/api/data/client/membership', CLIENT_ROLES);
  const needsAttention = Boolean(data?.membership && data.membership.daysRemaining <= 7);

  if (loading || !data) {
    return <LoadingState title="Loading membership details" text="Preparing your current plan and renewal snapshot." />;
  }

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro eyebrow="Membership" title="Your plan" description="Everything you need about your active membership in one calm view." />
      <SurfaceCard title={data.membership?.planType || 'No active plan'}>
        {data.membership ? (
          <>
            <div className="detail-list membership-detail-list">
              <div><span>Status</span><StatusPill label={data.membership.status} tone={data.membership.status === 'active' ? 'success' : 'warning'} /></div>
              <div><span>Start date</span><strong>{formatDate(data.membership.startDate)}</strong></div>
              <div><span>Expiry date</span><strong>{formatDate(data.membership.expiryDate)}</strong></div>
              <div><span>Typical fee</span><strong>{formatMonthlyFeeRangeWithUnit()}</strong></div>
              <div className="highlight-detail"><span>Days remaining</span><strong>{data.membership.daysRemaining}</strong></div>
            </div>
            {needsAttention ? (
              <div className="landing-note">
                <strong>Renewal reminder</strong>
                <p className="subcopy">Your plan is nearing expiry. Please contact the gym desk or owner soon so your access continues without interruption.</p>
              </div>
            ) : null}
            <p className="subcopy">Most monthly memberships at PowerHouse stay between {formatMonthlyFeeRangeWithUnit()} depending on the level of support and plan guidance you choose.</p>
          </>
        ) : (
          <p className="subcopy">No membership data is synced for this account yet.</p>
        )}
      </SurfaceCard>
    </main>
  );
}

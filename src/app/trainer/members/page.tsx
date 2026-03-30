'use client';

import { Avatar, EmptyState, GridToolbar, LoadingState, MetricGrid, Notice, PageIntro, PaginationControls, SurfaceCard, StatusPill } from '../../../components/app-ui';
import { useAuthedPageData } from '../../../lib/app-client';
import { formatDate } from '../../../lib/formatters';
import { useGridQuery } from '../../../lib/grid';
import type { ViewerRole } from '../../../lib/auth';

const TRAINER_ROLES: ViewerRole[] = ['trainer'];

type TrainerMembersPayload = {
  items: Array<{ id: number; name: string; profilePhotoUrl: string; membershipStatus: string; expiryDate: string }>;
};

export default function TrainerMembersPage() {
  const { data, loading, error } = useAuthedPageData<TrainerMembersPayload>('/api/data/trainer/members', TRAINER_ROLES);
  const items = data?.items || [];
  const grid = useGridQuery({
    items,
    pageSize: 8,
    predicate: (member, query) => [
      member.name,
      member.membershipStatus,
      member.expiryDate
    ].some((value) => String(value || '').toLowerCase().includes(query))
  });

  if (loading || !data) {
    return <LoadingState title="Loading assigned members" text="Preparing your member list with privacy-safe details." />;
  }

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro eyebrow="Assigned Members" title="Your member list" description="Only the essentials are visible here: name, profile photo, and membership status." />
      <MetricGrid
        items={[
          { label: 'Assigned Members', value: String(items.length) },
          { label: 'Active Plans', value: String(items.filter((member) => member.membershipStatus === 'active').length), tone: 'success' },
          { label: 'Attention Needed', value: String(items.filter((member) => member.membershipStatus !== 'active').length), tone: items.some((member) => member.membershipStatus !== 'active') ? 'warning' : 'default' }
        ]}
      />
      <GridToolbar
        query={grid.query}
        onQueryChange={grid.setQuery}
        placeholder="Search by member name, status, or expiry date"
        filteredCount={grid.filteredCount}
        totalCount={grid.totalItems}
        page={grid.page}
        totalPages={grid.totalPages}
        pageSize={8}
        label="members"
      />
      <section className="card-grid">
        {grid.pageItems.map((member) => (
          <SurfaceCard key={member.id} title={member.name} className="member-card">
            <div className="profile-hero-card compact-profile-card">
              <Avatar name={member.name} src={member.profilePhotoUrl} compact />
              <div>
                <StatusPill label={member.membershipStatus || 'unknown'} tone={member.membershipStatus === 'active' ? 'success' : 'warning'} />
                <p className="subcopy">Expiry: {formatDate(member.expiryDate)}</p>
              </div>
            </div>
          </SurfaceCard>
        ))}
        {grid.pageItems.length === 0 ? <EmptyState title="No assigned members yet" text="Once members are assigned to you, they will appear here with privacy-safe cards." /> : null}
      </section>
      <PaginationControls page={grid.page} totalPages={grid.totalPages} onPageChange={grid.setPage} />
    </main>
  );
}

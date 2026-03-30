'use client';

import { useState } from 'react';
import { GridToolbar, LoadingState, MetricGrid, Notice, PageIntro, PaginationControls, StatusPill, SurfaceCard } from '../../../components/app-ui';
import { useAuthedPageData } from '../../../lib/app-client';
import { currency, formatDate } from '../../../lib/formatters';
import type { ViewerRole } from '../../../lib/auth';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerPaymentsPayload = {
  items: Array<{ id: number; memberName: string; amount: number; paymentMode: string; date: string; status: string }>;
  totalsByMode: Array<{ mode: string; total: number }>;
  totalCollected: number;
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function OwnerPaymentsPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = `/api/data/owner/payments?query=${encodeURIComponent(query)}&page=${page}&pageSize=10`;
  const { data, loading, error } = useAuthedPageData<OwnerPaymentsPayload>(endpoint, OWNER_ROLES);

  if (loading || !data) {
    return <LoadingState title="Loading payments" text="Bringing in cashflow totals and full payment logs." />;
  }

  return (
    <main className="page-stack owner-page">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro eyebrow="Payments" title="Financial system" description="Revenue data is isolated here so the owner can review finance without cluttering other views." />
      <MetricGrid items={[{ label: 'Total Collected', value: currency(data.totalCollected), tone: 'success' }, { label: 'Transactions', value: String(data.totalCount) }]} />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="By mode" title="Collection split">
          <div className="timeline-list dense">
            {data.totalsByMode.map((item) => (
              <div key={item.mode} className="timeline-item">
                <strong>{item.mode}</strong>
                <span>{currency(item.total)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Payment log">
          <GridToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by member, mode, amount, date, or status"
            filteredCount={data.filteredCount}
            totalCount={data.totalCount}
            page={data.page}
            totalPages={data.totalPages}
            pageSize={10}
            label="payments"
          />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Member</th><th>Amount</th><th>Mode</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.memberName || '-'}</td>
                    <td>{currency(item.amount)}</td>
                    <td>{item.paymentMode || '-'}</td>
                    <td><StatusPill label={item.status || 'paid'} tone={item.status === 'paid' ? 'success' : 'warning'} /></td>
                  </tr>
                ))}
                {data.items.length === 0 ? <tr><td colSpan={5} className="empty-cell">No payments match this search.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <PaginationControls page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </SurfaceCard>
      </section>
    </main>
  );
}

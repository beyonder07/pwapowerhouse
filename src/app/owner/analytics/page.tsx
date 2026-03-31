'use client';

import { useMemo, useState } from 'react';
import { LoadingState, MetricGrid, Notice, PageIntro, SurfaceCard } from '../../../components/app-ui';
import { useAuthedPageData } from '../../../lib/app-client';
import { currency, formatDate } from '../../../lib/formatters';
import type { ViewerRole } from '../../../lib/auth';
import { formatExpectedMonthlyCollection, formatMonthlyFeeRange } from '../../../lib/fee-config';

const OWNER_ROLES: ViewerRole[] = ['owner', 'admin'];

type OwnerAnalyticsPayload = {
  activeBranchId: string;
  branches: Array<{ id: string; label: string }>;
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
  revenueTrend: Array<{ label: string; value: number }>;
  memberTrend: Array<{ label: string; value: number }>;
  attendanceTrend: Array<{ label: string; present: number; absent: number }>;
  paymentModeSplit: Array<{ label: string; value: number }>;
  expiringSoon: Array<{ id: number; name: string; phone: string; expiryDate: string; daysRemaining: number }>;
  trainerPerformance: Array<{ id: number; name: string; assignedMembers: number; activeMembers: number; presentMarks: number; collectedRevenue: number }>;
};

type LineChartSeries = {
  label: string;
  color: string;
  values: number[];
};

function buildWhatsAppHref(name: string, phone: string, expiryDate: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const message = `Hello ${name}, your PowerHouse Gym plan is expiring on ${formatDate(expiryDate)}. Please renew your membership to continue uninterrupted access. Reply here if you need any help.`;
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : '';
}

function buildLinePath(values: number[], maxValue: number, width = 100, height = 100, topPad = 12, bottomPad = 18) {
  if (!values.length) {
    return { path: '', points: [] as Array<{ x: number; y: number; value: number }> };
  }

  const usableHeight = height - topPad - bottomPad;
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : index * stepX;
    const ratio = maxValue > 0 ? value / maxValue : 0;
    const y = height - bottomPad - usableHeight * ratio;
    return { x, y, value };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  return { path, points };
}

function ResponsiveLineChart({
  labels,
  series,
  valueFormatter
}: {
  labels: string[];
  series: LineChartSeries[];
  valueFormatter?: (value: number) => string;
}) {
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values));
  const labelStep = labels.length > 8 ? Math.ceil(labels.length / 6) : 1;
  const chartSeries = series.map((item) => ({
    ...item,
    ...buildLinePath(item.values, maxValue)
  }));

  return (
    <div className="line-chart-shell">
      <div className="line-chart-legend">
        {series.map((item) => (
          <span key={item.label} className="line-chart-legend-item">
            <i style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="line-chart-stage">
        <svg className="line-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="82" x2="100" y2="82" className="line-chart-axis" />
          {[25, 50, 75].map((offset) => (
            <line key={offset} x1="0" y1={offset} x2="100" y2={offset} className="line-chart-gridline" />
          ))}
          {chartSeries.map((item) => (
            <g key={item.label}>
              <path d={item.path} fill="none" stroke={item.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              {item.points.map((point, index) => (
                <circle key={`${item.label}-${index}`} cx={point.x} cy={point.y} r="2.1" fill={item.color} />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="line-chart-labels">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} className={index % labelStep === 0 || index === labels.length - 1 ? 'visible' : ''}>
            {label}
          </span>
        ))}
      </div>
      <div className="line-chart-summary">
        {chartSeries.map((item) => {
          const lastValue = item.values[item.values.length - 1] || 0;
          return (
            <div key={`${item.label}-summary`} className="line-chart-summary-item">
              <span>{item.label}</span>
              <strong>{valueFormatter ? valueFormatter(lastValue) : String(lastValue)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerAnalyticsPage() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const endpoint = `/api/data/owner/analytics?branch=${encodeURIComponent(selectedBranch)}`;
  const { data, loading, error } = useAuthedPageData<OwnerAnalyticsPayload>(endpoint, OWNER_ROLES);

  const memberGrowthBoxes = useMemo(() => {
    return (data?.memberTrend || []).map((item) => ({
      label: item.label,
      value: `${item.value}`,
      meta: item.value === 1 ? 'new member' : 'new members',
      accent: item.value > 0 ? 'info' : 'muted'
    }));
  }, [data]);

  const paymentModeBoxes = useMemo(() => {
    const palette = ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6'];
    const items = data?.paymentModeSplit || [];
    const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);

    return items.map((item, index) => {
      const value = Number(item.value || 0);
      const share = total > 0 ? Math.round((value / total) * 100) : 0;
      return {
        label: item.label.toUpperCase(),
        value,
        share,
        color: palette[index % palette.length]
      };
    });
  }, [data]);

  const trainerPerformanceBoxes = useMemo(() => {
    return (data?.trainerPerformance || []).map((item) => ({
      id: item.id,
      label: item.name,
      value: currency(item.collectedRevenue),
      meta: `${item.assignedMembers} members | ${item.presentMarks} presents`,
      accent: item.collectedRevenue > 0 ? 'warning' : 'muted'
    }));
  }, [data]);

  const attendanceWindow = useMemo(() => (data?.attendanceTrend || []).slice(-12), [data]);

  if (loading || !data) {
    return <LoadingState title="Loading analytics" text="Building revenue, attendance, and branch trends for the owner dashboard." />;
  }

  return (
    <main className="page-stack owner-page analytics-page">
      {error ? <Notice tone="error" text={error} /> : null}
      <PageIntro
        eyebrow="Analytics"
        title="Business trends"
        description="See both branches together by default, then switch to one branch whenever you want a closer operational view."
        actions={(
          <label className="branch-filter-bar">
            <span className="toolbar-label">View branch</span>
            <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
              {data.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.label}
                </option>
              ))}
            </select>
          </label>
        )}
      />

      <MetricGrid items={[
        { label: 'Revenue Today', value: currency(data.analytics?.revenueToday || 0), tone: 'success' },
        { label: 'Revenue Month', value: currency(data.analytics?.revenueMonth || 0) },
        { label: 'Members In View', value: String(data.analytics?.totalMembers || 0) },
        { label: 'Active Members', value: String(data.analytics?.activeMembers || 0) },
        { label: 'Monthly Fee Band', value: data.analytics?.feeBandLabel || formatMonthlyFeeRange() },
        { label: 'Expected Monthly Collection', value: data.analytics ? formatExpectedMonthlyCollection(data.analytics.activeMembers) : formatExpectedMonthlyCollection(0) }
      ]} />

      <section className="analytics-row">
        <SurfaceCard eyebrow="Revenue" title="Monthly collection trend" className="analytics-card analytics-list-card">
          <ResponsiveLineChart
            labels={(data.revenueTrend || []).map((item) => item.label)}
            series={[
              {
                label: 'Revenue',
                color: '#22c55e',
                values: (data.revenueTrend || []).map((item) => Number(item.value || 0))
              }
            ]}
            valueFormatter={(value) => currency(value)}
          />
        </SurfaceCard>

        <SurfaceCard eyebrow="Attendance" title="Last 30 days" className="analytics-card analytics-list-card">
          <ResponsiveLineChart
            labels={attendanceWindow.map((item) => item.label)}
            series={[
              {
                label: 'Present',
                color: '#38bdf8',
                values: attendanceWindow.map((item) => Number(item.present || 0))
              },
              {
                label: 'Absent',
                color: '#f97316',
                values: attendanceWindow.map((item) => Number(item.absent || 0))
              }
            ]}
            valueFormatter={(value) => `${value}`}
          />
        </SurfaceCard>
      </section>

      <section className="analytics-row">
        <SurfaceCard eyebrow="Growth" title="Member join trend" className="analytics-card analytics-list-card">
          <div className="analytics-box-grid">
            {memberGrowthBoxes.map((item) => (
              <article key={item.label} className={`analytics-box ${item.accent}`}>
                <strong>{item.label}</strong>
                <span className="analytics-box-value">{item.value}</span>
                <span className="analytics-box-meta">{item.meta}</span>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Modes" title="Payment mode split" className="analytics-card analytics-list-card">
          <div className="analytics-box-grid payment-mode-box-grid">
            {paymentModeBoxes.map((item) => (
              <article key={item.label} className="analytics-box payment-mode-box">
                <span className="payment-mode-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <strong>{item.label}</strong>
                <span className="analytics-box-value">{currency(item.value)}</span>
                <span className="analytics-box-meta">{item.share}% of this month&apos;s collection</span>
              </article>
            ))}
            {paymentModeBoxes.length === 0 ? (
              <p className="subcopy">Approved branch payments will appear here once collection starts coming in.</p>
            ) : null}
          </div>
        </SurfaceCard>
      </section>

      <section className="analytics-row">
        <SurfaceCard eyebrow="Trainer performance" title="Revenue by trainer" className="analytics-card analytics-list-card">
          <div className="analytics-box-grid">
            {trainerPerformanceBoxes.map((item) => (
              <article key={item.id} className={`analytics-box ${item.accent}`}>
                <strong>{item.label}</strong>
                <span className="analytics-box-value">{item.value}</span>
                <span className="analytics-box-meta">{item.meta}</span>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Expiring soon" title="Next renewals to watch" className="analytics-card analytics-list-card">
          <div className="timeline-list dense">
            {data.expiringSoon.map((item) => (
              <div key={item.id} className="timeline-item">
                <strong>{item.name}</strong>
                <span>{formatDate(item.expiryDate)}</span>
                <span>{item.daysRemaining} day(s) left</span>
                {item.phone ? (
                  <a className="ghost-button" href={buildWhatsAppHref(item.name, item.phone, item.expiryDate)} target="_blank" rel="noreferrer">
                    Remind on WhatsApp
                  </a>
                ) : (
                  <span className="subcopy">Phone number not available for WhatsApp reminder.</span>
                )}
              </div>
            ))}
            {data.expiringSoon.length === 0 ? (
              <p className="subcopy">No members are within 2 days of expiry in this branch view right now.</p>
            ) : null}
          </div>
        </SurfaceCard>
      </section>
    </main>
  );
}

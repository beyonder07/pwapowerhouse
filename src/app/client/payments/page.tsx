'use client';

import { useMemo, useState } from 'react';
import { PhotoUpload } from '../../../components/photo-upload';
import { LoadingState, MetricGrid, Notice, PageIntro, StatusPill, SurfaceCard } from '../../../components/app-ui';
import { authedJsonRequest, useAuthedPageData } from '../../../lib/app-client';
import { currency, formatDate } from '../../../lib/formatters';
import type { ViewerRole } from '../../../lib/auth';
import type { GymBranchConfig } from '../../../lib/location';
import { formatMonthlyFeeRangeWithUnit } from '../../../lib/fee-config';

const CLIENT_ROLES: ViewerRole[] = ['client'];

type ClientPaymentsPayload = {
  gymBranches: GymBranchConfig[];
  items: Array<{
    id: number;
    amount: number;
    paymentMode: string;
    date: string;
    status: string;
    branchLabel?: string;
    proofUrl?: string;
  }>;
  totalPaid: number;
  pendingCount: number;
};

type SubmitResponse = {
  ok: boolean;
  paymentId: number;
  message: string;
};

export default function ClientPaymentsPage() {
  const { data, loading, error, session, setSession, logout, reload } = useAuthedPageData<ClientPaymentsPayload>(
    '/api/data/client/payments',
    CLIENT_ROLES
  );
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'cash',
    branchId: '',
    proofUrl: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const nonCashMode = form.paymentMode !== 'cash';
  const totalRecorded = useMemo(() => data?.items.length || 0, [data?.items]);
  const activeBranchId = form.branchId || data?.gymBranches[0]?.id || '';

  if (loading || !data) {
    return <LoadingState title="Loading payment history" text="Collecting your payment records and your usual monthly fee range." />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!form.amount || Number(form.amount) <= 0) {
      setStatus({ tone: 'error', text: 'Please enter the amount you paid.' });
      return;
    }
    if (!form.paymentDate) {
      setStatus({ tone: 'error', text: 'Please choose the payment date.' });
      return;
    }
    if (!activeBranchId) {
      setStatus({ tone: 'error', text: 'Please choose the branch where you paid.' });
      return;
    }
    if (nonCashMode && !form.proofUrl) {
      setStatus({ tone: 'error', text: 'Please upload a screenshot for UPI, card, bank transfer, or other digital payments.' });
      return;
    }

    setSubmitting(true);
    const result = await authedJsonRequest<SubmitResponse>('/api/payments/client/submit', session, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        branchId: activeBranchId,
        proofUrl: form.proofUrl || undefined,
        note: form.note.trim() || undefined
      })
    });

    if (!result.session || result.unauthorized) {
      logout();
      return;
    }

    setSession(result.session);
    if (!result.ok || !result.data) {
      setStatus({ tone: 'error', text: result.error || 'Could not submit your payment information.' });
      setSubmitting(false);
      return;
    }

    setStatus({ tone: 'success', text: result.data.message || 'Payment information submitted successfully.' });
    setForm({
      amount: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'cash',
      branchId: '',
      proofUrl: '',
      note: ''
    });
    await reload();
    setSubmitting(false);
  };

  return (
    <main className="page-stack">
      {error ? <Notice tone="error" text={error} /> : null}
      {status ? <Notice tone={status.tone} text={status.text} /> : null}
      <PageIntro
        eyebrow="Payments"
        title="Fees and payment updates"
        description="See what is already recorded, then send new payment information in a simple form. The owner will approve digital payments after checking the proof."
      />
      <MetricGrid items={[
        { label: 'Payments Recorded', value: String(totalRecorded) },
        { label: 'Pending Review', value: String(data.pendingCount), tone: data.pendingCount > 0 ? 'warning' : 'default' },
        { label: 'Total Approved', value: currency(data.totalPaid), tone: 'success' },
        { label: 'Monthly Fee Guide', value: formatMonthlyFeeRangeWithUnit() }
      ]} />

      <section className="content-grid two-col">
        <SurfaceCard eyebrow="Submit payment" title="Send your fee information">
          <p className="subcopy">Monthly fees usually stay between {formatMonthlyFeeRangeWithUnit()}. If you paid a different amount because of an adjusted plan or partial payment, you can still submit the exact amount here.</p>
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-section-grid">
              <label>
                Amount paid
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="Enter the amount you paid"
                />
              </label>
              <label>
                Date paid
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))}
                />
              </label>
              <label>
                Payment mode
                <select
                  value={form.paymentMode}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank-transfer">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Paid at branch
                <select
                  value={activeBranchId}
                  onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                >
                  {data.gymBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {nonCashMode ? (
              <PhotoUpload
                label="Payment screenshot"
                value={form.proofUrl}
                onChange={(next) => setForm((current) => ({ ...current, proofUrl: next }))}
                uploadCategory="payment-proof-client"
                authToken={session.accessToken}
                helperText="Upload the UPI, card, or bank transfer screenshot so the owner can approve it quickly."
              />
            ) : (
              <div className="location-feedback neutral">
                <strong>Cash payment</strong>
                <span>No screenshot is needed for cash payments. The owner will still review the submitted amount and date.</span>
              </div>
            )}

            <label>
              Extra note (optional)
              <textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Example: Paid monthly fee at reception."
              />
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting payment info...' : 'Submit payment info'}
            </button>
          </form>
        </SurfaceCard>

        <SurfaceCard title="Payment history">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Amount</th><th>Mode</th><th>Branch</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{currency(item.amount)}</td>
                    <td>{item.paymentMode || '-'}</td>
                    <td>{item.branchLabel || '-'}</td>
                    <td><StatusPill label={item.status || 'paid'} tone={item.status === 'paid' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'} /></td>
                  </tr>
                ))}
                {data.items.length === 0 ? <tr><td colSpan={5} className="empty-cell">No payments are recorded yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </main>
  );
}

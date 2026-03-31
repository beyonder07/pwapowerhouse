import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { writeOwnerAudit } from '@/lib/server/audit-log';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  decision: z.enum(['approve', 'reject'])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const reviewer = await requireAuthorizedUser(request, ['owner']);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid review decision.' }, { status: 400 });
    }

    const routeParams = await params;
    const paymentId = Number(routeParams.id || 0);
    if (!paymentId) {
      return NextResponse.json({ error: 'Invalid payment record.' }, { status: 400 });
    }

    const nextStatus = parsed.data.decision === 'approve' ? 'paid' : 'failed';
    const admin = createAdminSupabaseClient();
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .update({ status: nextStatus })
      .eq('id', paymentId)
      .eq('status', 'pending')
      .select('id, member_id, amount, mode, status, date')
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: 'This payment is already reviewed or no longer exists.' }, { status: 409 });
    }

    try {
      await writeOwnerAudit('payment_reviewed', {
        actorUserId: reviewer.profile.id,
        entityType: 'payment',
        entityId: payment.id,
        details: {
          decision: parsed.data.decision,
          amount: Number(payment.amount || 0),
          paymentMode: payment.mode
        }
      });
    } catch {
      // Payment review should not fail after the status has already been updated.
    }

    return NextResponse.json({
      ok: true,
      status: nextStatus
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

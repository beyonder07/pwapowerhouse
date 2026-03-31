import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { isFutureIsoDate, isStrictIsoDate, requireAuthorizedUser } from '@/lib/server/auth-utils';
import { resolveGymBranch } from '@/lib/server/gym-location';
import { writeActivityAudit } from '@/lib/server/audit-log';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  amount: z.number().positive('Please enter the amount you paid.'),
  paymentDate: z.string()
    .refine((value) => isStrictIsoDate(value), 'Please choose a valid payment date.')
    .refine((value) => !isFutureIsoDate(value), 'Payment date cannot be in the future.'),
  paymentMode: z.enum(['cash', 'upi', 'card', 'bank-transfer', 'other']),
  branchId: z.string().trim().min(1, 'Please choose the branch where you paid.'),
  proofUrl: z.string().trim().optional(),
  note: z.string().trim().max(300).optional()
}).superRefine((value, ctx) => {
  if (value.paymentMode !== 'cash' && !value.proofUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please upload a payment screenshot for non-cash payments.' });
  }
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payment submission.' }, { status: 400 });
    }

    const branch = resolveGymBranch(parsed.data.branchId);
    if (!branch) {
      return NextResponse.json({ error: 'Please choose a valid gym branch.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id, status')
      .eq('user_id', auth.profile.id)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({ error: 'Client profile not found.' }, { status: 404 });
    }

    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .insert({
        member_id: member.id,
        amount: parsed.data.amount,
        mode: parsed.data.paymentMode,
        status: 'pending',
        date: parsed.data.paymentDate
      })
      .select('id, amount, mode, status, date')
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: paymentError?.message || 'Could not save your payment request.' }, { status: 500 });
    }

    try {
      await writeActivityAudit('payment_submitted', {
        actorUserId: auth.profile.id,
        entityType: 'payment',
        entityId: payment.id,
        details: {
          branchId: branch.id,
          branchLabel: branch.label,
          proofUrl: parsed.data.proofUrl || '',
          note: parsed.data.note || ''
        }
      });
    } catch {
      // Payment request should still be recorded even if audit persistence is temporarily unavailable.
    }

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      message: 'Payment information submitted. The owner will review it shortly.'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

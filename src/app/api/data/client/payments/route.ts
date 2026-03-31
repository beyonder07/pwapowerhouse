import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { getGymBranchesConfig } from '@/lib/server/gym-location';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

type ActivityAuditRow = {
  entity_id: string;
  details: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const admin = createAdminSupabaseClient();
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id')
      .eq('user_id', auth.profile.id)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({ error: 'Client profile not found.' }, { status: 404 });
    }

    const { data: payments, error: paymentsError } = await admin
      .from('payments')
      .select('id, amount, mode, date, status')
      .eq('member_id', member.id)
      .order('date', { ascending: false });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const paymentIds = (payments || []).map((item) => item.id);
    const { data: audits, error: auditsError } = paymentIds.length
      ? await admin
        .from('activity_audits')
        .select('entity_id, details')
        .eq('entity_type', 'payment')
        .eq('actor_user_id', auth.profile.id)
        .in('entity_id', paymentIds.map(String))
      : { data: [], error: null };

    if (auditsError) {
      return NextResponse.json({ error: auditsError.message }, { status: 500 });
    }

    const auditMap = new Map<number, ActivityAuditRow>();
    for (const audit of (audits || []) as ActivityAuditRow[]) {
      const paymentId = Number(audit.entity_id || 0);
      if (!paymentId || auditMap.has(paymentId)) {
        continue;
      }
      auditMap.set(paymentId, audit);
    }

    return NextResponse.json({
      gymBranches: getGymBranchesConfig(),
      items: (payments || []).map((item) => ({
        id: item.id,
        amount: Number(item.amount || 0),
        paymentMode: item.mode,
        date: item.date,
        status: item.status,
        branchLabel: String((auditMap.get(item.id)?.details?.branchLabel as string) || ''),
        proofUrl: String((auditMap.get(item.id)?.details?.proofUrl as string) || '')
      })),
      totalPaid: (payments || []).filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingCount: (payments || []).filter((item) => item.status === 'pending').length
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

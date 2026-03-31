import { getGymBranchesConfig } from '@/lib/server/gym-location';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { formatMonthlyFeeRange, getExpectedMonthlyCollection } from '@/lib/fee-config';

type AuditRow = {
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

function monthKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function dayKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function dayLabel(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function monthRange(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_value, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date)
    };
  });
}

function dayRange(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_value, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (count - index - 1));
    return {
      key: dayKey(date),
      label: dayLabel(date)
    };
  });
}

function buildAuditMap(rows: AuditRow[]) {
  const map = new Map<string, AuditRow>();
  for (const row of rows) {
    const key = `${row.entity_type}:${row.entity_id}`;
    if (map.has(key)) {
      continue;
    }
    map.set(key, row);
  }
  return map;
}

export async function getOwnerAnalyticsSnapshot(branchId = 'all') {
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [paymentsRes, attendanceRes, membersRes, trainersRes, usersRes, auditsRes] = await Promise.all([
    admin.from('payments').select('id, member_id, amount, mode, status, date').gte('date', sixMonthStart),
    admin.from('attendance').select('id, member_id, date, status').gte('date', thirtyDaysAgo),
    admin.from('members').select('id, user_id, trainer_id, start_date, expiry_date, status'),
    admin.from('trainers').select('id, user_id'),
    admin.from('users').select('id, name, phone'),
    admin
      .from('activity_audits')
      .select('entity_type, entity_id, details, created_at')
      .in('entity_type', ['payment', 'attendance'])
      .order('created_at', { ascending: false })
      .limit(3000)
  ]);

  const payments = paymentsRes.data || [];
  const attendance = attendanceRes.data || [];
  const members = membersRes.data || [];
  const trainers = trainersRes.data || [];
  const users = usersRes.data || [];
  const audits = (auditsRes.data || []) as AuditRow[];

  const userMap = new Map(users.map((user) => [user.id, user]));
  const auditMap = buildAuditMap(audits);
  const monthBuckets = monthRange(6);
  const dayBuckets = dayRange(30);
  const currentMonthKey = monthKey(new Date());
  const branchOptions = [
    { id: 'all', label: 'All branches' },
    ...getGymBranchesConfig().map((branch) => ({ id: branch.id, label: branch.label }))
  ];

  const scopedPayments = branchId === 'all'
    ? payments
    : payments.filter((item) => {
        const audit = auditMap.get(`payment:${item.id}`);
        return audit?.details?.branchId === branchId;
      });

  const scopedAttendance = branchId === 'all'
    ? attendance
    : attendance.filter((item) => {
        const audit = auditMap.get(`attendance:${item.id}`);
        return audit?.details?.branchId === branchId;
      });

  const scopedMemberIds = branchId === 'all'
    ? new Set(members.map((member) => member.id))
    : new Set([
        ...scopedPayments.map((item) => item.member_id),
        ...scopedAttendance.map((item) => item.member_id)
      ]);

  const scopedMembers = members.filter((member) => scopedMemberIds.has(member.id));
  const activeMembersCount = scopedMembers.filter((member) => member.status === 'active').length;
  const expectedMonthlyCollection = getExpectedMonthlyCollection(activeMembersCount);

  const revenueToday = scopedPayments
    .filter((item) => item.status === 'paid' && item.date === today)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const revenueMonth = scopedPayments
    .filter((item) => item.status === 'paid' && monthKey(item.date) === currentMonthKey)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const revenueTrend = monthBuckets.map((bucket) => ({
    label: bucket.label,
    value: scopedPayments
      .filter((item) => item.status === 'paid' && monthKey(item.date) === bucket.key)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }));

  const memberTrend = monthBuckets.map((bucket) => ({
    label: bucket.label,
    value: scopedMembers.filter((item) => monthKey(item.start_date) === bucket.key).length
  }));

  const attendanceTrend = dayBuckets.map((bucket) => ({
    label: bucket.label,
    present: scopedAttendance.filter((item) => item.date === bucket.key && item.status === 'present').length,
    absent: scopedAttendance.filter((item) => item.date === bucket.key && item.status === 'absent').length
  }));

  const paymentModeSplit = ['cash', 'upi', 'card', 'bank-transfer', 'other'].map((mode) => ({
    label: mode,
    value: scopedPayments
      .filter((item) => item.status === 'paid' && monthKey(item.date) === currentMonthKey && item.mode === mode)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }));

  const expiringSoon = scopedMembers
    .filter((member) => member.status === 'active' && member.expiry_date >= today)
    .map((member) => ({
      id: member.id,
      name: userMap.get(member.user_id)?.name || 'Member',
      phone: userMap.get(member.user_id)?.phone || '',
      expiryDate: member.expiry_date,
      daysRemaining: Math.max(0, Math.ceil((new Date(member.expiry_date).getTime() - new Date(today).getTime()) / (24 * 60 * 60 * 1000)))
    }))
    .filter((member) => member.daysRemaining < 2)
    .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate))
    .slice(0, 8);

  const membersByTrainer = new Map<number, typeof scopedMembers>();
  for (const member of scopedMembers) {
    if (!member.trainer_id) {
      continue;
    }

    const existing = membersByTrainer.get(member.trainer_id) || [];
    existing.push(member);
    membersByTrainer.set(member.trainer_id, existing);
  }

  const attendanceByMember = new Map<number, typeof scopedAttendance>();
  for (const row of scopedAttendance) {
    const existing = attendanceByMember.get(row.member_id) || [];
    existing.push(row);
    attendanceByMember.set(row.member_id, existing);
  }

  const paymentsByMember = new Map<number, typeof scopedPayments>();
  for (const payment of scopedPayments) {
    const existing = paymentsByMember.get(payment.member_id) || [];
    existing.push(payment);
    paymentsByMember.set(payment.member_id, existing);
  }

  const trainerPerformance = trainers.map((trainer) => {
    const assignedMembers = membersByTrainer.get(trainer.id) || [];
    const presentMarks = assignedMembers.reduce((sum, member) => sum + (attendanceByMember.get(member.id) || []).filter((row) => row.status === 'present').length, 0);
    const collectedRevenue = assignedMembers.reduce((sum, member) => {
      return sum + (paymentsByMember.get(member.id) || []).filter((payment) => payment.status === 'paid').reduce((inner, payment) => inner + Number(payment.amount || 0), 0);
    }, 0);

    return {
      id: trainer.id,
      name: userMap.get(trainer.user_id)?.name || 'Trainer',
      assignedMembers: assignedMembers.length,
      activeMembers: assignedMembers.filter((member) => member.status === 'active').length,
      presentMarks,
      collectedRevenue
    };
  }).filter((trainer) => trainer.assignedMembers > 0 || branchId === 'all')
    .sort((left, right) => right.collectedRevenue - left.collectedRevenue || right.presentMarks - left.presentMarks)
    .slice(0, 6);

  return {
    activeBranchId: branchId,
    branches: branchOptions,
    analytics: {
      revenueToday,
      revenueMonth,
      totalMembers: scopedMembers.length,
      activeMembers: activeMembersCount,
      trainerCount: trainers.length,
      feeBandLabel: formatMonthlyFeeRange(),
      expectedMonthlyMin: expectedMonthlyCollection.min,
      expectedMonthlyMax: expectedMonthlyCollection.max
    },
    revenueTrend,
    memberTrend,
    attendanceTrend,
    paymentModeSplit,
    expiringSoon,
    trainerPerformance
  };
}

export async function getOwnerOverviewSnapshot() {
  const admin = createAdminSupabaseClient();
  const analytics = await getOwnerAnalyticsSnapshot('all');

  const [membersRes, usersRes, paymentsRes, requestsRes] = await Promise.all([
    admin.from('members').select('id, user_id, expiry_date, status').eq('status', 'active').gte('expiry_date', new Date().toISOString().slice(0, 10)).order('expiry_date', { ascending: true }).limit(6),
    admin.from('users').select('id, role, name'),
    admin.from('payments').select('id, member_id, amount, mode, date, status').order('date', { ascending: false }).limit(6),
    admin.from('requests').select('id, type, status, created_by, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(6)
  ]);

  const users = usersRes.data || [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const paymentMemberIds = Array.from(new Set((paymentsRes.data || []).map((payment) => payment.member_id)));
  const paymentMembersRes = paymentMemberIds.length
    ? await admin.from('members').select('id, user_id').in('id', paymentMemberIds)
    : { data: [] as Array<{ id: number; user_id: string }> };
  const memberOwnerMap = new Map((paymentMembersRes.data || []).map((member) => [member.id, userMap.get(member.user_id)?.name || 'Member']));

  return {
    analytics: analytics.analytics,
    branches: analytics.branches,
    sync: {
      generatedAt: new Date().toISOString(),
      pendingRequests: requestsRes.data?.length || 0
    },
    expiringMembers: (membersRes.data || []).map((member) => ({
      id: member.id,
      name: userMap.get(member.user_id)?.name || 'Member',
      expiryDate: member.expiry_date,
      status: member.status
    })),
    recentPayments: (paymentsRes.data || []).map((payment) => ({
      id: payment.id,
      memberName: memberOwnerMap.get(payment.member_id) || 'Member',
      amount: Number(payment.amount || 0),
      date: payment.date,
      paymentMode: payment.mode,
      status: payment.status
    })),
    pendingApprovals: (requestsRes.data || []).map((request) => ({
      _id: request.id,
      type: request.type,
      createdAt: request.created_at,
      createdByRole: request.created_by ? (userMap.get(request.created_by)?.role || 'trainer') : 'public'
    }))
  };
}

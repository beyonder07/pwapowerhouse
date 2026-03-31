import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { ListQuery } from '@/lib/server/list-utils';

type UserRow = {
  id: string;
  role: 'owner' | 'trainer' | 'client';
  name: string;
  phone: string;
  email: string;
};

type MemberRow = {
  id: number;
  user_id: string;
  trainer_id: number | null;
  govt_id: string;
  profile_photo_url: string | null;
  membership_plan: string;
  start_date: string;
  expiry_date: string;
  status: string;
};

type TrainerRow = {
  id: number;
  user_id: string;
  govt_id: string | null;
  profile_photo_url: string | null;
  salary: number | string | null;
  created_at: string;
};

type PaymentRow = {
  id: number;
  member_id: number;
  amount: number | string;
  mode: string;
  status: string;
  date: string;
};

type ActivityAuditRow = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AttendanceRow = {
  id: number;
  member_id: number;
  date: string;
  status: string;
  check_in_time: string;
};

type RequestRow = {
  id: string;
  type: string;
  status: string;
  created_by: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  data: Record<string, unknown> | null;
};

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asNumeric(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function buildPagedMeta(totalCount: number, filteredCount: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  return {
    totalCount,
    filteredCount,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages
  };
}

async function fetchUserIdsBySearch(search: string, role?: UserRow['role']) {
  const admin = createAdminSupabaseClient();
  const term = sanitizeSearchTerm(search);
  const phoneTerm = digitsOnly(search);
  const filters: string[] = [];

  if (term) {
    filters.push(`name.ilike.%${term}%`, `email.ilike.%${term}%`);
  }
  if (phoneTerm) {
    filters.push(`phone.ilike.%${phoneTerm}%`);
  }
  if (filters.length === 0) {
    return [];
  }

  let query = admin.from('users').select('id').limit(1000);
  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query.or(filters.join(','));
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => row.id as string);
}

async function fetchUsersByIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, UserRow>();
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('users')
    .select('id, role, name, phone, email')
    .in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data || []).map((row) => [row.id as string, row as UserRow]));
}

async function fetchMembersByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('members')
    .select('id, user_id')
    .in('user_id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function countRows(table: string) {
  const admin = createAdminSupabaseClient();
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(error.message);
  }
  return count || 0;
}

export async function getOwnerMembersList(params: ListQuery) {
  const admin = createAdminSupabaseClient();
  const totalCount = await countRows('members');
  const search = params.query.trim();
  const sanitized = sanitizeSearchTerm(search);
  const matchedUserIds = search ? await fetchUserIdsBySearch(search, 'client') : [];

  const filters: string[] = [];
  if (matchedUserIds.length > 0) {
    filters.push(`user_id.in.(${matchedUserIds.join(',')})`);
  }
  if (sanitized) {
    filters.push(
      `govt_id.ilike.%${sanitized}%`,
      `membership_plan.ilike.%${sanitized}%`,
      `status.ilike.%${sanitized}%`
    );
  }
  if (isIsoDate(search)) {
    filters.push(`start_date.eq.${search}`, `expiry_date.eq.${search}`);
  }

  if (search && filters.length === 0) {
    return {
      items: [],
      ...buildPagedMeta(totalCount, 0, params.page, params.pageSize)
    };
  }

  let filteredCount = totalCount;
  if (filters.length > 0) {
    const { count, error: countError } = await admin.from('members').select('id', { count: 'exact', head: true }).or(filters.join(','));
    if (countError) {
      throw new Error(countError.message);
    }
    filteredCount = count || 0;
  }

  const meta = buildPagedMeta(totalCount, filteredCount, params.page, params.pageSize);
  const { from, to } = toRange(meta.page, meta.pageSize);

  let dataQuery = admin
    .from('members')
    .select('id, user_id, trainer_id, govt_id, profile_photo_url, membership_plan, start_date, expiry_date, status')
    .order('id', { ascending: false })
    .range(from, to);

  if (filters.length > 0) {
    dataQuery = dataQuery.or(filters.join(','));
  }

  const { data: rows, error: rowsError } = await dataQuery;
  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const members = (rows || []) as MemberRow[];
  const memberIds = members.map((row) => row.id);

  const [userMap, paymentsRes, attendanceRes] = await Promise.all([
    fetchUsersByIds(members.map((row) => row.user_id)),
    memberIds.length
      ? admin.from('payments').select('id, member_id, amount').in('member_id', memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin.from('attendance').select('id, member_id').in('member_id', memberIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (paymentsRes.error) {
    throw new Error(paymentsRes.error.message);
  }
  if (attendanceRes.error) {
    throw new Error(attendanceRes.error.message);
  }

  const paymentsByMember = new Map<number, Array<{ id: number; amount: number }>>();
  for (const payment of paymentsRes.data || []) {
    const existing = paymentsByMember.get(payment.member_id as number) || [];
    existing.push({ id: payment.id as number, amount: Number(payment.amount || 0) });
    paymentsByMember.set(payment.member_id as number, existing);
  }

  const attendanceByMember = new Map<number, Array<{ id: number }>>();
  for (const attendance of attendanceRes.data || []) {
    const existing = attendanceByMember.get(attendance.member_id as number) || [];
    existing.push({ id: attendance.id as number });
    attendanceByMember.set(attendance.member_id as number, existing);
  }

  return {
    items: members.map((member) => {
      const user = userMap.get(member.user_id);
      return {
        id: member.id,
        name: user?.name || 'Unknown member',
        phone: user?.phone || '',
        email: user?.email || '',
        governmentId: member.govt_id || '',
        governmentIdVerified: Boolean(member.govt_id),
        profilePhotoUrl: member.profile_photo_url || '',
        planType: member.membership_plan || '',
        joinDate: member.start_date || '',
        expiryDate: member.expiry_date || '',
        status: member.status || 'inactive',
        payments: paymentsByMember.get(member.id) || [],
        attendance: attendanceByMember.get(member.id) || []
      };
    }),
    ...meta
  };
}

export async function getOwnerTrainersList(params: ListQuery) {
  const admin = createAdminSupabaseClient();
  const totalCount = await countRows('trainers');
  const search = params.query.trim();
  const sanitized = sanitizeSearchTerm(search);
  const matchedUserIds = search ? await fetchUserIdsBySearch(search, 'trainer') : [];
  const numericSearch = asNumeric(search);

  const filters: string[] = [];
  if (matchedUserIds.length > 0) {
    filters.push(`user_id.in.(${matchedUserIds.join(',')})`);
  }
  if (sanitized) {
    filters.push(`govt_id.ilike.%${sanitized}%`);
  }
  if (numericSearch !== null) {
    filters.push(`salary.eq.${numericSearch}`);
  }

  if (search && filters.length === 0) {
    return {
      items: [],
      ...buildPagedMeta(totalCount, 0, params.page, params.pageSize)
    };
  }

  let filteredCount = totalCount;
  if (filters.length > 0) {
    const { count, error: countError } = await admin.from('trainers').select('id', { count: 'exact', head: true }).or(filters.join(','));
    if (countError) {
      throw new Error(countError.message);
    }
    filteredCount = count || 0;
  }

  const meta = buildPagedMeta(totalCount, filteredCount, params.page, params.pageSize);
  const { from, to } = toRange(meta.page, meta.pageSize);

  let dataQuery = admin
    .from('trainers')
    .select('id, user_id, govt_id, profile_photo_url, salary, created_at')
    .order('id', { ascending: false })
    .range(from, to);
  if (filters.length > 0) {
    dataQuery = dataQuery.or(filters.join(','));
  }

  const { data: rows, error: rowsError } = await dataQuery;
  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const trainers = (rows || []) as TrainerRow[];
  const trainerIds = trainers.map((row) => row.id);
  const [userMap, attendanceRes] = await Promise.all([
    fetchUsersByIds(trainers.map((row) => row.user_id)),
    trainerIds.length
      ? admin.from('trainer_attendance').select('id, trainer_id').in('trainer_id', trainerIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (attendanceRes.error) {
    throw new Error(attendanceRes.error.message);
  }

  const attendanceByTrainer = new Map<number, Array<{ id: number }>>();
  for (const attendance of attendanceRes.data || []) {
    const existing = attendanceByTrainer.get(attendance.trainer_id as number) || [];
    existing.push({ id: attendance.id as number });
    attendanceByTrainer.set(attendance.trainer_id as number, existing);
  }

  return {
    items: trainers.map((trainer) => {
      const user = userMap.get(trainer.user_id);
      return {
        id: trainer.id,
        name: user?.name || 'Unknown trainer',
        phone: user?.phone || '',
        email: user?.email || '',
        governmentId: trainer.govt_id || '',
        governmentIdVerified: Boolean(trainer.govt_id),
        profilePhotoUrl: trainer.profile_photo_url || '',
        baseSalary: Number(trainer.salary || 0),
        status: 'active',
        salaryLog: [
          {
            month: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            amount: Number(trainer.salary || 0),
            status: 'pending'
          }
        ],
        attendance: attendanceByTrainer.get(trainer.id) || []
      };
    }),
    ...meta
  };
}

export async function getOwnerPaymentsList(params: ListQuery) {
  const admin = createAdminSupabaseClient();
  const totalCount = await countRows('payments');
  const { count: pendingPaymentsCount, error: pendingCountError } = await admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (pendingCountError) {
    throw new Error(pendingCountError.message);
  }

  const pendingCount = pendingPaymentsCount || 0;
  const search = params.query.trim();
  const sanitized = sanitizeSearchTerm(search);
  const numericSearch = asNumeric(search);
  const matchedUserIds = search ? await fetchUserIdsBySearch(search, 'client') : [];
  const matchedMembers = matchedUserIds.length > 0 ? await fetchMembersByUserIds(matchedUserIds) : [];

  const filters: string[] = [];
  if (matchedMembers.length > 0) {
    filters.push(`member_id.in.(${matchedMembers.map((row) => row.id).join(',')})`);
  }
  if (sanitized) {
    filters.push(`mode.ilike.%${sanitized}%`, `status.ilike.%${sanitized}%`);
  }
  if (isIsoDate(search)) {
    filters.push(`date.eq.${search}`);
  }
  if (numericSearch !== null) {
    filters.push(`amount.eq.${numericSearch}`);
  }

  if (search && filters.length === 0) {
    return {
      items: [],
      totalsByMode: [],
      totalCollected: 0,
      pendingCount,
      ...buildPagedMeta(totalCount, 0, params.page, params.pageSize)
    };
  }

  let filteredCount = totalCount;
  if (filters.length > 0) {
    const { count, error: countError } = await admin.from('payments').select('id', { count: 'exact', head: true }).or(filters.join(','));
    if (countError) {
      throw new Error(countError.message);
    }
    filteredCount = count || 0;
  }

  const meta = buildPagedMeta(totalCount, filteredCount, params.page, params.pageSize);
  const { from, to } = toRange(meta.page, meta.pageSize);

  let dataQuery = admin
    .from('payments')
    .select('id, member_id, amount, mode, status, date')
    .order('date', { ascending: false })
    .range(from, to);
  if (filters.length > 0) {
    dataQuery = dataQuery.or(filters.join(','));
  }

  const { data: rows, error: rowsError } = await dataQuery;
  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const payments = (rows || []) as PaymentRow[];

  const paymentAuditRes = payments.length
    ? await admin
      .from('activity_audits')
      .select('id, entity_type, entity_id, action, details, created_at')
      .eq('entity_type', 'payment')
      .in('entity_id', payments.map((row) => String(row.id)))
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (paymentAuditRes.error) {
    throw new Error(paymentAuditRes.error.message);
  }

  const paymentAuditMap = new Map<number, ActivityAuditRow>();
  for (const audit of (paymentAuditRes.data || []) as ActivityAuditRow[]) {
    const paymentId = Number(audit.entity_id || 0);
    if (!paymentId || paymentAuditMap.has(paymentId)) {
      continue;
    }
    paymentAuditMap.set(paymentId, audit);
  }

  const nestedPaymentsRes = payments.length
    ? await admin
      .from('payments')
      .select('id, amount, mode, status, date, member:members(id, user:users(name))')
      .in('id', payments.map((row) => row.id))
      .order('date', { ascending: false })
    : { data: [], error: null };

  if (nestedPaymentsRes.error) {
    throw new Error(nestedPaymentsRes.error.message);
  }

  let totalsByMode: Array<{ mode: string; total: number }> = [];
  let totalCollected = 0;
  const today = new Date().toISOString().slice(0, 10);
  const revenueByMode = await admin.rpc('analytics_revenue_by_mode', {
    p_from: '2000-01-01',
    p_to: today
  });

  if (!revenueByMode.error && Array.isArray(revenueByMode.data)) {
    totalsByMode = revenueByMode.data.map((row) => ({
      mode: String((row as { payment_mode?: string }).payment_mode || 'other'),
      total: Number((row as { paid_total?: number | string }).paid_total || 0)
    })).filter((row) => row.total > 0);
    totalCollected = totalsByMode.reduce((sum, row) => sum + row.total, 0);
  } else {
    const fallbackSummary = await admin
      .from('payments')
      .select('mode, amount')
      .eq('status', 'paid');

    if (fallbackSummary.error) {
      throw new Error(fallbackSummary.error.message);
    }

    const totalsByModeMap = new Map<string, number>();
    for (const payment of fallbackSummary.data || []) {
      const numericAmount = Number(payment.amount || 0);
      totalsByModeMap.set(payment.mode as string, (totalsByModeMap.get(payment.mode as string) || 0) + numericAmount);
      totalCollected += numericAmount;
    }
    totalsByMode = Array.from(totalsByModeMap.entries()).map(([mode, total]) => ({ mode, total })).sort((left, right) => right.total - left.total);
  }

  return {
    items: (nestedPaymentsRes.data || []).map((payment) => ({
      id: Number(payment.id || 0),
      memberName: ((payment.member as { user?: { name?: string } | Array<{ name?: string }> } | null)?.user as { name?: string } | Array<{ name?: string }> | undefined)
        ? Array.isArray((payment.member as { user?: Array<{ name?: string }> }).user)
          ? (payment.member as { user?: Array<{ name?: string }> }).user?.[0]?.name || 'Unknown member'
          : ((payment.member as { user?: { name?: string } }).user?.name || 'Unknown member')
        : 'Unknown member',
      amount: Number(payment.amount || 0),
      paymentMode: String(payment.mode || ''),
      date: String(payment.date || ''),
      status: String(payment.status || ''),
      branchLabel: String((paymentAuditMap.get(Number(payment.id || 0))?.details?.branchLabel as string) || ''),
      proofUrl: String((paymentAuditMap.get(Number(payment.id || 0))?.details?.proofUrl as string) || ''),
      note: String((paymentAuditMap.get(Number(payment.id || 0))?.details?.note as string) || '')
    })),
    totalsByMode,
    totalCollected,
    pendingCount,
    ...meta
  };
}

export async function getOwnerAttendanceList(params: ListQuery) {
  const admin = createAdminSupabaseClient();
  const totalCount = await countRows('attendance');
  const search = params.query.trim();
  const sanitized = sanitizeSearchTerm(search);
  const numericSearch = asNumeric(search);
  const matchedUserIds = search ? await fetchUserIdsBySearch(search, 'client') : [];
  const matchedMembers = matchedUserIds.length > 0 ? await fetchMembersByUserIds(matchedUserIds) : [];

  const filters: string[] = [];
  if (matchedMembers.length > 0) {
    filters.push(`member_id.in.(${matchedMembers.map((row) => row.id).join(',')})`);
  }
  if (sanitized) {
    filters.push(`status.ilike.%${sanitized}%`);
  }
  if (isIsoDate(search)) {
    filters.push(`date.eq.${search}`);
  }
  if (numericSearch !== null) {
    filters.push(`member_id.eq.${numericSearch}`);
  }

  if (search && filters.length === 0) {
    return {
      items: [],
      memberOptions: [],
      ...buildPagedMeta(totalCount, 0, params.page, params.pageSize)
    };
  }

  let filteredCount = totalCount;
  if (filters.length > 0) {
    const { count, error: countError } = await admin.from('attendance').select('id', { count: 'exact', head: true }).or(filters.join(','));
    if (countError) {
      throw new Error(countError.message);
    }
    filteredCount = count || 0;
  }

  const meta = buildPagedMeta(totalCount, filteredCount, params.page, params.pageSize);
  const { from, to } = toRange(meta.page, meta.pageSize);

  let dataQuery = admin
    .from('attendance')
    .select('id, member_id, date, status, check_in_time')
    .order('date', { ascending: false })
    .range(from, to);
  if (filters.length > 0) {
    dataQuery = dataQuery.or(filters.join(','));
  }

  const { data: rows, error: rowsError } = await dataQuery;
  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const attendanceRows = (rows || []) as AttendanceRow[];
  const pageMemberIds = Array.from(new Set(attendanceRows.map((row) => row.member_id)));
  const pageMembersRes = pageMemberIds.length
    ? await admin.from('members').select('id, user_id').in('id', pageMemberIds)
    : { data: [], error: null };
  if (pageMembersRes.error) {
    throw new Error(pageMembersRes.error.message);
  }
  const memberUserMap = new Map((pageMembersRes.data || []).map((row) => [row.id as number, row.user_id as string]));
  const userMap = await fetchUsersByIds(Array.from(new Set((pageMembersRes.data || []).map((row) => row.user_id as string))));

  const allMembersRes = await admin.from('members').select('id, user_id').order('id', { ascending: false }).limit(1000);
  if (allMembersRes.error) {
    throw new Error(allMembersRes.error.message);
  }
  const memberOptionUsers = await fetchUsersByIds(Array.from(new Set((allMembersRes.data || []).map((row) => row.user_id as string))));
  const memberOptions = (allMembersRes.data || []).map((row) => ({
    id: row.id as number,
    name: memberOptionUsers.get(row.user_id as string)?.name || `Member ${row.id}`
  })).sort((left, right) => left.name.localeCompare(right.name));

  return {
    items: attendanceRows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: userMap.get(memberUserMap.get(row.member_id) || '')?.name || `Member ${row.member_id}`,
      date: row.date,
      checkInTime: row.check_in_time,
      status: row.status
    })),
    memberOptions,
    ...meta
  };
}

export async function getOwnerRequestsList(params: ListQuery) {
  const admin = createAdminSupabaseClient();
  const totalCount = await countRows('requests');
  const search = params.query.trim();
  const sanitized = sanitizeSearchTerm(search);
  const phoneTerm = digitsOnly(search);
  const matchedCreatorIds = search ? await fetchUserIdsBySearch(search) : [];

  const filters: string[] = [];
  if (sanitized) {
    filters.push(
      `type.ilike.%${sanitized}%`,
      `status.ilike.%${sanitized}%`,
      `review_note.ilike.%${sanitized}%`,
      `data->>fullName.ilike.%${sanitized}%`,
      `data->>email.ilike.%${sanitized}%`,
      `data->>notes.ilike.%${sanitized}%`
    );
  }
  if (phoneTerm) {
    filters.push(`data->>phone.ilike.%${phoneTerm}%`);
  }
  if (matchedCreatorIds.length > 0) {
    filters.push(`created_by.in.(${matchedCreatorIds.join(',')})`);
  }

  let filteredCount = totalCount;
  if (search && filters.length === 0) {
    filteredCount = 0;
  } else if (filters.length > 0) {
    const { count, error } = await admin.from('requests').select('id', { count: 'exact', head: true }).or(filters.join(','));
    if (error) {
      throw new Error(error.message);
    }
    filteredCount = count || 0;
  }

  const meta = buildPagedMeta(totalCount, filteredCount, params.page, params.pageSize);
  const { from, to } = toRange(meta.page, meta.pageSize);

  if (filteredCount === 0) {
    const [pending, approved, rejected] = await Promise.all([
      admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
    ]);

    return {
      items: [],
      pendingCount: pending.count || 0,
      approvedCount: approved.count || 0,
      rejectedCount: rejected.count || 0,
      ...meta
    };
  }

  let dataQuery = admin
    .from('requests')
    .select('id, type, status, created_by, review_note, reviewed_by, reviewed_at, created_at, data')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.length > 0) {
    dataQuery = dataQuery.or(filters.join(','));
  }

  const [{ data, error }, pending, approved, rejected] = await Promise.all([
    dataQuery,
    admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const requestRows = (data || []) as RequestRow[];
  const creatorMap = await fetchUsersByIds(Array.from(new Set(requestRows.map((item) => item.created_by).filter(Boolean) as string[])));

  return {
    items: requestRows.map((item) => ({
      _id: item.id,
      type: item.type,
      status: item.status,
      createdAt: item.created_at,
      createdByRole: item.created_by
        ? creatorMap.get(item.created_by)?.role || 'trainer'
        : 'public',
      data: item.data || {},
      reviewNote: item.review_note || undefined
    })),
    pendingCount: pending.count || 0,
    approvedCount: approved.count || 0,
    rejectedCount: rejected.count || 0,
    ...meta
  };
}

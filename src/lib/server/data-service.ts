import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function monthKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getClientProfileBundle(userId: string) {
  const admin = createAdminSupabaseClient();

  const [{ data: user }, { data: member }] = await Promise.all([
    admin.from('users').select('id, name, phone, email').eq('id', userId).single(),
    admin.from('members').select('id, trainer_id, govt_id, profile_photo_url, membership_plan, start_date, expiry_date, status, workout_plan').eq('user_id', userId).maybeSingle()
  ]);

  if (!user || !member) {
    return null;
  }

  const trainer = member.trainer_id
    ? await admin.from('trainers').select('id, profile_photo_url, user:users(name)').eq('id', member.trainer_id).single()
    : { data: null };

  const attendanceResult = await admin
    .from('attendance')
    .select('id, date, status, check_in_time')
    .eq('member_id', member.id)
    .order('date', { ascending: false });

  const paymentsResult = await admin
    .from('payments')
    .select('id, amount, mode, status, date')
    .eq('member_id', member.id)
    .order('date', { ascending: false });

  const attendance = attendanceResult.data || [];
  const payments = paymentsResult.data || [];
  const thisMonth = monthKey(new Date());
  const attendanceThisMonth = attendance.filter((item) => monthKey(item.date) === thisMonth);

  return {
    user,
    member,
    trainer: trainer.data,
    attendance,
    payments,
    attendanceThisMonth
  };
}

export async function getTrainerProfileBundle(userId: string) {
  const admin = createAdminSupabaseClient();

  const [{ data: user }, { data: trainer }] = await Promise.all([
    admin.from('users').select('id, name, phone, email').eq('id', userId).single(),
    admin.from('trainers').select('id, govt_id, profile_photo_url, salary').eq('user_id', userId).maybeSingle()
  ]);

  if (!user || !trainer) {
    return null;
  }

  const [{ data: members }, { data: trainerAttendance }, { data: requests }] = await Promise.all([
    admin.from('members').select('id, profile_photo_url, membership_plan, expiry_date, status, workout_plan, user:users(name)').eq('trainer_id', trainer.id),
    admin.from('trainer_attendance').select('id, date, check_in_time').eq('trainer_id', trainer.id).order('date', { ascending: false }),
    admin.from('requests').select('id, type, status, created_at, review_note, data').eq('created_by', userId).order('created_at', { ascending: false })
  ]);

  const memberIds = (members || []).map((item) => item.id);
  const attendance = memberIds.length > 0
    ? await admin.from('attendance').select('id, member_id, date, status, check_in_time').in('member_id', memberIds).order('date', { ascending: false })
    : { data: [] as Array<Record<string, unknown>> };

  return {
    user,
    trainer,
    members: members || [],
    trainerAttendance: trainerAttendance || [],
    requests: requests || [],
    memberAttendance: attendance.data || []
  };
}

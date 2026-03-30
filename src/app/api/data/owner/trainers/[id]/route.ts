import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { normalizePhone, requireAuthorizedUser } from '@/lib/server/auth-utils';
import { writeOwnerAudit } from '@/lib/server/audit-log';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { cleanupReplacedProfileImage } from '@/lib/server/storage-cleanup';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.email(),
  governmentId: z.string().min(4),
  profilePhotoUrl: z.string().min(10),
  baseSalary: z.number().min(0)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  let auth;
  try {
    auth = await requireAuthorizedUser(request, ['owner']);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid trainer update payload.' }, { status: 400 });
  }

  const { id } = await params;
  const trainerId = Number(id);
  if (!Number.isFinite(trainerId) || trainerId <= 0) {
    return NextResponse.json({ error: 'Invalid trainer id.' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: trainerRecord, error: trainerFetchError } = await admin
    .from('trainers')
    .select('id, user_id, profile_photo_url')
    .eq('id', trainerId)
    .maybeSingle();

  if (trainerFetchError || !trainerRecord) {
    return NextResponse.json({ error: 'Trainer not found.' }, { status: 404 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(parsed.data.phone);

  const { data: conflictingUsers, error: conflictError } = await admin
    .from('users')
    .select('id')
    .or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone}`)
    .neq('id', trainerRecord.user_id)
    .limit(1);

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 500 });
  }

  if (conflictingUsers && conflictingUsers.length > 0) {
    return NextResponse.json({ error: 'Another user already uses this phone number or email.' }, { status: 409 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(trainerRecord.user_id);

  const { error: authError } = await admin.auth.admin.updateUserById(trainerRecord.user_id, {
    email: normalizedEmail,
    phone: normalizedPhone || undefined,
    user_metadata: {
      ...(authUser.user?.user_metadata || {}),
      name: parsed.data.name,
      role: 'trainer'
    }
  });

  if (authError) {
    return NextResponse.json({ error: authError.message || 'Could not update trainer auth profile.' }, { status: 500 });
  }

  const { error: userError } = await admin
    .from('users')
    .update({
      name: parsed.data.name,
      phone: normalizedPhone,
      email: normalizedEmail
    })
    .eq('id', trainerRecord.user_id);

  if (userError) {
    return NextResponse.json({ error: userError.message || 'Could not update trainer profile.' }, { status: 500 });
  }

  const { error: trainerError } = await admin
    .from('trainers')
    .update({
      govt_id: parsed.data.governmentId,
      profile_photo_url: parsed.data.profilePhotoUrl,
      salary: parsed.data.baseSalary
    })
    .eq('id', trainerId);

  if (trainerError) {
    return NextResponse.json({ error: trainerError.message || 'Could not update trainer details.' }, { status: 500 });
  }

  try {
    await cleanupReplacedProfileImage(trainerRecord.profile_photo_url, parsed.data.profilePhotoUrl);
  } catch {
    // Keep the successful trainer update even if old photo cleanup is temporarily unavailable.
  }

  try {
    await writeOwnerAudit(`trainer_updated:${trainerId}:by:${auth.profile.id}`, {
      actorUserId: auth.profile.id,
      entityType: 'trainer',
      entityId: trainerId,
      details: {
        baseSalary: parsed.data.baseSalary
      }
    });
  } catch {
    // The trainer update has already succeeded. Do not surface an audit-only failure.
  }

  return NextResponse.json({ ok: true });
}

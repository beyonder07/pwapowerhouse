import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getClientProfileBundle } from '@/lib/server/data-service';
import { normalizePhone, requireAuthorizedUser } from '@/lib/server/auth-utils';
import { cleanupReplacedProfileImage } from '@/lib/server/storage-cleanup';

const schema = z.object({
  displayName: z.string().min(2),
  phone: z.string().min(8),
  profilePhotoUrl: z.string().min(1)
});

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const bundle = await getClientProfileBundle(auth.profile.id);
    if (!bundle) {
      return NextResponse.json({ error: 'Client profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        name: bundle.user.name,
        phone: bundle.user.phone,
        email: bundle.user.email,
        governmentId: bundle.member.govt_id,
        governmentIdVerified: Boolean(bundle.member.govt_id),
        profilePhotoUrl: bundle.member.profile_photo_url || '',
        verifiedIdLocked: true
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile payload.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    await admin.from('users').update({
      name: parsed.data.displayName,
      phone: normalizePhone(parsed.data.phone)
    }).eq('id', auth.profile.id);

    const bundle = await getClientProfileBundle(auth.profile.id);

    await admin.from('members').update({
      profile_photo_url: parsed.data.profilePhotoUrl
    }).eq('user_id', auth.profile.id);

    try {
      await cleanupReplacedProfileImage(bundle?.member.profile_photo_url, parsed.data.profilePhotoUrl);
    } catch {
      // Keep the successful profile update even if old photo cleanup is temporarily unavailable.
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

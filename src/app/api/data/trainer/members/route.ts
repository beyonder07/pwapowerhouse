import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getTrainerProfileBundle } from '@/lib/server/data-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    const auth = await requireAuthorizedUser(request, ['trainer']);
    const bundle = await getTrainerProfileBundle(auth.profile.id);
    if (!bundle) {
      return NextResponse.json({ error: 'Trainer profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      items: bundle.members.map((member) => ({
        id: member.id,
        name: (member.user as { name?: string })?.name || 'Member',
        profilePhotoUrl: member.profile_photo_url || '',
        membershipStatus: member.status,
        expiryDate: member.expiry_date
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}


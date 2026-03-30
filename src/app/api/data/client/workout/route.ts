import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getClientProfileBundle } from '@/lib/server/data-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

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
      workoutPlan: bundle.member.workout_plan || null,
      assignedTrainer: bundle.trainer ? {
        id: bundle.trainer.id,
        name: (bundle.trainer.user as { name?: string })?.name || 'Assigned trainer',
        profilePhotoUrl: bundle.trainer.profile_photo_url || ''
      } : null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}


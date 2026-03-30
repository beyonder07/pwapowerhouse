import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser, type AppRole } from '@/lib/server/auth-utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const CATEGORY_RULES: Record<string, { folder: string; roles?: AppRole[] }> = {
  'signup-client': { folder: 'requests/clients' },
  'signup-trainer': { folder: 'requests/trainers' },
  'member-record': { folder: 'records/members', roles: ['owner'] },
  'trainer-record': { folder: 'records/trainers', roles: ['owner'] },
  'trainer-member-request': { folder: 'requests/members', roles: ['trainer'] },
  'profile-client': { folder: 'profiles/clients', roles: ['client'] },
  'profile-trainer': { folder: 'profiles/trainers', roles: ['trainer'] },
  'profile-owner': { folder: 'profiles/owners', roles: ['owner'] }
};

function safeExtension(file: File) {
  const rawName = file.name || '';
  const dotIndex = rawName.lastIndexOf('.');
  const fromName = dotIndex >= 0 ? rawName.slice(dotIndex + 1).toLowerCase() : '';

  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fromName)) {
    return fromName;
  }

  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Image upload payload is missing.' }, { status: 400 });
  }

  const category = String(formData.get('category') || '');
  const rule = CATEGORY_RULES[category];
  if (!rule) {
    return NextResponse.json({ error: 'Invalid upload category.' }, { status: 400 });
  }

  let authContext: Awaited<ReturnType<typeof requireAuthorizedUser>> | null = null;
  if (rule.roles?.length) {
    try {
      authContext = await requireAuthorizedUser(request, rule.roles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 });
    }
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image file was provided.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, HEIC, or HEIF images are allowed.' }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image is too large. Please choose one under 2MB.' }, { status: 400 });
  }

  const extension = safeExtension(file);
  const date = new Date();
  const dateFolder = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const actorSegment = authContext?.profile.id || 'public';
  const path = `${rule.folder}/${actorSegment}/${dateFolder}/${randomUUID()}.${extension}`;
  const supabase = createAdminSupabaseClient();
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('profile-images')
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || 'Could not upload image.' }, { status: 500 });
  }

  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);

  return NextResponse.json({
    publicUrl: data.publicUrl,
    path
  });
}

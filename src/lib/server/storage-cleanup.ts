import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const PUBLIC_PROFILE_BUCKET = 'profile-images';

function extractProfileImagePath(publicUrl: string) {
  if (!publicUrl) {
    return null;
  }

  try {
    const parsed = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${PUBLIC_PROFILE_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export async function cleanupReplacedProfileImage(previousUrl?: string | null, nextUrl?: string | null) {
  if (!previousUrl || previousUrl === nextUrl) {
    return;
  }

  const previousPath = extractProfileImagePath(previousUrl);
  if (!previousPath) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  await supabase.storage.from(PUBLIC_PROFILE_BUCKET).remove([previousPath]);
}


import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { writeOwnerAudit } from '@/lib/server/audit-log';
import { provisionManagedUser } from '@/lib/server/user-provisioning';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  email: z.email(),
  governmentId: z.string().min(4),
  profilePhotoUrl: z.string().min(10),
  planPreference: z.string().optional()
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const owner = await requireAuthorizedUser(request, ['owner']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid member payload.' }, { status: 400 });
    }

    const createdUser = await provisionManagedUser({
      role: 'client',
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      governmentId: parsed.data.governmentId,
      profilePhotoUrl: parsed.data.profilePhotoUrl,
      planPreference: parsed.data.planPreference
    });

    try {
      await writeOwnerAudit('member_created_direct', {
        actorUserId: owner.profile.id,
        entityType: 'member',
        entityId: createdUser.memberId || createdUser.userId,
        details: {
          userId: createdUser.userId,
          name: parsed.data.fullName,
          email: parsed.data.email.trim().toLowerCase(),
          phone: parsed.data.phone,
          planPreference: parsed.data.planPreference || 'Standard'
        }
      });
    } catch {
      // Creation should still succeed even if the audit sink has a temporary issue.
    }

    return NextResponse.json({
      ok: true,
      createdUser: {
        userId: createdUser.userId,
        memberId: createdUser.memberId
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = /already exists/i.test(message) ? 409 : /Unauthorized|Forbidden/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

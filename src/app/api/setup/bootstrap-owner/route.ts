import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { normalizePhone } from '@/lib/server/auth-utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const bootstrapSchema = z.object({
  name: z.string().min(2, 'Owner name is required.'),
  phone: z.string().min(8, 'Phone number is required.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  setupCode: z.string().optional()
});

async function ownerExists() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('users')
    .select('id')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ready: false,
      supabaseConfigured: false,
      ownerExists: false,
      requiresSetupCode: false
    });
  }

  try {
    const exists = await ownerExists();

    return NextResponse.json({
      ready: !exists,
      supabaseConfigured: true,
      ownerExists: exists,
      requiresSetupCode: Boolean(process.env.OWNER_BOOTSTRAP_TOKEN)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not check owner setup state.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bootstrapSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid owner setup payload.' }, { status: 400 });
  }

  const expectedSetupCode = process.env.OWNER_BOOTSTRAP_TOKEN;
  if (expectedSetupCode && parsed.data.setupCode !== expectedSetupCode) {
    return NextResponse.json({ error: 'Setup code is invalid.' }, { status: 403 });
  }

  try {
    if (await ownerExists()) {
      return NextResponse.json({ error: 'Owner account is already set up.' }, { status: 409 });
    }

    const admin = createAdminSupabaseClient();
    const normalizedPhone = normalizePhone(parsed.data.phone);
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const { data: authResult, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.data.name.trim(),
        role: 'owner'
      }
    });

    if (authError || !authResult.user) {
      return NextResponse.json({ error: authError?.message || 'Could not create owner account.' }, { status: 400 });
    }

    const { error: profileError } = await admin.from('users').insert({
      id: authResult.user.id,
      role: 'owner',
      name: parsed.data.name.trim(),
      phone: normalizedPhone,
      email: normalizedEmail
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authResult.user.id);
      return NextResponse.json({ error: profileError.message || 'Could not save owner profile.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      ownerId: authResult.user.id
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Owner setup failed.' },
      { status: 500 }
    );
  }
}

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session';

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6)
});

export const requestSchema = z.object({
  type: z.enum(['client', 'trainer', 'member', 'workout-plan', 'trainer-attendance']),
  data: z.record(z.string(), z.unknown())
}).superRefine((value, ctx) => {
  const data = value.data as Record<string, unknown>;

  if (value.type === 'client' || value.type === 'trainer' || value.type === 'member') {
    const parsed = z.object({
      fullName: z.string().min(2),
      phone: z.string().min(8),
      email: z.email(),
      governmentId: z.string().min(4),
      profilePhotoUrl: z.string().min(10),
      planPreference: z.string().optional(),
      experience: z.string().optional(),
      notes: z.string().optional(),
      gymId: z.string().optional()
    }).safeParse(data);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error.issues[0]?.message || 'Invalid request payload.' });
    }
  }

  if (value.type === 'workout-plan') {
    const parsed = z.object({
      memberId: z.number().int().positive(),
      workoutPlan: z.object({
        name: z.string().min(1),
        exercises: z.array(z.string().trim().min(1)).min(1, 'Add at least one exercise.')
      })
    }).safeParse(data);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error.issues[0]?.message || 'Invalid workout plan request.' });
    }
  }

  if (value.type === 'trainer-attendance') {
    const parsed = z.object({
      date: z.string().refine((date) => isStrictIsoDate(date), 'Date must be in YYYY-MM-DD format.')
        .refine((date) => !isFutureIsoDate(date), 'Future attendance is not allowed.'),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracyMeters: z.number().min(0).max(5000).optional()
    }).safeParse(data);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error.issues[0]?.message || 'Invalid trainer attendance request.' });
    }
  }
});

export const forgotPasswordSchema = z.object({
  role: z.enum(['owner', 'trainer', 'client']),
  phone: z.string().optional(),
  email: z.email().optional()
}).superRefine((value, ctx) => {
  if (value.role === 'owner' && !value.phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Owner must reset using phone number.' });
  }

  if (value.role !== 'owner' && !value.phone && !value.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide phone or email.' });
  }
});

export const verifyOtpSchema = z.object({
  requestId: z.uuid(),
  otp: z.string().length(6)
});

export const resetPasswordSchema = z.object({
  requestId: z.uuid(),
  resetToken: z.string().min(12),
  password: z.string().min(8)
});

export type AppRole = 'owner' | 'trainer' | 'client';

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export function isStrictIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isFutureIsoDate(value: string) {
  if (!isStrictIsoDate(value)) {
    return true;
  }

  return value > new Date().toISOString().slice(0, 10);
}

export function isEmail(value: string) {
  return value.includes('@');
}

export function createPublicSupabaseClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function resolveUserByIdentifier(identifier: string, expectedRole?: AppRole) {
  const admin = createAdminSupabaseClient();
  const normalizedIdentifier = isEmail(identifier) ? identifier.trim().toLowerCase() : normalizePhone(identifier);
  let query = admin
    .from('users')
    .select('id, role, name, phone, email')
    .limit(1);

  query = isEmail(normalizedIdentifier)
    ? query.eq('email', normalizedIdentifier)
    : query.eq('phone', normalizedIdentifier);

  if (expectedRole) {
    query = query.eq('role', expectedRole);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function requireAuthorizedUser(request: Request, allowedRoles: AppRole[]) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieToken = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : decodeURIComponent(cookieToken || '');
  if (!token) {
    throw new Error('Unauthorized');
  }

  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, role, name, email, phone')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || !allowedRoles.includes(profile.role as AppRole)) {
    throw new Error('Forbidden');
  }

  return {
    token,
    user: authData.user,
    profile: profile as { id: string; role: AppRole; name: string; email: string; phone: string }
  };
}

export function makeOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function makeTemporaryPassword() {
  return `PH-${randomUUID()}!`;
}

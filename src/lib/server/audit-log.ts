import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function writeActivityAudit(action: string, options?: {
  actorUserId?: string;
  entityType?: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const activityResult = await admin.from('activity_audits').insert({
    actor_user_id: options?.actorUserId || null,
    entity_type: options?.entityType || 'system',
    entity_id: String(options?.entityId || 'n/a'),
    action,
    details: options?.details || {}
  });

  if (!activityResult.error) {
    return;
  }

  await admin.from('attendance_audits').insert({
    action
  });
}

export async function writeOwnerAudit(action: string, options?: {
  actorUserId?: string;
  entityType?: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
}) {
  await writeActivityAudit(action, options);
}

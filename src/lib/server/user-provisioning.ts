import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { makeTemporaryPassword, normalizePhone } from '@/lib/server/auth-utils';

type ProvisionRole = 'client' | 'trainer';

type ProvisionPayload = {
  role: ProvisionRole;
  fullName: string;
  phone: string;
  email: string;
  governmentId: string;
  profilePhotoUrl: string;
  planPreference?: string;
};

type ProvisionedUser = {
  userId: string;
  memberId?: number;
  trainerId?: number;
  rollback: () => Promise<void>;
};

async function rollbackAuthUser(userId: string) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Rollback failed: ${error.message}`);
  }
}

export async function provisionManagedUser(payload: ProvisionPayload): Promise<ProvisionedUser> {
  const admin = createAdminSupabaseClient();
  const email = payload.email.trim().toLowerCase();
  const phone = normalizePhone(payload.phone);

  const { data: existingUsers, error: existingUsersError } = await admin
    .from('users')
    .select('id')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .limit(1);

  if (existingUsersError) {
    throw new Error(existingUsersError.message);
  }

  if (existingUsers && existingUsers.length > 0) {
    throw new Error('A user already exists with this phone or email.');
  }

  let createdUserId: string | null = null;

  try {
    const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
      email,
      phone: phone || undefined,
      password: makeTemporaryPassword(),
      email_confirm: true,
      phone_confirm: Boolean(phone),
      user_metadata: {
        name: payload.fullName,
        role: payload.role
      }
    });

    if (authError || !createdUser.user) {
      throw new Error(authError?.message || 'Could not create auth user.');
    }

    createdUserId = createdUser.user.id;

    const { error: profileError } = await admin
      .from('users')
      .insert({
        id: createdUser.user.id,
        role: payload.role,
        name: payload.fullName,
        phone,
        email
      });

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (payload.role === 'client') {
      const { data: member, error: memberError } = await admin
        .from('members')
        .insert({
          user_id: createdUser.user.id,
          govt_id: payload.governmentId,
          profile_photo_url: payload.profilePhotoUrl,
          membership_plan: payload.planPreference || 'Standard',
          start_date: new Date().toISOString().slice(0, 10),
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: 'active'
        })
        .select('id')
        .single();

      if (memberError || !member) {
        throw new Error(memberError?.message || 'Could not create member record.');
      }

      return {
        userId: createdUser.user.id,
        memberId: member.id,
        rollback: async () => rollbackAuthUser(createdUser.user.id)
      };
    }

    const { data: trainer, error: trainerError } = await admin
      .from('trainers')
      .insert({
        user_id: createdUser.user.id,
        govt_id: payload.governmentId,
        profile_photo_url: payload.profilePhotoUrl,
        salary: 0
      })
      .select('id')
      .single();

    if (trainerError || !trainer) {
      throw new Error(trainerError?.message || 'Could not create trainer record.');
    }

    return {
      userId: createdUser.user.id,
      trainerId: trainer.id,
      rollback: async () => rollbackAuthUser(createdUser.user.id)
    };
  } catch (error) {
    if (createdUserId) {
      try {
        await rollbackAuthUser(createdUserId);
      } catch (rollbackError) {
        const original = error instanceof Error ? error.message : 'Provisioning failed.';
        const rollbackText = rollbackError instanceof Error ? rollbackError.message : 'Rollback failed.';
        throw new Error(`${original} ${rollbackText}`);
      }
    }

    throw error instanceof Error ? error : new Error('Provisioning failed.');
  }
}

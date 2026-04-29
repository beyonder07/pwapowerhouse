create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'trainer', 'client')),
  name text not null,
  phone text not null unique,
  email text not null unique,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_users_single_owner
  on public.users ((role)) where role = 'owner';

create table if not exists public.trainers (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  govt_id text,
  profile_photo_url text,
  salary numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  trainer_id bigint references public.trainers(id) on delete set null,
  govt_id text not null,
  profile_photo_url text,
  membership_plan text not null,
  start_date date not null,
  expiry_date date not null,
  status text not null check (status in ('active', 'inactive', 'expired', 'frozen')),
  workout_plan jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent')),
  check_in_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint attendance_member_date_unique unique (member_id, date)
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  mode text not null check (mode in ('cash', 'upi', 'card', 'bank-transfer', 'other')),
  status text not null check (status in ('paid', 'pending', 'failed', 'refunded')),
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('client', 'trainer', 'member', 'workout-plan', 'trainer-attendance')),
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.users(id) on delete set null,
  review_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'trainer', 'client')),
  destination text not null,
  otp_code text not null,
  verified_at timestamptz,
  reset_token text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trainer_attendance (
  id bigint generated always as identity primary key,
  trainer_id bigint not null references public.trainers(id) on delete cascade,
  date date not null,
  check_in_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trainer_attendance_trainer_date_unique unique (trainer_id, date)
);

create table if not exists public.attendance_audits (
  id bigint generated always as identity primary key,
  attendance_id bigint references public.attendance(id) on delete cascade,
  action text not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_name on public.users(name);
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_members_trainer_id on public.members(trainer_id);
create index if not exists idx_members_expiry_date on public.members(expiry_date);
create index if not exists idx_attendance_member_id on public.attendance(member_id);
create index if not exists idx_attendance_date on public.attendance(date);
create index if not exists idx_payments_member_id on public.payments(member_id);
create index if not exists idx_payments_date on public.payments(date);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_type on public.requests(type);
create index if not exists idx_password_reset_requests_user_id on public.password_reset_requests(user_id);
create index if not exists idx_password_reset_requests_expires_at on public.password_reset_requests(expires_at);
create index if not exists idx_trainer_attendance_trainer_id on public.trainer_attendance(trainer_id);
create index if not exists idx_trainer_attendance_date on public.trainer_attendance(date);
create index if not exists idx_attendance_audits_attendance_id on public.attendance_audits(attendance_id);

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('govt-docs', 'govt-docs', false)
on conflict (id) do nothing;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() limit 1;
$$;

create or replace function public.current_member_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_trainer_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.trainers where user_id = auth.uid() limit 1;
$$;

create or replace function public.member_belongs_to_current_trainer(target_member_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where id = target_member_id
      and trainer_id = public.current_trainer_id()
  );
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.current_trainer_id() to authenticated;
grant execute on function public.member_belongs_to_current_trainer(bigint) to authenticated;

alter table public.users enable row level security;
alter table public.trainers enable row level security;
alter table public.members enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.requests enable row level security;
alter table public.password_reset_requests enable row level security;
alter table public.trainer_attendance enable row level security;
alter table public.attendance_audits enable row level security;

drop policy if exists users_owner_all on public.users;
drop policy if exists users_self_read on public.users;
create policy users_owner_all on public.users
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy users_self_read on public.users
  for select to authenticated
  using (id = auth.uid());

drop policy if exists trainers_owner_all on public.trainers;
drop policy if exists trainers_self_read on public.trainers;
create policy trainers_owner_all on public.trainers
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy trainers_self_read on public.trainers
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists members_owner_all on public.members;
drop policy if exists members_client_self_read on public.members;
drop policy if exists members_trainer_assigned_read on public.members;
create policy members_owner_all on public.members
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy members_client_self_read on public.members
  for select to authenticated
  using (user_id = auth.uid());
create policy members_trainer_assigned_read on public.members
  for select to authenticated
  using (trainer_id = public.current_trainer_id());

drop policy if exists attendance_owner_all on public.attendance;
drop policy if exists attendance_client_self_read on public.attendance;
drop policy if exists attendance_trainer_assigned_read on public.attendance;
create policy attendance_owner_all on public.attendance
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy attendance_client_self_read on public.attendance
  for select to authenticated
  using (member_id = public.current_member_id());
create policy attendance_trainer_assigned_read on public.attendance
  for select to authenticated
  using (public.member_belongs_to_current_trainer(member_id));

drop policy if exists payments_owner_all on public.payments;
drop policy if exists payments_client_self_read on public.payments;
create policy payments_owner_all on public.payments
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy payments_client_self_read on public.payments
  for select to authenticated
  using (member_id = public.current_member_id());

drop policy if exists requests_owner_all on public.requests;
drop policy if exists requests_trainer_self_read on public.requests;
drop policy if exists requests_client_self_read on public.requests;
create policy requests_owner_all on public.requests
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy requests_trainer_self_read on public.requests
  for select to authenticated
  using (created_by = auth.uid() and public.current_app_role() = 'trainer');
create policy requests_client_self_read on public.requests
  for select to authenticated
  using (created_by = auth.uid() and public.current_app_role() = 'client');

drop policy if exists password_reset_owner_all on public.password_reset_requests;
drop policy if exists password_reset_self_read on public.password_reset_requests;
create policy password_reset_owner_all on public.password_reset_requests
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy password_reset_self_read on public.password_reset_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists trainer_attendance_owner_all on public.trainer_attendance;
drop policy if exists trainer_attendance_self_read on public.trainer_attendance;
create policy trainer_attendance_owner_all on public.trainer_attendance
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy trainer_attendance_self_read on public.trainer_attendance
  for select to authenticated
  using (trainer_id = public.current_trainer_id());

drop policy if exists attendance_audits_owner_all on public.attendance_audits;
create policy attendance_audits_owner_all on public.attendance_audits
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');

drop policy if exists profile_images_public_read on storage.objects;
drop policy if exists govt_docs_owner_all on storage.objects;
create policy profile_images_public_read on storage.objects
  for select to public
  using (bucket_id = 'profile-images');
create policy govt_docs_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'govt-docs' and public.current_app_role() = 'owner')
  with check (bucket_id = 'govt-docs' and public.current_app_role() = 'owner');

alter table public.trainer_attendance
  add column if not exists status text not null default 'present',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists distance_meters numeric(10, 2),
  add column if not exists request_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trainer_attendance_status_check'
  ) then
    alter table public.trainer_attendance
      add constraint trainer_attendance_status_check
      check (status in ('present', 'late'));
  end if;
end $$;

create unique index if not exists idx_trainer_attendance_request_id
  on public.trainer_attendance(request_id)
  where request_id is not null;

create table if not exists public.trainer_workout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id bigint not null references public.members(id) on delete cascade,
  trainer_id bigint references public.trainers(id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'active' check (status in ('active', 'pending', 'archived')),
  split jsonb not null default '[]'::jsonb,
  progress_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trainer_workout_plans_member_id
  on public.trainer_workout_plans(member_id);
create index if not exists idx_trainer_workout_plans_trainer_id
  on public.trainer_workout_plans(trainer_id);
create index if not exists idx_trainer_workout_plans_status
  on public.trainer_workout_plans(status);

create table if not exists public.trainer_salary_records (
  id uuid primary key default gen_random_uuid(),
  trainer_id bigint not null references public.trainers(id) on delete cascade,
  month_start date not null,
  base_salary numeric(12, 2) not null default 0,
  bonus numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('paid', 'processing', 'pending')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trainer_id, month_start)
);

create index if not exists idx_trainer_salary_records_trainer_id
  on public.trainer_salary_records(trainer_id);
create index if not exists idx_trainer_salary_records_month_start
  on public.trainer_salary_records(month_start desc);

alter table public.trainer_workout_plans enable row level security;
alter table public.trainer_salary_records enable row level security;

drop policy if exists members_trainer_assigned_read on public.members;
drop policy if exists attendance_trainer_assigned_read on public.attendance;
drop policy if exists trainer_attendance_self_read on public.trainer_attendance;

drop policy if exists trainer_workout_plans_owner_all on public.trainer_workout_plans;
drop policy if exists trainer_workout_plans_trainer_select on public.trainer_workout_plans;
drop policy if exists trainer_workout_plans_trainer_insert on public.trainer_workout_plans;
drop policy if exists trainer_workout_plans_trainer_update on public.trainer_workout_plans;
drop policy if exists trainer_workout_plans_client_self_read on public.trainer_workout_plans;

create policy trainer_workout_plans_owner_all on public.trainer_workout_plans
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');

create policy trainer_workout_plans_trainer_select on public.trainer_workout_plans
  for select to authenticated
  using (public.current_app_role() = 'trainer');

create policy trainer_workout_plans_trainer_insert on public.trainer_workout_plans
  for insert to authenticated
  with check (public.current_app_role() = 'trainer');

create policy trainer_workout_plans_trainer_update on public.trainer_workout_plans
  for update to authenticated
  using (public.current_app_role() = 'trainer')
  with check (public.current_app_role() = 'trainer');

create policy trainer_workout_plans_client_self_read on public.trainer_workout_plans
  for select to authenticated
  using (
    public.current_app_role() = 'client'
    and member_id = public.current_member_id()
  );

drop policy if exists trainer_salary_records_owner_all on public.trainer_salary_records;
drop policy if exists trainer_salary_records_self_read on public.trainer_salary_records;

create policy trainer_salary_records_owner_all on public.trainer_salary_records
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');

create policy trainer_salary_records_self_read on public.trainer_salary_records
  for select to authenticated
  using (trainer_id = public.current_trainer_id());

create or replace function public.check_in_trainer_attendance(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer public.trainers%rowtype;
  v_branch public.gym_branches%rowtype;
  v_distance double precision;
  v_attendance_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_trainer
  from public.trainers
  where user_id = auth.uid();

  if not found then
    raise exception 'Trainer profile required';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Location payload is incomplete';
  end if;

  if p_latitude is not null and p_longitude is not null then
    select * into v_branch
    from public.gym_branches
    where is_active = true
    order by created_at
    limit 1;

    if found then
      v_distance := public.haversine_meters(
        p_latitude,
        p_longitude,
        v_branch.latitude,
        v_branch.longitude
      );

      if v_distance > least(v_branch.radius_meters, 150) then
        raise exception 'Trainer not within gym radius';
      end if;
    end if;
  end if;

  insert into public.trainer_attendance (
    trainer_id,
    date,
    status,
    check_in_time,
    latitude,
    longitude,
    distance_meters,
    request_id
  )
  values (
    v_trainer.id,
    current_date,
    'present',
    now(),
    p_latitude,
    p_longitude,
    case when v_distance is null then null else round(v_distance::numeric, 2) end,
    p_request_id
  )
  returning id into v_attendance_id;

  return (
    select jsonb_build_object(
      'id', a.id,
      'attendanceDate', a.date,
      'checkedInAt', a.check_in_time,
      'status', a.status,
      'gpsVerified', a.distance_meters is not null
    )
    from public.trainer_attendance a
    where a.id = v_attendance_id
  );
exception
  when unique_violation then
    raise exception 'Trainer attendance already marked for today';
end;
$$;

grant select, insert, update on public.trainer_workout_plans to authenticated;
grant select on public.trainer_salary_records to authenticated;
grant execute on function public.check_in_trainer_attendance(double precision, double precision, uuid) to authenticated;

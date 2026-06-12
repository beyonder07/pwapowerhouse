create extension if not exists "pgcrypto";

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius integer not null default 150 check (radius between 1 and 500),
  created_at timestamptz not null default now()
);

insert into public.gyms (name, latitude, longitude, radius)
values
  ('Indira Chowk Branch', 28.613939, 77.209023, 150),
  ('Pathik Chowk Branch', 28.612912, 77.229510, 150)
on conflict (name) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius = excluded.radius;

alter table public.users
  add column if not exists gym_id uuid references public.gyms(id) on delete restrict;

with default_gym as (
  select id from public.gyms order by name limit 1
)
update public.users
set gym_id = (select id from default_gym)
where gym_id is null;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_valid_dates check (end_date >= start_date)
);

create table if not exists public.user_details (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone text,
  govt_id_url text,
  govt_id_type text,
  govt_id_number text,
  profile_pic_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_gym_id on public.users(gym_id);
create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_gym_status on public.memberships(gym_id, status);
create index if not exists idx_memberships_end_date on public.memberships(end_date);
create unique index if not exists idx_memberships_one_active_per_user
  on public.memberships(user_id)
  where status = 'active';

-- Migrate existing member rows into memberships (safe for fresh/preview databases)
do $$
begin
  if exists (
    select from pg_tables where schemaname = 'public' and tablename = 'members'
  ) then
    insert into public.memberships (user_id, gym_id, start_date, end_date, status)
    select
      m.user_id,
      u.gym_id,
      m.start_date,
      m.expiry_date,
      case when m.status = 'active' and m.expiry_date >= current_date then 'active' else 'expired' end
    from public.members m
    join public.users u on u.id = m.user_id
    where u.gym_id is not null
      and not exists (
        select 1
        from public.memberships existing
        where existing.user_id = m.user_id
          and existing.start_date = m.start_date
          and existing.end_date = m.expiry_date
      )
    on conflict do nothing;
  end if;
end $$;

alter table public.attendance
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists gym_id uuid references public.gyms(id) on delete restrict,
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);

alter table public.attendance
  alter column member_id drop not null,
  alter column status set default 'present';

-- Backfill attendance user_id/gym_id from members (safe for fresh/preview databases)
do $$
begin
  if exists (
    select from pg_tables where schemaname = 'public' and tablename = 'members'
  ) then
    update public.attendance a
    set
      user_id = coalesce(a.user_id, m.user_id),
      gym_id = coalesce(a.gym_id, u.gym_id)
    from public.members m
    join public.users u on u.id = m.user_id
    where a.member_id = m.id
      and (a.user_id is null or a.gym_id is null);
  end if;
end $$;

create index if not exists idx_attendance_user_id on public.attendance(user_id);
create index if not exists idx_attendance_gym_date on public.attendance(gym_id, date);
create unique index if not exists idx_attendance_user_date_unique
  on public.attendance(user_id, date)
  where user_id is not null;

alter table public.payments
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists gym_id uuid references public.gyms(id) on delete restrict,
  add column if not exists plan_duration integer not null default 30 check (plan_duration > 0 and plan_duration <= 730),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.users(id) on delete set null;

alter table public.payments
  alter column member_id drop not null,
  alter column mode set default 'other',
  alter column date set default current_date;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'approved', 'rejected', 'paid', 'failed', 'refunded'));

update public.payments p
set
  user_id = coalesce(p.user_id, m.user_id),
  gym_id = coalesce(p.gym_id, u.gym_id)
from public.members m
join public.users u on u.id = m.user_id
where p.member_id = m.id
  and (p.user_id is null or p.gym_id is null);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_gym_status_created_at on public.payments(gym_id, status, created_at desc);
create unique index if not exists idx_payments_one_pending_per_user
  on public.payments(user_id)
  where status = 'pending' and user_id is not null;

create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id
  from public.users
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_gym_id() to authenticated;

create or replace function public.haversine_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) *
      cos(radians(lat2)) *
      power(sin(radians(lon2 - lon1) / 2), 2)
    )
  );
$$;

create or replace function public.check_in_attendance_mvp(
  p_latitude double precision,
  p_longitude double precision,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_gym public.gyms%rowtype;
  v_membership public.memberships%rowtype;
  v_member_id bigint;
  v_attendance_id bigint;
  v_distance double precision;
  v_local_time time;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_latitude is null or p_latitude < -90 or p_latitude > 90
    or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid location';
  end if;

  v_local_time := (now() at time zone 'Asia/Kolkata')::time;
  if v_local_time < time '05:00' or v_local_time > time '23:00' then
    raise exception 'Check-in is available only during gym hours';
  end if;

  select * into v_user
  from public.users
  where id = auth.uid();

  if not found or v_user.role <> 'client' then
    raise exception 'Client account required';
  end if;

  if v_user.gym_id is null then
    raise exception 'User is not assigned to a gym';
  end if;

  select * into v_gym
  from public.gyms
  where id = v_user.gym_id;

  if not found then
    raise exception 'Gym branch not configured';
  end if;

  select * into v_membership
  from public.memberships
  where user_id = v_user.id
    and gym_id = v_user.gym_id
    and status = 'active'
    and start_date <= current_date
    and end_date >= current_date
  order by end_date desc
  limit 1;

  if not found then
    raise exception 'Active membership required';
  end if;

  v_distance := public.haversine_meters(
    p_latitude,
    p_longitude,
    v_gym.latitude,
    v_gym.longitude
  );

  if v_distance > v_gym.radius then
    raise exception 'User not within gym radius';
  end if;

  select id into v_member_id
  from public.members
  where user_id = v_user.id
  limit 1;

  insert into public.attendance (
    member_id,
    user_id,
    gym_id,
    date,
    status,
    check_in_time,
    latitude,
    longitude,
    distance_meters
  )
  values (
    v_member_id,
    v_user.id,
    v_user.gym_id,
    current_date,
    'present',
    now(),
    p_latitude,
    p_longitude,
    round(v_distance::numeric, 2)
  )
  returning id into v_attendance_id;

  insert into public.attendance_audits (attendance_id, action)
  values (v_attendance_id, 'client_check_in')
  on conflict do nothing;

  return (
    select jsonb_build_object(
      'id', a.id,
      'userId', a.user_id,
      'gymId', a.gym_id,
      'attendanceDate', a.date,
      'checkedInAt', a.check_in_time,
      'distanceMeters', a.distance_meters,
      'gym', jsonb_build_object(
        'id', v_gym.id,
        'name', v_gym.name,
        'radius', v_gym.radius
      )
    )
    from public.attendance a
    where a.id = v_attendance_id
  );
exception
  when unique_violation then
    raise exception 'Attendance already marked for today';
end;
$$;

create or replace function public.get_client_dashboard_mvp()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_membership public.memberships%rowtype;
  v_gym public.gyms%rowtype;
  v_today public.attendance%rowtype;
  v_cursor date;
  v_streak integer := 0;
  v_has_day boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if not found or v_user.role <> 'client' then
    raise exception 'Client account required';
  end if;

  select * into v_gym from public.gyms where id = v_user.gym_id;

  select * into v_membership
  from public.memberships
  where user_id = v_user.id
    and gym_id = v_user.gym_id
  order by
    case when status = 'active' and start_date <= current_date and end_date >= current_date then 0 else 1 end,
    end_date desc
  limit 1;

  select * into v_today
  from public.attendance
  where user_id = v_user.id
    and gym_id = v_user.gym_id
    and date = current_date
  limit 1;

  v_cursor := case when v_today.id is null then current_date - 1 else current_date end;
  loop
    select exists (
      select 1
      from public.attendance
      where user_id = v_user.id
        and gym_id = v_user.gym_id
        and date = v_cursor
        and status = 'present'
    ) into v_has_day;

    exit when not v_has_day;
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'role', v_user.role,
      'gymId', v_user.gym_id
    ),
    'gym', case when v_gym.id is null then null else jsonb_build_object(
      'id', v_gym.id,
      'name', v_gym.name,
      'latitude', v_gym.latitude,
      'longitude', v_gym.longitude,
      'radius', v_gym.radius
    ) end,
    'membership', case when v_membership.id is null then null else jsonb_build_object(
      'id', v_membership.id,
      'status', case
        when v_membership.status = 'active' and v_membership.end_date >= current_date then 'active'
        else 'expired'
      end,
      'startDate', v_membership.start_date,
      'endDate', v_membership.end_date,
      'daysRemaining', greatest(v_membership.end_date - current_date, 0)
    ) end,
    'todayAttendance', jsonb_build_object(
      'checkedIn', v_today.id is not null,
      'checkedInAt', v_today.check_in_time,
      'status', coalesce(v_today.status, 'not_checked_in')
    ),
    'streak', v_streak,
    'recentPayments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'planDuration', p.plan_duration,
          'status', p.status,
          'createdAt', p.created_at,
          'approvedAt', p.approved_at
        )
        order by p.created_at desc
      )
      from (
        select *
        from public.payments
        where user_id = v_user.id
          and gym_id = v_user.gym_id
        order by created_at desc
        limit 5
      ) p
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_client_payments_mvp()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_membership public.memberships%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if not found or v_user.role <> 'client' then
    raise exception 'Client account required';
  end if;

  select * into v_membership
  from public.memberships
  where user_id = v_user.id
    and gym_id = v_user.gym_id
  order by end_date desc
  limit 1;

  return jsonb_build_object(
    'currentPlan', case when v_membership.id is null then null else jsonb_build_object(
      'id', v_membership.id,
      'status', case
        when v_membership.status = 'active' and v_membership.end_date >= current_date then 'active'
        else 'expired'
      end,
      'startDate', v_membership.start_date,
      'endDate', v_membership.end_date,
      'daysRemaining', greatest(v_membership.end_date - current_date, 0)
    ) end,
    'pendingRequest', (
      select jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'planDuration', p.plan_duration,
        'status', p.status,
        'createdAt', p.created_at
      )
      from public.payments p
      where p.user_id = v_user.id
        and p.gym_id = v_user.gym_id
        and p.status = 'pending'
      order by p.created_at desc
      limit 1
    ),
    'history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'planDuration', p.plan_duration,
          'status', p.status,
          'createdAt', p.created_at,
          'approvedAt', p.approved_at
        )
        order by p.created_at desc
      )
      from (
        select *
        from public.payments
        where user_id = v_user.id
          and gym_id = v_user.gym_id
        order by created_at desc
        limit 25
      ) p
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.request_client_payment_mvp(
  p_amount numeric,
  p_plan_duration integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_member_id bigint;
  v_payment public.payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_plan_duration is null or p_plan_duration < 1 or p_plan_duration > 730 then
    raise exception 'Invalid plan duration';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if not found or v_user.role <> 'client' then
    raise exception 'Client account required';
  end if;

  if v_user.gym_id is null then
    raise exception 'User is not assigned to a gym';
  end if;

  if exists (
    select 1
    from public.payments
    where user_id = v_user.id
      and gym_id = v_user.gym_id
      and status = 'pending'
  ) then
    raise exception 'A payment request is already pending';
  end if;

  select id into v_member_id
  from public.members
  where user_id = v_user.id
  limit 1;

  insert into public.payments (
    member_id,
    user_id,
    gym_id,
    amount,
    mode,
    status,
    date,
    plan_duration
  )
  values (
    v_member_id,
    v_user.id,
    v_user.gym_id,
    round(p_amount, 2),
    'other',
    'pending',
    current_date,
    p_plan_duration
  )
  returning * into v_payment;

  return jsonb_build_object(
    'id', v_payment.id,
    'amount', v_payment.amount,
    'planDuration', v_payment.plan_duration,
    'status', v_payment.status,
    'createdAt', v_payment.created_at
  );
exception
  when unique_violation then
    raise exception 'A payment request is already pending';
end;
$$;

create or replace function public.review_payment_request_mvp(
  p_payment_id bigint,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner public.users%rowtype;
  v_payment public.payments%rowtype;
  v_membership public.memberships%rowtype;
  v_base_end date;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into v_owner
  from public.users
  where id = auth.uid();

  if not found or v_owner.role <> 'owner' then
    raise exception 'Owner account required';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending payment request not found';
  end if;

  if v_owner.gym_id is not null and v_payment.gym_id <> v_owner.gym_id then
    raise exception 'Payment request belongs to another gym';
  end if;

  update public.payments
  set
    status = p_status,
    approved_at = case when p_status = 'approved' then now() else null end,
    approved_by = case when p_status = 'approved' then v_owner.id else null end
  where id = v_payment.id
  returning * into v_payment;

  if p_status = 'approved' then
    select * into v_membership
    from public.memberships
    where user_id = v_payment.user_id
      and gym_id = v_payment.gym_id
      and status = 'active'
    order by end_date desc
    limit 1
    for update;

    if found then
      v_base_end := greatest(v_membership.end_date, current_date);

      update public.memberships
      set
        end_date = v_base_end + v_payment.plan_duration,
        status = 'active',
        updated_at = now()
      where id = v_membership.id;
    else
      insert into public.memberships (
        user_id,
        gym_id,
        start_date,
        end_date,
        status
      )
      values (
        v_payment.user_id,
        v_payment.gym_id,
        current_date,
        current_date + v_payment.plan_duration - 1,
        'active'
      );
    end if;
  end if;

  return jsonb_build_object(
    'id', v_payment.id,
    'status', v_payment.status,
    'approvedAt', v_payment.approved_at
  );
end;
$$;

alter table public.gyms enable row level security;
alter table public.memberships enable row level security;
alter table public.user_details enable row level security;

drop policy if exists gyms_owner_all on public.gyms;
drop policy if exists gyms_authenticated_read on public.gyms;
create policy gyms_owner_all on public.gyms
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy gyms_authenticated_read on public.gyms
  for select to authenticated
  using (id = public.current_gym_id() or public.current_app_role() in ('owner', 'trainer'));

drop policy if exists memberships_owner_all on public.memberships;
drop policy if exists memberships_client_self_read on public.memberships;
create policy memberships_owner_all on public.memberships
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy memberships_client_self_read on public.memberships
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_details_owner_all on public.user_details;
drop policy if exists user_details_self_read on public.user_details;
drop policy if exists user_details_self_write on public.user_details;
drop policy if exists user_details_self_update on public.user_details;
create policy user_details_owner_all on public.user_details
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');
create policy user_details_self_read on public.user_details
  for select to authenticated
  using (user_id = auth.uid());
create policy user_details_self_write on public.user_details
  for insert to authenticated
  with check (user_id = auth.uid());
create policy user_details_self_update on public.user_details
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists attendance_client_self_read on public.attendance;
drop policy if exists attendance_client_self_insert on public.attendance;
create policy attendance_client_self_read on public.attendance
  for select to authenticated
  using (user_id = auth.uid() or member_id = public.current_member_id());
create policy attendance_client_self_insert on public.attendance
  for insert to authenticated
  with check (user_id = auth.uid() and gym_id = public.current_gym_id());

drop policy if exists payments_client_self_read on public.payments;
drop policy if exists payments_client_self_insert on public.payments;
create policy payments_client_self_read on public.payments
  for select to authenticated
  using (user_id = auth.uid() or member_id = public.current_member_id());
create policy payments_client_self_insert on public.payments
  for insert to authenticated
  with check (user_id = auth.uid() and gym_id = public.current_gym_id() and status = 'pending');

grant execute on function public.check_in_attendance_mvp(double precision, double precision, uuid) to authenticated;
grant execute on function public.get_client_dashboard_mvp() to authenticated;
grant execute on function public.get_client_payments_mvp() to authenticated;
grant execute on function public.request_client_payment_mvp(numeric, integer) to authenticated;
grant execute on function public.review_payment_request_mvp(bigint, text) to authenticated;

create table if not exists public.rate_limit_buckets (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, window_start)
);

create index if not exists idx_rate_limit_buckets_expires_at
  on public.rate_limit_buckets (expires_at);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'Rate limit key is required';
  end if;

  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  delete from public.rate_limit_buckets where expires_at < now();

  insert into public.rate_limit_buckets (key, window_start, count, expires_at, updated_at)
  values (p_key, v_window_start, 1, v_window_start + make_interval(secs => p_window_seconds + 60), now())
  on conflict (key, window_start)
  do update set count = public.rate_limit_buckets.count + 1, updated_at = now()
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

create table if not exists public.gym_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null default 150 check (radius_meters between 1 and 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.members
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table public.attendance
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists distance_meters numeric(10, 2);

create index if not exists idx_members_branch_id on public.members(branch_id);
create index if not exists idx_attendance_check_in_time on public.attendance(check_in_time desc);

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

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'client');
  if v_role not in ('owner', 'trainer', 'client') then
    v_role := 'client';
  end if;

  insert into public.users (id, role, name, phone, email)
  values (
    new.id,
    v_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), new.id::text),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name;

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
after insert on auth.users
for each row execute function public.sync_auth_user_profile();

drop trigger if exists on_auth_user_updated_sync_profile on auth.users;
create trigger on_auth_user_updated_sync_profile
after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

create or replace function public.check_in_attendance(
  p_branch_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_branch public.gym_branches%rowtype;
  v_distance double precision;
  v_attendance_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_member
  from public.members
  where user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'Active member profile required';
  end if;

  select * into v_branch
  from public.gym_branches
  where id = coalesce(p_branch_id, v_member.branch_id)
    and is_active = true;

  if not found then
    select * into v_branch
    from public.gym_branches
    where is_active = true
    order by created_at
    limit 1;
  end if;

  if not found then
    raise exception 'Gym branch not found';
  end if;

  v_distance := public.haversine_meters(
    p_latitude,
    p_longitude,
    v_branch.latitude,
    v_branch.longitude
  );

  if v_distance > v_branch.radius_meters then
    raise exception 'User not within gym radius';
  end if;

  insert into public.attendance (
    member_id,
    date,
    status,
    check_in_time,
    latitude,
    longitude,
    distance_meters
  )
  values (
    v_member.id,
    current_date,
    'present',
    now(),
    p_latitude,
    p_longitude,
    round(v_distance::numeric, 2)
  )
  returning id into v_attendance_id;

  insert into public.attendance_audits (attendance_id, action)
  values (v_attendance_id, 'check_in');

  return (
    select jsonb_build_object(
      'id', a.id,
      'memberId', a.member_id,
      'attendanceDate', a.date,
      'checkedInAt', a.check_in_time,
      'distanceMeters', a.distance_meters
    )
    from public.attendance a
    where a.id = v_attendance_id
  );
exception
  when unique_violation then
    raise exception 'Attendance already marked for today';
end;
$$;

create or replace function public.get_daily_attendance(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (date date, check_ins bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select least(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as from_date,
           greatest(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as to_date
  ),
  days as (
    select generate_series(params.from_date, params.to_date, interval '1 day')::date as date
    from params
  )
  select days.date, count(a.id)::bigint as check_ins
  from days
  left join public.attendance a
    on a.date = days.date
    and a.status = 'present'
  left join public.members m
    on m.id = a.member_id
  where p_branch_id is null or m.branch_id = p_branch_id or a.id is null
  group by days.date
  order by days.date;
$$;

create or replace function public.get_weekly_revenue(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  date date,
  revenue numeric,
  pending_total numeric,
  paid_payments bigint,
  pending_payments bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select least(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as from_date,
           greatest(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as to_date
  ),
  days as (
    select generate_series(params.from_date, params.to_date, interval '1 day')::date as date
    from params
  )
  select
    days.date,
    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)::numeric(12, 2) as revenue,
    coalesce(sum(p.amount) filter (where p.status = 'pending'), 0)::numeric(12, 2) as pending_total,
    count(p.id) filter (where p.status = 'paid')::bigint as paid_payments,
    count(p.id) filter (where p.status = 'pending')::bigint as pending_payments
  from days
  left join public.payments p on p.date = days.date
  left join public.members m on m.id = p.member_id
  where p_branch_id is null or m.branch_id = p_branch_id or p.id is null
  group by days.date
  order by days.date;
$$;

create or replace function public.get_monthly_revenue(
  p_months integer default 6,
  p_branch_id uuid default null
)
returns table (month_start date, revenue numeric, pending_total numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select greatest(coalesce(p_months, 6), 1) as months_back
  ),
  months as (
    select generate_series(
      date_trunc('month', current_date)::date - make_interval(months => params.months_back - 1),
      date_trunc('month', current_date)::date,
      interval '1 month'
    )::date as month_start
    from params
  )
  select
    months.month_start,
    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)::numeric(12, 2) as revenue,
    coalesce(sum(p.amount) filter (where p.status = 'pending'), 0)::numeric(12, 2) as pending_total
  from months
  left join public.payments p on date_trunc('month', p.date)::date = months.month_start
  left join public.members m on m.id = p.member_id
  where p_branch_id is null or m.branch_id = p_branch_id or p.id is null
  group by months.month_start
  order by months.month_start;
$$;

create or replace function public.get_inactive_members(
  p_days integer default 7,
  p_limit integer default 50,
  p_offset integer default 0,
  p_branch_id uuid default null
)
returns table (
  member_id bigint,
  user_id uuid,
  full_name text,
  email text,
  branch_id uuid,
  last_attendance_date date,
  inactive_days integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select greatest(coalesce(p_days, 7), 1) as inactive_after_days,
           least(greatest(coalesce(p_limit, 50), 1), 100) as page_size,
           greatest(coalesce(p_offset, 0), 0) as page_offset
  ),
  visible_members as (
    select m.id as member_id, u.id as user_id, u.name as full_name, u.email, m.branch_id,
           max(a.date) filter (where a.status = 'present') as last_attendance_date
    from public.members m
    join public.users u on u.id = m.user_id
    left join public.attendance a on a.member_id = m.id
    where m.status = 'active'
      and (p_branch_id is null or m.branch_id = p_branch_id)
    group by m.id, u.id, u.name, u.email, m.branch_id
  ),
  inactive as (
    select visible_members.*,
           case when visible_members.last_attendance_date is null then null
                else (current_date - visible_members.last_attendance_date)::integer end as inactive_days
    from visible_members, params
    where visible_members.last_attendance_date is null
       or visible_members.last_attendance_date < current_date - params.inactive_after_days
  )
  select inactive.*, count(*) over()::bigint as total_count
  from inactive, params
  order by inactive.last_attendance_date nulls first, inactive.full_name
  limit (select page_size from params)
  offset (select page_offset from params);
$$;

create or replace function public.get_dashboard_metrics(p_branch_id uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'totalMembers', coalesce((select count(*) from public.members m where p_branch_id is null or m.branch_id = p_branch_id), 0),
    'activeMembers', coalesce((select count(*) from public.members m where m.status = 'active' and (p_branch_id is null or m.branch_id = p_branch_id)), 0),
    'activeTrainers', coalesce((select count(*) from public.trainers), 0),
    'weeklyRevenue', coalesce((select sum(p.amount)::numeric(12, 2) from public.payments p join public.members m on m.id = p.member_id where p.status = 'paid' and p.date between current_date - 6 and current_date and (p_branch_id is null or m.branch_id = p_branch_id)), 0),
    'monthlyRevenue', coalesce((select sum(p.amount)::numeric(12, 2) from public.payments p join public.members m on m.id = p.member_id where p.status = 'paid' and p.date >= date_trunc('month', current_date)::date and (p_branch_id is null or m.branch_id = p_branch_id)), 0),
    'pendingPaymentsTotal', coalesce((select sum(p.amount)::numeric(12, 2) from public.payments p join public.members m on m.id = p.member_id where p.status = 'pending' and (p_branch_id is null or m.branch_id = p_branch_id)), 0),
    'avgDailyAttendance', coalesce((select round(avg(x.check_ins)::numeric, 2) from public.get_daily_attendance(current_date - 6, current_date, p_branch_id) x), 0),
    'attendanceToday', coalesce((select count(*) from public.attendance a join public.members m on m.id = a.member_id where a.status = 'present' and a.date = current_date and (p_branch_id is null or m.branch_id = p_branch_id)), 0),
    'inactiveMembers', coalesce((select count(*) from public.members m where m.status = 'active' and (p_branch_id is null or m.branch_id = p_branch_id) and not exists (select 1 from public.attendance a where a.member_id = m.id and a.status = 'present' and a.date >= current_date - 7)), 0),
    'pendingRequests', coalesce((select count(*) from public.requests r where r.status = 'pending'), 0)
  );
$$;

create or replace function public.get_recent_payments(
  p_limit integer default 5,
  p_branch_id uuid default null
)
returns table (
  id bigint,
  member_id bigint,
  member_name text,
  amount numeric,
  status text,
  payment_date date,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.member_id, u.name as member_name, p.amount, p.status, p.date as payment_date, p.created_at
  from public.payments p
  join public.members m on m.id = p.member_id
  join public.users u on u.id = m.user_id
  where p_branch_id is null or m.branch_id = p_branch_id
  order by p.date desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

create or replace function public.get_pending_requests(p_limit integer default 5)
returns table (id uuid, name text, type text, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id,
         coalesce(r.data ->> 'fullName', r.data ->> 'name', r.data ->> 'email', 'Request') as name,
         r.type,
         r.created_at
  from public.requests r
  where r.status = 'pending'
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

create or replace function public.get_branch_attendance_summary(
  p_from date default null,
  p_to date default null
)
returns table (
  branch_id uuid,
  branch_name text,
  total_check_ins bigint,
  active_members bigint,
  attendance_rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select least(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as from_date,
           greatest(coalesce(p_from, current_date - 6), coalesce(p_to, current_date)) as to_date
  ),
  branches as (
    select id, name from public.gym_branches where is_active = true
    union all
    select null::uuid, 'PowerHouse Gym'::text
    where not exists (select 1 from public.gym_branches where is_active = true)
  ),
  day_count as (
    select (to_date - from_date + 1)::numeric as days from params
  )
  select
    b.id as branch_id,
    b.name as branch_name,
    count(a.id)::bigint as total_check_ins,
    count(distinct m.id) filter (where m.status = 'active')::bigint as active_members,
    case
      when count(distinct m.id) filter (where m.status = 'active') = 0 then 0::numeric
      else round((count(a.id)::numeric / ((count(distinct m.id) filter (where m.status = 'active'))::numeric * day_count.days)) * 100, 2)
    end as attendance_rate
  from branches b
  cross join params
  cross join day_count
  left join public.members m on (b.id is null or m.branch_id = b.id)
  left join public.attendance a on a.member_id = m.id and a.status = 'present' and a.date between params.from_date and params.to_date
  group by b.id, b.name, day_count.days
  order by b.name;
$$;

create or replace function public.get_recent_attendance(
  p_limit integer default 20,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  id bigint,
  member_id bigint,
  member_name text,
  branch_name text,
  attendance_date date,
  checked_in_at timestamptz,
  distance_meters numeric,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select least(greatest(coalesce(p_limit, 20), 1), 100) as page_size,
           greatest(coalesce(p_offset, 0), 0) as page_offset,
           nullif(trim(p_search), '') as search
  ),
  rows as (
    select a.id, a.member_id, u.name as member_name,
           coalesce(gb.name, 'PowerHouse Gym') as branch_name,
           a.date as attendance_date,
           a.check_in_time as checked_in_at,
           a.distance_meters
    from public.attendance a
    join public.members m on m.id = a.member_id
    join public.users u on u.id = m.user_id
    left join public.gym_branches gb on gb.id = m.branch_id
    cross join params
    where a.status = 'present'
      and (
        params.search is null
        or u.name ilike '%' || params.search || '%'
        or u.email ilike '%' || params.search || '%'
        or gb.name ilike '%' || params.search || '%'
      )
  )
  select rows.*, count(*) over()::bigint as total_count
  from rows, params
  order by rows.checked_in_at desc
  limit (select page_size from params)
  offset (select page_offset from params);
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to anon, authenticated;
grant execute on function public.check_in_attendance(uuid, double precision, double precision, uuid) to authenticated;
grant execute on function public.get_daily_attendance(date, date, uuid) to authenticated;
grant execute on function public.get_weekly_revenue(date, date, uuid) to authenticated;
grant execute on function public.get_monthly_revenue(integer, uuid) to authenticated;
grant execute on function public.get_inactive_members(integer, integer, integer, uuid) to authenticated;
grant execute on function public.get_dashboard_metrics(uuid) to authenticated;
grant execute on function public.get_recent_payments(integer, uuid) to authenticated;
grant execute on function public.get_pending_requests(integer) to authenticated;
grant execute on function public.get_branch_attendance_summary(date, date) to authenticated;
grant execute on function public.get_recent_attendance(integer, integer, text) to authenticated;

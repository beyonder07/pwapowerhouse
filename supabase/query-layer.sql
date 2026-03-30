-- PowerHouse Gym Management System
-- Query layer for PostgreSQL / Supabase
-- Goal: fast CRUD, analytics, search, notifications, and RLS-aware access patterns.
--
-- Apply after schema.sql. This file does not redesign the schema; it adds
-- optimized database-side query helpers and example parameterized SQL.

set search_path = public;

-- ---------------------------------------------------------------------------
-- 1. OWNER / SERVER-SIDE CRUD QUERIES
-- ---------------------------------------------------------------------------
-- These are safe for the Next.js backend using the service role or an owner-only
-- session. They are intentionally EXPLAIN-friendly and avoid unnecessary nesting.

-- Members: list / search / filter
-- Parameters:
--   :p_query text
--   :p_trainer_id bigint
--   :p_status text
--   :p_limit int
--   :p_offset int
--
-- select
--   m.id,
--   u.name,
--   u.phone,
--   u.email,
--   m.trainer_id,
--   m.govt_id,
--   m.profile_photo_url,
--   m.membership_plan,
--   m.start_date,
--   m.expiry_date,
--   m.status
-- from public.members m
-- join public.users u on u.id = m.user_id
-- where (
--   :p_query is null
--   or :p_query = ''
--   or lower(u.name) like '%' || lower(:p_query) || '%'
--   or u.phone like '%' || regexp_replace(:p_query, '\D', '', 'g') || '%'
--   or lower(u.email) like '%' || lower(:p_query) || '%'
-- )
-- and (:p_trainer_id is null or m.trainer_id = :p_trainer_id)
-- and (:p_status is null or m.status = :p_status)
-- order by u.name asc, m.id desc
-- limit :p_limit offset :p_offset;

-- Members: get one record with payment + attendance rollups
-- Parameters:
--   :p_member_id bigint
--
-- select
--   m.id,
--   u.name,
--   u.phone,
--   u.email,
--   m.govt_id,
--   m.profile_photo_url,
--   m.membership_plan,
--   m.start_date,
--   m.expiry_date,
--   m.status,
--   coalesce(sum(case when p.status = 'paid' then p.amount else 0 end), 0) as total_paid,
--   coalesce(sum(case when p.status = 'pending' then p.amount else 0 end), 0) as total_pending,
--   count(distinct a.id) as attendance_rows
-- from public.members m
-- join public.users u on u.id = m.user_id
-- left join public.payments p on p.member_id = m.id
-- left join public.attendance a on a.member_id = m.id
-- where m.id = :p_member_id
-- group by m.id, u.id;

-- Attendance: mark / upsert one row
create or replace function public.owner_upsert_attendance(
  p_member_id bigint,
  p_date date,
  p_status text
)
returns table (
  id bigint,
  member_id bigint,
  date date,
  status text,
  check_in_time timestamptz
)
language plpgsql
security invoker
as $$
begin
  return query
  insert into public.attendance (member_id, date, status)
  values (p_member_id, p_date, p_status)
  on conflict (member_id, date)
  do update set
    status = excluded.status,
    check_in_time = now()
  returning attendance.id, attendance.member_id, attendance.date, attendance.status, attendance.check_in_time;
end;
$$;

-- Payments: create payment and return invoice-ready snapshot
create or replace function public.owner_record_payment(
  p_member_id bigint,
  p_amount numeric,
  p_mode text,
  p_status text,
  p_date date default current_date
)
returns table (
  payment_id bigint,
  member_id bigint,
  amount numeric,
  mode text,
  status text,
  date date
)
language plpgsql
security invoker
as $$
begin
  return query
  insert into public.payments (member_id, amount, mode, status, date)
  values (p_member_id, p_amount, p_mode, p_status, p_date)
  returning payments.id, payments.member_id, payments.amount, payments.mode, payments.status, payments.date;
end;
$$;

-- Trainer assignments
create or replace function public.owner_assign_trainer(
  p_member_id bigint,
  p_trainer_id bigint
)
returns table (
  member_id bigint,
  trainer_id bigint,
  updated_at timestamptz
)
language sql
security invoker
as $$
  update public.members
  set trainer_id = p_trainer_id
  where id = p_member_id
  returning id, trainer_id, now();
$$;

-- Invoice-ready member financial snapshot
create or replace function public.member_invoice_snapshot(p_member_id bigint)
returns table (
  member_id bigint,
  member_name text,
  phone text,
  email text,
  membership_plan text,
  total_paid numeric,
  total_pending numeric,
  last_payment_date date
)
language sql
security invoker
stable
as $$
  select
    m.id,
    u.name,
    u.phone,
    u.email,
    m.membership_plan,
    coalesce(sum(case when p.status = 'paid' then p.amount else 0 end), 0) as total_paid,
    coalesce(sum(case when p.status = 'pending' then p.amount else 0 end), 0) as total_pending,
    max(p.date) as last_payment_date
  from public.members m
  join public.users u on u.id = m.user_id
  left join public.payments p on p.member_id = m.id
  where m.id = p_member_id
  group by m.id, u.id;
$$;

-- ---------------------------------------------------------------------------
-- 2. SEARCH QUERIES
-- ---------------------------------------------------------------------------

create or replace function public.owner_search_members(
  p_query text default null,
  p_trainer_id bigint default null,
  p_status text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  member_id bigint,
  user_id uuid,
  trainer_id bigint,
  name text,
  phone text,
  email text,
  membership_plan text,
  start_date date,
  expiry_date date,
  status text,
  profile_photo_url text
)
language sql
security invoker
stable
as $$
  select
    m.id,
    m.user_id,
    m.trainer_id,
    u.name,
    u.phone,
    u.email,
    m.membership_plan,
    m.start_date,
    m.expiry_date,
    m.status,
    m.profile_photo_url
  from public.members m
  join public.users u on u.id = m.user_id
  where (
    p_query is null
    or p_query = ''
    or lower(u.name) like '%' || lower(p_query) || '%'
    or u.phone like '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
    or lower(u.email) like '%' || lower(p_query) || '%'
  )
  and (p_trainer_id is null or m.trainer_id = p_trainer_id)
  and (p_status is null or m.status = p_status)
  order by u.name asc, m.id desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.owner_search_trainers(
  p_query text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  trainer_id bigint,
  user_id uuid,
  name text,
  phone text,
  email text,
  govt_id text,
  salary numeric,
  profile_photo_url text
)
language sql
security invoker
stable
as $$
  select
    t.id,
    t.user_id,
    u.name,
    u.phone,
    u.email,
    t.govt_id,
    t.salary,
    t.profile_photo_url
  from public.trainers t
  join public.users u on u.id = t.user_id
  where (
    p_query is null
    or p_query = ''
    or lower(u.name) like '%' || lower(p_query) || '%'
    or u.phone like '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
    or lower(u.email) like '%' || lower(p_query) || '%'
  )
  order by u.name asc, t.id desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------------
-- 3. ANALYTICS QUERIES
-- ---------------------------------------------------------------------------

create or replace function public.analytics_revenue_monthly(
  p_from date,
  p_to date
)
returns table (
  bucket_month date,
  paid_total numeric,
  pending_total numeric,
  payment_count bigint
)
language sql
security invoker
stable
as $$
  with months as (
    select generate_series(
      date_trunc('month', p_from)::date,
      date_trunc('month', p_to)::date,
      interval '1 month'
    )::date as bucket_month
  )
  select
    m.bucket_month,
    coalesce(sum(case when p.status = 'paid' then p.amount else 0 end), 0) as paid_total,
    coalesce(sum(case when p.status = 'pending' then p.amount else 0 end), 0) as pending_total,
    count(p.id) as payment_count
  from months m
  left join public.payments p
    on date_trunc('month', p.date)::date = m.bucket_month
  group by m.bucket_month
  order by m.bucket_month;
$$;

create or replace function public.analytics_attendance_daily(
  p_from date,
  p_to date
)
returns table (
  bucket_day date,
  present_count bigint,
  absent_count bigint,
  distinct_members bigint
)
language sql
security invoker
stable
as $$
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as bucket_day
  )
  select
    d.bucket_day,
    count(a.id) filter (where a.status = 'present') as present_count,
    count(a.id) filter (where a.status = 'absent') as absent_count,
    count(distinct a.member_id) as distinct_members
  from days d
  left join public.attendance a on a.date = d.bucket_day
  group by d.bucket_day
  order by d.bucket_day;
$$;

create or replace function public.analytics_membership_status()
returns table (
  status text,
  member_count bigint
)
language sql
security invoker
stable
as $$
  select
    m.status,
    count(*) as member_count
  from public.members m
  group by m.status
  order by m.status;
$$;

create or replace function public.analytics_expiring_memberships(
  p_days int default 7
)
returns table (
  member_id bigint,
  name text,
  phone text,
  membership_plan text,
  expiry_date date,
  days_remaining int
)
language sql
security invoker
stable
as $$
  select
    m.id,
    u.name,
    u.phone,
    m.membership_plan,
    m.expiry_date,
    (m.expiry_date - current_date) as days_remaining
  from public.members m
  join public.users u on u.id = m.user_id
  where m.status = 'active'
    and m.expiry_date between current_date and current_date + greatest(p_days, 0)
  order by m.expiry_date asc, u.name asc;
$$;

create or replace function public.analytics_trainer_performance(
  p_from date,
  p_to date
)
returns table (
  trainer_id bigint,
  trainer_name text,
  assigned_members bigint,
  active_members bigint,
  attendance_marks bigint,
  present_marks bigint,
  collected_revenue numeric
)
language sql
security invoker
stable
as $$
  select
    t.id as trainer_id,
    u.name as trainer_name,
    count(distinct m.id) as assigned_members,
    count(distinct m.id) filter (where m.status = 'active') as active_members,
    count(a.id) as attendance_marks,
    count(a.id) filter (where a.status = 'present') as present_marks,
    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as collected_revenue
  from public.trainers t
  join public.users u on u.id = t.user_id
  left join public.members m on m.trainer_id = t.id
  left join public.attendance a
    on a.member_id = m.id
   and a.date between p_from and p_to
  left join public.payments p
    on p.member_id = m.id
   and p.date between p_from and p_to
  group by t.id, u.name
  order by collected_revenue desc, trainer_name asc;
$$;

-- Owner KPI snapshot
create or replace function public.analytics_owner_kpis(
  p_today date default current_date
)
returns table (
  revenue_today numeric,
  revenue_month numeric,
  total_members bigint,
  active_members bigint,
  total_trainers bigint,
  pending_requests bigint
)
language sql
security invoker
stable
as $$
  select
    coalesce((select sum(amount) from public.payments where status = 'paid' and date = p_today), 0) as revenue_today,
    coalesce((select sum(amount) from public.payments where status = 'paid' and date_trunc('month', date) = date_trunc('month', p_today)), 0) as revenue_month,
    (select count(*) from public.members) as total_members,
    (select count(*) from public.members where status = 'active') as active_members,
    (select count(*) from public.trainers) as total_trainers,
    (select count(*) from public.requests where status = 'pending') as pending_requests;
$$;

-- ---------------------------------------------------------------------------
-- 4. ROLE-SAFE READ QUERIES
-- ---------------------------------------------------------------------------
-- These are intended for authenticated calls where RLS is active.
-- Important: trainer-safe member lookups should NOT join public.users directly,
-- because users contains phone/email and the current schema does not do
-- column-level security. Keep trainer/client-facing reads sanitized in the API.

-- Client own membership summary (RLS-safe)
create or replace function public.client_membership_summary()
returns table (
  member_id bigint,
  membership_plan text,
  start_date date,
  expiry_date date,
  status text,
  workout_plan jsonb
)
language sql
security invoker
stable
as $$
  select
    m.id,
    m.membership_plan,
    m.start_date,
    m.expiry_date,
    m.status,
    m.workout_plan
  from public.members m
  where m.user_id = (select auth.uid());
$$;

-- Trainer assigned member cards (sanitized)
create or replace function public.trainer_member_cards()
returns table (
  member_id bigint,
  trainer_id bigint,
  membership_plan text,
  expiry_date date,
  status text,
  profile_photo_url text
)
language sql
security invoker
stable
as $$
  select
    m.id,
    m.trainer_id,
    m.membership_plan,
    m.expiry_date,
    m.status,
    m.profile_photo_url
  from public.members m
  where m.trainer_id = (select public.current_trainer_id())
  order by m.expiry_date asc nulls last, m.id desc;
$$;

-- ---------------------------------------------------------------------------
-- 5. NOTIFICATION / JOB QUERIES
-- ---------------------------------------------------------------------------

create or replace function public.notify_members_expiring(p_days int default 3)
returns table (
  member_id bigint,
  user_id uuid,
  name text,
  phone text,
  email text,
  membership_plan text,
  expiry_date date
)
language sql
security invoker
stable
as $$
  select
    m.id,
    u.id,
    u.name,
    u.phone,
    u.email,
    m.membership_plan,
    m.expiry_date
  from public.members m
  join public.users u on u.id = m.user_id
  where m.status = 'active'
    and m.expiry_date between current_date and current_date + greatest(p_days, 0)
  order by m.expiry_date asc, u.name asc;
$$;

create or replace function public.notify_unpaid_members()
returns table (
  member_id bigint,
  name text,
  phone text,
  email text,
  pending_amount numeric,
  latest_pending_date date
)
language sql
security invoker
stable
as $$
  select
    m.id,
    u.name,
    u.phone,
    u.email,
    coalesce(sum(p.amount) filter (where p.status = 'pending'), 0) as pending_amount,
    max(p.date) filter (where p.status = 'pending') as latest_pending_date
  from public.members m
  join public.users u on u.id = m.user_id
  join public.payments p on p.member_id = m.id
  where p.status = 'pending'
  group by m.id, u.id
  order by latest_pending_date asc nulls last, pending_amount desc;
$$;

create or replace function public.notify_inactive_members(p_days int default 14)
returns table (
  member_id bigint,
  name text,
  phone text,
  email text,
  last_present_date date
)
language sql
security invoker
stable
as $$
  select
    m.id,
    u.name,
    u.phone,
    u.email,
    max(a.date) filter (where a.status = 'present') as last_present_date
  from public.members m
  join public.users u on u.id = m.user_id
  left join public.attendance a on a.member_id = m.id
  where m.status = 'active'
  group by m.id, u.id
  having coalesce(max(a.date) filter (where a.status = 'present'), current_date - (p_days + 1)) < current_date - p_days
  order by last_present_date asc nulls first, u.name asc;
$$;

create or replace function public.owner_search_members_advanced(
  p_query text default null,
  p_trainer_id bigint default null,
  p_status text default null,
  p_plan text default null,
  p_expiry_before date default null,
  p_joined_after date default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  member_id bigint,
  user_id uuid,
  trainer_id bigint,
  name text,
  phone text,
  email text,
  membership_plan text,
  start_date date,
  expiry_date date,
  status text,
  profile_photo_url text
)
language sql
security invoker
stable
as $$
  select
    m.id,
    m.user_id,
    m.trainer_id,
    u.name,
    u.phone,
    u.email,
    m.membership_plan,
    m.start_date,
    m.expiry_date,
    m.status,
    m.profile_photo_url
  from public.members m
  join public.users u on u.id = m.user_id
  where (
    p_query is null
    or p_query = ''
    or lower(u.name) like '%' || lower(p_query) || '%'
    or u.phone like '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
    or lower(u.email) like '%' || lower(p_query) || '%'
    or lower(m.govt_id) like '%' || lower(p_query) || '%'
  )
  and (p_trainer_id is null or m.trainer_id = p_trainer_id)
  and (p_status is null or m.status = p_status)
  and (p_plan is null or lower(m.membership_plan) = lower(p_plan))
  and (p_expiry_before is null or m.expiry_date <= p_expiry_before)
  and (p_joined_after is null or m.start_date >= p_joined_after)
  order by m.expiry_date asc nulls last, u.name asc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.analytics_revenue_by_mode(
  p_from date,
  p_to date
)
returns table (
  payment_mode text,
  paid_total numeric,
  pending_total numeric,
  payment_count bigint
)
language sql
security invoker
stable
as $$
  select
    p.mode as payment_mode,
    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as paid_total,
    coalesce(sum(p.amount) filter (where p.status = 'pending'), 0) as pending_total,
    count(*) as payment_count
  from public.payments p
  where p.date between p_from and p_to
  group by p.mode
  order by paid_total desc, payment_mode asc;
$$;

create or replace function public.analytics_membership_pressure(
  p_days int default 7
)
returns table (
  bucket text,
  member_count bigint
)
language sql
security invoker
stable
as $$
  select bucket, count(*) as member_count
  from (
    select
      case
        when status <> 'active' then 'inactive'
        when expiry_date < current_date then 'expired'
        when expiry_date <= current_date + greatest(p_days, 0) then 'expiring-soon'
        else 'healthy'
      end as bucket
    from public.members
  ) buckets
  group by bucket
  order by bucket asc;
$$;

-- ---------------------------------------------------------------------------
-- 6. OPTIONAL SCALE-UP IMPROVEMENTS
-- ---------------------------------------------------------------------------
-- Use when dashboard traffic grows or analytics windows widen:
--
-- create materialized view public.mv_daily_gym_kpis as
-- select
--   d::date as bucket_day,
--   coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as revenue_paid,
--   count(a.id) filter (where a.status = 'present') as attendance_present
-- from generate_series(current_date - interval '180 days', current_date, interval '1 day') d
-- left join public.payments p on p.date = d::date
-- left join public.attendance a on a.date = d::date
-- group by d::date;
--
-- refresh materialized view concurrently public.mv_daily_gym_kpis;
--
-- If attendance or payments grow past hundreds of thousands of rows, consider:
--   1. monthly partitioning on attendance.date and payments.date
--   2. nightly refresh of materialized analytics
--   3. direct SQL API routes instead of bundle-then-filter query patterns

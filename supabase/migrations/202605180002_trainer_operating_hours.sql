-- Trainer check-in windows: 6:00–10:00 AM and 4:00–10:00 PM (Asia/Kolkata)

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
  v_local_time time;
  v_local_minutes integer;
  v_in_window boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_local_time := (now() at time zone 'Asia/Kolkata')::time;
  v_local_minutes := extract(hour from v_local_time)::integer * 60
    + extract(minute from v_local_time)::integer;

  v_in_window :=
    (v_local_minutes >= 360 and v_local_minutes <= 600)
    or (v_local_minutes >= 960 and v_local_minutes <= 1320);

  if not v_in_window then
    raise exception 'Check-in is available only during 6:00-10:00 AM and 4:00-10:00 PM';
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
    (now() at time zone 'Asia/Kolkata')::date,
    case
      when (v_local_minutes >= 360 and v_local_minutes <= 600 and v_local_minutes > 360)
        or (v_local_minutes >= 960 and v_local_minutes <= 1320 and v_local_minutes > 960)
      then 'late'
      else 'present'
    end,
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

comment on function public.check_in_trainer_attendance is
  'Trainer daily check-in. Allowed windows: 06:00-10:00 and 16:00-22:00 Asia/Kolkata.';

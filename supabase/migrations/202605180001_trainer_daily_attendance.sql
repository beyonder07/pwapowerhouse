-- Optional expected floor hours per trainer (not session splits)
alter table public.user_details
  add column if not exists floor_start_time time,
  add column if not exists floor_end_time time;

comment on column public.user_details.floor_start_time is 'Expected check-in time for late detection';
comment on column public.user_details.floor_end_time is 'Expected end of floor duty (display / analytics)';

-- Daily trainer attendance on unified attendance table
alter table public.attendance
  add column if not exists check_out_time timestamptz;

alter table public.trainer_attendance
  add column if not exists check_out_time timestamptz;

-- Expand status values for trainers (present, late, half-day)
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.trainer_attendance drop constraint if exists trainer_attendance_status_check;

alter table public.attendance
  add constraint attendance_status_check
  check (status in ('present', 'absent', 'late', 'half-day'));

alter table public.trainer_attendance
  add constraint trainer_attendance_status_check
  check (status in ('present', 'absent', 'late', 'half-day'));

insert into public.gym_branches (name, latitude, longitude, radius_meters, timezone)
values
  ('Indira Chowk Branch', 28.613939, 77.209023, 150, 'Asia/Kolkata'),
  ('Pathik Chowk Branch', 28.612912, 77.229510, 150, 'Asia/Kolkata')
on conflict do nothing;

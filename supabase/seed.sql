insert into public.gyms (name, latitude, longitude, radius)
values
  ('Indira Chowk Branch', 28.613939, 77.209023, 150),
  ('Pathik Chowk Branch', 28.612912, 77.229510, 150)
on conflict (name) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius = excluded.radius;

insert into public.gym_branches (name, latitude, longitude, radius_meters)
values
  ('Indira Chowk Branch', 28.613939, 77.209023, 150),
  ('Pathik Chowk Branch', 28.612912, 77.229510, 150)
on conflict do nothing;

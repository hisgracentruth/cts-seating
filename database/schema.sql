create table if not exists seating_state (
  room_id text primary key,
  payload jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

insert into seating_state (room_id, payload)
values ('default', '{"people":[],"categories":[]}'::jsonb)
on conflict (room_id) do nothing;

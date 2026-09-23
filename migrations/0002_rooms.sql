create table if not exists rooms (
  code text primary key,
  host_token text not null,
  status text not null,
  total_rounds integer not null default 20,
  version integer not null default 0,
  payload jsonb not null default '{"game":null,"undo":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists room_players (
  id text primary key,
  room_code text not null references rooms (code) on delete cascade,
  display_name text not null,
  player_token text not null unique,
  seat integer not null,
  created_at timestamptz not null default now(),
  unique (room_code, seat)
);

create index if not exists room_players_room_idx on room_players (room_code);

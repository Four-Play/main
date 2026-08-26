-- ============================================================
-- FourPlay base schema — run this in a fresh Supabase project
-- Then run 002_allow_both_sides_picks.sql and 003_device_tokens.sql
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  avatar_url   text,
  total_points integer not null default 0,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── leagues ──────────────────────────────────────────────────
create table public.leagues (
  id                   uuid default gen_random_uuid() primary key,
  name                 text not null,
  invite_code          text not null unique,
  admin_id             uuid not null references auth.users(id),
  entry_fee_cents      integer not null default 0,
  payout_per_loss_cents integer not null default 5000,
  spread_cushion       integer not null default 0,
  is_locked            boolean not null default false,
  created_at           timestamptz default now()
);

alter table public.leagues enable row level security;

-- leagues policies added after league_members table is created (see below)

-- ── league_members ───────────────────────────────────────────
create table public.league_members (
  id               uuid default gen_random_uuid() primary key,
  league_id        uuid not null references public.leagues(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null default 'member' check (role in ('admin', 'member')),
  league_points    integer not null default 0,
  wins             integer not null default 0,
  losses           integer not null default 0,
  total_owed_cents integer not null default 0,
  joined_at        timestamptz default now(),
  unique (league_id, user_id)
);

alter table public.league_members enable row level security;

create policy "league_members_select_member" on public.league_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.league_members lm2
      where lm2.league_id = league_id and lm2.user_id = auth.uid()
    )
  );

create policy "league_members_insert_auth" on public.league_members
  for insert with check (auth.uid() = user_id or auth.uid() in (
    select admin_id from public.leagues where id = league_id
  ));

create policy "league_members_update_own" on public.league_members
  for update using (auth.uid() = user_id);

create policy "league_members_delete_own" on public.league_members
  for delete using (auth.uid() = user_id or auth.uid() in (
    select admin_id from public.leagues where id = league_id
  ));

-- ── leagues policies (after league_members exists) ───────────
create policy "leagues_select_member" on public.leagues
  for select using (
    exists (
      select 1 from public.league_members
      where league_id = id and user_id = auth.uid()
    )
  );

create policy "leagues_insert_auth" on public.leagues
  for insert with check (auth.uid() = admin_id);

create policy "leagues_update_admin" on public.leagues
  for update using (auth.uid() = admin_id);

create policy "leagues_delete_admin" on public.leagues
  for delete using (auth.uid() = admin_id);

-- ── games ────────────────────────────────────────────────────
create table public.games (
  id             uuid default gen_random_uuid() primary key,
  external_id    text unique,
  home_team      text,
  away_team      text,
  favorite_team  text,
  underdog_team  text,
  spread         numeric not null default 0,
  total          numeric,
  commence_time  timestamptz,
  nfl_week       integer,
  season_year    integer,
  home_score     integer,
  away_score     integer,
  status         text not null default 'upcoming' check (status in ('upcoming', 'live', 'final')),
  created_at     timestamptz default now()
);

alter table public.games enable row level security;

create policy "games_select_all" on public.games
  for select using (true);

-- ── picks ────────────────────────────────────────────────────
create table public.picks (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  league_id     uuid not null references public.leagues(id) on delete cascade,
  game_id       uuid not null references public.games(id) on delete cascade,
  team_selected text not null,
  is_locked     boolean not null default false,
  result        text check (result in ('win', 'loss')),
  nfl_week      integer not null,
  season_year   integer not null,
  created_at    timestamptz default now(),
  unique (user_id, league_id, game_id, team_selected)
);

alter table public.picks enable row level security;

create policy "picks_select_league_member" on public.picks
  for select using (
    exists (
      select 1 from public.league_members
      where league_id = picks.league_id and user_id = auth.uid()
    )
  );

create policy "picks_insert_own" on public.picks
  for insert with check (auth.uid() = user_id);

create policy "picks_update_own" on public.picks
  for update using (auth.uid() = user_id);

create policy "picks_delete_own" on public.picks
  for delete using (auth.uid() = user_id);

-- ── weekly_results ───────────────────────────────────────────
create table public.weekly_results (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  league_id        uuid not null references public.leagues(id) on delete cascade,
  nfl_week         integer not null,
  season_year      integer not null,
  picks_correct    integer not null default 0,
  is_winner        boolean not null default false,
  amount_won_cents  integer not null default 0,
  amount_owed_cents integer not null default 0,
  calculated_at    timestamptz default now(),
  unique (user_id, league_id, nfl_week, season_year)
);

alter table public.weekly_results enable row level security;

create policy "weekly_results_select_league_member" on public.weekly_results
  for select using (
    exists (
      select 1 from public.league_members
      where league_id = weekly_results.league_id and user_id = auth.uid()
    )
  );

-- ── device_tokens (from migration 003) ───────────────────────
create table public.device_tokens (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text not null default 'ios',
  created_at timestamptz default now(),
  unique(token)
);

alter table public.device_tokens enable row level security;

create policy "users_own_tokens" on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

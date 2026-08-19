-- Device tokens for push notifications (APNs for iOS)
create table if not exists public.device_tokens (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null default 'ios',
  created_at  timestamptz default now(),
  unique(token)
);

alter table public.device_tokens enable row level security;

-- Users can read and write their own tokens; service role bypasses RLS for scoring/cron
create policy "users_own_tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ── Game saves ─────────────────────────────────────────────────────────────
create table if not exists game_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique not null references auth.users on delete cascade,
  monster     jsonb,
  inventory   jsonb default '[]'::jsonb,
  coins       integer default 100,
  updated_at  timestamptz default now()
);

alter table game_saves enable row level security;

create policy "Users can read their own save"
  on game_saves for select using (auth.uid() = user_id);

create policy "Users can insert their own save"
  on game_saves for insert with check (auth.uid() = user_id);

create policy "Users can update their own save"
  on game_saves for update using (auth.uid() = user_id);

create policy "Users can delete their own save"
  on game_saves for delete using (auth.uid() = user_id);

-- Auto-update updated_at on save
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger game_saves_updated_at
  before update on game_saves
  for each row execute function touch_updated_at();

-- =============================================================================
-- Streaks -- clean schema
-- Run this in the Supabase SQL Editor to reset everything from scratch.
-- WARNING: drops all existing data.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- Drop everything that might exist from older versions
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.task_completions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.profiles cascade;

-- =============================================================================
-- tasks
-- =============================================================================
create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 200),
  active_days integer[] not null default '{}',
  color       text not null default '#F07F13'
              check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks(user_id);

-- =============================================================================
-- task_completions
-- =============================================================================
create table public.task_completions (
  id             uuid primary key default uuid_generate_v4(),
  task_id        uuid not null references public.tasks(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  constraint task_completions_unique unique (task_id, completed_date)
);

create index task_completions_task_id_idx on public.task_completions(task_id);
create index task_completions_user_date_idx on public.task_completions(user_id, completed_date desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks"
  on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

create policy "Users can view own completions"
  on public.task_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions"
  on public.task_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions"
  on public.task_completions for delete using (auth.uid() = user_id);

-- =============================================================================
-- v2 tables
-- Drop if they exist (safe re-run)
-- =============================================================================
drop table if exists public.notifications cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.friendships cascade;
drop table if exists public.sub_records cascade;
drop table if exists public.activity_tag_links cascade;
drop table if exists public.goal_tag_links cascade;
drop table if exists public.tags cascade;
drop table if exists public.activities cascade;
drop table if exists public.goals cascade;

-- goals
create table public.goals (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 500),
  active_days  integer[] not null default '{}',
  priority     integer not null default 3 check (priority between 1 and 5),
  tag_ids      text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index goals_user_id_idx on public.goals(user_id);
alter table public.goals enable row level security;
create policy "Users manage own goals" on public.goals using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goal_completions
create table public.goal_completions (
  id             uuid primary key default uuid_generate_v4(),
  goal_id        uuid not null references public.goals(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  constraint goal_completions_unique unique (goal_id, completed_date)
);
create index goal_completions_goal_id_idx on public.goal_completions(goal_id);
create index goal_completions_user_date_idx on public.goal_completions(user_id, completed_date desc);
alter table public.goal_completions enable row level security;
create policy "Users manage own goal completions" on public.goal_completions using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activities
create table public.activities (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  assigner_user_id  uuid references auth.users(id) on delete set null,
  assignee_user_id  uuid references auth.users(id) on delete set null,
  group_id          uuid,
  title             text not null check (char_length(title) between 1 and 120),
  description       text check (char_length(description) <= 500),
  activity_date     date,
  activity_time     time,
  priority          integer not null default 3 check (priority between 1 and 5),
  tag_ids           text[] not null default '{}',
  status            text not null default 'accepted' check (status in ('pending','accepted','completed','rejected')),
  reminder_minutes  integer[] not null default '{}',
  snooze_minutes    integer not null default 15,
  loop_count        integer not null default 1,
  created_at        timestamptz not null default now()
);
create index activities_user_id_idx on public.activities(user_id);
alter table public.activities enable row level security;
create policy "Users manage own activities" on public.activities using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Assigners can view" on public.activities for select using (auth.uid() = assigner_user_id);

-- sub_records
create table public.sub_records (
  id          uuid primary key default uuid_generate_v4(),
  goal_id     uuid references public.goals(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.sub_records enable row level security;
create policy "Users manage own sub_records" on public.sub_records using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tags (global, managed by admin)
create table public.tags (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique check (char_length(name) between 1 and 40),
  color      text,
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;
create policy "All authenticated users can view tags" on public.tags for select using (auth.role() = 'authenticated');

-- friendships
create table public.friendships (
  id                      uuid primary key default uuid_generate_v4(),
  requester_id            uuid not null references auth.users(id) on delete cascade,
  addressee_id            uuid not null references auth.users(id) on delete cascade,
  status                  text not null default 'pending' check (status in ('pending','accepted','blocked')),
  auto_accept_activities  boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint friendships_unique unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
create policy "Users view own friendships" on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users manage own friendships" on public.friendships using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- groups
create table public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "Owner manages group" on public.groups using (auth.uid() = created_by);

-- group_members (must exist before the groups membership-check policy)
create table public.group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint group_members_unique unique (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "Users view own memberships" on public.group_members for select using (auth.uid() = user_id or
  exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy "Users manage own memberships" on public.group_members using (auth.uid() = user_id);

-- groups membership-check policy (added after group_members exists)
create policy "Members view groups" on public.groups for select using (
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
);

-- notifications
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id, read, created_at desc);
alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- profiles (public cache of auth.users user_metadata — synced via trigger)
-- Allows joining without service role for display names.
-- =============================================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  bio        text,
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are public read" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_user_profile_upsert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username, bio, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'bio',
    now()
  )
  on conflict (id) do update set
    username   = excluded.username,
    bio        = excluded.bio,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_profile_sync
  after insert or update on auth.users
  for each row execute procedure public.handle_user_profile_upsert();

notify pgrst, 'reload schema';

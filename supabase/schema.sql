-- =============================================================================
-- Streaks -- Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / DROP...IF EXISTS
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- profiles
-- One row per authenticated user. Created automatically via a DB trigger
-- when a new user signs up through Supabase Auth.
-- =============================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Trigger: insert a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- tasks
-- A habit / recurring task configured by the user.
-- active_days stores an array of JS day-of-week ints: 0=Sun ... 6=Sat
-- =============================================================================

create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 200),
  active_days integer[] not null default '{}',
  color       text not null default '#F07F13'
              check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- =============================================================================
-- task_completions
-- Records each day a task was marked complete.
-- The unique constraint prevents duplicate completions for the same task+date.
-- =============================================================================

create table if not exists public.task_completions (
  id             uuid primary key default uuid_generate_v4(),
  task_id        uuid not null references public.tasks (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),

  constraint task_completions_unique unique (task_id, completed_date)
);

create index if not exists task_completions_task_id_idx
  on public.task_completions (task_id);

create index if not exists task_completions_user_date_idx
  on public.task_completions (user_id, completed_date desc);

-- =============================================================================
-- Row Level Security (RLS)
-- Every user can only access their own rows.
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_completions  enable row level security;

-- profiles
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- tasks
drop policy if exists "Users can view own tasks"   on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can view own tasks"
  on public.tasks for select using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

-- task_completions
drop policy if exists "Users can view own completions"   on public.task_completions;
drop policy if exists "Users can insert own completions" on public.task_completions;
drop policy if exists "Users can delete own completions" on public.task_completions;

create policy "Users can view own completions"
  on public.task_completions for select using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.task_completions for insert with check (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.task_completions for delete using (auth.uid() = user_id);

-- =============================================================================
-- Notify PostgREST to reload its schema cache.
-- This is REQUIRED after creating new tables so the API can see them.
-- Without this, you get: "Could not find the table 'public.tasks' in the schema cache"
-- =============================================================================
notify pgrst, 'reload schema';

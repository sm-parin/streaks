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

notify pgrst, 'reload schema';

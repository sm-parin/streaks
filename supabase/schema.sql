-- =============================================================================
-- Streaks — v3 clean schema
-- Run in the Supabase SQL Editor to reset everything from scratch.
-- WARNING: drops all existing data.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- Drop old triggers/functions/tables
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_profile_sync on auth.users;
-- Trigger drops are handled by DROP TABLE CASCADE below; wrap in DO to avoid
-- "relation does not exist" when running on a fresh database
do $$ begin
  drop trigger if exists records_updated_at on public.records;
  drop trigger if exists task_list_updated_at on public.records;
exception when undefined_table then null;
end $$;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_user_profile_upsert() cascade;
drop function if exists public.update_record_timestamp() cascade;
drop function if exists public.propagate_task_updated_at() cascade;
drop table if exists public.record_completions cascade;
drop table if exists public.records cascade;
drop table if exists public.notifications cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.friendships cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tags cascade;
-- v1/v2 tables
drop table if exists public.task_completions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.sub_records cascade;
drop table if exists public.activities cascade;
drop table if exists public.goals cascade;
drop table if exists public.goal_completions cascade;

-- =============================================================================
-- Tags (admin-managed, global)
-- =============================================================================
create table public.tags (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique check (char_length(name) between 1 and 40),
  color      text not null default '#64748b',
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;
create policy "Tags viewable by authenticated users" on public.tags
  for select using (auth.role() = 'authenticated');

-- Seed default tags
insert into public.tags (name, color) values
  ('Work',     '#3B82F6'),
  ('Personal', '#F07F13'),
  ('Health',   '#22C55E'),
  ('Study',    '#A855F7');

-- =============================================================================
-- Profiles (cache of auth.users user_metadata)
-- =============================================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  bio        text,
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are public read"  on public.profiles for select using (true);
create policy "Users update own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile"  on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_user_profile_upsert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username, bio, updated_at)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'bio', now())
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

-- =============================================================================
-- Friendships
-- =============================================================================
create table public.friendships (
  id                uuid primary key default uuid_generate_v4(),
  requester_id      uuid not null references auth.users(id) on delete cascade,
  addressee_id      uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending','accepted','blocked')),
  auto_accept_tasks boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint friendships_unique unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
create policy "Users view own friendships"   on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users manage own friendships" on public.friendships
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- =============================================================================
-- Groups
-- =============================================================================
create table public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "Group owner manages group" on public.groups using (auth.uid() = created_by);
-- "Members view groups" policy added after group_members table is created below

create table public.group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  status     text not null default 'active'  check (status in ('pending','active')),
  joined_at  timestamptz,
  created_at timestamptz not null default now(),
  constraint group_members_unique unique (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "Users view own memberships" on public.group_members
  for select using (auth.uid() = user_id or
    exists (select 1 from public.group_members gm
            where gm.group_id = group_id and gm.user_id = auth.uid() and gm.status = 'active'));
create policy "Users manage own memberships" on public.group_members using (auth.uid() = user_id);

-- Now safe to add: group_members exists
create policy "Members view groups" on public.groups for select using (
  auth.uid() = created_by or
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid() and status = 'active')
);

-- =============================================================================
-- Records (Tasks and Lists — single polymorphic table)
-- =============================================================================
create table public.records (
  id               uuid primary key default uuid_generate_v4(),
  kind             text not null check (kind in ('task','list')),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 120),
  priority         integer not null default 3 check (priority between 1 and 5),
  tag_ids          uuid[]  not null default '{}',
  status           text    not null default 'accepted'
                   check (status in ('pending','accepted','completed','rejected')),
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  description      text,
  is_recurring     boolean not null default false,
  active_days      integer[] not null default '{}',
  specific_date    date,
  time_from        time,
  time_to          time,
  assigner_user_id uuid references auth.users(id) on delete set null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  group_id         uuid references public.groups(id) on delete set null,
  list_id          uuid references public.records(id) on delete set null,
  social_mutual    jsonb not null default '[]'
);

create index records_user_id_idx    on public.records(user_id);
create index records_assignee_idx   on public.records(assignee_user_id)   where assignee_user_id is not null;
create index records_assigner_idx   on public.records(assigner_user_id)   where assigner_user_id is not null;
create index records_list_id_idx    on public.records(list_id)             where list_id is not null;
create index records_updated_at_idx on public.records(updated_at desc);
create index records_kind_user_idx  on public.records(kind, user_id);

alter table public.records enable row level security;
create policy "Users view own and assigned records" on public.records
  for select using (
    auth.uid() = user_id or
    auth.uid() = assignee_user_id or
    auth.uid() = assigner_user_id
  );
create policy "Users insert own records" on public.records
  for insert with check (auth.uid() = user_id);
create policy "Users update own records" on public.records
  for update using (auth.uid() = user_id);
create policy "Users delete own records" on public.records
  for delete using (auth.uid() = user_id);

create or replace function public.update_record_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger records_updated_at
  before update on public.records
  for each row execute procedure public.update_record_timestamp();

create or replace function public.propagate_task_updated_at()
returns trigger language plpgsql as $$
begin
  if new.list_id is not null then
    update public.records set updated_at = now() where id = new.list_id;
  end if;
  return new;
end;
$$;
create trigger task_list_updated_at
  after update on public.records
  for each row when (new.kind = 'task' and new.list_id is not null)
  execute procedure public.propagate_task_updated_at();

-- =============================================================================
-- Record Completions
-- =============================================================================
create table public.record_completions (
  id             uuid primary key default uuid_generate_v4(),
  record_id      uuid not null references public.records(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  constraint record_completions_unique unique (record_id, user_id, completed_date)
);
create index record_completions_record_idx    on public.record_completions(record_id);
create index record_completions_user_date_idx on public.record_completions(user_id, completed_date desc);

alter table public.record_completions enable row level security;
create policy "Users manage own completions" on public.record_completions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Notifications
-- =============================================================================
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read, created_at desc);
alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

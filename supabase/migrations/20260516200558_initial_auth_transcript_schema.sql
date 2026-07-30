create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'unlimited')),
  offer_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transcript_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input text not null,
  language text not null default 'en',
  status text not null check (status in ('success', 'failure')),
  video_id text,
  video_url text,
  title text,
  channel_name text,
  thumbnail_url text,
  transcript text,
  segments jsonb not null default '[]'::jsonb,
  raw_item jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transcript_generations_user_created_idx
  on public.transcript_generations (user_id, created_at desc);

create index if not exists transcript_generations_daily_success_idx
  on public.transcript_generations (user_id, created_at)
  where status = 'success';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.transcript_generations enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can read their own transcript history" on public.transcript_generations;
create policy "Users can read their own transcript history"
on public.transcript_generations
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

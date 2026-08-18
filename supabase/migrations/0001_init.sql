-- PaperCat core schema: papers catalog + per-user profile + per-user/per-paper progress.
-- Run this in the Supabase SQL editor (or `supabase db push` if you use the CLI).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

-- ============================================================================
-- 1. papers — the catalog shown in Explore / Home / PaperDetail / LearningComplete.
--    Public read (guests browse it too); writes are admin-only (no client policy).
-- ============================================================================
create table if not exists public.papers (
  id            text primary key,                 -- 'attention', 'bert', ...
  grade         text not null check (grade in ('S', 'Normal')),
  cat           text not null check (cat in ('NLP', 'CV', 'RL', '생성AI')),
  title         text not null,
  date_label    text not null,                     -- '2017.06.12' (display string, not a real date)
  year          int  not null,
  cites_label   text not null,                     -- '100k+'
  cites_num     int  not null default 0,
  trending      boolean not null default false,
  quote_policy  text not null default 'short-quote-and-link'
                  check (quote_policy in ('short-quote-and-link', 'full-with-attribution')),
  ingest_status text not null default 'pending' check (ingest_status in ('ready', 'pending')),
  created_at    timestamptz not null default now()
);

alter table public.papers enable row level security;

drop policy if exists "papers are publicly readable" on public.papers;
create policy "papers are publicly readable"
  on public.papers for select
  using (true);

-- ============================================================================
-- 2. profiles — one row per auth user; mirrors the gamification fields in
--    src/store.ts (level, xp, streak, hearts, ...). Created automatically on
--    signup by the trigger below.
-- ============================================================================
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  cat_name             text not null default '식빵',
  personality          text not null default 'curious'
                          check (personality in ('curious', 'calm', 'passionate', 'chill')),
  ai_level             text not null default 'beginner'
                          check (ai_level in ('beginner', 'intermediate')),
  level                int not null default 1,
  xp                   int not null default 0,
  xp_to_next           int not null default 100,
  total_xp             int not null default 0,
  streak_days          int not null default 0,
  hearts               int not null default 5,
  papers_done          int not null default 0,
  weekly_minutes       int not null default 0,
  weekly_goal_minutes  int not null default 300,
  weekly_goal_papers   int not null default 3,
  weekly_goal_label    text not null default '꾸준히',
  interests            text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when someone signs up (AuthScreen's supabase.auth.signUp
-- call passes { name, birthdate, aiLevel } as user metadata — we only use aiLevel here).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, ai_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'aiLevel', 'beginner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. paper_progress — per-user, per-paper reading/summary state. Backs
--    CollectionScreen's collected badges, PaperDetail's "요약 완료" flag, and
--    Home/Study's "이어서 학습하기" progress bar.
-- ============================================================================
create table if not exists public.paper_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  paper_id      text not null references public.papers(id) on delete cascade,
  progress      numeric not null default 0 check (progress >= 0 and progress <= 1),
  seen          boolean not null default false,
  summary_done  boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (user_id, paper_id)
);

alter table public.paper_progress enable row level security;

drop policy if exists "users can read own progress" on public.paper_progress;
create policy "users can read own progress"
  on public.paper_progress for select
  using (auth.uid() = user_id);

drop policy if exists "users can upsert own progress" on public.paper_progress;
create policy "users can insert own progress"
  on public.paper_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own progress" on public.paper_progress;
create policy "users can update own progress"
  on public.paper_progress for update
  using (auth.uid() = user_id);

drop trigger if exists set_paper_progress_updated_at on public.paper_progress;
create trigger set_paper_progress_updated_at
  before update on public.paper_progress
  for each row execute function public.set_updated_at();

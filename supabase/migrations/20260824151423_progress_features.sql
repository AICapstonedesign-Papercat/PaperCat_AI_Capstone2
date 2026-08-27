-- Backs the features that were previously hardcoded on-screen:
--   - StudyScreen's weekly chart/heatmap/streak badge
--   - StageMapScreen's per-stage done/active/locked status
--   - DiscussionScreen's vote bar
--   - ProfileScreen's "도전 승률" (challenge win rate)
-- Safe to re-run: every statement is guarded.

-- ============================================================================
-- 1. daily_activity — one row per user per day, minutes spent reading.
--    Backs StudyScreen's weekly bar/line chart and the monthly heatmap, and
--    is written to by touch_daily_streak() below.
-- ============================================================================
create table if not exists public.daily_activity (
  user_id       uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  minutes       int  not null default 0,
  primary key (user_id, activity_date)
);

alter table public.daily_activity enable row level security;

drop policy if exists "users can read own daily activity" on public.daily_activity;
create policy "users can read own daily activity"
  on public.daily_activity for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own daily activity" on public.daily_activity;
create policy "users can insert own daily activity"
  on public.daily_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own daily activity" on public.daily_activity;
create policy "users can update own daily activity"
  on public.daily_activity for update
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. profiles additions — streak bookkeeping + summary-challenge win rate.
-- ============================================================================
alter table public.profiles add column if not exists last_active_date date;
alter table public.profiles add column if not exists challenge_attempts int not null default 0;
alter table public.profiles add column if not exists challenge_passes int not null default 0;

-- ============================================================================
-- 3. discussion_votes — one vote per user per paper. Read is open to any
--    authenticated user so the app can show aggregate counts (찬성/비판 %);
--    write is restricted to the caller's own row.
-- ============================================================================
create table if not exists public.discussion_votes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  paper_id   text not null references public.papers(id) on delete cascade,
  side       text not null check (side in ('pro', 'critical')),
  created_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

alter table public.discussion_votes enable row level security;

drop policy if exists "authenticated users can read vote counts" on public.discussion_votes;
create policy "authenticated users can read vote counts"
  on public.discussion_votes for select
  using (auth.role() = 'authenticated');

drop policy if exists "users can cast own vote" on public.discussion_votes;
create policy "users can cast own vote"
  on public.discussion_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can change own vote" on public.discussion_votes;
create policy "users can change own vote"
  on public.discussion_votes for update
  using (auth.uid() = user_id);

-- ============================================================================
-- 4. record_challenge_attempt — atomic increment, avoids a racy
--    fetch-then-write from the client for the pass/fail counters.
-- ============================================================================
-- security definer bypasses RLS to do the atomic increment, so it must check
-- the caller is only ever touching their own row.
create or replace function public.record_challenge_attempt(p_user_id uuid, p_passed boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set challenge_attempts = challenge_attempts + 1,
      challenge_passes   = challenge_passes + (case when p_passed then 1 else 0 end)
  where id = p_user_id;
end;
$$;

-- ============================================================================
-- 5. touch_daily_streak — call once per app session (and again with real
--    minutes when a reading session ends). Atomically:
--      - bumps streak_days if last_active_date was yesterday
--      - resets streak_days to 1 if there was a gap (or first-ever activity)
--      - leaves streak_days alone if already touched today
--      - upserts today's row in daily_activity, adding p_minutes
--    Returns the resulting streak_days.
-- ============================================================================
create or replace function public.touch_daily_streak(p_user_id uuid, p_minutes int default 0)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_last   date;
  v_streak int;
begin
  if p_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  select last_active_date, streak_days into v_last, v_streak
  from public.profiles where id = p_user_id;

  if v_last is null or v_last < current_date - 1 then
    v_streak := 1;
  elsif v_last = current_date - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  end if; -- v_last = current_date: already counted today, leave v_streak as-is

  update public.profiles
  set streak_days = v_streak, last_active_date = current_date
  where id = p_user_id;

  insert into public.daily_activity (user_id, activity_date, minutes)
  values (p_user_id, current_date, greatest(p_minutes, 0))
  on conflict (user_id, activity_date)
  do update set minutes = public.daily_activity.minutes + excluded.minutes;

  return v_streak;
end;
$$;

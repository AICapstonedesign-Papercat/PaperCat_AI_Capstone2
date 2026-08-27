import { supabase } from './supabase';
import type { Paper } from '../data/papers';
import type { PaperCatState } from '../store';

// Row shapes mirror supabase/migrations/0001_init.sql exactly (snake_case columns).

type PaperRow = {
  id: string;
  grade: 'S' | 'Normal';
  cat: 'NLP' | 'CV' | 'RL' | '생성AI';
  title: string;
  date_label: string;
  year: number;
  cites_label: string;
  cites_num: number;
  trending: boolean;
};

export type ProfileRow = {
  id: string;
  cat_name: string;
  personality: 'curious' | 'calm' | 'passionate' | 'chill';
  ai_level: 'beginner' | 'intermediate';
  level: number;
  xp: number;
  xp_to_next: number;
  total_xp: number;
  streak_days: number;
  hearts: number;
  papers_done: number;
  weekly_minutes: number;
  weekly_goal_minutes: number;
  weekly_goal_papers: number;
  weekly_goal_label: string;
  interests: string[];
  challenge_attempts: number;
  challenge_passes: number;
};

export type PaperProgressRow = {
  user_id: string;
  paper_id: string;
  progress: number;
  seen: boolean;
  summary_done: boolean;
};

function paperRowToPaper(row: PaperRow): Paper {
  return {
    id: row.id,
    grade: row.grade,
    cat: row.cat,
    title: row.title,
    date: row.date_label,
    year: row.year,
    cites: row.cites_label,
    citesNum: row.cites_num,
    trending: row.trending,
  };
}

export async function fetchPapers(): Promise<Paper[]> {
  const { data, error } = await supabase
    .from('papers')
    .select('id, grade, cat, title, date_label, year, cites_label, cites_num, trending')
    .order('cites_num', { ascending: false });
  if (error) throw error;
  return (data as PaperRow[]).map(paperRowToPaper);
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

const PROFILE_STATE_TO_COLUMN: Record<string, keyof ProfileRow> = {
  catName: 'cat_name',
  personality: 'personality',
  aiLevel: 'ai_level',
  level: 'level',
  xp: 'xp',
  xpToNext: 'xp_to_next',
  totalXp: 'total_xp',
  streakDays: 'streak_days',
  hearts: 'hearts',
  papersDone: 'papers_done',
  weeklyMinutes: 'weekly_minutes',
  weeklyGoalMinutes: 'weekly_goal_minutes',
  weeklyGoalPapers: 'weekly_goal_papers',
  weeklyGoalLabel: 'weekly_goal_label',
  interests: 'interests',
  // challengeAttempts/challengePasses are deliberately NOT mapped here — they're
  // written server-side only, via the record_challenge_attempt() RPC (atomic
  // increment), and pulled into local state on hydration/after the RPC call.
  // If they were in this map, a plain `set({challengeAttempts: n})` for local
  // UI refresh would also push an upsert here, racing/overwriting the RPC's
  // atomic increment.
};

// Fields in PaperCatState that get synced 1:1 to the `profiles` table.
export const PROFILE_STATE_KEYS = Object.keys(PROFILE_STATE_TO_COLUMN) as (keyof PaperCatState)[];

export function profileRowToState(row: ProfileRow): Partial<PaperCatState> {
  return {
    catName: row.cat_name,
    personality: row.personality,
    aiLevel: row.ai_level,
    level: row.level,
    xp: row.xp,
    xpToNext: row.xp_to_next,
    totalXp: row.total_xp,
    streakDays: row.streak_days,
    hearts: row.hearts,
    papersDone: row.papers_done,
    weeklyMinutes: row.weekly_minutes,
    weeklyGoalMinutes: row.weekly_goal_minutes,
    weeklyGoalPapers: row.weekly_goal_papers,
    weeklyGoalLabel: row.weekly_goal_label,
    interests: row.interests,
    challengeAttempts: row.challenge_attempts,
    challengePasses: row.challenge_passes,
  };
}

export function statePatchToProfileColumns(patch: Partial<PaperCatState>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  for (const [stateKey, column] of Object.entries(PROFILE_STATE_TO_COLUMN)) {
    if (stateKey in patch) columns[column] = (patch as Record<string, unknown>)[stateKey];
  }
  return columns;
}

export async function upsertProfile(userId: string, columns: Record<string, unknown>): Promise<void> {
  if (Object.keys(columns).length === 0) return;
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...columns });
  if (error) throw error;
}

export async function fetchPaperProgress(userId: string): Promise<PaperProgressRow[]> {
  const { data, error } = await supabase
    .from('paper_progress')
    .select('user_id, paper_id, progress, seen, summary_done')
    .eq('user_id', userId);
  if (error) throw error;
  return data as PaperProgressRow[];
}

// Reconstructs the store's flat `seenPapers` array and mixed `progress` record
// (`{ [paperId]: number, [paperId + '_summary']: boolean }`) from progress rows.
export function progressRowsToState(rows: PaperProgressRow[]): Partial<PaperCatState> {
  const seenPapers: string[] = [];
  const progress: Record<string, number | boolean> = {};
  for (const row of rows) {
    if (row.seen) seenPapers.push(row.paper_id);
    if (row.progress > 0) progress[row.paper_id] = row.progress;
    if (row.summary_done) progress[`${row.paper_id}_summary`] = true;
  }
  return { seenPapers, progress };
}

export async function upsertPaperProgress(
  userId: string,
  paperId: string,
  patch: Partial<Pick<PaperProgressRow, 'progress' | 'seen' | 'summary_done'>>,
): Promise<void> {
  const { error } = await supabase
    .from('paper_progress')
    .upsert({ user_id: userId, paper_id: paperId, ...patch }, { onConflict: 'user_id,paper_id' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recent activity feed (StudyScreen "최근 활동") — paper_progress ordered by
// updated_at, with the paper title embedded via the FK to `papers`.
// ---------------------------------------------------------------------------
export type RecentActivityRow = {
  paper_id: string;
  title: string;
  seen: boolean;
  summary_done: boolean;
  progress: number;
  updated_at: string;
};

export async function fetchRecentActivity(userId: string, limit: number = 10): Promise<RecentActivityRow[]> {
  const { data, error } = await supabase
    .from('paper_progress')
    .select('paper_id, seen, summary_done, progress, updated_at, papers(title)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as any[]).map(row => ({
    paper_id: row.paper_id,
    title: row.papers?.title ?? row.paper_id,
    seen: row.seen,
    summary_done: row.summary_done,
    progress: row.progress,
    updated_at: row.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// daily_activity — backs StudyScreen's weekly chart/heatmap. Written to via
// touch_daily_streak() below rather than upserted directly from the client,
// so minutes always add up atomically even if two screens finish around the
// same time.
// ---------------------------------------------------------------------------
export type DailyActivityRow = { activity_date: string; minutes: number };

export async function fetchDailyActivity(userId: string, sinceDate: string): Promise<DailyActivityRow[]> {
  const { data, error } = await supabase
    .from('daily_activity')
    .select('activity_date, minutes')
    .eq('user_id', userId)
    .gte('activity_date', sinceDate)
    .order('activity_date', { ascending: true });
  if (error) throw error;
  return data as DailyActivityRow[];
}

// Bumps streak_days (login-streak logic lives in the Postgres function so it's
// atomic) and adds `minutes` to today's daily_activity row. Call with 0
// minutes once per session just to touch the streak; call again with real
// minutes when a reading session ends. Returns the resulting streak_days.
export async function touchDailyStreak(userId: string, minutes: number = 0): Promise<number> {
  const { data, error } = await supabase.rpc('touch_daily_streak', { p_user_id: userId, p_minutes: minutes });
  if (error) throw error;
  return data as number;
}

// ---------------------------------------------------------------------------
// Summary Challenge win rate (ProfileScreen's "도전 승률")
// ---------------------------------------------------------------------------
export async function recordChallengeAttempt(userId: string, passed: boolean): Promise<void> {
  const { error } = await supabase.rpc('record_challenge_attempt', { p_user_id: userId, p_passed: passed });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Discussion voting (DiscussionScreen's vote bar)
// ---------------------------------------------------------------------------
export type DiscussionSide = 'pro' | 'critical';
export type DiscussionVoteCounts = { pro: number; critical: number; mine: DiscussionSide | null };

export async function fetchDiscussionVotes(paperId: string, userId: string): Promise<DiscussionVoteCounts> {
  const { data, error } = await supabase
    .from('discussion_votes')
    .select('user_id, side')
    .eq('paper_id', paperId);
  if (error) throw error;
  const rows = data as { user_id: string; side: DiscussionSide }[];
  let pro = 0, critical = 0;
  let mine: DiscussionSide | null = null;
  for (const row of rows) {
    if (row.side === 'pro') pro++; else critical++;
    if (row.user_id === userId) mine = row.side;
  }
  return { pro, critical, mine };
}

export async function castDiscussionVote(userId: string, paperId: string, side: DiscussionSide): Promise<void> {
  const { error } = await supabase
    .from('discussion_votes')
    .upsert({ user_id: userId, paper_id: paperId, side }, { onConflict: 'user_id,paper_id' });
  if (error) throw error;
}

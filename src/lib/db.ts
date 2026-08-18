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

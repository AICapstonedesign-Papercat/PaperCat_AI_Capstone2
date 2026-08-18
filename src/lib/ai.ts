// Client for the Supabase Edge Functions in supabase/functions/*.
// Prompts themselves live server-side in each function's index.ts (search for
// "PROMPT —" there) — this file only shapes requests/responses for the screens.
import { supabase } from './supabase';
import type { Paper } from '../data/papers';

export type PaperContext = {
  id: string;
  title: string;
  year: number;
  cat: Paper['cat'];
  grade: Paper['grade'];
};

export function toPaperContext(paper: Paper): PaperContext {
  return { id: paper.id, title: paper.title, year: paper.year, cat: paper.cat, grade: paper.grade };
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

// Gemini's shared capacity returns transient 503s fairly often — retry those a
// few times with backoff before surfacing an error to the screen.
async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const attempts = 5;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    const errMsg = error ? String(error.message ?? error) : data?.error ? String(data.error) : null;
    if (!errMsg) return data as T;
    lastErr = new Error(errMsg);
    const transient = /503|UNAVAILABLE|high demand/i.test(errMsg);
    if (!transient || i === attempts - 1) throw lastErr;
    await sleep(800 * (i + 1));
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Q&A chatbot (QAChatbotScreen)
// ---------------------------------------------------------------------------
export type ChatTurn = { who: 'cat' | 'me'; text: string };

export async function askPaperQuestion(
  paper: PaperContext,
  question: string,
  history: ChatTurn[],
): Promise<string> {
  const { answer } = await invoke<{ answer: string }>('qa-chat', { paper, question, history });
  return answer;
}

// ---------------------------------------------------------------------------
// Summary challenge grading (SummaryChallengeScreen)
// ---------------------------------------------------------------------------
export type GradeResult = { score: number; feedback: string; matchedKeywords: string[] };

export async function gradeSummary(paper: PaperContext, summary: string): Promise<GradeResult> {
  return invoke<GradeResult>('grade-summary', { paper, summary });
}

// ---------------------------------------------------------------------------
// Storytelling narrative (StorytellingScreen)
// ---------------------------------------------------------------------------
export type StoryResult = { chapter: string; title: string; story: string; whisper: string };

export async function generateStory(paper: PaperContext): Promise<StoryResult> {
  return invoke<StoryResult>('generate-story', { paper });
}

// ---------------------------------------------------------------------------
// Discussion debate (DiscussionScreen)
// ---------------------------------------------------------------------------
export type DiscussionResult = {
  vsTitle: string;
  sides: { label: string; text: string }[];
  judge: string;
};

export async function generateDiscussion(paper: PaperContext): Promise<DiscussionResult> {
  return invoke<DiscussionResult>('generate-discussion', { paper });
}

// ---------------------------------------------------------------------------
// Paper overview: structure flow + story + key concept (PaperDetailScreen)
// ---------------------------------------------------------------------------
export type StructureGroup = { title: string; steps: string[] };

export type OverviewResult = {
  groups: StructureGroup[];
  storyParagraphs: string[];
  pullQuote: string;
  conceptName: string;
  whyItMatters: string;
};

export async function generateOverview(paper: PaperContext): Promise<OverviewResult> {
  return invoke<OverviewResult>('generate-overview', { paper });
}

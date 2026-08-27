// 캡디1(PaperCat_AI_Capstone1/src/store.js) 그대로 이식 — AsyncStorage 기반 미니 전역 스토어.
// Supabase 연동: AsyncStorage는 그대로 로컬 캐시/게스트 저장소로 쓰고, 로그인된(비게스트)
// 사용자는 profiles/paper_progress 테이블과 추가로 동기화한다 (하이드레이션은 pull,
// set()은 push) — src/lib/db.ts 참고.
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './lib/supabase';
import {
  fetchProfile,
  fetchPaperProgress,
  profileRowToState,
  progressRowsToState,
  statePatchToProfileColumns,
  upsertProfile,
  upsertPaperProgress,
  touchDailyStreak,
} from './lib/db';

const KEY = '@papercat/state/v2';

export type PaperCatState = {
  onboardingDone: boolean;
  isGuest: boolean;
  hasSeenHomeTour: boolean;
  hasSeenExploreTour: boolean;
  hasSeenStudyTour: boolean;
  hasSeenCollectionTour: boolean;
  hasSeenProfileTour: boolean;
  showOnboardingVideo: boolean;
  catName: string;
  personality: 'curious' | 'calm' | 'passionate' | 'chill';
  aiLevel: 'beginner' | 'intermediate';
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  streakDays: number;
  hearts: number;
  papersDone: number;
  weeklyMinutes: number;
  weeklyGoalMinutes: number;
  weeklyGoalPapers: number;
  weeklyGoalLabel: string;
  seenPapers: string[];
  // 논문 진행률(0~1)은 숫자, `${id}_summary` 같은 완료 플래그는 boolean — 캡디1과 동일하게 혼합 타입
  progress: Record<string, number | boolean>;
  interests?: string[];
  challengeAttempts: number;
  challengePasses: number;
};

const DEFAULT: PaperCatState = {
  onboardingDone: false,
  isGuest: false,
  hasSeenHomeTour: false,
  hasSeenExploreTour: false,
  hasSeenStudyTour: false,
  hasSeenCollectionTour: false,
  hasSeenProfileTour: false,
  showOnboardingVideo: true,
  catName: '식빵',
  personality: 'curious',
  aiLevel: 'beginner',
  level: 7,
  xp: 320,
  xpToNext: 500,
  totalXp: 2340,
  streakDays: 3,
  hearts: 5,
  papersDone: 12,
  weeklyMinutes: 160,
  weeklyGoalMinutes: 300,
  weeklyGoalPapers: 3,
  weeklyGoalLabel: '꾸준히',
  seenPapers: [],
  progress: { attention: 0.6, bert: 0.8 },
  challengeAttempts: 0,
  challengePasses: 0,
};
// ^ Demo placeholder values — only ever seen briefly before AsyncStorage/Supabase
// resolve, or in the .env-not-configured dev fallback (SUPABASE_CONFIGURED === false,
// see src/lib/supabase.ts). Real signed-in users get overwritten by hydrateFromSupabase()
// below within one round-trip of login/app-start.

type Listener = (state: PaperCatState) => void;
const listeners = new Set<Listener>();
let cache: PaperCatState = { ...DEFAULT };
let loaded = false;
let loadPromise: Promise<PaperCatState> | null = null;
let pendingUpdates: StoreUpdate[] = [];
let persistChain = Promise.resolve();
let persistQueued = false;

type StoreUpdate = Partial<PaperCatState> | ((s: PaperCatState) => Partial<PaperCatState>);

function applyUpdate(update: StoreUpdate): Partial<PaperCatState> {
  const patch = typeof update === 'function' ? update(cache) : update;
  cache = { ...cache, ...patch };
  return patch;
}

function parseState(raw: string): Partial<PaperCatState> {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<PaperCatState>)
      : {};
  } catch {
    return {};
  }
}

async function load() {
  if (loaded) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      cache = { ...DEFAULT, ...(raw ? parseState(raw) : {}) };
    } catch {
      cache = { ...DEFAULT };
    }

    const hadPendingUpdates = pendingUpdates.length > 0;
    for (const update of pendingUpdates) applyUpdate(update);
    pendingUpdates = [];
    loaded = true;
    emit();
    if (hadPendingUpdates) schedulePersist();
    return cache;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

function schedulePersist() {
  if (!loaded || persistQueued) return;
  persistQueued = true;

  // ponytail: coalesce same-tick updates; replace with a real persistence queue only if writes become measurable.
  Promise.resolve().then(() => {
    persistQueued = false;
    const snapshot = JSON.stringify(cache);
    persistChain = persistChain
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(KEY, snapshot))
      .catch(() => undefined);
  });
}

async function flushPersist() {
  while (persistQueued) await Promise.resolve();
  await persistChain;
}

function emit() {
  [...listeners].forEach(fn => fn(cache));
}

// ---------------------------------------------------------------------------
// Supabase sync — only active for signed-in (non-guest) users when .env is
// configured. Guests keep working entirely off AsyncStorage, unchanged.
// ---------------------------------------------------------------------------

let currentUserId: string | null = null;

async function hydrateFromSupabase(userId: string) {
  try {
    const [profile, progressRows] = await Promise.all([fetchProfile(userId), fetchPaperProgress(userId)]);
    const patch: Partial<PaperCatState> = {};
    if (profile) Object.assign(patch, profileRowToState(profile));
    Object.assign(patch, progressRowsToState(progressRows));
    if (Object.keys(patch).length > 0) {
      cache = { ...cache, ...patch, isGuest: false };
      emit();
      schedulePersist();
    }
  } catch (err) {
    console.warn('[store] Supabase profile/progress 조회 실패 — 로컬 캐시 유지:', err);
  }

  // 로그인 스트릭은 세션당 한 번만 터치 — 서버가 원자적으로 계산한 값으로 되돌려 반영.
  try {
    const streak = await touchDailyStreak(userId, 0);
    if (streak !== cache.streakDays) {
      cache = { ...cache, streakDays: streak };
      emit();
      schedulePersist();
    }
  } catch (err) {
    console.warn('[store] touchDailyStreak 실패:', err);
  }
}

if (SUPABASE_CONFIGURED) {
  supabase.auth.onAuthStateChange((event, session) => {
    const userId = session?.user?.id ?? null;
    currentUserId = userId;
    if (userId && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      load().then(() => hydrateFromSupabase(userId));
    }
  });
}

let pendingProfileColumns: Record<string, unknown> = {};
let profilePushQueued = false;

function queueProfilePush(columns: Record<string, unknown>) {
  if (!currentUserId || Object.keys(columns).length === 0) return;
  pendingProfileColumns = { ...pendingProfileColumns, ...columns };
  if (profilePushQueued) return;
  profilePushQueued = true;

  Promise.resolve().then(async () => {
    profilePushQueued = false;
    const columnsToSend = pendingProfileColumns;
    pendingProfileColumns = {};
    const userId = currentUserId;
    if (!userId || Object.keys(columnsToSend).length === 0) return;
    try {
      await upsertProfile(userId, columnsToSend);
    } catch (err) {
      console.warn('[store] Supabase profile 저장 실패:', err);
    }
  });
}

function pushProgress(paperId: string, patch: { progress?: number; seen?: boolean; summary_done?: boolean }) {
  const userId = currentUserId;
  if (!userId) return;
  upsertPaperProgress(userId, paperId, patch).catch(err => {
    console.warn('[store] Supabase paper_progress 저장 실패:', err);
  });
}

function syncToSupabase(patch: Partial<PaperCatState>, prev: PaperCatState) {
  if (!SUPABASE_CONFIGURED || !currentUserId || cache.isGuest) return;

  queueProfilePush(statePatchToProfileColumns(patch));

  if (patch.seenPapers) {
    const added = patch.seenPapers.filter(id => !(prev.seenPapers || []).includes(id));
    added.forEach(id => pushProgress(id, { seen: true }));
  }

  if (patch.progress) {
    for (const [key, value] of Object.entries(patch.progress)) {
      if (prev.progress?.[key] === value) continue;
      if (key.endsWith('_summary')) {
        pushProgress(key.slice(0, -'_summary'.length), { summary_done: Boolean(value) });
      } else {
        pushProgress(key, { progress: Number(value) });
      }
    }
  }
}

export type StoreSetter = (patch: StoreUpdate) => void;

export function useStore(): [PaperCatState, StoreSetter] {
  const [state, setState] = useState(cache);

  useEffect(() => {
    let cancelled = false;
    load().then(v => {
      if (!cancelled) setState({ ...v });
    });
    const fn: Listener = v => setState({ ...v });
    listeners.add(fn);
    return () => {
      cancelled = true;
      listeners.delete(fn);
    };
  }, []);

  const set = useCallback((update: StoreUpdate) => {
    if (!loaded) pendingUpdates.push(update);
    const prev = cache;
    const patch = applyUpdate(update);
    emit();
    schedulePersist();
    syncToSupabase(patch, prev);
  }, []);

  return [state, set];
}

export async function loadStore() {
  return load();
}

export async function resetStore() {
  await load();
  cache = { ...DEFAULT };
  pendingUpdates = [];
  emit();
  schedulePersist();
  await flushPersist();
}

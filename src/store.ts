// 캡디1(PaperCat_AI_Capstone1/src/store.js) 그대로 이식 — AsyncStorage 기반 미니 전역 스토어.
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

type Listener = (state: PaperCatState) => void;
const listeners = new Set<Listener>();
let cache: PaperCatState = { ...DEFAULT };
let loaded = false;
let loadPromise: Promise<PaperCatState> | null = null;
let pendingUpdates: StoreUpdate[] = [];
let persistChain = Promise.resolve();
let persistQueued = false;

type StoreUpdate = Partial<PaperCatState> | ((s: PaperCatState) => Partial<PaperCatState>);

function applyUpdate(update: StoreUpdate) {
  const patch = typeof update === 'function' ? update(cache) : update;
  cache = { ...cache, ...patch };
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
    applyUpdate(update);
    emit();
    schedulePersist();
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

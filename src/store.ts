// 캡디1(PaperCat_AI_Capstone1/src/store.js) 그대로 이식 — AsyncStorage 기반 미니 전역 스토어.
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@papercat/state/v2';

export type PaperCatState = {
  onboardingDone: boolean;
  isGuest: boolean;
  catName: string;
  personality: 'curious' | 'calm' | 'passionate' | 'chill';
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
  catName: '식빵',
  personality: 'curious',
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

async function load() {
  if (loaded) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  loaded = true;
  return cache;
}

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function emit() {
  listeners.forEach(fn => fn(cache));
}

export function useStore(): [PaperCatState, (patch: Partial<PaperCatState> | ((s: PaperCatState) => Partial<PaperCatState>)) => void] {
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

  const set = useCallback((patchOrFn: Partial<PaperCatState> | ((s: PaperCatState) => Partial<PaperCatState>)) => {
    const patch = typeof patchOrFn === 'function' ? patchOrFn(cache) : patchOrFn;
    cache = { ...cache, ...patch };
    emit();
    persist();
  }, []);

  return [state, set];
}

export async function loadStore() {
  return load();
}

export async function resetStore() {
  cache = { ...DEFAULT };
  emit();
  await persist();
}

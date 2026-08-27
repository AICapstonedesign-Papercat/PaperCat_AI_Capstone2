import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { getCurrentUserId } from '../lib/supabase';
import { touchDailyStreak } from '../lib/db';

// The 5-stage paper journey (see StageMapScreen) is tracked as a single
// progress number 0~1 per paper — each stage screen "checks in" at its own
// checkpoint the first time it's opened for that paper. Guests don't sync.
export const CHECKPOINT = {
  paperDetail: 0.2,
  storytelling: 0.4,
  summaryChallenge: 0.6,
  discussion: 0.8,
  qaChatbot: 1,
} as const;

// Bumps progress[paperId] up to `checkpoint` (never down — a later stage
// re-visited doesn't undo further-along progress) and tracks time spent on
// screen, added to weeklyMinutes + daily_activity (for StudyScreen's chart
// and the login streak) when the screen is left.
export function useReadingSession(paperId: string | undefined, checkpoint: number) {
  const [state, set] = useStore();
  const startRef = useRef(Date.now());

  const currentValue = paperId ? state.progress?.[paperId] : undefined;
  const currentNum = typeof currentValue === 'number' ? currentValue : 0;

  useEffect(() => {
    if (!paperId || state.isGuest) return;
    if (currentNum < checkpoint) {
      set(prev => ({ progress: { ...prev.progress, [paperId]: checkpoint } }));
    }
  }, [paperId, state.isGuest, currentNum, checkpoint]);

  useEffect(() => {
    startRef.current = Date.now();
    return () => {
      const minutes = Math.round((Date.now() - startRef.current) / 60000);
      if (minutes <= 0) return;
      set(prev => ({ weeklyMinutes: prev.weeklyMinutes + minutes }));
      getCurrentUserId().then(userId => {
        if (userId) {
          touchDailyStreak(userId, minutes).catch(err => {
            console.warn('[useReadingSession] touchDailyStreak 실패:', err);
          });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);
}

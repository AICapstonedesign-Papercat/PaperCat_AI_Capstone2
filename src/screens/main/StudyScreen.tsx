import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/tokens';
import { Card, ProgressBar, SectionTitle, GuestLockOverlay, SpotlightTour, type TourStep } from '../../components';
import { useStore } from '../../store';
import { usePapers } from '../../data/papers';
import { getCurrentUserId } from '../../lib/supabase';
import { fetchDailyActivity, fetchRecentActivity, type DailyActivityRow, type RecentActivityRow } from '../../lib/db';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const TOUR_STEPS: TourStep[] = [
  { target: 'tabs', title: '진행 중 · 완료 · 통계', desc: '탭으로 학습 기록을 나눠 볼 수 있어요.' },
  { target: 'chart', title: '이번 주 학습 그래프', desc: '막대·선형·히트맵 3가지 방식으로 학습 시간을 볼 수 있어요. 버튼을 눌러 그래프 종류를 바꿔보세요.' },
  { target: 'continue', title: '이어서 학습하기', desc: '읽다 만 논문이 진행률과 함께 여기 남아있어요. 탭하면 그 지점부터 이어서 볼 수 있어요.' },
  { target: 'activity', title: '최근 활동', desc: '최근 완독·요약 기록을 시간순으로 볼 수 있어요.' },
  { target: 'rail', title: '왼쪽 메뉴', desc: '홈 · 탐색 · 도감 · 프로필로 여기서 이동해요.' },
];

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function levelForMinutes(mins: number): 0 | 1 | 2 | 3 | 4 {
  if (mins <= 0) return 0;
  if (mins < 15) return 1;
  if (mins < 30) return 2;
  if (mins < 60) return 3;
  return 4;
}

type WeekDay = { d: string; mins: number; level: 0 | 1 | 2 | 3 | 4; today?: boolean };

// 이번 주(월~일) — daily_activity에 기록이 없는 날은 0분(오늘 이후는 아직 안 지난 날이라 0).
function buildWeek(activityByDate: Map<string, number>): WeekDay[] {
  const today = new Date();
  const isoDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=월 ... 7=일
  const monday = new Date(today);
  monday.setDate(today.getDate() - (isoDow - 1));
  const todayKey = localYMD(today);

  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localYMD(d);
    const isFuture = key > todayKey;
    const mins = isFuture ? 0 : (activityByDate.get(key) ?? 0);
    return { d: label, mins, level: levelForMinutes(mins), today: key === todayKey };
  });
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function activityLabel(row: RecentActivityRow): { icon: string; text: string } {
  if (row.summary_done) return { icon: 'award', text: `${row.title} · 한 줄 요약 완료` };
  if (row.progress >= 1) return { icon: 'check', text: `${row.title} · 학습 완료` };
  if (row.seen) return { icon: 'book-open', text: `${row.title} · 학습 시작` };
  return { icon: 'file-text', text: row.title };
}

// 체크포인트(0.2 단위)에서 "다음에 이어갈 스테이지" 번호로 — StageMapScreen과 동일한 매핑.
function nextStageNumber(v: number): number {
  return Math.min(5, Math.round(v / 0.2) + 1);
}

const CHART_TYPES = [
  { id: 'bar',     label: '막대그래프' },
  { id: 'line',    label: '선형그래프' },
  { id: 'heatmap', label: '히트맵' },
] as const;
type ChartType = (typeof CHART_TYPES)[number]['id'];

function WeeklyBarChart({ days }: { days: WeekDay[] }) {
  const chartHeight = 96;
  const maxVal = Math.max(...days.map(d => d.mins), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: chartHeight }}>
        {days.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: '100%',
              height: Math.max(4, (d.mins / maxVal) * chartHeight),
              borderRadius: 6,
              backgroundColor: d.today ? colors.accent : colors.accent2,
              opacity: d.today ? 1 : 0.55,
            }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {days.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontFamily: 'Pretendard-Regular', color: d.today ? colors.accent : colors.muted }}>
            {d.d}
          </Text>
        ))}
      </View>
    </View>
  );
}

// GitHub 잔디 스타일 — 칸 11px 고정(늘어나지 않음) + 3px 간격, 7행(월~일).
// 주 수는 카드 실제 폭에 맞춰 동적으로 계산해서 우측에 빈 공간이 안 남게 함(최대 1년=52주).
const MAX_HEATMAP_WEEKS = 52;
const DAY_LABEL_COL_WIDTH = 24;
const CELL = 11;
const CELL_GAP = 3;

const LEVEL_COLOR = (level: number) => {
  if (level === 0) return colors.hairline;
  const opac = [0, 0.35, 0.55, 0.78, 1][level];
  return `rgba(157,90,45,${opac})`; // colors.accent2 계열
};

function MonthlyHeatmap({ activityByDate }: { activityByDate: Map<string, number> }) {
  const colWidth = CELL + CELL_GAP;
  const [gridAreaWidth, setGridAreaWidth] = useState(0);
  const weeks = gridAreaWidth > 0
    ? Math.min(MAX_HEATMAP_WEEKS, Math.max(1, Math.floor((gridAreaWidth - DAY_LABEL_COL_WIDTH) / colWidth)))
    : MAX_HEATMAP_WEEKS;

  const today = new Date();
  const todayKey = localYMD(today);
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;

  // 각 칸의 날짜 키를 미리 계산 — 오늘이 속한 주가 맨 오른쪽 열에 오도록 뒤에서부터 채움.
  const cellDate = (w: number, dRow: number) => {
    const daysFromRightEdge = (weeks - 1 - w) * 7 + (6 - dRow);
    const d = new Date(today);
    d.setDate(d.getDate() - daysFromRightEdge);
    return d;
  };

  for (let w = 0; w < weeks; w++) {
    const d = cellDate(w, 0);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ week: w, label: `${d.getMonth() + 1}월` });
      lastMonth = d.getMonth();
    }
  }

  const total = weeks * 7;
  let filled = 0;
  const levelAt = (w: number, dRow: number) => {
    const d = cellDate(w, dRow);
    const key = localYMD(d);
    if (key > todayKey) return -1; // 미래 — 칸 자체를 비움
    return levelForMinutes(activityByDate.get(key) ?? 0);
  };
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      if (levelAt(w, d) > 0) filled++;
    }
  }

  return (
    <View onLayout={e => setGridAreaWidth(e.nativeEvent.layout.width)}>
      <Text style={{ fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.ink, marginBottom: 14 }}>
        최근 {weeks >= 52 ? '1년' : `${weeks}주`} 동안 {filled}/{total}일 학습했어요
      </Text>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: DAY_LABEL_COL_WIDTH }}>
          {DAY_LABELS.map((d, i) => (
            <View key={i} style={{ height: CELL, marginBottom: CELL_GAP, justifyContent: 'center' }}>
              {(i === 0 || i === 2 || i === 4) && (
                <Text style={{ fontSize: 9, fontFamily: 'Pretendard-Regular', color: colors.faint }}>{d}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', height: 14, marginBottom: 4 }}>
            {Array.from({ length: weeks }).map((_, w) => {
              const m = monthLabels.find(x => x.week === w);
              return (
                <View key={w} style={{ width: colWidth }}>
                  {m && <Text style={{ fontSize: 9, fontFamily: 'Pretendard-Regular', color: colors.faint }}>{m.label}</Text>}
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row' }}>
            {Array.from({ length: weeks }).map((_, w) => (
              <View key={w} style={{ width: colWidth }}>
                {DAY_LABELS.map((_, d) => {
                  const level = levelAt(w, d);
                  return (
                    <View
                      key={d}
                      style={{
                        width: CELL,
                        height: CELL,
                        marginBottom: CELL_GAP,
                        borderRadius: 2,
                        backgroundColor: level < 0 ? 'transparent' : LEVEL_COLOR(level),
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 14 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.faint, marginRight: 2 }}>적음</Text>
        {[0, 1, 2, 3, 4].map(l => (
          <View key={l} style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: LEVEL_COLOR(l) }} />
        ))}
        <Text style={{ fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.faint, marginLeft: 2 }}>많음</Text>
      </View>
    </View>
  );
}

function WeeklyLineChart({ days }: { days: WeekDay[] }) {
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 72;
  const todayIdx = days.findIndex(d => d.today);
  const CHART_DAYS = todayIdx >= 0 ? days.slice(0, todayIdx + 1) : days;
  const maxVal = Math.max(...CHART_DAYS.map(d => d.mins), 1);

  const points = chartWidth > 0 ? CHART_DAYS.map((d, idx) => ({
    x: (idx / (days.length - 1)) * chartWidth,
    y: chartHeight - (d.mins / maxVal) * chartHeight,
    mins: d.mins,
    d: d.d,
    today: d.today,
  })) : [];

  return (
    <View>
      <View
        style={{ height: chartHeight }}
        onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
      >
        {points.slice(0, -1).map((p, i) => {
          const p2 = points[i + 1];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const cx = (p.x + p2.x) / 2;
          const cy = (p.y + p2.y) / 2;
          return (
            <View key={i} style={{
              position: 'absolute',
              left: cx - len / 2,
              top: cy - 1.5,
              width: len,
              height: 3,
              backgroundColor: colors.ink,
              borderRadius: 2,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          );
        })}
        {points.map((p, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: p.today ? p.x - 7 : p.x - 4,
            top: p.today ? p.y - 7 : p.y - 4,
            width: p.today ? 14 : 8,
            height: p.today ? 14 : 8,
            borderRadius: 7,
            backgroundColor: p.today ? colors.accent : colors.muted,
            borderWidth: p.today ? 2.5 : 1.5,
            borderColor: colors.bg,
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {days.map((d, i) => (
          <Text key={i} style={{ fontSize: 10.5, fontFamily: 'Pretendard-Regular', color: d.today ? colors.accent : colors.muted }}>
            {d.d}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function StudyScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'now' | 'done' | 'stats'>('now');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [state, set] = useStore();
  const { papers } = usePapers();

  const [dailyActivity, setDailyActivity] = useState<DailyActivityRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (state.isGuest) { setLoadingStats(false); return; }
    let cancelled = false;
    getCurrentUserId().then(async userId => {
      if (!userId || cancelled) { setLoadingStats(false); return; }
      const since = new Date();
      since.setDate(since.getDate() - 370);
      try {
        const [activity, recent] = await Promise.all([
          fetchDailyActivity(userId, localYMD(since)),
          fetchRecentActivity(userId, 10),
        ]);
        if (!cancelled) {
          setDailyActivity(activity);
          setRecentActivity(recent);
        }
      } catch (err) {
        console.warn('[Study] 통계 조회 실패:', err);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    });
    return () => { cancelled = true; };
  }, [state.isGuest]);

  const activityByDate = new Map(dailyActivity.map(r => [r.activity_date, r.minutes]));
  const week = buildWeek(activityByDate);
  const weekTotalMins = week.reduce((sum, d) => sum + d.mins, 0);

  const inProgress = papers
    .map(p => ({ paper: p, progress: state.progress?.[p.id] }))
    .filter((x): x is { paper: typeof x.paper; progress: number } => typeof x.progress === 'number' && x.progress > 0 && x.progress < 1);

  const completed = papers.filter(p => Boolean(state.progress?.[`${p.id}_summary`]));

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const tabsRef = useRef<View>(null);
  const chartRef = useRef<View>(null);
  const continueRef = useRef<View>(null);
  const activityRef = useRef<View>(null);
  const targetRefs = { tabs: tabsRef, chart: chartRef, continue: continueRef, activity: activityRef };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View style={s.head}>
          <Text style={s.h1}>학습</Text>
          <View style={s.streak}>
            <Feather name="zap" size={14} color={colors.accent3} />
            <Text style={s.streakText}>{state.streakDays}일 연속</Text>
          </View>
        </View>

        {/* Tab bar — underline style matching CollectionScreen */}
        <View ref={tabsRef} style={s.tabsWrap}>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            {(['now', 'done', 'stats'] as const).map(t => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
                <Text style={[s.tabText, tab === t && s.tabTextOn]}>
                  {t === 'now' ? '진행 중' : t === 'done' ? '완료' : '통계'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loadingStats ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={colors.accent2} />
          </View>
        ) : (
          <>
            {tab === 'now' && (
              <View ref={continueRef}>
                <SectionTitle title="이어서 학습하기" />
                {inProgress.length === 0 ? (
                  <Text style={s.emptyText}>아직 읽던 논문이 없어요 — 탐색에서 시작해보세요</Text>
                ) : (
                  inProgress.map((p, i) => (
                    <Pressable key={p.paper.id} onPress={() => navigation.navigate('StageMap', { paperId: p.paper.id })}>
                      <View style={[s.studyRow, { marginBottom: i === inProgress.length - 1 ? 22 : 10 }]}>
                        <View style={s.coverWrap}>
                          <Text style={s.coverCat}>{p.paper.cat}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.tagRow}>
                            <Text style={s.tagCat}>{p.paper.cat}</Text>
                            <Text style={s.tagDot}> · </Text>
                            <Text style={s.tagStage}>STAGE {nextStageNumber(p.progress)}</Text>
                          </Text>
                          <Text style={s.itemTitle} numberOfLines={1}>{p.paper.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ flex: 1 }}><ProgressBar value={p.progress} height={6} fillColor={colors.accent2} trackColor={colors.hairline} /></View>
                            <Text style={s.pct}>{Math.round(p.progress * 100)}%</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {tab === 'done' && (
              <View>
                <SectionTitle title="완료한 논문" />
                {completed.length === 0 ? (
                  <Text style={s.emptyText}>아직 완독한 논문이 없어요 — 한 줄 요약까지 마치면 여기 쌓여요</Text>
                ) : (
                  completed.map((p, i) => (
                    <Pressable key={p.id} onPress={() => navigation.navigate('Collection')}>
                      <View style={[s.studyRow, { marginBottom: i === completed.length - 1 ? 22 : 10 }]}>
                        <View style={s.coverWrap}>
                          <Feather name="check-circle" size={20} color={colors.accent2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.tagRow}>
                            <Text style={s.tagCat}>{p.cat}</Text>
                            <Text style={s.tagDot}> · </Text>
                            <Text style={s.tagStage}>{p.grade === 'S' ? 'GOLD' : 'SILVER'}</Text>
                          </Text>
                          <Text style={s.itemTitle} numberOfLines={1}>{p.title}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {tab === 'stats' && (
              <>
                <View ref={chartRef}>
                  <Card style={{ marginBottom: 22 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                      <Text style={s.chartLabel}>이번 주 학습</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={s.chartBig}>{Math.floor(weekTotalMins / 60)}h {weekTotalMins % 60}m</Text>
                        <Text style={s.chartSub}>/ {Math.floor(state.weeklyGoalMinutes / 60)}h 목표</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                      {CHART_TYPES.map(c => (
                        <Pressable
                          key={c.id}
                          onPress={() => setChartType(c.id)}
                          style={[s.chartTypeBtn, chartType === c.id && s.chartTypeBtnOn]}
                        >
                          <Text style={[s.chartTypeText, chartType === c.id && s.chartTypeTextOn]}>{c.label}</Text>
                        </Pressable>
                      ))}
                    </View>

                    {chartType === 'bar' && <WeeklyBarChart days={week} />}
                    {chartType === 'line' && <WeeklyLineChart days={week} />}
                    {chartType === 'heatmap' && <MonthlyHeatmap activityByDate={activityByDate} />}
                  </Card>
                </View>

                <View ref={activityRef}>
                  <SectionTitle title="최근 활동" />
                  <View style={{ marginBottom: 22 }}>
                    {recentActivity.length === 0 ? (
                      <Text style={s.emptyText}>아직 활동 기록이 없어요</Text>
                    ) : (
                      recentActivity.map((a, i) => {
                        const { icon, text } = activityLabel(a);
                        return (
                          <View key={`${a.paper_id}-${i}`} style={[s.act, i > 0 && s.actBorder]}>
                            <Feather name={icon} size={16} color={colors.muted} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.actText}>{text}</Text>
                              <Text style={s.actTime}>{relativeTime(a.updated_at)}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {!state.hasSeenStudyTour && (
        <SpotlightTour
          steps={TOUR_STEPS}
          targetRefs={targetRefs}
          scrollRef={scrollRef}
          scrollY={scrollY}
          onDone={() => set({ hasSeenStudyTour: true })}
        />
      )}
      {state.isGuest && <GuestLockOverlay navigation={navigation} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h1:    { fontSize: 26, fontFamily: 'Pretendard-Bold', color: colors.ink },
  streak:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakText: { fontFamily: 'Pretendard-Regular', fontSize: 13, color: colors.accent3, letterSpacing: 0.3 },

  tabsWrap: { marginBottom: 22, borderBottomWidth: 1, borderColor: colors.hairline },
  tab:     { paddingBottom: 10 },
  tabOn:   { borderBottomWidth: 2, borderColor: colors.accent, marginBottom: -1 },
  tabText: { fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.muted, letterSpacing: 0.6 },
  tabTextOn: { color: colors.ink },

  emptyText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 22 },

  chartLabel: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 0.3 },
  chartBig:   { fontSize: 24, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink },
  chartSub:   { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },

  chartTypeBtn:   { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline },
  chartTypeBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chartTypeText:  { fontSize: 12.5, fontFamily: 'Pretendard-Medium', color: colors.muted },
  chartTypeTextOn:{ color: '#fff' },

  studyRow:  { flexDirection: 'row', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.hairline },
  coverWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
  coverCat:  { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  tagRow:    { marginBottom: 4 },
  tagCat:    { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  tagDot:    { color: colors.faint },
  tagStage:  { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  itemTitle: { fontSize: 14.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink, marginBottom: 8 },
  pct:       { fontSize: 11.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, minWidth: 30, textAlign: 'right' },

  act:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  actBorder: { borderTopWidth: 1, borderColor: colors.hairline },
  actText:   { fontSize: 13.5, fontFamily: 'Pretendard-Medium', color: colors.ink },
  actTime:   { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 2 },
});

import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/tokens';
import { Card, ProgressBar, SectionTitle, GuestLockOverlay, SpotlightTour, type TourStep } from '../../components';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const TOUR_STEPS: TourStep[] = [
  { target: 'tabs', title: '진행 중 · 완료 · 통계', desc: '탭으로 학습 기록을 나눠 볼 수 있어요.' },
  { target: 'chart', title: '이번 주 학습 그래프', desc: '막대·선형·히트맵 3가지 방식으로 학습 시간을 볼 수 있어요. 버튼을 눌러 그래프 종류를 바꿔보세요.' },
  { target: 'continue', title: '이어서 학습하기', desc: '읽다 만 논문이 진행률과 함께 여기 남아있어요. 탭하면 그 지점부터 이어서 볼 수 있어요.' },
  { target: 'activity', title: '최근 활동', desc: '최근 완독·요약·질문 기록과 받은 XP를 시간순으로 볼 수 있어요.' },
  { target: 'rail', title: '왼쪽 메뉴', desc: '홈 · 탐색 · 도감 · 프로필로 여기서 이동해요.' },
];

type Day = { d: string; mins: number; level: number; today?: boolean };

const DAYS: Day[] = [
  { d: '월', mins: 25, level: 2 },
  { d: '화', mins: 40, level: 3 },
  { d: '수', mins: 15, level: 1 },
  { d: '목', mins: 55, level: 4 },
  { d: '금', mins: 25, level: 2 },
  { d: '토', mins: 35, level: 3, today: true },
  { d: '일', mins: 0,  level: 0 },
];

// 진행률은 여기 한 곳에만 — % 표기는 progress에서 계산해서 두 값이 어긋날 일이 없게.
const IN_PROGRESS = [
  { paperId: 'bert', screen: 'StageMap',    cat: 'NLP', stage: 2, progress: 0.8,  title: 'BERT: Pre-training of Deep Bidirectional…' },
  { paperId: 'vit',  screen: 'PaperDetail', cat: 'CV',  stage: 1, progress: 0.35, title: 'Vision Transformer (ViT)' },
];

const CHART_TYPES = [
  { id: 'bar',     label: '막대그래프' },
  { id: 'line',    label: '선형그래프' },
  { id: 'heatmap', label: '히트맵' },
] as const;
type ChartType = (typeof CHART_TYPES)[number]['id'];

function WeeklyBarChart() {
  const chartHeight = 96;
  const maxVal = Math.max(...DAYS.map(d => d.mins), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: chartHeight }}>
        {DAYS.map((d, i) => (
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
        {DAYS.map((d, i) => (
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
// 활동 없는 날이 훨씬 많은 희소한 분포. 실제 저장된 일별 기록은 이번 주 7일뿐이라
// 나머지 과거 주차는 데모 목데이터로 채움(시드 고정 — 새로고침마다 안 바뀜, Math.random 안 씀).
const MAX_HEATMAP_WEEKS = 52;
const DAY_LABEL_COL_WIDTH = 24;
const CELL = 11;
const CELL_GAP = 3;
const DAY_ROWS = ['월', '화', '수', '목', '금', '토', '일'];

// 실제 활동 그래프처럼 희소하게: 0(활동없음) 확률을 가장 높게, 레벨이 올라갈수록 확률을 낮춤
function seedLevel(week: number, day: number): 0 | 1 | 2 | 3 | 4 {
  const n = Math.abs(Math.sin(week * 127.1 + day * 311.7) * 43758.5453);
  const r = n - Math.floor(n); // 0~1 균일분포 (시드 고정, 매 렌더 동일)
  if (r < 0.45) return 0;
  if (r < 0.70) return 1;
  if (r < 0.87) return 2;
  if (r < 0.96) return 3;
  return 4;
}
const LEVEL_COLOR = (level: number) => {
  if (level === 0) return colors.hairline;
  const opac = [0, 0.35, 0.55, 0.78, 1][level];
  return `rgba(157,90,45,${opac})`; // colors.accent2 계열
};

function MonthlyHeatmap() {
  const colWidth = CELL + CELL_GAP;
  const [gridAreaWidth, setGridAreaWidth] = useState(0);
  // 카드 실제 폭을 재서 딱 맞는 주 수를 계산 — 우측에 빈 공간이 안 남게 함
  const weeks = gridAreaWidth > 0
    ? Math.min(MAX_HEATMAP_WEEKS, Math.max(1, Math.floor((gridAreaWidth - DAY_LABEL_COL_WIDTH) / colWidth)))
    : MAX_HEATMAP_WEEKS;

  const today = new Date();
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks - 1 - w) * 7);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ week: w, label: `${d.getMonth() + 1}월` });
      lastMonth = d.getMonth();
    }
  }

  const total = weeks * 7;
  let filled = 0;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const isCurrentWeek = w === weeks - 1;
      const level = isCurrentWeek ? DAYS[d].level : seedLevel(w, d);
      if (level > 0) filled++;
    }
  }

  return (
    <View onLayout={e => setGridAreaWidth(e.nativeEvent.layout.width)}>
      <Text style={{ fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.ink, marginBottom: 14 }}>
        최근 {weeks >= 52 ? '1년' : `${weeks}주`} 동안 {filled}/{total}일 학습했어요
      </Text>

      <View style={{ flexDirection: 'row' }}>
        {/* 요일 라벨 — GitHub처럼 월/수/금만 표기 */}
        <View style={{ width: DAY_LABEL_COL_WIDTH }}>
          {DAY_ROWS.map((d, i) => (
            <View key={i} style={{ height: CELL, marginBottom: CELL_GAP, justifyContent: 'center' }}>
              {(i === 0 || i === 2 || i === 4) && (
                <Text style={{ fontSize: 9, fontFamily: 'Pretendard-Regular', color: colors.faint }}>{d}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          {/* 월 라벨 */}
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

          {/* 격자 — 칸 크기 고정, 주 수로 폭을 맞춤 */}
          <View style={{ flexDirection: 'row' }}>
            {Array.from({ length: weeks }).map((_, w) => (
              <View key={w} style={{ width: colWidth }}>
                {DAY_ROWS.map((_, d) => {
                  const isCurrentWeek = w === weeks - 1;
                  const level = isCurrentWeek ? DAYS[d].level : seedLevel(w, d);
                  return (
                    <View
                      key={d}
                      style={{
                        width: CELL,
                        height: CELL,
                        marginBottom: CELL_GAP,
                        borderRadius: 2,
                        backgroundColor: LEVEL_COLOR(level),
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

function WeeklyLineChart() {
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 72;
  // 오늘까지만 그림 — 앞에서부터 자르니 배열 인덱스가 곧 요일 위치
  const CHART_DAYS = DAYS.slice(0, DAYS.findIndex(d => d.today) + 1);
  const maxVal = Math.max(...CHART_DAYS.map(d => d.mins), 1);

  const points = chartWidth > 0 ? CHART_DAYS.map((d, idx) => ({
    x: (idx / (DAYS.length - 1)) * chartWidth,
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
        {DAYS.map((d, i) => (
          <Text key={i} style={{ fontSize: 10.5, fontFamily: 'Pretendard-Regular', color: d.today ? colors.accent : colors.muted }}>
            {d.d}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function StudyScreen({ navigation }: Props) {
  const [tab, setTab] = useState('now');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [state, set] = useStore();

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
            <Text style={s.streakText}>3일 연속</Text>
          </View>
        </View>

        {/* Tab bar — underline style matching CollectionScreen */}
        <View ref={tabsRef} style={s.tabsWrap}>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            {['now', 'done', 'stats'].map(t => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
                <Text style={[s.tabText, tab === t && s.tabTextOn]}>
                  {t === 'now' ? '진행 중' : t === 'done' ? '완료' : '통계'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Heatmap + Line Chart */}
        <View ref={chartRef}>
        <Card style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <Text style={s.chartLabel}>이번 주 학습</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={s.chartBig}>2h 40m</Text>
              <Text style={s.chartSub}>/ 5h 목표</Text>
            </View>
          </View>

          {/* 그래프 타입 선택 — 요일 박스 대신 이걸로 통일 */}
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

          {chartType === 'bar' && <WeeklyBarChart />}
          {chartType === 'line' && <WeeklyLineChart />}
          {chartType === 'heatmap' && <MonthlyHeatmap />}
        </Card>
        </View>

        <View ref={continueRef}>
        <SectionTitle title="이어서 학습하기" />

        {IN_PROGRESS.map((p, i) => (
          <Pressable key={p.paperId} onPress={() => navigation.navigate(p.screen, { paperId: p.paperId })}>
            <View style={[s.studyRow, { marginBottom: i === IN_PROGRESS.length - 1 ? 22 : 10 }]}>
              <View style={s.coverWrap}>
                <Text style={s.coverCat}>{p.cat}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tagRow}>
                  <Text style={s.tagCat}>{p.cat}</Text>
                  <Text style={s.tagDot}> · </Text>
                  <Text style={s.tagStage}>STAGE {p.stage}</Text>
                </Text>
                <Text style={s.itemTitle} numberOfLines={1}>{p.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}><ProgressBar value={p.progress} height={6} fillColor={colors.accent2} trackColor={colors.hairline} /></View>
                  <Text style={s.pct}>{Math.round(p.progress * 100)}%</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
        </View>

        <View ref={activityRef}>
        <SectionTitle title="최근 활동" />
        <View style={{ marginBottom: 22 }}>
          {[
            { ic: 'award',          text: 'Attention is All You Need 골드 획득', time: '오늘 09:21', xp: '+100' },
            { ic: 'file-text',      text: '한 줄 요약 챌린지 92점',              time: '오늘 09:18', xp: '+50'  },
            { ic: 'message-circle', text: 'Q&A 챗봇과 5개 질문',                time: '어제 23:04', xp: '+10'  },
            { ic: 'check',          text: 'ResNet 학습 완료',                    time: '어제 20:42', xp: '+80'  },
          ].map((a, i) => (
            <View key={i} style={[s.act, i > 0 && s.actBorder]}>
              <Feather name={a.ic} size={16} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.actText}>{a.text}</Text>
                <Text style={s.actTime}>{a.time}</Text>
              </View>
              <Text style={s.actXp}>{a.xp}</Text>
            </View>
          ))}
        </View>
        </View>
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
  actXp:     { fontSize: 12, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, letterSpacing: 0.4 },
});

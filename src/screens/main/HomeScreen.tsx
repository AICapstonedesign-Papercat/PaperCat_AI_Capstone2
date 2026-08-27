import React, { useMemo, useRef } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/tokens';
import { useStore } from '../../store';
import { usePapers } from '../../data/papers';
import { SectionTitle, GradeBadge, ProgressBar, SpotlightTour, type TourStep } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const TOUR_STEPS_MEMBER: TourStep[] = [
  { target: 'rec', title: '오늘의 추천 논문 · 이어서 학습하기', desc: '왼쪽은 관심 분야에 맞춰 고른 추천 논문이에요. 오른쪽은 읽다 만 논문을 이어보는 자리 — 진행률이 그대로 남아있어요. 탭하면 바로 그 지점부터 시작해요.' },
  { target: 'challenges', title: '오늘의 도전 과제', desc: '논문 완독하기, 한 줄 요약 쓰기 같은 작은 미션이에요. 달성하면 자동으로 체크돼요.' },
  { target: 'week', title: '이번 주 학습', desc: '이번 주 학습 시간, 완료한 논문 수, 현재 레벨과 다음 레벨까지 남은 XP를 한눈에 볼 수 있어요. 밑줄은 주간 목표 대비 진행률이에요.' },
  { target: 'badges', title: '최근 도감', desc: '다 읽은 논문은 등급별 배지가 되어 여기 쌓여요. 이 줄을 탭하면 지금까지 모은 배지를 전체 도감에서 볼 수 있어요.' },
  { target: 'rail', title: '왼쪽 메뉴', desc: '탐색(새 논문 찾기) · 학습(진행 중인 논문) · 도감(모은 배지) · 프로필(내 통계·설정)로 여기서 바로 이동해요.' },
];

const TOUR_STEPS_GUEST: TourStep[] = [
  { target: 'rec', title: '오늘의 추천 논문 · 이어서 학습하기', desc: '왼쪽은 관심 분야에 맞춰 고른 추천 논문이에요. 오른쪽은 읽다 만 논문을 이어보는 자리 — 진행률이 그대로 남아있어요.' },
  { target: 'locked', title: '가입하면 쓸 수 있어요', desc: '한 줄 요약 채점, Q&A 챗봇, 다관점 토론은 가입 후 열려요. 지금은 체험판이라 잠겨있어요.' },
  { target: 'rail', title: '왼쪽 메뉴', desc: '탐색(새 논문 찾기) · 학습(진행 중인 논문) · 도감(모은 배지) · 프로필로 여기서 바로 이동해요.' },
];

// Figma "Home (최종)" 확정 시안 그대로 — 마스코트+인사 한 줄, 하트만 있는 스탯,
// 추천논문/이어서학습 2단 분할, 주간학습 스탯, 최근 도감 배지줄.
// "완독" 뱃지 이미지가 논문별로 따로 없어서 등급으로만 구분 — CollectionScreen과 동일한 규칙.
const GOLD_BADGES = [
  require('../../../assets/badges/badge-gold-1.png'),
  require('../../../assets/badges/badge-gold-2.png'),
  require('../../../assets/badges/badge-gold-3.png'),
];
const SILVER_BADGE = require('../../../assets/badges/badge-silver-1.png');

export default function HomeScreen({ navigation }: Props) {
  const [state, set] = useStore();
  const { papers } = usePapers();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  // 오늘의 추천 논문 — InterestPickerScreen에서 고른 관심 분야(state.interests)에 맞는
  // 논문 중 S등급·트렌딩을 우선 고르고, 관심사가 없거나 매칭이 없으면 대표 S등급 논문으로 폴백.
  const recPaper = useMemo(() => {
    if (papers.length === 0) return undefined;
    const interests = state.interests || [];
    const matches = interests.length > 0 ? papers.filter(p => interests.includes(p.cat)) : [];
    const pool = matches.length > 0 ? matches : papers;
    return (
      pool.find(p => p.grade === 'S' && p.trending) ||
      pool.find(p => p.grade === 'S') ||
      pool.find(p => p.trending) ||
      pool[0]
    );
  }, [papers, state.interests]);

  // 오늘의 도전 과제 — 실제 완독/요약 기록에서 달성 여부를 계산 (더 이상 로컬 토글 아님).
  const hasAnySummary = Object.keys(state.progress || {}).some(k => k.endsWith('_summary') && state.progress[k]);
  const challenges = [
    { id: 1, text: '논문 1편 완료하기', xp: 50, done: state.papersDone > 0 },
    { id: 2, text: '한 줄 요약 작성하기', xp: 20, done: hasAnySummary },
  ];

  // "이어서 학습하기" — 진행률이 0보다 크고 아직 안 끝난(<1) 논문 중 하나.
  const continuePaperId = Object.keys(state.progress || {}).find(k => {
    if (k.endsWith('_summary')) return false;
    const v = state.progress[k];
    return typeof v === 'number' && v > 0 && v < 1;
  });
  const continuePaper = continuePaperId ? papers.find(p => p.id === continuePaperId) : undefined;
  const continueProgress = continuePaperId ? Number(state.progress[continuePaperId]) : 0;

  // 최근 도감 — 한 줄 요약까지 끝낸(수집된) 논문만. CollectionScreen과 동일한 뱃지 규칙.
  const recentBadges = papers
    .filter(p => Boolean(state.progress?.[`${p.id}_summary`]))
    .slice(0, 4)
    .map((p, i) => ({
      id: p.id,
      title: p.title.length > 20 ? `${p.title.slice(0, 18)}…` : p.title,
      img: p.grade === 'S' ? GOLD_BADGES[i % GOLD_BADGES.length] : SILVER_BADGE,
    }));

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const recRef = useRef<View>(null);
  const challengesRef = useRef<View>(null);
  const weekRef = useRef<View>(null);
  const badgesRef = useRef<View>(null);
  const lockedRef = useRef<View>(null);
  const targetRefs = { rec: recRef, challenges: challengesRef, week: weekRef, badges: badgesRef, locked: lockedRef };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {/* 마스코트 + 인사 한 줄 + 하트 */}
          <View style={s.heroRow}>
            <Image source={require('../../../assets/cat/hi.png')} style={s.mascot} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{state.isGuest ? '환영한다냥!!' : '오늘도 왔다냥!!'}</Text>
              {!state.isGuest && (
                <Text style={s.streakLine}>
                  {state.streakDays}일 연속 학습 중 · 오늘 한 편만 더 읽으면 {state.streakDays + 1}일째예요
                </Text>
              )}
            </View>
            {!state.isGuest && (
              <View style={s.heart}>
                <Ionicons name="heart" size={16} color={colors.heartRed} />
                <Text style={s.heartText}>{state.hearts}</Text>
              </View>
            )}
          </View>

          {/* 오늘의 추천 논문 | 이어서 학습하기 — 2단 분할 (Figma 그대로) */}
          <View ref={recRef} style={[s.twoCol, isWide && s.twoColWide]}>
            <View style={[s.colLeft, isWide && s.colLeftWide]}>
              <SectionTitle title="오늘의 추천 논문" rule />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={s.recTitle}>{recPaper?.title}</Text>
                <GradeBadge grade={recPaper?.grade} />
              </View>
              <Text style={s.recMeta}>{recPaper?.cat} · {recPaper?.year} · 인용 {recPaper?.cites}</Text>
              <Pressable onPress={() => recPaper && navigation.navigate('PaperDetail', { paperId: recPaper.id })}>
                <Text style={s.studyLink}>학습하기 →</Text>
              </Pressable>
            </View>

            {isWide && <View style={s.vDivider} />}

            <View style={[s.colRight, isWide && s.colRightWide]}>
              <SectionTitle title="이어서 학습하기" rule />
              {continuePaper ? (
                <Pressable onPress={() => navigation.navigate('StageMap', { paperId: continuePaper.id })}>
                  <Text style={s.continueTitle} numberOfLines={1}>{continuePaper.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}><ProgressBar value={continueProgress} height={8} fillColor={colors.accent2} trackColor={colors.hairline} /></View>
                    <Text style={s.pct}>{Math.round(continueProgress * 100)}%</Text>
                  </View>
                </Pressable>
              ) : (
                <Text style={s.continueEmpty}>아직 읽던 논문이 없어요 — 탐색에서 시작해보세요</Text>
              )}
            </View>
          </View>

          {state.isGuest && (
            <View ref={lockedRef}>
              <SectionTitle title="가입하면 쓸 수 있어요" />
              <View style={s.lockedRow}>
                {[
                  { icon: 'file-text', label: '한 줄 요약',  sub: '핵심을 한 문장으로' },
                  { icon: 'message-circle', label: 'Q&A 챗봇', sub: '궁금한 걸 바로 질문' },
                  { icon: 'layers',    label: '다관점 토론', sub: '여러 시각 비교하기' },
                ].map((f, i) => (
                  <View key={i} style={s.lockedCard}>
                    <View style={s.lockedIconWrap}>
                      <Feather name={f.icon} size={22} color="#C4B49A" />
                      <View style={s.lockedOverlay}><Feather name="lock" size={11} color="#fff" /></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lockedLabel}>{f.label}</Text>
                      <Text style={s.lockedSub}>{f.sub}</Text>
                    </View>
                    <Feather name="lock" size={16} color="#C4B49A" />
                  </View>
                ))}
              </View>
            </View>
          )}

          {!state.isGuest && (
            <>
              <View ref={challengesRef}>
              <SectionTitle title="오늘의 도전 과제" rule />
              <View style={{ marginBottom: 22 }}>
                {challenges.map((c, i) => (
                  <View key={c.id} style={[s.chal, i > 0 && s.chalBorder]}>
                    <View style={[s.checkbox, c.done && s.checkboxOn]}>
                      {c.done && <Feather name="check" size={16} color="#fff" />}
                    </View>
                    <Text style={[s.chalText, c.done && { color: colors.mutedSoft, textDecorationLine: 'line-through' }]}>{c.text}</Text>
                    <Text style={s.xpText}>+{c.xp} XP</Text>
                  </View>
                ))}
              </View>
              </View>

              {/* 이번 주 학습 — 3스탯 + 진행바 */}
              <View ref={weekRef}>
              <SectionTitle title="이번 주 학습" rule />
              <View style={s.weekStats}>
                <View style={s.weekStat}>
                  <Text style={s.weekBig}>{state.weeklyMinutes}<Text style={s.weekUnit}> / {state.weeklyGoalMinutes}분</Text></Text>
                  <Text style={s.weekLabel}>주간 학습 목표</Text>
                </View>
                <View style={s.weekStat}>
                  <Text style={s.weekBig}>{state.papersDone}<Text style={s.weekUnit}> 편</Text></Text>
                  <Text style={s.weekLabel}>완료한 논문</Text>
                </View>
                <View style={s.weekStat}>
                  <Text style={s.weekBig}>{state.level}<Text style={s.weekUnit}> Lv</Text></Text>
                  <Text style={s.weekLabel}>현재 레벨 · 다음까지 {state.xpToNext - state.xp}XP</Text>
                </View>
              </View>
              <View style={{ marginBottom: 26 }}>
                <ProgressBar value={state.weeklyMinutes / state.weeklyGoalMinutes} height={3} fillColor={colors.accent2} trackColor={colors.hairline} />
              </View>
              </View>

              {/* 최근 도감 */}
              <View ref={badgesRef}>
              <SectionTitle title="최근 도감" right="전체 보기 →" />
              <Pressable onPress={() => navigation.navigate('Collection')}>
                {recentBadges.length > 0 ? (
                  <View style={s.badgeRow}>
                    {recentBadges.map(b => (
                      <View key={b.id} style={s.badgeItem}>
                        <Image source={b.img} style={s.badgeImg} resizeMode="contain" />
                        <Text style={s.badgeTitle} numberOfLines={2}>{b.title}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.continueEmpty}>아직 수집한 배지가 없어요 — 논문을 완독해보세요</Text>
                )}
              </Pressable>
              </View>
            </>
          )}
        </ScrollView>

        {!state.hasSeenHomeTour && (
          <SpotlightTour
            steps={state.isGuest ? TOUR_STEPS_GUEST : TOUR_STEPS_MEMBER}
            targetRefs={targetRefs}
            scrollRef={scrollRef}
            scrollY={scrollY}
            onDone={() => set({ hasSeenHomeTour: true })}
          />
        )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 28 },
  mascot: { width: 100, height: 130 },
  greeting: { fontSize: 30, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, marginBottom: 4 },
  streakLine: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  heart: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  heartText: { fontFamily: 'Pretendard-Medium', fontSize: 15, color: colors.ink },

  twoCol: { marginBottom: 22 },
  twoColWide: { flexDirection: 'row' },
  colLeft: {},
  colLeftWide: { flex: 1, paddingRight: 24 },
  colRight: { marginTop: 22 },
  colRightWide: { flex: 1, paddingLeft: 24, marginTop: 0 },
  vDivider: { width: 1, backgroundColor: colors.hairline },

  recTitle: { fontSize: 18, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink, lineHeight: 24 },
  recMeta:  { fontSize: 12.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 0.3, marginBottom: 14 },
  studyLink: { fontSize: 14.5, fontFamily: 'Pretendard-Bold', color: colors.ink },

  continueTitle: { fontSize: 15, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink, marginBottom: 12 },
  continueEmpty: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  pct: { fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent },

  chal:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  chalBorder:{ borderTopWidth: 1, borderColor: colors.hairline },
  checkbox: { width: 22, height: 22, borderRadius: 999, borderWidth: 1.5, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  checkboxOn:{ backgroundColor: colors.accent, borderColor: colors.accent },
  chalText: { flex: 1, fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: colors.text },
  xpText:   { fontSize: 12.5, fontFamily: 'Pretendard-Medium', color: colors.accent2 },

  weekStats: { flexDirection: 'row', gap: 40, marginBottom: 16 },
  weekStat: {},
  weekBig: { fontSize: 28, fontFamily: 'Pretendard-ExtraBold', color: colors.ink },
  weekUnit: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  weekLabel: { fontSize: 11.5, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 2 },

  badgeRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  badgeItem: { alignItems: 'center', width: 90 },
  badgeImg: { width: 64, height: 64, marginBottom: 8 },
  badgeTitle: { fontSize: 12, fontFamily: 'Pretendard-Medium', color: colors.text, textAlign: 'center' },

  lockedRow:     { flexDirection: 'column', marginBottom: 22 },
  lockedCard:    { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderColor: colors.hairline },
  lockedIconWrap:{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lockedOverlay: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#A89278', alignItems: 'center', justifyContent: 'center' },
  lockedLabel:   { fontSize: 14, fontFamily: 'Pretendard-Medium', color: '#A89278' },
  lockedSub:     { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.faint, marginTop: 2 },
});

import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/tokens';
import { useStore } from '../../store';
import { PAPERS } from '../../data/papers';
import { SectionTitle, GradeBadge, ProgressBar } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const REC_PAPER_ID = 'attention';

// Figma "Home (최종)" 확정 시안 그대로 — 마스코트+인사 한 줄, 하트만 있는 스탯,
// 추천논문/이어서학습 2단 분할, 주간학습 스탯, 최근 도감 배지줄.
const RECENT_BADGES = [
  { id: 'attention', title: 'Attention is All\nYou Need', img: require('../../../assets/badges/badge-gold-1.png') },
  { id: 'bert',      title: 'BERT',                        img: require('../../../assets/badges/badge-gold-2.png') },
  { id: 'gpt2',      title: 'GPT-2',                        img: require('../../../assets/badges/badge-silver-1.png') },
  { id: 'resnet',    title: 'ResNet',                       img: require('../../../assets/badges/badge-gold-3.png') },
];

export default function HomeScreen({ navigation }: Props) {
  const [state] = useStore();
  const recPaper = PAPERS.find(p => p.id === REC_PAPER_ID);
  const [challenges, setChallenges] = React.useState([
    { id: 1, text: '논문 1편 완료하기', xp: 50, done: true },
    { id: 2, text: '한 줄 요약 작성하기', xp: 20, done: false },
  ]);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* 마스코트 + 인사 한 줄 + 하트 */}
          <View style={s.heroRow}>
            <Image source={require('../../../assets/cat/cat-wave.png')} style={s.mascot} resizeMode="contain" />
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
          <View style={[s.twoCol, isWide && s.twoColWide]}>
            <View style={[s.colLeft, isWide && s.colLeftWide]}>
              <SectionTitle title="오늘의 추천 논문" rule />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={s.recTitle}>{recPaper?.title}</Text>
                <GradeBadge grade={recPaper?.grade} />
              </View>
              <Text style={s.recMeta}>VASWANI ET AL. · {recPaper?.year} · 인용 {recPaper?.cites}</Text>
              <Pressable onPress={() => navigation.navigate('PaperDetail', { paperId: 'attention' })}>
                <Text style={s.studyLink}>학습하기 →</Text>
              </Pressable>
            </View>

            {isWide && <View style={s.vDivider} />}

            <View style={[s.colRight, isWide && s.colRightWide]}>
              <SectionTitle title="이어서 학습하기" rule />
              <Pressable onPress={() => navigation.navigate('StageMap', { paperId: 'bert' })}>
                <Text style={s.continueTitle}>BERT: Pre-training of Deep Bidirectional…</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}><ProgressBar value={0.8} height={8} fillColor={colors.accent2} trackColor={colors.hairline} /></View>
                  <Text style={s.pct}>80%</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {state.isGuest && (
            <>
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
            </>
          )}

          {!state.isGuest && (
            <>
              <SectionTitle title="오늘의 도전 과제" rule />
              <View style={{ marginBottom: 22 }}>
                {challenges.map((c, i) => (
                  <Pressable key={c.id} onPress={() => setChallenges(challenges.map(x => x.id === c.id ? { ...x, done: !x.done } : x))} style={[s.chal, i > 0 && s.chalBorder]}>
                    <View style={[s.checkbox, c.done && s.checkboxOn]}>
                      {c.done && <Feather name="check" size={16} color="#fff" />}
                    </View>
                    <Text style={[s.chalText, c.done && { color: colors.mutedSoft, textDecorationLine: 'line-through' }]}>{c.text}</Text>
                    <Text style={s.xpText}>+{c.xp} XP</Text>
                  </Pressable>
                ))}
              </View>

              {/* 이번 주 학습 — 3스탯 + 진행바 */}
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

              {/* 최근 도감 */}
              <SectionTitle title="최근 도감" right="전체 보기 →" />
              <Pressable onPress={() => navigation.navigate('Collection')}>
                <View style={s.badgeRow}>
                  {RECENT_BADGES.map(b => (
                    <View key={b.id} style={s.badgeItem}>
                      <Image source={b.img} style={s.badgeImg} resizeMode="contain" />
                      <Text style={s.badgeTitle} numberOfLines={2}>{b.title}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            </>
          )}
        </ScrollView>
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

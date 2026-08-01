import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { ProgressBar } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "StageMap" 확정 시안 — 지그재그 여정 경로(1~5장) + 완료 스테이지 반짝임 +
// 진행 중 스테이지에 마스코트 + 마지막 잠긴 스테이지에 완독 보상 아이콘.
// 5개 노드는 캡디2 실제 학습 활동(구조시각화·스토리텔링·요약챌린지·토론·QA챗봇)에 그대로 매핑.
const STAGES = [
  { n: '1장', title: '이해하기', screen: 'PaperDetail',      status: 'done' as const },
  { n: '2장', title: '방법론',   screen: 'Storytelling',     status: 'done' as const },
  { n: '3장', title: '실험설계', screen: 'SummaryChallenge', status: 'done' as const },
  { n: '4장', title: '결과분석', screen: 'Discussion',       status: 'active' as const },
  { n: '5장', title: '결론',     screen: 'QAChatbot',        status: 'locked' as const },
];

export default function StageMapScreen({ navigation, route }: Props) {
  // route.params 타입 미정의 — as any로 접근 (per-screen param list 아직 없음)
  const paperId = (route.params as any)?.paperId || 'attention';
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const doneCount = STAGES.filter(s => s.status === 'done').length;
  const pct = doneCount / STAGES.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.navTitle} numberOfLines={1}>Attention is All You Need</Text>
      </View>

      <View style={centerColumn}>
        <ScrollView style={readingWidth} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Text style={s.subTitle}>Attention is All You Need — {STAGES.length}개 스테이지 여정</Text>

          <View style={s.statCard}>
            <Text style={s.pct}>{Math.round(pct * 100)}%</Text>
            <Text style={s.pctSub}>{doneCount}/{STAGES.length} 스테이지 완료 · 예상 12분 남음</Text>
          </View>

          <View style={[s.path, isWide && s.pathWide]}>
            {STAGES.map((st, i) => {
              const isDone = st.status === 'done';
              const isActive = st.status === 'active';
              const isLocked = st.status === 'locked';
              const zigzag = isWide ? (i % 2 === 1 ? 36 : 0) : 0;
              return (
                <React.Fragment key={st.n}>
                  {i > 0 && <View style={s.connector} />}
                  <Pressable
                    style={[s.node, { marginTop: zigzag }]}
                    disabled={isLocked}
                    onPress={() => navigation.navigate(st.screen, { paperId })}
                  >
                    {isDone && <Text style={s.sparkle}>✦</Text>}
                    {/* Figma 그대로 — 완독 보상은 별도 블록이 아니라 마지막(잠긴) 노드 바로 위에 붙음 */}
                    {i === STAGES.length - 1 && (
                      <View style={s.reward}>
                        <Text style={s.rewardIcon}>🎁</Text>
                        <Text style={s.rewardLabel}>완독 보상</Text>
                      </View>
                    )}
                    <View style={[s.badge, isDone && s.badgeDone, isActive && s.badgeActive, isLocked && s.badgeLocked]}>
                      {isActive ? (
                        <Image source={require('../../../assets/cat/surprise.png')} style={s.mascot} resizeMode="contain" />
                      ) : (
                        <Feather
                          name={isDone ? 'check' : 'lock'}
                          size={isDone ? 20 : 16}
                          color={isDone ? '#fff' : colors.faint}
                        />
                      )}
                    </View>
                    <Text style={[s.nodeTitle, isLocked && { color: colors.faint }]}>{st.n} {st.title}</Text>
                    <Text style={s.nodeStatus}>{isDone ? '완료' : isActive ? '진행중' : '잠김'}</Text>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>

          <View style={s.footerBar}>
            <ProgressBar value={pct} height={8} fillColor={colors.accent2} trackColor={colors.hairline} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingBottom: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 17, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink },

  subTitle: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.accent2, marginBottom: 16 },

  statCard: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2, borderRadius: 20,
    paddingVertical: 18, paddingHorizontal: 22, marginBottom: 32,
    flexDirection: 'row', alignItems: 'baseline', gap: 14,
  },
  pct: { fontSize: 34, fontFamily: 'Pretendard-ExtraBold', color: colors.ink },
  pctSub: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted, flex: 1 },

  path: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  pathWide: { flexWrap: 'nowrap' },

  connector: { flex: 1, height: 1, backgroundColor: colors.hairline, marginTop: 32, marginHorizontal: 4, minWidth: 16 },

  node: { alignItems: 'center', width: 96 },
  sparkle: { fontSize: 16, color: colors.accent2, marginBottom: 2 },
  badge: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.bg, marginBottom: 10,
  },
  badgeDone: { backgroundColor: colors.accent2, borderColor: colors.accent2 },
  badgeActive: { borderColor: colors.accent, borderWidth: 2, overflow: 'hidden' },
  badgeLocked: { borderStyle: 'dashed' },
  mascot: { width: 56, height: 56 },

  nodeTitle: { fontSize: 12.5, fontFamily: 'Pretendard-Bold', color: colors.ink, textAlign: 'center' },
  nodeStatus: { fontSize: 10.5, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 2 },

  reward: { alignItems: 'center', marginBottom: 4 },
  rewardIcon: { fontSize: 20 },
  rewardLabel: { fontSize: 10, fontFamily: 'Pretendard-Bold', color: colors.accent2 },

  footerBar: { marginTop: 4 },
});

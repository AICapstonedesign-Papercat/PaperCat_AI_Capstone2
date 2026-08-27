import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Alert, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { CatBubble, Card, Divider, GradeBadge } from '../../components';
import { useStore } from '../../store';
import { usePaper } from '../../data/papers';
import { generateOverview, toPaperContext, type OverviewResult } from '../../lib/ai';
import { useReadingSession, CHECKPOINT } from '../../hooks/useReadingSession';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

export default function PaperDetailScreen({ navigation, route }: Props) {
  // route.params 타입 미정의 — as any로 접근 (per-screen param list 아직 없음)
  const paperId = (route.params as any)?.paperId || 'attention';
  const [state, set] = useStore();
  const { paper } = usePaper(paperId);
  const summaryDone = state.progress?.[paperId + '_summary'] || false;
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useReadingSession(paper?.id, CHECKPOINT.paperDetail);

  useEffect(() => {
    if (!paper || state.isGuest) return;
    if (!(state.seenPapers || []).includes(paper.id)) {
      set(prev => ({ seenPapers: [...(prev.seenPapers || []), paper.id] }));
    }
  }, [paper?.id, state.isGuest]);

  const [overview, setOverview] = useState<OverviewResult | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewFailed, setOverviewFailed] = useState(false);

  useEffect(() => {
    if (!paper) return;
    let cancelled = false;
    setLoadingOverview(true);
    setOverviewFailed(false);
    generateOverview(toPaperContext(paper))
      .then(result => { if (!cancelled) setOverview(result); })
      .catch(err => {
        console.warn('[PaperDetail] generateOverview 실패:', err);
        if (!cancelled) setOverviewFailed(true);
      })
      .finally(() => { if (!cancelled) setLoadingOverview(false); });
    return () => { cancelled = true; };
  }, [paper?.id]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{paper?.title || '논문 상세'}</Text>
        {/* grade: S = 골드 배지 강조 / Normal = 옅은 텍스트 (공용 GradeBadge) */}
        <GradeBadge grade={paper?.grade} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <CatBubble pose="concern" size={56}>이 논문 풀어보자냥!</CatBubble>
      </View>

      <View style={centerColumn}>
      <ScrollView style={readingWidth} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* 구조 시각화·스토리텔링·핵심 개념은 generate-overview Edge Function이 논문별로 생성 —
            supabase/functions/generate-overview/index.ts의 PROMPT 참고. */}
        {loadingOverview ? (
          <View style={s.loadingBlock}>
            <ActivityIndicator color={colors.accent2} />
            <Text style={s.loadingText}>냥이가 논문을 분석하고 있어요…</Text>
          </View>
        ) : overviewFailed || !overview ? (
          <Text style={s.errorText}>내용을 불러오지 못했어요. 뒤로 갔다가 다시 들어와봐 주세요냥.</Text>
        ) : (
        <View style={[s.twoCol, isWide && s.twoColWide]}>
        <View style={[s.colLeft, isWide && s.colLeftWide]}>
        <Section num={1} title="핵심 구조 시각화" />
        <Card style={{ paddingVertical: 20 }}>
          {overview.groups.map((group, gi) => (
            <View key={gi}>
              <View style={s.groupBox}>
                <Text style={s.groupTitle}>{group.title}</Text>
                {group.steps.map((step, si) => (
                  <View key={si}>
                    <View style={s.stepRow}>
                      <View style={s.stepBadge}><Text style={s.stepBadgeText}>{si + 1}</Text></View>
                      <Text style={s.stepText}>{step}</Text>
                    </View>
                    {si < group.steps.length - 1 && (
                      <View style={s.stepConnectorWrap}><Feather name="arrow-down" size={12} color={colors.faint} /></View>
                    )}
                  </View>
                ))}
              </View>
              {gi < overview.groups.length - 1 && (
                <View style={s.groupConnectorWrap}><Feather name="arrow-down" size={18} color={colors.accent2} /></View>
              )}
            </View>
          ))}
        </Card>
        </View>

        <View style={[s.colRight, isWide && s.colRightWide]}>
        <Section num={2} title="스토리텔링" />
        <View style={s.story}>
          <Text style={s.qmark}>"</Text>
          {overview.storyParagraphs.map((p, i) => (
            <Text key={i} style={s.storyP}>{p}</Text>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <Image source={require('../../../assets/cat/read_book.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, lineHeight: 20, fontStyle: 'italic' }}>{overview.pullQuote}</Text>
          </View>
        </View>

        {/* highlight: Figma 그대로 — 좌측 세로바 + 헤딩(가운데정렬 pill 아님) */}
        <View style={s.highlight}>
          <Text style={s.highlightText}>핵심 개념 : {overview.conceptName}</Text>
        </View>

        {/* why-it-matters: content directly on bg, no card box */}
        <View style={s.whyBlock}>
          <Text style={s.whyLabel}>왜 중요할까?</Text>
          <Text style={s.whyBody}>{overview.whyItMatters}</Text>
        </View>
        </View>
        </View>
        )}

        <Divider style={{ marginTop: 8, marginBottom: 8 }} />

        {/* Section 3 — next actions (overview 로딩과 무관하게 항상 접근 가능) */}
        <Section num={3} title="다음은 뭘 해볼래냥?" />
        <View style={{ marginBottom: 20 }}>
          {[
            { ic: 'message-circle', title: 'Q&A 챗봇',   sub: '궁금한 거 물어보기',           screen: 'QAChatbot',        required: false },
            { ic: 'edit-3',         title: '한 줄 요약',  sub: '100점 만점 AI 피드백',          screen: 'SummaryChallenge', required: true  },
            { ic: 'message-square', title: '다관점 토론', sub: '지지·비판·종합 관점 살펴보기',  screen: 'Discussion',       required: false },
            { ic: 'map',            title: '스테이지 맵', sub: '학습 진행 현황 보기',            screen: 'StageMap',         required: false },
          ].map((a, i) => (
            <Pressable key={i} onPress={() => !state.isGuest && navigation.navigate(a.screen, { paperId })}>
              <View style={[
                s.action,
                i > 0 && s.actionBorder,
                !state.isGuest && a.required && !summaryDone && s.actionRequired,
              ]}>
                <Feather
                  name={state.isGuest ? 'lock' : a.ic}
                  size={state.isGuest ? 18 : 22}
                  color={state.isGuest ? colors.faint : colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.actionTitle, state.isGuest && { color: colors.muted }]}>{a.title}</Text>
                    {!state.isGuest && a.required && (
                      summaryDone
                        ? <Text style={s.doneText}>완료</Text>
                        : <Text style={s.reqText}>필수</Text>
                    )}
                  </View>
                  <Text style={s.actionSub}>{a.sub}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.faint} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* CTA: solid accent button, no gradient */}
        <Pressable
          onPress={() => {
            if (state.isGuest) { navigation.navigate('CatAdoption'); return; }
            summaryDone
              ? navigation.navigate('LearningComplete', { paperId, paperTitle: paper?.title ?? '' })
              : Alert.alert('한 줄 요약 필수', '한 줄 요약 챌린지를 먼저 완료해줘냥!');
          }}
        >
          <View style={[s.completeCta, !(summaryDone || state.isGuest) && s.completeCtalocked]}>
            {!state.isGuest && <Feather name={summaryDone ? 'check-circle' : 'lock'} size={18} color="#fff" />}
            <Text style={s.completeCtaText}>
              {state.isGuest ? '가입하러가자냥!!' : summaryDone ? '학습 완료하기' : '한 줄 요약을 먼저 완료해줘냥'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Section({ num, title }: { num: number; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 12 }}>
      {/* accent number dot instead of gradient pill */}
      <Text style={secStyles.num}>{num}</Text>
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  num:   { fontSize: 12, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, letterSpacing: 0.5 },
  title: { fontSize: 16, fontFamily: 'Pretendard-SemiBold', color: colors.ink },
});

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'SUIT-Medium', fontWeight: undefined, fontSize: 16, color: colors.ink },
  // top grade (GOLD) uses accent; other grades would use colors.muted
  gradeLabel: { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },

  twoCol: {},
  twoColWide: { flexDirection: 'row', gap: 32 },
  colLeft: {},
  colLeftWide: { flex: 1 },
  colRight: {},
  colRightWide: { flex: 1 },

  loadingBlock: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  errorText: { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.muted, textAlign: 'center', paddingVertical: 60 },

  // structure diagram (replaces the old static transformer-arch.png) — grouped
  // into stage "boxes" (Section 1 architecture blocks), each with its own
  // numbered sub-step flow, mirroring how the paper's own figure would box things.
  groupBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2, borderRadius: 16, padding: 16, marginBottom: 4 },
  groupTitle: { fontSize: 12.5, fontFamily: 'Pretendard-Bold', color: colors.accent2, letterSpacing: 0.4, marginBottom: 12 },
  groupConnectorWrap: { alignItems: 'center', paddingVertical: 8 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent2, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 12, fontFamily: 'Pretendard-Bold', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text },
  stepConnectorWrap: { alignItems: 'center', paddingVertical: 4, marginLeft: 13 },

  // story: no border, no fill — content directly on bg
  story: { paddingVertical: 8, marginBottom: 4 },
  qmark: { fontFamily: 'SUIT-Medium', fontWeight: undefined, fontSize: 52, color: colors.muted, opacity: 0.4, marginBottom: 6, lineHeight: 38 },
  storyP: { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 23, marginBottom: 10 },

  // highlight: 좌측 세로 accent bar + 헤딩(Figma 그대로) — 가운데정렬 필 아님
  highlight: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 12, paddingVertical: 4, marginTop: 10, marginBottom: 10 },
  highlightText: { fontSize: 14, fontFamily: 'Pretendard-SemiBold', color: colors.ink },

  // why block: no card box, plain content on bg with top hairline
  whyBlock: { paddingTop: 16, paddingBottom: 12, borderTopWidth: 1, borderColor: colors.hairline },
  whyLabel: { fontSize: 12.5, fontFamily: 'Pretendard-Medium', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  whyBody:  { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 22 },

  // action rows: hairline separated, no card boxes or filled icon backgrounds
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  actionBorder: { borderTopWidth: 1, borderColor: colors.hairline },
  actionRequired: { borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 12 },
  actionTitle: { fontSize: 16, fontFamily: 'Pretendard-SemiBold', color: colors.ink, marginBottom: 2 },
  actionSub: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted },

  reqText:  { fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.accent },
  doneText: { fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.muted },

  // CTA: solid accent pill, no gradient
  completeCta:       { height: 56, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  completeCtalocked: { backgroundColor: colors.muted },
  completeCtaText:   { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 15 },
});

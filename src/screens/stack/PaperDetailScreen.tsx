import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { CatBubble, Card, Divider, GradeBadge } from '../../components';
import { useStore } from '../../store';
import { PAPERS } from '../../data/papers';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

export default function PaperDetailScreen({ navigation, route }: Props) {
  // route.params 타입 미정의 — as any로 접근 (per-screen param list 아직 없음)
  const paperId = (route.params as any)?.paperId || 'attention';
  const [state] = useStore();
  const paper = PAPERS.find((p) => p.id === paperId);
  const summaryDone = state.progress?.[paperId + '_summary'] || false;
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

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
        <CatBubble pose="reading" size={56}>이 논문 풀어보자냥!</CatBubble>
      </View>

      <View style={centerColumn}>
      <ScrollView style={readingWidth} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Figma: ① 다이어그램(좌) | ② 스토리텔링+③ 액션(우) 2단 분할 */}
        <View style={[s.twoCol, isWide && s.twoColWide]}>
        <View style={[s.colLeft, isWide && s.colLeftWide]}>
        <Section num={1} title="핵심 구조 시각화" />
        <Card style={{ padding: 0, alignItems: 'center', overflow: 'hidden' }}>
          <Image
            source={require('../../../assets/transformer-arch.png')}
            style={s.archImg}
            resizeMode="contain"
          />
        </Card>
        </View>

        <View style={[s.colRight, isWide && s.colRightWide]}>
        <Section num={2} title="스토리텔링" />
        <View style={s.story}>
          <Text style={s.qmark}>"</Text>
          <Text style={s.storyP}>옛날 옛적에 아주 긴 편지를 한 글자씩 차례대로 읽는 느림보 우편집배원이 있었습니다. 이 배달부는 편지의 첫 글자부터 마지막 글자까지 줄지어 한 걸음씩 걸어가야 했기 때문에, 문장이 조금만 길어져도 편지를 모두 전하는 데 너무 오랜 시간이 걸렸습니다.</Text>
          <Text style={s.storyP}>특히 먼 거리에 있는 중요한 단어들 사이의 관계를 파악할 때는 길고 험난한 과정을 거쳐야만 했습니다.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <Image source={require('../../../assets/cat/read_book.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, lineHeight: 20, fontStyle: 'italic' }}>그때, 트랜스포머라는 똑똑한 새 배달부가 나타났습니다...</Text>
          </View>
          <Text style={[s.storyP, { color: colors.text, fontFamily: 'Pretendard-Regular', fontStyle: 'italic' }]}>
            "이제는 줄을 서서 기다릴 필요 없이, 편지의 모든 단어를 한눈에 보고 바로 연결해 보세요."
          </Text>
          <Text style={[s.storyP, { marginBottom: 0 }]}>그러던 어느 날, 트랜스포머라는 이름의 똑똑한 새 배달부가 나타났습니다. 트랜스포머는 기존의 복잡한 순차 계산을 모두 없애고 전체 편지를 동시에 살펴봄으로써, AI가 훨씬 더 빠르고 정확하게 글을 이해할 수 있는 놀라운 변화를 이끌어냈습니다.</Text>
        </View>

        {/* highlight: Figma 그대로 — 좌측 세로바 + 헤딩(가운데정렬 pill 아님) */}
        <View style={s.highlight}>
          <Text style={s.highlightText}>핵심 개념 : Self-Attention (자기 주의 메커니즘)</Text>
        </View>

        {/* why-it-matters: content directly on bg, no card box */}
        <View style={s.whyBlock}>
          <Text style={s.whyLabel}>왜 중요할까?</Text>
          <Text style={s.whyBody}>Self-Attention은 문장 속 모든 단어가 다른 모든 단어와의 관계를 동시에 계산하는 메커니즘입니다. 기존 RNN/LSTM이 순차적으로 처리하던 것과 달리, 병렬 처리가 가능해 학습 속도가 비약적으로 향상되었고 먼 거리의 단어 간 관계도 정확하게 파악합니다. GPT, BERT, ChatGPT 등 현재 거의 모든 AI 언어 모델의 핵심 기반입니다.</Text>
        </View>

        <Divider style={{ marginTop: 8, marginBottom: 8 }} />

        {/* Section 3 — next actions */}
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
              ? navigation.navigate('LearningComplete', { paperId, paperTitle: 'Attention is All You Need' })
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
        </View>
        </View>
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

  archImg: { width: '100%', height: 750, borderRadius: 12 },

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

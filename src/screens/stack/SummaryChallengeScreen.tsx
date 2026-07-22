import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { CatBubble, Card, ProgressBar, XPBurst, GuestBanner, Divider } from '../../components';
import { useStore } from '../../store';

type Props = NativeStackScreenProps<ParamListBase>;

const KEYWORDS = ['Attention', 'Transformer', '병렬', 'Self-Attention', 'RNN'];

function gradeFor(text: string) {
  const lower = text.toLowerCase();
  let hits = 0;
  KEYWORDS.forEach(k => { if (lower.includes(k.toLowerCase())) hits++; });
  const lengthOk = text.length >= 25 && text.length <= 120;
  return Math.min(100, hits * 18 + (lengthOk ? 18 : 0) + (text.length > 0 ? 10 : 0) + Math.floor(Math.random() * 6));
}

export default function SummaryChallengeScreen({ navigation, route }: Props) {
  const paperId = (route?.params as any)?.paperId || 'attention'; // params not typed yet
  const [state, set] = useStore();
  const [text, setText] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [showXP, setShowXP] = useState(false);
  const [showGuest, setShowGuest] = useState(state.isGuest);

  const submit = () => {
    if (!text.trim()) return;
    const s = gradeFor(text);
    setScore(s);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 1000);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Nav */}
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}><Feather name="chevron-left" size={22} color={colors.ink} /></Pressable>
        <Text style={s.title}>한 줄 요약 챌린지</Text>
        {/* XP badge — accent accent text, no pill fill */}
        <Text style={s.step}>+50 XP</Text>
      </View>

      <View style={centerColumn}>
      <ScrollView style={readingWidth} contentContainerStyle={s.scroll}>
        <CatBubble pose="reading">이 논문을 한 문장으로 정리해보자냥</CatBubble>

        {/* Topic block — content directly on bg, no cream card */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={s.topicKicker}>주제</Text>
          <Text style={s.topicTitle}>Attention is All You Need</Text>
          <Text style={s.topicSub}>1문장으로 작성해보라냥!!</Text>
        </Card>

        <TextInput
          style={s.input}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="예: Transformer는 Self-Attention을 통해…"
          placeholderTextColor={colors.faint}
          maxLength={200}
        />
        <Text style={s.charCount}>{text.length} / 200</Text>

        {/* Keyword hints — monochrome uppercase letterspaced labels, no filled pills */}
        <Text style={s.kwLabel}>이런 키워드가 들어가면 좋아요</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
          {KEYWORDS.map(k => {
            const used = text.toLowerCase().includes(k.toLowerCase());
            return (
              <View key={k} style={s.kwRow}>
                {used && <Feather name="check" size={11} color={colors.muted} />}
                <Text style={[s.kwText, used && s.kwUsedText]}>{k}</Text>
              </View>
            );
          })}
        </View>

        {/* Score result — no cream card, content directly on bg, hairline top */}
        {score !== null && (
          <View style={s.scoreBlock}>
            <Divider style={{ marginBottom: 20 }} />
            <Text style={s.scoreKicker}>AI FEEDBACK</Text>
            {/* Large score number in ink, accent only on the key figure */}
            <Text style={s.scoreNum}>{score}</Text>
            <Text style={s.scoreDenom}>/ 100</Text>
            <View style={{ width: '100%', marginVertical: 16 }}>
              <ProgressBar value={score / 100} height={8} fillColor={colors.accent2} trackColor={colors.hairline} />
            </View>
            <Text style={s.scoreFeedback}>
              {score >= 85 ? '훌륭한 요약이냥! 핵심 키워드를 잘 담아냈어' :
               score >= 65 ? '좋아냥. 키워드 1~2개만 더 넣으면 완벽해질 거야' :
                              '조금 더 구체적으로 적어보자냥. 키워드를 활용해봐'}
            </Text>
          </View>
        )}
      </ScrollView>
      </View>

      <XPBurst xp={50} visible={showXP} />
      <GuestBanner visible={showGuest} onClose={() => setShowGuest(false)} navigation={navigation} />

      {/* CTA footer — solid accent, pill, no gradient */}
      <View style={s.footer}>
        <Pressable onPress={score !== null ? () => {
          set((prev): any => ({ progress: { ...prev.progress, [paperId + '_summary']: true } }));
          navigation.navigate('LearningComplete', { paperId, paperTitle: 'Attention is All You Need', xpEarned: score >= 85 ? 70 : score >= 65 ? 50 : 30 });
        } : submit}>
          <View style={[s.cta, readingWidth, { alignSelf: 'center' }]}>
            <Text style={s.ctaText}>{score !== null ? '완료하기' : 'AI 채점받기'}</Text>
            <Feather name={score !== null ? 'check' : 'send'} size={20} color="#fff" />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  /* Nav */
  nav:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:{ flex: 1, fontFamily: 'Pretendard-SemiBold', fontSize: 16, color: colors.ink },
  /* XP label — accent text only, no pill */
  step: { fontSize: 11, fontFamily: 'SUIT-Medium', color: colors.accent, letterSpacing: 0.6 },

  scroll: { padding: 20, paddingBottom: 120 },

  /* Topic block */
  topicKicker: { fontSize: 10.5, fontFamily: 'SUIT-Medium', color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  topicTitle:  { fontSize: 16, fontFamily: 'SUIT-Medium', color: colors.ink },
  topicSub:    { marginTop: 4, fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },

  /* Text input — hairline border, no white card */
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 16, fontSize: 15, fontFamily: 'Pretendard-Regular', color: colors.ink, minHeight: 120, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', fontSize: 11, fontFamily: 'SUIT-Medium', color: colors.faint, marginTop: 4 },

  /* Keyword hints — monochrome uppercase labels, no pill borders */
  kwLabel:    { marginTop: 14, fontSize: 10.5, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 0.6, marginBottom: 8 },
  kwRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kwText:     { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },
  kwUsedText: { color: colors.ink },

  /* Score block — hairline top, no cream fill */
  scoreBlock:    { marginTop: 22, alignItems: 'center' },
  scoreKicker:   { fontSize: 10.5, fontFamily: 'SUIT-Medium', color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  scoreNum:      { fontSize: 64, fontFamily: 'SUIT-Bold', color: colors.accent, lineHeight: 70 },
  scoreDenom:    { fontSize: 12, fontFamily: 'SUIT-Medium', color: colors.muted, marginBottom: 2 },
  scoreFeedback: { fontSize: 13.5, fontFamily: 'Pretendard-Regular', color: colors.text, textAlign: 'center', lineHeight: 21 },

  /* Footer CTA — solid accent pill, no gradient */
  footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: colors.bg },
  cta:     { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
});

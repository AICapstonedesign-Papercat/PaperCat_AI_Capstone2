import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { CatBubble, Card, ProgressBar, XPBurst, GuestBanner, Divider } from '../../components';
import { useStore } from '../../store';
import { usePaper } from '../../data/papers';
import { gradeSummary, toPaperContext, type GradeResult } from '../../lib/ai';
import { useReadingSession, CHECKPOINT } from '../../hooks/useReadingSession';
import { getCurrentUserId } from '../../lib/supabase';
import { recordChallengeAttempt } from '../../lib/db';

type Props = NativeStackScreenProps<ParamListBase>;

// 65점 기준으로 '통과' — 아래 채점 피드백 톤과 xpEarned 등급이 이미 65를 기준선으로 쓰던 것과 맞춤.
const PASS_SCORE = 65;

export default function SummaryChallengeScreen({ navigation, route }: Props) {
  const paperId = (route?.params as any)?.paperId || 'attention'; // params not typed yet
  const { paper } = usePaper(paperId);
  const [state, set] = useStore();
  const [text, setText] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [showGuest, setShowGuest] = useState(state.isGuest);

  useReadingSession(paper?.id, CHECKPOINT.summaryChallenge);

  const submit = async () => {
    if (!text.trim() || grading || !paper) return;
    setGrading(true);
    try {
      const graded = await gradeSummary(toPaperContext(paper), text.trim());
      setResult(graded);
      setShowXP(true);
      setTimeout(() => setShowXP(false), 1000);

      if (!state.isGuest) {
        const passed = graded.score >= PASS_SCORE;
        const userId = await getCurrentUserId();
        if (userId) {
          await recordChallengeAttempt(userId, passed);
          set(prev => ({
            challengeAttempts: prev.challengeAttempts + 1,
            challengePasses: prev.challengePasses + (passed ? 1 : 0),
          }));
        }
      }
    } catch (err) {
      console.warn('[SummaryChallenge] gradeSummary 실패:', err);
      setResult({ score: 0, feedback: '앗, 채점을 못 가져왔어냥. 잠시 후 다시 시도해줘냥', matchedKeywords: [] });
    } finally {
      setGrading(false);
    }
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
          <Text style={s.topicTitle}>{paper?.title ?? '...'}</Text>
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
          editable={!grading}
        />
        <Text style={s.charCount}>{text.length} / 200</Text>

        {/* Score result — no cream card, content directly on bg, hairline top */}
        {result !== null && (
          <View style={s.scoreBlock}>
            <Divider style={{ marginBottom: 20 }} />
            <Text style={s.scoreKicker}>AI FEEDBACK</Text>
            {/* Large score number in ink, accent only on the key figure */}
            <Text style={s.scoreNum}>{result.score}</Text>
            <Text style={s.scoreDenom}>/ 100</Text>
            <View style={{ width: '100%', marginVertical: 16 }}>
              <ProgressBar value={result.score / 100} height={8} fillColor={colors.accent2} trackColor={colors.hairline} />
            </View>
            <Text style={s.scoreFeedback}>{result.feedback}</Text>
            {result.matchedKeywords.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
                {result.matchedKeywords.map(k => (
                  <View key={k} style={s.kwRow}>
                    <Feather name="check" size={11} color={colors.muted} />
                    <Text style={[s.kwText, s.kwUsedText]}>{k}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      </View>

      <XPBurst xp={50} visible={showXP} />
      <GuestBanner visible={showGuest} onClose={() => setShowGuest(false)} navigation={navigation} />

      {/* CTA footer — solid accent, pill, no gradient */}
      <View style={s.footer}>
        <Pressable disabled={grading} onPress={result !== null ? () => {
          set((prev): any => ({ progress: { ...prev.progress, [paperId + '_summary']: true } }));
          navigation.navigate('LearningComplete', { paperId, paperTitle: paper?.title ?? '', xpEarned: result.score >= 85 ? 70 : result.score >= 65 ? 50 : 30 });
        } : submit}>
          <View style={[s.cta, readingWidth, { alignSelf: 'center' }, grading && { opacity: 0.6 }]}>
            {grading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.ctaText}>{result !== null ? '완료하기' : 'AI 채점받기'}</Text>
                <Feather name={result !== null ? 'check' : 'send'} size={20} color="#fff" />
              </>
            )}
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

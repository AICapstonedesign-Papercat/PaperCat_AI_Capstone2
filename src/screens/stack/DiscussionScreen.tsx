import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { GuestBanner, ProgressBar } from '../../components';
import { useStore } from '../../store';
import { usePaper } from '../../data/papers';
import { generateDiscussion, toPaperContext, type DiscussionResult } from '../../lib/ai';
import { useReadingSession, CHECKPOINT } from '../../hooks/useReadingSession';
import { getCurrentUserId } from '../../lib/supabase';
import { fetchDiscussionVotes, castDiscussionVote, type DiscussionVoteCounts, type DiscussionSide } from '../../lib/db';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "Discussion" 확정 시안 — VS 구도의 찬성/비판 카드(캐릭터 아바타 포함) + 심판 종합 + 투표바.
// 카드 텍스트(vsTitle/sides/judge)는 generate-discussion Edge Function이 논문별로 생성 —
// supabase/functions/generate-discussion/index.ts의 PROMPT 참고. 아바타 이미지는 진영(찬성/비판)에
// 고정 매칭이라 그대로 로컬 에셋 사용. 투표 수치는 discussion_votes 테이블 실집계
// (RESPONSE_SCHEMA가 sides[0]=찬성/sides[1]=비판 순서를 강제하므로 인덱스로 pro/critical 매핑).
const SIDE_AVATARS = [
  require('../../../assets/cat/cat-calm.png'),
  require('../../../assets/cat/cat-chill.png'),
];
const SIDE_KEYS: DiscussionSide[] = ['pro', 'critical'];

export default function DiscussionScreen({ navigation, route }: Props) {
  const paperId = (route?.params as any)?.paperId || 'attention';
  const { paper } = usePaper(paperId);
  const [state] = useStore();
  const [showGuest, setShowGuest] = useState(state.isGuest);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useReadingSession(paper?.id, CHECKPOINT.discussion);

  const [discussion, setDiscussion] = useState<DiscussionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [voteCounts, setVoteCounts] = useState<DiscussionVoteCounts | null>(null);
  const [votingBusy, setVotingBusy] = useState(false);

  useEffect(() => {
    if (!paper) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    generateDiscussion(toPaperContext(paper))
      .then(result => { if (!cancelled) setDiscussion(result); })
      .catch(err => {
        console.warn('[Discussion] generateDiscussion 실패:', err);
        if (!cancelled) setFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [paper?.id]);

  useEffect(() => {
    if (!paper || state.isGuest) return;
    let cancelled = false;
    getCurrentUserId().then(userId => {
      if (!userId || cancelled) return;
      fetchDiscussionVotes(paper.id, userId)
        .then(counts => { if (!cancelled) setVoteCounts(counts); })
        .catch(err => console.warn('[Discussion] fetchDiscussionVotes 실패:', err));
    });
    return () => { cancelled = true; };
  }, [paper?.id, state.isGuest]);

  const vote = async (side: DiscussionSide) => {
    if (!paper || state.isGuest || votingBusy || voteCounts?.mine) return;
    setVotingBusy(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      await castDiscussionVote(userId, paper.id, side);
      const fresh = await fetchDiscussionVotes(paper.id, userId);
      setVoteCounts(fresh);
    } catch (err) {
      console.warn('[Discussion] castDiscussionVote 실패:', err);
    } finally {
      setVotingBusy(false);
    }
  };

  const totalVotes = (voteCounts?.pro ?? 0) + (voteCounts?.critical ?? 0);
  const proPct = totalVotes > 0 ? (voteCounts?.pro ?? 0) / totalVotes : 0.5;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text style={s.title}>Discussion</Text>
        <Text style={s.step}>+15 XP</Text>
      </View>

      <View style={centerColumn}>
        <ScrollView style={readingWidth} contentContainerStyle={s.scroll}>
          {loading ? (
            <View style={s.loadingBlock}>
              <ActivityIndicator color={colors.accent2} />
              <Text style={s.loadingText}>냥이들이 토론 중이에요…</Text>
            </View>
          ) : failed || !discussion ? (
            <Text style={s.errorText}>토론을 불러오지 못했어요. 뒤로 갔다가 다시 들어와봐 주세요냥.</Text>
          ) : (
            <>
              <Text style={s.vsTitle}>{discussion.vsTitle}</Text>

              <View style={[s.sides, isWide && s.sidesWide]}>
                {discussion.sides.map((side, i) => {
                  const sideKey = SIDE_KEYS[i % SIDE_KEYS.length];
                  const isMine = voteCounts?.mine === sideKey;
                  return (
                    <View key={i} style={[s.card, isWide && s.cardWide]}>
                      <View style={s.cardHead}>
                        <View style={s.chip}><Text style={s.chipText}>{side.label}</Text></View>
                        <Image source={SIDE_AVATARS[i % SIDE_AVATARS.length]} style={s.avatar} resizeMode="contain" />
                      </View>
                      <Text style={s.cardText}>{side.text}</Text>
                      {!state.isGuest && (
                        <Pressable
                          disabled={votingBusy || !!voteCounts?.mine}
                          onPress={() => vote(sideKey)}
                          style={[s.cardVoteBtn, isMine && s.cardVoteBtnSel, !!voteCounts?.mine && !isMine && { opacity: 0.4 }]}
                        >
                          <Text style={[s.cardVoteBtnText, isMine && s.cardVoteBtnTextSel]}>
                            {isMine ? '✓ 내 선택' : '이 편에 투표'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={s.judge}>
                <Text style={s.judgeLabel}>⚖ 심판의 종합</Text>
                <Text style={s.judgeText}>{discussion.judge}</Text>
              </View>

              <View style={s.voteBlock}>
                {totalVotes > 0 ? (
                  <>
                    <Text style={s.voteLabel}>참여자 투표 · {totalVotes}명 참여</Text>
                    <ProgressBar value={proPct} height={12} fillColor={colors.accent2} trackColor={colors.hairline} />
                    <Text style={s.voteSub}>찬성 {Math.round(proPct * 100)}% · 비판 {Math.round((1 - proPct) * 100)}%</Text>
                  </>
                ) : (
                  <Text style={s.voteLabel}>아직 투표가 없어요 — 카드 아래 버튼으로 첫 투표를 남겨보세요</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <View style={s.footer}>
        <Pressable onPress={() => navigation.goBack()}>
          <View style={[s.cta, readingWidth, { alignSelf: 'center' }]}>
            <Text style={s.ctaText}>확인했다냥!</Text>
            <Feather name="check" size={20} color="#fff" />
          </View>
        </Pressable>
      </View>
      <GuestBanner visible={showGuest} onClose={() => setShowGuest(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:{ flex: 1, fontFamily: 'SUIT-Medium', fontSize: 17, color: colors.ink },
  step: { fontSize: 11, fontFamily: 'SUIT-Medium', color: colors.accent, letterSpacing: 0.6 },

  scroll: { padding: 20, paddingBottom: 120 },

  loadingBlock: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  errorText: { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.muted, textAlign: 'center', paddingVertical: 60 },

  vsTitle: { fontSize: 20, fontFamily: 'Pretendard-Bold', color: colors.ink, textAlign: 'center', marginBottom: 20 },

  sides: { gap: 16, marginBottom: 24 },
  sidesWide: { flexDirection: 'row' },
  card: {
    flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2, borderRadius: 24,
    padding: 20,
  },
  cardWide: {},
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chip: { backgroundColor: colors.accent2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: '#fff', fontSize: 12, fontFamily: 'Pretendard-Bold' },
  avatar: { width: 48, height: 48 },
  cardText: { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 21 },

  cardVoteBtn: { marginTop: 14, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.accent2 },
  cardVoteBtnSel: { backgroundColor: colors.accent2 },
  cardVoteBtnText: { fontSize: 12.5, fontFamily: 'Pretendard-Bold', color: colors.accent2 },
  cardVoteBtnTextSel: { color: '#fff' },

  judge: { borderTopWidth: 1, borderColor: colors.hairline, paddingTop: 16, marginBottom: 20 },
  judgeLabel: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: colors.accent2, marginBottom: 6 },
  judgeText: { fontSize: 13.5, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 20 },

  voteBlock: { marginBottom: 16 },
  voteLabel: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: colors.accent2, marginBottom: 10 },
  voteSub: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 8 },

  footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: colors.bg },
  cta:     { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
});

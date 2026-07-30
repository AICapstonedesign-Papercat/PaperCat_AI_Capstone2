import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { GuestBanner, ProgressBar } from '../../components';
import { useStore } from '../../store';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "Discussion" 확정 시안 — VS 구도의 찬성/비판 카드(캐릭터 아바타 포함) + 심판 종합 + 투표바.
const SIDES = [
  { label: '찬성 진영', avatar: require('../../../assets/cat/cat-calm.png'),
    text: 'Self-Attention은 병렬 처리로 RNN의 순차 계산 한계를 완전히 극복했습니다. 여러 NLP 벤치마크에서 SOTA를 달성했어요.' },
  { label: '비판 진영', avatar: require('../../../assets/cat/cat-chill.png'),
    text: 'O(n²) 연산량이 긴 시퀀스에서 병목이 됩니다. 문서 전체를 다루려면 여전히 최적화가 필요해요.' },
];

export default function DiscussionScreen({ navigation }: Props) {
  const [state] = useStore();
  const [showGuest, setShowGuest] = useState(state.isGuest);
  const [voted, setVoted] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

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
          <Text style={s.vsTitle}>Self-Attention을 둘러싼 3파전</Text>

          <View style={[s.sides, isWide && s.sidesWide]}>
            {SIDES.map((side, i) => (
              <View key={i} style={[s.card, isWide && s.cardWide]}>
                <View style={s.cardHead}>
                  <View style={s.chip}><Text style={s.chipText}>{side.label}</Text></View>
                  <Image source={side.avatar} style={s.avatar} resizeMode="contain" />
                </View>
                <Text style={s.cardText}>{side.text}</Text>
              </View>
            ))}
          </View>

          <View style={s.judge}>
            <Text style={s.judgeLabel}>⚖ 심판의 종합</Text>
            <Text style={s.judgeText}>
              짧은 문장엔 찬성 진영이, 긴 문서엔 비판 진영이 맞습니다 — 실무에선 Sparse Attention
              등으로 절충해요.
            </Text>
          </View>

          <View style={s.voteBlock}>
            <Text style={s.voteLabel}>참여자 투표 · 42명 참여</Text>
            <ProgressBar value={0.64} height={12} fillColor={colors.accent2} trackColor={colors.hairline} />
            <Text style={s.voteSub}>찬성 64% · 반대 36%</Text>
          </View>

          <Pressable style={[s.voteCta, voted && { opacity: 0.5 }]} disabled={voted} onPress={() => setVoted(true)}>
            <Text style={s.voteCtaText}>{voted ? '투표 완료!' : '내 관점 투표하기 →'}</Text>
          </Pressable>
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

  judge: { borderTopWidth: 1, borderColor: colors.hairline, paddingTop: 16, marginBottom: 20 },
  judgeLabel: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: colors.accent2, marginBottom: 6 },
  judgeText: { fontSize: 13.5, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 20 },

  voteBlock: { marginBottom: 16 },
  voteLabel: { fontSize: 13, fontFamily: 'Pretendard-Bold', color: colors.accent2, marginBottom: 10 },
  voteSub: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 8 },

  voteCta: { alignSelf: 'center', paddingVertical: 8 },
  voteCtaText: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: colors.accent },

  footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: colors.bg },
  cta:     { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
});

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme/tokens';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const FEATURES = [
  { n: '01', title: '논문 스토리텔링', desc: '어려운 논문을 이야기로 쉽게' },
  { n: '02', title: '핵심 구조 시각화', desc: '아키텍처를 블록으로 한눈에' },
  { n: '03', title: '한 줄 요약 챌린지', desc: 'AI 피드백으로 이해도 확인' },
  { n: '04', title: 'Q&A 챗봇', desc: '궁금한 것 바로 물어보기' },
  { n: '05', title: '다관점 토론', desc: '지지·비판·종합 관점 비교' },
];

export default function PlayFirstScreen({ navigation }: Props) {
  const [, set] = useStore();
  // 폭 기준 반응형: iPad에서 좌우 배치, 좁으면 자연스럽게 세로로 쌓임 — 하드코딩 해상도값 없음
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const tryAsGuest = () => {
    set({ onboardingDone: true, isGuest: true });
    navigation.replace('Tabs');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.body, isWide && s.bodyWide]}>
        <Image
          source={require('../../../assets/cat/study_with_ipad.png')}
          style={[s.hero, isWide ? s.heroWide : s.heroNarrow]}
          resizeMode="contain"
        />

        <View style={[s.copy, isWide && s.copyWide]}>
          <Text style={s.title}>AI 논문을{'\n'}게임처럼 배워봐냥!</Text>
          <Text style={s.subtitle}>어려운 논문도 고양이랑 함께라면 재미있게 읽을 수 있어냥</Text>

          <View style={s.featureList}>
            {FEATURES.map((f, i) => (
              <View key={f.n} style={[s.featureRow, i > 0 && s.featureBorder]}>
                <Text style={s.featureN}>{f.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={s.cta} onPress={() => navigation.navigate('CatAdoption')}>
            <Text style={s.ctaText}>시작하기 →</Text>
          </Pressable>
          <Pressable style={s.guest} onPress={tryAsGuest}>
            <Text style={s.guestText}>가입 없이 먼저 체험해보기</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bodyWide: { flexDirection: 'row', gap: 56, justifyContent: 'center' },

  hero: { marginBottom: 24 },
  heroNarrow: { width: 200, height: 300 },
  heroWide: { width: 340, height: 480, marginBottom: 0 },

  copy: { width: '100%', maxWidth: 420 },
  copyWide: { maxWidth: 480 },

  title: { fontSize: 30, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, lineHeight: 38, marginBottom: 10 },
  subtitle: { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.muted, lineHeight: 20, marginBottom: 22 },

  featureList: { marginBottom: 26 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
  featureBorder: { borderTopWidth: 1, borderColor: colors.hairline },
  featureN: { fontSize: 12, fontFamily: 'SUIT-Bold', fontWeight: undefined, color: colors.accent2, width: 20, marginTop: 2 },
  featureTitle: { fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: colors.ink, marginBottom: 2 },
  featureDesc: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },

  cta: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17, letterSpacing: 0.3 },

  guest: { alignItems: 'center', paddingVertical: 14 },
  guestText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
});

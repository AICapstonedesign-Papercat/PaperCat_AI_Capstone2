import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "Storytelling" 확정 시안 — 챕터 헤딩 + 큰 제목 + 원형 점선 프레임 마스코트 +
// 드롭캡 본문 + 하단 필(pill)형 "냥이의 속삭임" 콜아웃.
export default function StorytellingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.navTitle}>Storytelling</Text>
      </View>

      <View style={centerColumn}>
        <ScrollView style={readingWidth} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text style={s.chapter}>1장 · 우리가 몰랐던 이야기</Text>

          <View style={[s.headRow, isWide && s.headRowWide]}>
            <Text style={[s.bigTitle, isWide && { flex: 1 }]}>Self-Attention이 세상을 바꾼 날</Text>
            <View style={s.mascotRing}>
              <Image source={require('../../../assets/cat/hi.png')} style={s.mascot} resizeMode="contain" />
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.storyBody}>
            <Text style={s.dropCap}>본</Text>
            <Text style={s.p}>
              연구는 대규모 언어모델의 in-context learning 능력이 사전학습 데이터 분포에 어떻게
              의존하는지를 실증적으로 분석한다. 저자들은 태스크 다양성과 예시 개수를 체계적으로
              변화시키며 few-shot 성능의 변화를 관찰했고, 그 결과 데이터가 다양할수록 새로운
              문제에 더 잘 적응한다는 사실을 발견했다.
            </Text>
          </View>

          <View style={s.whisper}>
            <Image source={require('../../../assets/cat/concern.png')} style={s.whisperIcon} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={s.whisperLabel}>냥이의 속삭임</Text>
              <Text style={s.whisperText}>
                쉽게 말하면, 이 모델은 예시 몇 개만 보고도 처음 보는 문제를 풀 수 있어요 —
                데이터가 다양할수록 더 똑똑해진대요냥.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={s.footer}>
        <Pressable onPress={() => navigation.goBack()} style={s.cta}>
          <Text style={s.ctaText}>이해했다냥!</Text>
          <Feather name="check" size={20} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 17, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink },

  chapter: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.accent2, letterSpacing: 1, marginBottom: 8 },

  headRow: { marginBottom: 20 },
  headRowWide: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  bigTitle: { fontSize: 28, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, lineHeight: 36 },

  mascotRing: {
    width: 130, height: 130, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16,
  },
  mascot: { width: 90, height: 90 },

  divider: { height: 1, backgroundColor: colors.hairline, marginBottom: 20 },

  storyBody: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dropCap: { fontSize: 40, fontFamily: 'Pretendard-ExtraBold', color: colors.accent2, lineHeight: 40 },
  p: { flex: 1, fontSize: 15, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 26, paddingTop: 4 },

  whisper: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2, borderRadius: 999,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  whisperIcon: { width: 48, height: 48 },
  whisperLabel: { fontSize: 12.5, fontFamily: 'Pretendard-Bold', color: colors.accent2, marginBottom: 4 },
  whisperText: { fontSize: 13.5, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 19 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: colors.bg },
  cta: { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17, letterSpacing: 0.3 },
});

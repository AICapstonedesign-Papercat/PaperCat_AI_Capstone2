import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, CAT_COLORS } from '../../theme/tokens';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "InterestPicker (진영 합류형)" 확정 시안 — 진영 4개, 진영별 컬러는 CAT_COLORS(tokens.ts)에서 가져옴
const FACTIONS = [
  { id: 'NLP',   name: 'NLP 진영',    sub: '언어모델 탐구대',   members: 128, color: CAT_COLORS.NLP },
  { id: 'CV',    name: 'CV 진영',     sub: '컴퓨터비전 원정대', members: 96,  color: CAT_COLORS.CV },
  { id: 'RL',    name: 'RL 진영',     sub: '강화학습 특공대',   members: 54,  color: CAT_COLORS.RL },
  { id: 'GenAI', name: '생성AI 진영', sub: '디퓨전·GAN 창작단', members: 71,  color: CAT_COLORS.생성AI },
];

function FactionCard({ f, sel, cardStyle, onPress }: { f: typeof FACTIONS[number]; sel: boolean; cardStyle: any; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    // 누를 때마다 통통 튀는 바운스 이펙트
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3.5, tension: 140, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ flex: 1, minWidth: cardStyle.minWidth, transform: [{ scale }] }}>
      <Pressable
        style={[s.card, { borderColor: f.color }, sel && s.cardSel]}
        onPress={press}
      >
        {sel && (
          <View style={[s.ribbon, { backgroundColor: f.color }]}>
            <Text style={s.ribbonText}>합류완료</Text>
          </View>
        )}
        <View style={[s.emblem, { borderColor: f.color }]}>
          <Feather name="award" size={28} color={sel ? f.color : colors.faint} />
        </View>
        <Text style={[s.factionName, sel && { color: colors.ink }]}>{f.name}</Text>
        <Text style={s.factionSub}>{f.sub}</Text>
        <View style={s.cardDivider} />
        <Text style={[s.members, sel && { color: f.color }]}>{f.members}명 합류</Text>
        <Text style={[s.action, sel ? { color: colors.ink } : { color: f.color }]}>
          {sel ? '누르면 탈퇴' : '눌러서 합류하기 →'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function InterestPickerScreen({ navigation }: Props) {
  const [, set] = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const MAX_FACTIONS = 3;
  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_FACTIONS) return prev;
      return [...prev, id];
    });
  };

  const finish = () => {
    // TODO(store): PaperCatState has no `interests` field yet -- persisted loosely until store.ts adds it.
    set({ interests: selected } as any);
    navigation.navigate('StreakCommit');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={s.track}><View style={[s.fill, { width: '75%' }]} /></View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>어떤 진영에 합류할래냥? (최대 {MAX_FACTIONS}개)</Text>
        <Text style={s.helper}>진영에 따라 추천 논문이 달라져요</Text>

        <View style={[s.factionRow, isWide && s.factionRowWide]}>
          {FACTIONS.map(f => (
            <FactionCard
              key={f.id}
              f={f}
              sel={selected.includes(f.id)}
              cardStyle={{ minWidth: isWide ? 0 : '46%' }}
              onPress={() => toggle(f.id)}
            />
          ))}
        </View>

        <Text style={s.status}>
          {selected.length}/{MAX_FACTIONS} 진영 합류 완료
          {selected.length > 0 && selected.length < MAX_FACTIONS ? ` · ${MAX_FACTIONS - selected.length}개 더 고를 수 있어요` : ''}
        </Text>
      </ScrollView>

      <View style={s.footer}>
        <Pressable onPress={finish} disabled={selected.length === 0} style={{ opacity: selected.length === 0 ? 0.45 : 1 }}>
          <View style={s.cta}>
            <Text style={s.ctaText}>다음 →</Text>
          </View>
        </Pressable>
        <Pressable style={s.skip} onPress={finish}>
          <Text style={s.skipText}>건너뛰기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  track:{ flex: 1, height: 6, backgroundColor: colors.hairline, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },

  body: { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 160, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  title:  { fontSize: 26, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, marginBottom: 6 },
  helper: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 24 },

  factionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 22 },
  factionRowWide: { flexWrap: 'nowrap' },

  card: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 28,
    paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center',
  },
  cardSel:  { borderStyle: 'solid', borderWidth: 2 },

  ribbon: { position: 'absolute', top: -12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  ribbonText: { color: '#fff', fontSize: 11, fontFamily: 'Pretendard-Bold', letterSpacing: 0.3 },

  emblem: { width: 88, height: 88, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },

  factionName: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: colors.muted, marginBottom: 4 },
  factionSub:  { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 14 },
  cardDivider: { width: '70%', height: 1, backgroundColor: colors.hairline, marginBottom: 12 },
  members: { fontSize: 12, fontFamily: 'Pretendard-Medium', color: colors.muted, marginBottom: 8 },
  action:  { fontSize: 12.5, fontFamily: 'Pretendard-Bold' },

  status: { textAlign: 'center', fontSize: 14, fontFamily: 'Pretendard-Medium', color: colors.ink },

  footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, backgroundColor: colors.bg, alignItems: 'center', gap: 8 },
  cta:     { height: 56, borderRadius: 999, minWidth: 320, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
  skip:    { alignItems: 'center', paddingVertical: 8 },
  skipText:{ fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
});

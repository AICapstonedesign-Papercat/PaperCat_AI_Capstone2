import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/tokens';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

// Figma "StreakCommit" 확정 시안(PlayFirst 스타일: 마스코트 + 번호 리스트) 그대로 —
// 매일/격일/주 3회, 선택 시 체크 아이콘.
const OPTIONS = [
  { id: 'daily',   n: '01', label: '매일',   sub: '가장 빠르게 늘어요 — 매일 만나러 올게냥', papers: 7 },
  { id: 'every2',  n: '02', label: '격일',   sub: '부담 없이 꾸준히 이어가요',                papers: 3 },
  { id: 'weekly3', n: '03', label: '주 3회', sub: '가볍게 시작해서 천천히 늘려가요',           papers: 3 },
];

export default function StreakCommitScreen({ navigation }: Props) {
  const [, set] = useStore();
  const [selected, setSelected] = useState('daily');
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const finish = () => {
    const opt = OPTIONS.find(o => o.id === selected)!;
    set({ weeklyGoalPapers: opt.papers, weeklyGoalLabel: opt.label, onboardingDone: true, isGuest: false });
    navigation.replace('Tabs');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={s.track}><View style={[s.fill, { width: '100%' }]} /></View>
      </View>

      <View style={[s.body, isWide && s.bodyWide]}>
        {isWide && (
          <Image source={require('../../../assets/cat/info.png')} style={s.mascot} resizeMode="contain" />
        )}

        <View style={[s.copy, isWide && s.copyWide]}>
          <Text style={s.title}>며칠마다 만나러 올래냥?</Text>
          <Text style={s.subtitle}>약속한 주기로 알림을 보내줄게요 — 언제든 바꿀 수 있어요</Text>

          <View style={s.list}>
            {OPTIONS.map((o, i) => {
              const sel = selected === o.id;
              return (
                <Pressable key={o.id} onPress={() => setSelected(o.id)} style={[s.row, i > 0 && s.rowBorder]}>
                  <Text style={s.n}>{o.n}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, sel && s.labelSel]}>{o.label}</Text>
                    <Text style={s.sub}>{o.sub}</Text>
                  </View>
                  {sel && (
                    <View style={s.check}>
                      <Feather name="check" size={13} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={s.cta} onPress={finish}>
            <Text style={s.ctaText}>이대로 약속할게냥 →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  track:{ flex: 1, height: 6, backgroundColor: colors.hairline, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },

  body: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  bodyWide: { flexDirection: 'row', alignItems: 'center', gap: 56 },

  mascot: { width: 200, height: 260 },

  copy: { width: '100%', maxWidth: 480 },
  copyWide: { flex: 1, maxWidth: 640 },

  title:    { fontSize: 26, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 20 },

  list: { marginBottom: 24 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowBorder: { borderTopWidth: 1, borderColor: colors.hairline },
  n:    { fontSize: 12, fontFamily: 'Pretendard-Bold', color: colors.accent2, width: 20 },
  label:    { fontSize: 17, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 2 },
  labelSel: { color: colors.accent },
  sub:  { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted },
  check:{ width: 26, height: 26, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  cta:     { height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
});

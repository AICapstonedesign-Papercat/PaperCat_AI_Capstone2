import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { ProgressBar, Divider, GuestLockOverlay } from '../../components';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const CATS = ['전체', 'NLP', 'CV', 'RL', '생성AI'];

type Item = {
  id: string;
  grade: 'S' | 'Normal' | null;
  title: string | null;
  cat: string | null;
  img?: number;
  isNew?: boolean;
};

// Figma "Collection (최종)" 확정 시안 — 6칸 그리드, 4개 수집 + 4개 미수집(?)
const ITEMS: Item[] = [
  { id: 'attention', grade: 'S',      title: 'Attention is\nAll You Need', cat: 'NLP', img: require('../../../assets/badges/badge-gold-1.png'), isNew: true },
  { id: 'bert',      grade: 'S',      title: 'BERT',                       cat: 'NLP', img: require('../../../assets/badges/badge-gold-2.png') },
  { id: 'gpt2',      grade: 'Normal', title: 'GPT-2',                      cat: 'NLP', img: require('../../../assets/badges/badge-silver-1.png') },
  { id: 'resnet',    grade: 'S',      title: 'ResNet',                     cat: 'CV',  img: require('../../../assets/badges/badge-gold-3.png') },
  { id: 'l1', grade: null, title: null, cat: null },
  { id: 'l2', grade: null, title: null, cat: null },
  { id: 'l3', grade: null, title: null, cat: null },
  { id: 'l4', grade: null, title: null, cat: null },
];

export default function CollectionScreen({ navigation }: Props) {
  const [cat, setCat] = useState('전체');
  const [state, set] = useStore();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.head}>
          <View>
            <Text style={s.h1}>내 도감</Text>
            <Text style={s.countText}><Text style={s.countNum}>12</Text>편 수집 · 다음 배지까지 논문 1편</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            {CATS.map(c => (
              <Pressable key={c} onPress={() => setCat(c)}>
                <Text style={[s.tabText, cat === c && s.tabTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.grid}>
          {ITEMS.filter(it => cat === '전체' || it.cat === cat).map(it => {
            if (!it.grade) {
              return (
                <View key={it.id} style={s.card}>
                  <View style={s.artLocked}><Text style={s.lockedQ}>?</Text></View>
                  <Text style={s.lockedTitle}>미수집</Text>
                </View>
              );
            }
            const isNew = it.isNew && !(state.seenPapers || []).includes(it.id);
            return (
              <Pressable key={it.id} style={s.card} onPress={() => {
                if (it.isNew && !(state.seenPapers || []).includes(it.id)) {
                  set(prev => ({ seenPapers: [...(prev.seenPapers || []), it.id] }));
                }
                navigation.navigate('PaperDetail', { paperId: it.id });
              }}>
                <View style={s.art}>
                  <Image source={it.img} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                  {isNew && <Text style={s.newText}>NEW</Text>}
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>{it.title}</Text>
                <Text style={s.cardMeta}>
                  {it.cat}
                  <Text style={s.metaDot}>  ·  </Text>
                  <Text style={it.grade === 'S' ? s.gradeTop : s.grade}>{it.grade}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Divider style={{ marginTop: 8, marginBottom: 20 }} />

        {/* Figma 그대로 — 학습비율 3줄 옆에 마스코트 배너를 나란히(우측) 배치 */}
        <View style={s.statsRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.statsTitle}>분야별 학습 비율</Text>
            {[{ l: 'NLP', v: 0.6 }, { l: 'CV', v: 0.3 }, { l: 'RL', v: 0.1 }].map((r) => (
              <View key={r.l} style={s.statRow}>
                <Text style={s.statLabel}>{r.l}</Text>
                <View style={{ flex: 1 }}><ProgressBar value={r.v} height={6} fillColor={colors.accent2} trackColor={colors.hairline} /></View>
                <Text style={s.statPct}>{Math.round(r.v * 100)}%</Text>
              </View>
            ))}
          </View>
          <View style={s.banner}>
            <Image source={require('../../../assets/cat/standard.png')} style={s.bannerCat} />
            <Text style={s.bannerText}><Text style={s.bannerAccent}>CV</Text>도 도전해봐냥!</Text>
          </View>
        </View>
      </ScrollView>
      {state.isGuest && <GuestLockOverlay navigation={navigation} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  h1:    { fontSize: 28, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 6 },
  countText: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted },
  countNum:  { color: colors.accent },

  tabText: { fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.muted, marginTop: 6 },
  tabTextOn: { color: colors.ink, fontFamily: 'Pretendard-Bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 26, marginBottom: 24 },
  card: { alignItems: 'center', width: 130 },
  art:   { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  artLocked: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.hairline, borderStyle: 'dashed', borderRadius: 999 },
  lockedQ: { fontSize: 34, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.faint },
  lockedTitle: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.faint, textAlign: 'center' },
  newText: { position: 'absolute', top: -2, right: 6, fontSize: 9.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.accent, letterSpacing: 1 },
  cardTitle: { fontSize: 14.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink, textAlign: 'center', lineHeight: 18, marginBottom: 5 },
  cardMeta:  { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 1, textAlign: 'center' },
  metaDot:   { color: colors.faint },
  grade:     { color: colors.muted },
  gradeTop:  { color: colors.accent },

  statsRow:   { flexDirection: 'row', alignItems: 'center', gap: 24 },
  statsTitle: { fontSize: 12.5, fontFamily: 'Pretendard-Medium', color: colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  statRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  statLabel:  { width: 40, fontSize: 12.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.ink, letterSpacing: 0.5 },
  statPct:    { width: 44, fontSize: 12, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, textAlign: 'right' },

  banner:    { width: 160, alignItems: 'center', gap: 8 },
  bannerCat: { width: 52, height: 52, resizeMode: 'contain' },
  bannerText:{ fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text, textAlign: 'center' },
  bannerAccent: { color: colors.accent, fontFamily: 'Pretendard-SemiBold' },
});

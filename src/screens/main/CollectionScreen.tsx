import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { ProgressBar, Divider, GuestLockOverlay, SpotlightTour, type TourStep } from '../../components';
import { useStore } from '../../store';
import { usePapers } from '../../data/papers';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const CATS = ['전체', 'NLP', 'CV', 'RL', '생성AI'];

const TOUR_STEPS: TourStep[] = [
  { target: 'catTabs', title: '분야 필터', desc: 'NLP · CV · RL · 생성AI로 모은 배지를 좁혀볼 수 있어요.' },
  { target: 'grid', title: '수집한 배지', desc: '논문을 완독하면 등급(S/Normal) 배지로 여기 채워져요. ? 카드는 아직 안 읽은 논문이에요. 탭하면 논문 상세로 이동해요.' },
  { target: 'stats', title: '분야별 학습 비율', desc: '지금까지 어떤 분야를 얼마나 읽었는지 비율로 보여줘요.' },
  { target: 'rail', title: '왼쪽 메뉴', desc: '홈 · 탐색 · 학습 · 프로필로 여기서 이동해요.' },
];

type Item = {
  id: string;
  grade: 'S' | 'Normal' | null;
  title: string | null;
  cat: string | null;
  img?: number;
  isNew?: boolean;
};

// "완독" 뱃지 이미지가 논문별로 따로 없어서 등급으로만 구분 — S는 골드 3종을 순환, Normal은 실버 1종.
const GOLD_BADGES = [
  require('../../../assets/badges/badge-gold-1.png'),
  require('../../../assets/badges/badge-gold-2.png'),
  require('../../../assets/badges/badge-gold-3.png'),
];
const SILVER_BADGE = require('../../../assets/badges/badge-silver-1.png');

export default function CollectionScreen({ navigation }: Props) {
  const [cat, setCat] = useState('전체');
  const [state, set] = useStore();
  const { papers } = usePapers();

  // 수집 기준: 한 줄 요약 챌린지까지 끝낸 논문 = 도감에 실제로 박제된 논문.
  // (읽기 진행률만 있는 상태는 "이어서 학습" 대상이지, 아직 수집된 배지는 아님)
  const items: Item[] = useMemo(() => {
    return papers.map((p, i): Item => {
      const collected = Boolean(state.progress?.[`${p.id}_summary`]);
      if (!collected) return { id: p.id, grade: null, title: null, cat: p.cat };
      return {
        id: p.id,
        grade: p.grade,
        title: p.title.length > 24 ? `${p.title.slice(0, 22)}…` : p.title,
        cat: p.cat,
        img: p.grade === 'S' ? GOLD_BADGES[i % GOLD_BADGES.length] : SILVER_BADGE,
        isNew: !(state.seenPapers || []).includes(p.id),
      };
    });
  }, [papers, state.progress, state.seenPapers]);

  const collectedCount = items.filter(it => it.grade).length;
  const categoryRatios = useMemo(() => {
    const collected = items.filter(it => it.grade);
    const total = collected.length || 1;
    return (['NLP', 'CV', 'RL'] as const).map(c => ({
      l: c,
      v: collected.filter(it => it.cat === c).length / total,
    }));
  }, [items]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const catTabsRef = useRef<View>(null);
  const gridRef = useRef<View>(null);
  const statsRef = useRef<View>(null);
  const targetRefs = { catTabs: catTabsRef, grid: gridRef, stats: statsRef };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View style={s.head}>
          <View>
            <Text style={s.h1}>내 도감</Text>
            <Text style={s.countText}><Text style={s.countNum}>{collectedCount}</Text>편 수집 · 전체 {papers.length}편 중</Text>
          </View>
          <View ref={catTabsRef} style={{ flexDirection: 'row', gap: 18 }}>
            {CATS.map(c => (
              <Pressable key={c} onPress={() => setCat(c)}>
                <Text style={[s.tabText, cat === c && s.tabTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View ref={gridRef} style={s.grid}>
          {items.filter(it => cat === '전체' || it.cat === cat).map(it => {
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
        <View ref={statsRef} style={s.statsRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.statsTitle}>분야별 학습 비율</Text>
            {categoryRatios.map((r) => (
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

      {!state.hasSeenCollectionTour && (
        <SpotlightTour
          steps={TOUR_STEPS}
          targetRefs={targetRefs}
          scrollRef={scrollRef}
          scrollY={scrollY}
          onDone={() => set({ hasSeenCollectionTour: true })}
        />
      )}
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

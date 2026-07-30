import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import { colors, readingWidth } from '../../theme/tokens';
import { useStore } from '../../store';
import { PAPERS } from '../../data/papers';
import { playPurring } from '../../audio/catSounds';

const { width } = Dimensions.get('window');

// Collection 화면 뱃지 이미지 재사용 — 없는 논문은 등급별 기본 뱃지로 대체
const BADGE_BY_PAPER: Record<string, any> = {
  attention: require('../../../assets/badges/badge-gold-1.png'),
  bert:      require('../../../assets/badges/badge-gold-2.png'),
  gpt2:      require('../../../assets/badges/badge-silver-1.png'),
  resnet:    require('../../../assets/badges/badge-gold-3.png'),
};

// 입문(beginner)이 이 편수를 완독하면 심화로 넘어갈지 제안 — Profile의 aiLevel 토글 참고
const AI_LEVEL_UPGRADE_AT = 5;

// Confetti pieces: keep colors close to the editorial palette
// (warm neutrals + single accent) — purely decorative animation, not UI chrome
const CONFETTI_COLORS = ['#D4A574', '#B88955', '#5FA84A', '#6E8FB8', '#6B4E8E', '#C46B2A', '#FFD64F'];

function ConfettiPiece({ delay, x, color, size = 8 }: { delay: number; x: number; color: string; size?: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y,       { toValue: 500, duration: 1800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 1800, delay: 800, useNativeDriver: true }),
        Animated.timing(rotate,  { toValue: 6,   duration: 1800, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 6], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x,
      top: 0,
      width: size,
      height: size,
      borderRadius: size / 4,
      backgroundColor: color,
      transform: [{ translateY: y }, { rotate: spin }],
      opacity,
    }} />
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    delay: Math.random() * 600,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
  }));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {pieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
    </View>
  );
}

type Props = NativeStackScreenProps<ParamListBase>;

export default function LearningCompleteScreen({ navigation, route }: Props) {
  // params not typed yet
  const { paperId = 'attention', paperTitle = 'Attention is All You Need', xpEarned = 80 } = (route?.params as any) || {};
  const grade = PAPERS.find(p => p.id === paperId)?.grade || 'S';
  const gradeLabel = grade === 'S' ? 'GOLD' : 'SILVER';
  const badgeImg = BADGE_BY_PAPER[paperId] || (grade === 'S' ? BADGE_BY_PAPER.attention : BADGE_BY_PAPER.gpt2);
  const [state, set] = useStore();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showUpgradeSuggest, setShowUpgradeSuggest] = useState(false);

  // Entrance animations — all preserved as-is
  const catScale   = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0)).current;
  const xpY        = useRef(new Animated.Value(30)).current;
  const xpOpacity  = useRef(new Animated.Value(0)).current;
  const cardY      = useRef(new Animated.Value(40)).current;
  const cardOpacity= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopPurring: (() => void) | null = null;
    let stillHere = true;
    playPurring()
      .then(stop => { if (stillHere) stopPurring = stop; else stop(); })
      .catch(err => console.warn('[LearningComplete] cat-purring 재생 실패:', err));

    // blur와 unmount 둘 다 이 함수를 부를 수 있어서 stop()이 두 번 불릴 수 있음(이미 멈춘
    // source에 stop()을 또 부르면 에러) — 한 번 부르고 나면 null로 비워서 멱등하게 만든다.
    const stopOnce = () => { stopPurring?.(); stopPurring = null; };

    // unmount로만 정지하면 안 됨 — native-stack이 이 화면을 즉시 unmount하지 않고
    // 뒤에 그대로 둔 채로만 넘어갈 수 있어서, 포커스를 잃는 시점(blur)에 확실히 멈춘다.
    const unsubscribeBlur = navigation.addListener('blur', stopOnce);

    const leveledUp = state.xp + xpEarned >= state.xpToNext;
    set(prev => ({
      xp: leveledUp ? (prev.xp + xpEarned - prev.xpToNext) : prev.xp + xpEarned,
      level: leveledUp ? prev.level + 1 : prev.level,
      xpToNext: leveledUp ? Math.round(prev.xpToNext * 1.4) : prev.xpToNext,
      totalXp: prev.totalXp + xpEarned,
      papersDone: prev.papersDone + 1,
    }));
    if (leveledUp) setShowLevelUp(true);
    else if (state.aiLevel === 'beginner' && state.papersDone + 1 === AI_LEVEL_UPGRADE_AT) setShowUpgradeSuggest(true);

    Animated.sequence([
      Animated.spring(catScale,   { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(xpY,       { toValue: 0, friction: 6,   useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardY,       { toValue: 0, friction: 6,   useNativeDriver: true }),
      ]),
    ]).start();

    return () => { stillHere = false; stopOnce(); unsubscribeBlur(); };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Confetti />

      <View style={s.body}>
        {/* Cat + speech — CatBubble's inline text variant, no white border box */}
        <Animated.View style={[s.catRow, readingWidth, { transform: [{ scale: catScale }] }]}>
          <Animated.Image
            source={require('../../../assets/cat/cat-wave.png')}
            style={s.catImg}
          />
          {/* Speech: plain text beside cat, no white-bordered bubble */}
          <Text style={s.speechText}>논문 다 읽었냥!{'\n'}정말 대단해!!</Text>
        </Animated.View>

        {/* Title: large SUIT-Bold ink headline, no gradient badge */}
        <Animated.View style={[s.titleWrap, { transform: [{ scale: titleScale }] }]}>
          <Text style={s.titleText}>학습 완료!</Text>
          <View style={s.titleRule} />
        </Animated.View>

        {/* XP reward: large accent numeral, no colored pill */}
        <Animated.View style={[s.xpRow, { opacity: xpOpacity, transform: [{ translateY: xpY }] }]}>
          <Feather name="zap" size={15} color={colors.accent} />
          <Text style={s.xpNum}>+{xpEarned}</Text>
          <Text style={s.xpLabel}> XP 획득!</Text>
        </Animated.View>

        {/* Paper info — no card box; hairline top + content directly on bg */}
        <Animated.View style={[s.card, readingWidth, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
          <Image source={badgeImg} style={s.badgeImg} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            {/* Saved indicator: muted kicker label, no green pill */}
            <View style={s.cardTop}>
              <Text style={s.savedKicker}>도감에 저장됨</Text>
              <Feather name="bookmark" size={13} color={colors.accent} />
            </View>
            <Text style={s.cardTitle}>{paperTitle}</Text>
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Feather name="check-circle" size={13} color={colors.muted} />
                <Text style={s.statText}>완독</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.stat}>
                <Feather name="star" size={13} color={colors.accent} />
                <Text style={[s.statText, { color: colors.accent2 }]}>+{xpEarned} XP</Text>
              </View>
              <View style={s.statDiv} />
              <Text style={s.gradeText}>{gradeLabel}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Level Up overlay — keep overlay dark, box uses ink/hairline only */}
      {showLevelUp && (
        <Pressable style={s.levelUpOverlay} onPress={() => setShowLevelUp(false)}>
          <View style={s.levelUpBox}>
            <Feather name="arrow-up-circle" size={40} color={colors.accent} />
            <Text style={s.levelUpTitle}>레벨 업!</Text>
            <Text style={s.levelUpSub}>Lv. {state.level} 달성냥!</Text>
            <Text style={s.levelUpHint}>탭해서 닫기</Text>
          </View>
        </Pressable>
      )}

      {/* AI 지식수준 승급 제안 — 레벨업 오버레이와 같은 톤, 버튼 2개(수락/보류) */}
      {showUpgradeSuggest && (
        <View style={s.levelUpOverlay}>
          <View style={s.levelUpBox}>
            <Feather name="trending-up" size={40} color={colors.accent} />
            <Text style={s.levelUpTitle}>{AI_LEVEL_UPGRADE_AT}편 완독!</Text>
            <Text style={s.levelUpSub}>이제 심화로 넘어가볼래냥?</Text>
            <Pressable style={s.upgradeAccept} onPress={() => { set({ aiLevel: 'intermediate' }); setShowUpgradeSuggest(false); }}>
              <Text style={s.upgradeAcceptText}>다음 단계로</Text>
            </Pressable>
            <Pressable onPress={() => setShowUpgradeSuggest(false)}>
              <Text style={s.levelUpHint}>아직 이대로 할래요</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[s.footer, readingWidth, { alignSelf: 'center' }]}>
        {/* Primary CTA: solid accent pill */}
        <Pressable onPress={() => navigation.navigate('Explore')} style={s.cta}>
          <Text style={s.ctaText}>다음 논문 보러 가기</Text>
          <Feather name="arrow-right" size={20} color="#fff" />
        </Pressable>
        <Pressable style={s.home} onPress={() => navigation.navigate('Tabs')}>
          <Text style={s.homeText}>홈으로 돌아가기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },

  // Cat row: no speech bubble box — cat image + plain text side by side
  catRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 12 },
  catImg:     { width: 90, height: 90, resizeMode: 'contain' },
  speechText: { flex: 1, fontSize: 15, fontFamily: 'Pretendard-Regular', color: colors.ink, lineHeight: 22 },

  // Title: large ink headline + accent hairline underline
  titleWrap: { marginTop: 8, marginBottom: 14, alignItems: 'center' },
  titleText: { fontSize: 32, fontFamily: 'Pretendard-Bold', color: colors.ink, letterSpacing: 0.3 },
  titleRule: { width: 48, height: 2, backgroundColor: colors.accent, marginTop: 6, borderRadius: 999 },

  // XP: large accent numeral inline with label
  xpRow:  { flexDirection: 'row', alignItems: 'baseline', marginBottom: 28, gap: 2 },
  xpNum:  { fontSize: 28, fontFamily: 'SUIT-Bold', color: colors.accent2, letterSpacing: 0.2 },
  xpLabel:{ fontSize: 15, fontFamily: 'SUIT-Medium', color: colors.muted },

  // Paper card: no border/background — hairline top separates from above
  card:    { flexDirection: 'row', gap: 14, alignItems: 'center', borderTopWidth: 1, borderColor: colors.hairline, paddingTop: 20 },
  badgeImg:{ width: 56, height: 56 },
  gradeText: { fontSize: 12, fontFamily: 'SUIT-Bold', fontWeight: undefined, color: colors.accent, letterSpacing: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  // "도감에 저장됨" — kicker style, muted uppercased
  savedKicker: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  cardTitle:   { fontSize: 18, fontFamily: 'SUIT-Medium', color: colors.ink, lineHeight: 25, marginBottom: 16 },
  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText:    { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },
  statDiv:     { width: 1, height: 12, backgroundColor: colors.hairline },

  // Level Up overlay — dark backdrop, bare box on bg color, hairline border
  levelUpOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  levelUpBox:     { backgroundColor: colors.bg, borderRadius: 4, padding: 32, alignItems: 'center', gap: 8, borderTopWidth: 3, borderColor: colors.accent, width: '72%', maxWidth: 420 },
  levelUpTitle:   { fontSize: 34, fontFamily: 'SUIT-Medium', color: colors.ink, letterSpacing: 0.3 },
  levelUpSub:     { fontSize: 16, fontFamily: 'Pretendard-Regular', color: colors.accent },
  levelUpHint:    { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 8, letterSpacing: 0.8 },
  upgradeAccept:     { marginTop: 10, height: 48, borderRadius: 999, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  upgradeAcceptText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 15 },

  footer:   { padding: 20, paddingBottom: 32, gap: 10 },
  // CTA: solid accent pill, borderRadius 999
  cta:      { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  ctaText:  { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17 },
  home:     { alignItems: 'center', paddingVertical: 8 },
  homeText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
});

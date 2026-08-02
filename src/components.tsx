// 캡디1(PaperCat_AI_Capstone1/src/components.js) 이식. Expo 전용 패키지만 bare RN 대체재로 교체:
// @expo/vector-icons/Feather → react-native-vector-icons/Feather, expo-linear-gradient → react-native-linear-gradient.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, Modal, Pressable, Dimensions, ImageSourcePropType } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { colors, radius } from './theme/tokens';
import { useStore } from './store';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

// 실제로 pose= 로 쓰이는 값만 유지(wave는 기본값) — 나머지는 자산이 삭제됨
type CatPose = 'wave' | 'reading' | 'concern';

const poseMap: Record<CatPose, ImageSourcePropType> = {
  wave: require('../assets/cat/hi.png'),
  reading: require('../assets/cat/read_book.png'),
  concern: require('../assets/cat/concern.png'),
};

export function CatBubble({ pose = 'wave', children, size = 64 }: { pose?: CatPose; children: React.ReactNode; size?: number }) {
  return (
    <View style={cbStyles.row}>
      <Image source={poseMap[pose] || poseMap.wave} style={{ width: size, height: size, resizeMode: 'contain' }} />
      <View style={cbStyles.bubble}>
        <Text style={cbStyles.text}>{children}</Text>
      </View>
    </View>
  );
}

export function GradeBadge({ grade, suffix = false, style }: { grade?: string; suffix?: boolean; style?: any }) {
  if (grade === 'S') {
    return (
      <View style={[gradeStyles.sBadge, style]}>
        <Text style={gradeStyles.sText}>{suffix ? 'S 등급' : 'S'}</Text>
      </View>
    );
  }
  return (
    <View style={[gradeStyles.normalBadge, style]}>
      <Text style={gradeStyles.normalText}>
        {(grade || 'Normal').toString().toUpperCase()}
        {suffix ? ' 등급' : ''}
      </Text>
    </View>
  );
}
const gradeStyles = StyleSheet.create({
  sBadge: {
    backgroundColor: colors.ink,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sText: { fontSize: 10, fontFamily: 'SUIT-Bold', color: colors.cream, letterSpacing: 1.2 },
  normalBadge: {
    borderWidth: 1,
    borderColor: colors.brandDeep,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalText: { fontSize: 10, fontFamily: 'SUIT-Bold', color: colors.brandDeep, letterSpacing: 1.2 },
});

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={style}>{children}</View>;
}

export function Divider({ style }: { style?: any }) {
  return <View style={[{ height: 1, backgroundColor: colors.hairline }, style]} />;
}

export function ProgressBar({
  value = 0,
  height = 10,
  fillColor,
  trackColor = colors.borderSoft,
}: {
  value?: number;
  height?: number;
  fillColor?: string;
  trackColor?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, backgroundColor: trackColor, borderRadius: radius.pill, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          backgroundColor: fillColor || colors.brand,
          borderRadius: radius.pill,
        }}
      />
    </View>
  );
}

export function SectionTitle({ title, right, rule }: { title: string; right?: string; rule?: boolean }) {
  return (
    <View>
      <View style={section.row}>
        <Text style={section.title}>{title}</Text>
        {right ? <Text style={section.right}>{right}</Text> : null}
      </View>
      {rule ? <View style={section.rule} /> : null}
    </View>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  bubble: { flex: 1, paddingVertical: 2 },
  text: { fontSize: 16, fontFamily: 'Pretendard-SemiBold', color: colors.ink, lineHeight: 23 },
});

const section = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  title: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: colors.muted, letterSpacing: 0.3 },
  right: { fontSize: 12, fontFamily: 'Pretendard-Medium', color: colors.accent, letterSpacing: 0.4 },
  rule: { height: 1, backgroundColor: colors.hairline, marginBottom: 14 },
});

// 첫 방문 탭마다 쓰는 공용 스포트라이트 투어. 반투명 딤 위에 실제 요소 위치(measureInWindow)를
// 정확히 감싸는 밝은 테두리 박스를 얹고, 그 박스를 탭하면 다음 단계로 넘어간다.
// target: 'rail'은 SideRail(고정 폭 96, 다른 컴포넌트 트리라 실측 불가)만 쓰는 특수 케이스 —
// 나머지 target은 각 화면이 넘긴 targetRefs 키와 맞아야 한다.
const RAIL_WIDTH = 96;

export type TourStep = { target: string; title: string; desc: string };
type TourBox = { x: number; y: number; width: number; height: number };

export function SpotlightTour({
  steps, targetRefs, scrollRef, scrollY, onDone,
}: {
  steps: TourStep[];
  targetRefs: Record<string, React.RefObject<View | null>>;
  scrollRef?: React.RefObject<ScrollView | null>;
  scrollY?: React.RefObject<number>;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<TourBox | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    if (step.target === 'rail') {
      setBox({ x: 0, y: 0, width: RAIL_WIDTH, height: Dimensions.get('window').height });
      return;
    }
    const ref = targetRefs[step.target];
    if (!ref?.current) { setBox(null); return; }

    ref.current.measureInWindow((x, y, width, height) => {
      const screenH = Dimensions.get('window').height;
      const TOP_MARGIN = 90, BOTTOM_MARGIN = 260; // 아래쪽에 설명 카드 놓을 자리 확보
      if (scrollRef && (y < TOP_MARGIN || y + height > screenH - BOTTOM_MARGIN)) {
        const delta = y - TOP_MARGIN;
        scrollRef.current?.scrollTo({ y: (scrollY?.current ?? 0) + delta, animated: true });
        setTimeout(() => ref.current?.measureInWindow((x2, y2, w2, h2) => setBox({ x: x2, y: y2, width: w2, height: h2 })), 380);
      } else {
        setBox({ x, y, width, height });
      }
    });
  }, [i, step.target, targetRefs, scrollRef, scrollY]);

  const next = () => (last ? onDone() : setI(i + 1));

  const screenH = Dimensions.get('window').height;
  const screenW = Dimensions.get('window').width;
  const cardTop = box ? Math.min(box.y + box.height + 16, screenH - 220) : screenH / 2 - 100;
  const cardLeft = box ? Math.max(16, Math.min(box.x, screenW - 316)) : 24;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <View style={StyleSheet.absoluteFill}>
        <View style={tour.dim} />

        {box && (
          <Pressable
            onPress={next}
            style={[tour.spot, { left: box.x, top: box.y, width: box.width, height: box.height }]}
          />
        )}

        <Pressable style={tour.skip} onPress={onDone}>
          <Text style={tour.skipText}>튜토리얼 건너뛰기</Text>
        </Pressable>

        <View style={[tour.card, { top: cardTop, left: cardLeft }]}>
          <Text style={tour.stepLabel}>{i + 1} / {steps.length}</Text>
          <Text style={tour.title}>{step.title}</Text>
          <Text style={tour.desc}>{step.desc}</Text>
          <Pressable style={tour.next} onPress={next}>
            <Text style={tour.nextText}>{last ? '시작하기' : '다음 →'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const tour = StyleSheet.create({
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,15,10,0.6)' },
  spot: {
    position: 'absolute', borderRadius: 14, borderWidth: 2, borderColor: colors.accent,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skip: {
    position: 'absolute', top: 24, right: 20,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  skipText: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: colors.ink },
  card: { position: 'absolute', width: 300, backgroundColor: colors.surface, borderRadius: 18, padding: 20 },
  stepLabel: { fontSize: 11, fontFamily: 'Pretendard-Bold', color: colors.accent, letterSpacing: 0.5, marginBottom: 8 },
  title: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 6 },
  desc: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, lineHeight: 19, marginBottom: 16 },
  next: { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  nextText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 14 },
});

// XP burst animation — "+XP" flying up and fading out
export function XPBurst({ xp = 50, visible = false, color = colors.brand }: { xp?: number; visible?: boolean; color?: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    y.setValue(0);
    opacity.setValue(1);
    scale.setValue(0.6);
    Animated.parallel([
      Animated.timing(y, { toValue: -80, duration: 900, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true, delay: 300 }),
      Animated.spring(scale, { toValue: 1.2, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[xpStyles.wrap, { transform: [{ translateY: y }, { scale }], opacity }]}>
      <View style={[xpStyles.badge, { backgroundColor: color }]}>
        <Text style={xpStyles.text}>+{xp} XP</Text>
      </View>
    </Animated.View>
  );
}

const xpStyles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center', zIndex: 99 },
  badge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill },
  text: { fontSize: 22, fontFamily: 'SUIT-Bold', color: '#fff', letterSpacing: 0.5 },
});

// ParamListBase(느슨한 타입)로 맞춰서 화면마다 `navigation as any` 캐스팅 안 해도 되게 함 —
// 화면별 라우트 파라미터가 아직 정의 안 돼 있는 한 여기가 그 caveat의 유일한 자리.
type NavProp = NativeStackNavigationProp<ParamListBase>;

// Guest gate banner — shown when a guest tries to use a locked feature
export function GuestBanner({ visible, onClose, navigation }: { visible: boolean; onClose: () => void; navigation: NavProp }) {
  const [, set] = useStore();
  if (!visible) return null;

  const handleSignUp = () => {
    set({ isGuest: false, onboardingDone: false });
    onClose();
    navigation.navigate('PlayFirst');
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={gb.overlay} onPress={onClose}>
        <Pressable style={gb.sheet} onPress={() => {}}>
          <View style={gb.handle} />
          <Image source={require('../assets/cat/standard.png')} style={gb.catImg} />
          <Text style={gb.title}>가입하면 쓸 수 있어냥!</Text>
          <Text style={gb.desc}>한 줄 요약 · 토론 · Q&A 챗봇은{'\n'}가입 후 이용할 수 있어요</Text>
          <Pressable onPress={handleSignUp}>
            <LinearGradient colors={[colors.brand, colors.brandDeep]} style={gb.cta}>
              <Text style={gb.ctaText}>가입하고 시작하기</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={gb.later} onPress={onClose}>
            <Text style={gb.laterText}>나중에 할게요</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Full-screen lock overlay for guest users on tab screens
export function GuestLockOverlay({ navigation }: { navigation: NavProp }) {
  const [, set] = useStore();

  const handleSignUp = () => {
    set({ isGuest: false, onboardingDone: false });
    navigation.navigate('PlayFirst');
  };

  return (
    <View style={lo.wrap}>
      <View style={lo.iconWrap}>
        <Feather name="lock" size={36} color="#fff" />
      </View>
      <Text style={lo.title}>가입 후 이용할 수 있어냥!</Text>
      <Pressable onPress={handleSignUp}>
        <LinearGradient colors={[colors.brand, colors.brandDeep]} style={lo.cta}>
          <Text style={lo.ctaText}>가입하러가자냥!!</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const lo = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  iconWrap: { width: 72, height: 72, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontFamily: 'Pretendard-Bold', color: '#fff', marginBottom: 24 },
  cta: { height: 48, borderRadius: radius.pill, paddingHorizontal: 36, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 15 },
});

const gb = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 36, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.divider, alignSelf: 'center', marginBottom: 16 },
  catImg: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 4 },
  title: { fontSize: 20, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 6 },
  desc: { fontSize: 14, fontFamily: 'Pretendard-Medium', color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  cta: { height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, alignSelf: 'center', minWidth: 200 },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 15 },
  later: { alignItems: 'center', paddingVertical: 12 },
  laterText: { fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.mutedSoft },
});

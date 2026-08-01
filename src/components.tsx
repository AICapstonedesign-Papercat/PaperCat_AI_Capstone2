// 캡디1(PaperCat_AI_Capstone1/src/components.js) 이식. Expo 전용 패키지만 bare RN 대체재로 교체:
// @expo/vector-icons/Feather → react-native-vector-icons/Feather, expo-linear-gradient → react-native-linear-gradient.
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Modal, Pressable, ImageSourcePropType } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { colors, radius } from './theme/tokens';
import { useStore } from './store';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

// 실제로 pose= 로 쓰이는 값만 유지(wave는 기본값) — 나머지는 자산이 삭제됨
type CatPose = 'wave' | 'reading';

const poseMap: Record<CatPose, ImageSourcePropType> = {
  wave: require('../assets/cat/hi.png'),
  reading: require('../assets/cat/read_book.png'),
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

export function Chip({ children, style, accent }: { children: React.ReactNode; style?: any; accent?: boolean }) {
  return <Text style={[chipStyles.text, accent && { color: colors.accent }, style]}>{children}</Text>;
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

const chipStyles = StyleSheet.create({
  text: { fontSize: 12, fontFamily: 'SUIT-Medium', letterSpacing: 0.4, alignSelf: 'flex-start' },
});

const section = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  title: { fontSize: 13, fontFamily: 'Pretendard-SemiBold', color: colors.muted, letterSpacing: 0.3 },
  right: { fontSize: 12, fontFamily: 'Pretendard-Medium', color: colors.accent, letterSpacing: 0.4 },
  rule: { height: 1, backgroundColor: colors.hairline, marginBottom: 14 },
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

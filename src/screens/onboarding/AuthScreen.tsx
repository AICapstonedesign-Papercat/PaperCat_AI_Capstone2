import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Animated, Easing, StyleSheet, ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, radius } from '../../theme/tokens';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;
type Mode = 'login' | 'signup';
type AiLevel = 'beginner' | 'intermediate';

// 비전공자 대상 서비스라 '심화'(전문가 수준)는 없음 — 둘 다 "모르는 정도" 축의 두 단계.
// ProfileScreen의 AI_LEVEL_LABEL과 표기 통일.
const LEVELS: { key: AiLevel; label: string; desc: string }[] = [
  { key: 'beginner', label: '완전 처음', desc: 'AI 용어를 하나도 몰라요. 아주 쉬운 설명부터 시작할게요' },
  { key: 'intermediate', label: '입문', desc: '용어는 조금 들어봤어요. 예시 위주로 설명해드릴게요' },
];

type CatPos = { left?: number; right?: number; top: `${number}%` };
type CatDef = { source: number; pos: CatPos; size: number; duration: number };

const CATS: CatDef[] = [
  { source: require('../../../assets/cat/cat-read-paper.png'), pos: { left: -20, top: '28%' }, size: 240, duration: 3400 },
  { source: require('../../../assets/cat/cat-study-laptop.png'), pos: { right: -30, top: '36%' }, size: 240, duration: 3900 },
  { source: require('../../../assets/cat/cat-chill.png'), pos: { left: 28, top: '6%' }, size: 130, duration: 2600 },
  { source: require('../../../assets/cat/cat-passionate.png'), pos: { right: 34, top: '9%' }, size: 130, duration: 3000 },
];

function FloatingCat({ source, pos, size, duration, driftDir }: {
  source: number; pos: CatPos; size: number; duration: number; driftDir: 1 | -1;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // bob·drift 주기를 다르게 겹쳐서(리사주 곡선 근사) 반복이 안 보이게 — 진짜 경로 곡선 데이터는 없음
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: duration * 1.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: -1, duration: duration * 1.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    bobLoop.start();
    driftLoop.start();
    return () => { bobLoop.stop(); driftLoop.stop(); };
  }, [bob, drift, duration]);

  const style = {
    transform: [
      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
      { translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [-12 * driftDir, 12 * driftDir] }) },
      { rotate: drift.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) },
    ],
  };

  return (
    <Animated.Image
      source={source}
      style={[{ position: 'absolute', width: size, height: size, ...pos }, style]}
      resizeMode="contain"
    />
  );
}

// CatAdoptionScreen과 같은 관례: 박스·배경 없이 밑줄 하나, 포커스 시 accent로 — 앱 전체에서 쓰는 인풋 스타일.
type FieldKey = 'name' | 'birthdate' | 'email' | 'password' | 'confirmPassword';

function Field({ id, focused, onFieldFocus, onFieldBlur, style, ...inputProps }: {
  id: FieldKey; focused: FieldKey | null; onFieldFocus: (id: FieldKey) => void; onFieldBlur: () => void;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...inputProps}
      style={[s.input, style, focused === id && s.inputFocused]}
      placeholderTextColor={colors.faint}
      onFocus={() => onFieldFocus(id)}
      onBlur={onFieldBlur}
    />
  );
}

export default function AuthScreen({ navigation }: Props) {
  const [, set] = useStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [aiLevel, setAiLevel] = useState<AiLevel | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인↔회원가입 전환이 다른 화면처럼 보이게 — 탭 방향으로 슬라이드+페이드.
  // 회원가입(오른쪽 탭)으로 가면 오른쪽에서, 로그인(왼쪽 탭)으로 가면 왼쪽에서 들어옴.
  const slide = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    slide.setValue(mode === 'signup' ? 28 : -28);
    Animated.timing(slide, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [mode, slide]);
  const formAnimatedStyle = {
    opacity: slide.interpolate({ inputRange: [-28, 0, 28], outputRange: [0, 1, 0] }),
    transform: [{ translateX: slide }],
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmPassword('');
    setName('');
    setBirthdate('');
    setAgreed(false);
    setAiLevel(null);
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }
    if (mode === 'signup') {
      if (!agreed) {
        setError('이용약관 및 개인정보처리방침에 동의해주세요');
        return;
      }
      if (!name.trim() || !birthdate.trim()) {
        setError('이름과 생년월일을 입력해주세요');
        return;
      }
      if (!aiLevel) {
        setError('AI 지식수준을 선택해주세요');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 서로 달라요');
        return;
      }
    }
    setLoading(true);
    setError(null);

    if (SUPABASE_CONFIGURED) {
      const { error: authError } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { data: { name: name.trim(), birthdate: birthdate.trim(), aiLevel } },
            });
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
    } else {
      // ponytail: .env 채워지기 전 화면 흐름만 테스트하는 임시 통과 — 실제 인증 아님.
      // 이메일/비번 아무거나 입력하면 그대로 통과됨. SUPABASE_CONFIGURED가 true가 되는 순간 이 분기는 안 탐.
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
    }
    if (mode === 'login') {
      // 로그인 = 이미 캐릭터를 만든 기존 사용자라고 가정 → 온보딩 건너뛰고 바로 홈
      set({ isGuest: false, onboardingDone: true });
      navigation.replace('Tabs');
    } else {
      // 회원가입 = 신규 사용자 → 캐릭터 선택부터 시작하는 기존 온보딩 흐름 그대로
      set({ isGuest: false, aiLevel: aiLevel! });
      navigation.navigate('CatAdoption');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {CATS.map((c, i) => (
        <FloatingCat key={i} source={c.source} pos={c.pos} size={c.size} duration={c.duration} driftDir={i % 2 === 0 ? 1 : -1} />
      ))}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>PaperCat</Text>
        <Text style={s.tagline}>AI 논문 학습 플랫폼</Text>

        <View style={s.tabs}>
          <Pressable onPress={() => switchMode('login')} style={s.tab}>
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>로그인</Text>
            {mode === 'login' && <View style={s.tabUnderline} />}
          </Pressable>
          <View style={s.tabDivider} />
          <Pressable onPress={() => switchMode('signup')} style={s.tab}>
            <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>회원가입</Text>
            {mode === 'signup' && <View style={s.tabUnderline} />}
          </Pressable>
        </View>

        <Animated.View style={[s.form, isWide && s.formWide, formAnimatedStyle]}>
          {mode === 'signup' && (
            <View style={[s.row, isWide && s.rowSplit]}>
              <Field
                id="name" focused={focused} onFieldFocus={setFocused} onFieldBlur={() => setFocused(null)}
                style={s.inputHalf}
                placeholder="이름" value={name} onChangeText={setName}
              />
              <Field
                id="birthdate" focused={focused} onFieldFocus={setFocused} onFieldBlur={() => setFocused(null)}
                style={s.inputHalf}
                placeholder="생년월일 (YYYY-MM-DD)" value={birthdate} onChangeText={setBirthdate} keyboardType="number-pad"
              />
            </View>
          )}

          <Field
            id="email" focused={focused} onFieldFocus={setFocused} onFieldBlur={() => setFocused(null)}
            placeholder="이메일" value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
          />

          <View style={s.passwordRow}>
            <Field
              id="password" focused={focused} onFieldFocus={setFocused} onFieldBlur={() => setFocused(null)}
              style={s.inputPassword}
              placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible}
            />
            <Pressable style={s.eyeButton} onPress={() => setPasswordVisible(v => !v)}>
              <Feather name={passwordVisible ? 'eye' : 'eye-off'} size={16} color={colors.faint} />
            </Pressable>
          </View>

          {mode === 'signup' && (
            <Field
              id="confirmPassword" focused={focused} onFieldFocus={setFocused} onFieldBlur={() => setFocused(null)}
              placeholder="비밀번호 확인" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!passwordVisible}
            />
          )}

          {mode === 'signup' && (
            <View style={s.levelBlock}>
              <Text style={s.levelLabel}>AI 지식수준</Text>
              <View style={s.levelRow}>
                {LEVELS.map(l => {
                  const selected = aiLevel === l.key;
                  return (
                    <Pressable
                      key={l.key}
                      onPress={() => setAiLevel(l.key)}
                      style={[s.levelCard, selected && s.levelCardSelected]}
                    >
                      <Text style={[s.levelCardText, selected && s.levelCardTextSelected]}>{l.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {aiLevel && (
                <Text style={s.levelDesc}>{LEVELS.find(l => l.key === aiLevel)!.desc}</Text>
              )}
            </View>
          )}

          {mode === 'signup' && (
            <Pressable style={s.agreeRow} onPress={() => setAgreed(v => !v)}>
              <Feather name={agreed ? 'check-square' : 'square'} size={18} color={agreed ? colors.accent : colors.faint} />
              <Text style={s.agreeText}>이용약관 및 개인정보처리방침에 동의합니다</Text>
            </Pressable>
          )}
        </Animated.View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.cta, isWide && s.ctaWide]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{mode === 'login' ? '로그인' : '가입하기'}</Text>}
        </Pressable>

        <Pressable style={s.switchRow} onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={s.switchText}>
            {mode === 'login' ? '아직 계정이 없나요? ' : '이미 계정이 있나요? '}
            <Text style={s.switchLink}>{mode === 'login' ? '회원가입' : '로그인'}</Text>
          </Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // ScrollView의 contentContainerStyle로 씀 — flex 아니라 flexGrow라야 키보드로 콘텐츠가
  // 커져도(비밀번호확인 등 필드 추가) 제대로 스크롤됨
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  brand: { fontSize: 34, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontFamily: 'SUIT-Medium', color: colors.accent, marginTop: 4, marginBottom: 28 },

  tabs: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  tab: { alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 },
  tabText: { fontSize: 15, fontFamily: 'Pretendard-SemiBold', color: colors.faint },
  tabTextActive: { color: colors.accent },
  tabUnderline: { marginTop: 6, height: 2, width: 28, borderRadius: 1, backgroundColor: colors.accent },
  tabDivider: { width: 1, height: 14, backgroundColor: colors.hairline },

  form: { width: 320 },
  formWide: { width: 420 },

  row: { flexDirection: 'column' },
  rowSplit: { flexDirection: 'row', gap: 16 },

  // 박스·배경 없이 밑줄만 — CatAdoptionScreen 인풋과 동일한 관례
  input: {
    height: 52, borderBottomWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 4, fontSize: 16,
    fontFamily: 'Pretendard-Regular', color: colors.ink,
    marginBottom: 14,
  },
  inputHalf: { flex: 1 },
  inputFocused: { borderColor: colors.accent },

  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  inputPassword: { flex: 1 },
  eyeButton: { position: 'absolute', right: 4, top: 16 },

  levelBlock: { marginTop: 4, marginBottom: 14 },
  levelLabel: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 8 },
  levelRow: { flexDirection: 'row', gap: 10 },
  levelCard: {
    flex: 1, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.hairline,
  },
  levelCardSelected: { borderColor: colors.accent, backgroundColor: colors.panel },
  levelCardText: { fontSize: 14, fontFamily: 'Pretendard-SemiBold', color: colors.muted },
  levelCardTextSelected: { color: colors.accent },
  levelDesc: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 8 },

  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  agreeText: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted },

  error: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.red, marginBottom: 8 },

  cta: {
    width: 320, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, marginTop: 8,
  },
  ctaWide: { width: 420 },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 16 },

  switchRow: { marginTop: 18 },
  switchText: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.faint },
  switchLink: { color: colors.accent, fontFamily: 'Pretendard-Bold' },
});

import React, { useState } from 'react';
import { View, Text, Image, TextInput, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/tokens';
import { useStore, type PaperCatState } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const NAMES = ['식빵', '치즈', '코코', '모찌', '꼬미', '나비', '두부', '단추', '망고', '버터'];
const PERS_CAT: Record<string, any> = {
  curious:    require('../../../assets/cat/plush-cat.png'),
  calm:       require('../../../assets/cat/cat-calm.png'),
  passionate: require('../../../assets/cat/cat-passionate.png'),
  chill:      require('../../../assets/cat/cat-chill.png'),
};

// Figma "CatAdoption" 확정 시안 그대로: 호기심냥/차분냥/열정냥/여유냥 4장 카드
const PERS = [
  { id: 'curious',    name: '호기심냥', desc: '새로운 논문을 먼저 물어봐요' },
  { id: 'calm',       name: '차분냥',   desc: '천천히 꼼꼼하게 읽어요' },
  { id: 'passionate', name: '열정냥',   desc: '한 번에 몰아서 학습해요' },
  { id: 'chill',      name: '여유냥',   desc: '짧고 가볍게 자주 들러요' },
];

export default function CatAdoptionScreen({ navigation }: Props) {
  const [state, set] = useStore();
  const [name, setName] = useState(state.catName || '식빵');
  const [pers, setPers] = useState(state.personality || 'curious');
  const [inputFocused, setInputFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const selectPers = (id: PaperCatState['personality']) => {
    setPers(id);
    // 캐릭터를 고르면 이름도 랜덤으로 하나 제안해줌 — 마음에 안 들면 셔플/직접 수정 가능
    let next; do { next = NAMES[Math.floor(Math.random() * NAMES.length)]; } while (next === name);
    setName(next);
  };

  const shuffle = () => {
    let next; do { next = NAMES[Math.floor(Math.random() * NAMES.length)]; } while (next === name);
    setName(next);
  };

  const next = () => {
    set({ catName: name.trim() || '식빵', personality: pers });
    navigation.navigate('InterestPicker');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={s.track}>
          <View style={[s.fill, { width: '60%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>어떤 식빵이와 함께할래냥?</Text>
        <Text style={s.helper}>성격에 따라 학습 스타일이 달라져요 — 나중에 바꿀 수 있어요</Text>

        <View style={[s.persRow, isWide && s.persRowWide]}>
          {PERS.map((p) => {
            const sel = pers === p.id;
            return (
              <Pressable
                key={p.id}
                style={[s.persItem, isWide && s.persItemWide]}
                onPress={() => selectPers(p.id as PaperCatState['personality'])}
              >
                <View style={s.persImgSlot}>
                  <Image source={PERS_CAT[p.id]} style={s.persImg} resizeMode="contain" />
                </View>
                <Text style={[s.persName, sel && s.persNameSel]}>{p.name}</Text>
                <Text style={s.persDesc}>{p.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.nameSection}>
          <Text style={s.label}>이름도 지어줘냥</Text>
          <View style={s.nameRow}>
            <TextInput
              style={[s.input, inputFocused && s.inputFocused]}
              value={name}
              onChangeText={setName}
              maxLength={10}
              placeholder="이름"
              placeholderTextColor={colors.faint}
              textAlign="center"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            <Pressable style={s.shuffle} onPress={shuffle}>
              <Feather name="shuffle" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable onPress={next}>
          <View style={s.cta}>
            <Text style={s.ctaText}>이 아이로 정할게냥 →</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  back:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  track:  { flex: 1, height: 6, backgroundColor: colors.hairline, borderRadius: 999, overflow: 'hidden' },
  fill:   { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },

  // iPad 가로 기준 — 콘텐츠가 화면 폭까지 넓게 퍼지되 최대폭은 캡, 세로(좁은 폭)에서는 자연 축소
  body:   { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 140, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  title:  { fontSize: 26, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, marginBottom: 8 },
  helper: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted, marginBottom: 24 },

  // 카드/텍스트 없이 사진만 크게, 가로 기준 4장 한 줄 / 좁으면 2장씩 랩
  persRow:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 40, marginBottom: 36 },
  persRowWide: {},
  persItem:     { width: '36%', alignItems: 'center', paddingVertical: 30 },
  persItemWide: { width: 220 },
  persImgSlot:  { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  persImg:      { width: 200, height: 200 },
  persName:     { fontSize: 16, fontFamily: 'Pretendard-Bold', color: colors.ink, marginTop: 4 },
  persNameSel:  { color: colors.accent },
  persDesc:     { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 4, textAlign: 'center' },

  nameSection: { width: '100%', alignItems: 'center' },
  label:   { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },

  nameRow:     { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  input:       {
    width: 300, height: 56,
    borderBottomWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 4, fontSize: 18,
    fontFamily: 'Pretendard-Regular', color: colors.ink,
  },
  inputFocused: { borderColor: colors.accent },
  shuffle:     { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },

  footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: colors.bg, alignItems: 'center' },
  cta:     { height: 60, borderRadius: 999, minWidth: 320, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  ctaText: { color: '#fff', fontFamily: 'Pretendard-Bold', fontSize: 17, letterSpacing: 0.3 },
});

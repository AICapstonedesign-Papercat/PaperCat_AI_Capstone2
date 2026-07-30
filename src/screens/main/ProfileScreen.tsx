import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/tokens';
import { ProgressBar, SectionTitle, GuestLockOverlay } from '../../components';
import { useStore, resetStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

const PERS_LABEL: Record<string, string> = { curious: '호기심 많은 논문 탐험가', calm: '차분한 논문 탐험가', passionate: '열정 넘치는 논문 탐험가', chill: '여유로운 논문 탐험가' };
const AI_LEVEL_LABEL: Record<string, string> = { beginner: '입문', intermediate: '심화' };
const AI_LEVEL_NEXT: Record<string, 'beginner' | 'intermediate'> = { beginner: 'intermediate', intermediate: 'beginner' };

type Badge = { emoji: string; name: string; locked?: boolean };

const BADGES: Badge[] = [
  { emoji: '🏆', name: '첫 골드' },
  { emoji: '📖', name: '10편 돌파' },
  { emoji: '🔥', name: '3일 연속' },
  { emoji: '🤖', name: 'NLP 입문' },
  { emoji: '👁️', name: 'CV 입문', locked: true },
  { emoji: '🎮', name: 'RL 입문', locked: true },
];

export default function ProfileScreen({ navigation }: Props) {
  const [state, set] = useStore();
  const [alarm, setAlarm] = React.useState(true);
  const [dark, setDark] = React.useState(false);
  const interests = (state as any).interests as string[] | undefined;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={s.h1}>Profile — 캐릭터 시트</Text>

          {/* Figma: 점선 테두리 히어로 카드 — 아바타 + 이름·레벨 + 성격 + XP바 */}
          <View style={s.heroCard}>
            <Image source={require('../../../assets/cat/cat-wave.png')} style={s.avatar} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <Text style={s.nick}>{state.catName}</Text>
                <Text style={s.lvlText}>Lv.{state.level}</Text>
              </View>
              <Text style={s.personality}>"{PERS_LABEL[state.personality] || '호기심 많은 논문 탐험가'}"</Text>
              <View style={{ marginTop: 14, marginBottom: 6 }}>
                <ProgressBar value={state.xp / state.xpToNext} height={6} fillColor={colors.accent2} trackColor={colors.hairline} />
              </View>
              <Text style={s.xpValue}>{state.xp} / {state.xpToNext} XP · 다음 레벨까지 {state.xpToNext - state.xp}</Text>
            </View>
          </View>

          {/* Figma: 점선 테두리 스탯 4칸 */}
          <View style={s.statGrid}>
            <View style={s.statBox}>
              <Text style={s.statBig}>{state.papersDone}편</Text>
              <Text style={s.statLabel}>완독 논문</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBig}>{state.streakDays}일</Text>
              <Text style={s.statLabel}>연속 학습</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBig}>{state.totalXp}</Text>
              <Text style={s.statLabel}>누적 XP</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBig}>87%</Text>
              <Text style={s.statLabel}>도전 승률</Text>
            </View>
          </View>

          {/* Figma: 배지 슬롯 원형 6개(4 획득 + 2 잠김) */}
          <Text style={s.slotLabel}>배지 슬롯</Text>
          <View style={s.slotRow}>
            {BADGES.map((b, i) => (
              <View key={i} style={[s.slot, b.locked && s.slotLocked]}>
                <Text style={{ fontSize: 22, opacity: b.locked ? 0.3 : 1 }}>{b.emoji}</Text>
              </View>
            ))}
          </View>
          <View style={s.slotNames}>
            {BADGES.filter(b => !b.locked).map((b, i) => (
              <Text key={i} style={s.slotName}>{b.name}</Text>
            ))}
          </View>

          {/* 설정 — Figma 미포함, 실제 앱 기능이라 유지 */}
          <SectionTitle title="설정" rule />
          <View style={{ marginBottom: 18 }}>
            <Setting ic="bell"   label="학습 알림"  sub="매일 오후 8시"        right={<Switch value={alarm} onValueChange={setAlarm} trackColor={{ true: colors.accent, false: colors.hairline }} />} />
            <Setting ic="moon"   label="다크 모드"  sub="눈이 편안해요"        right={<Switch value={dark}  onValueChange={setDark}  trackColor={{ true: colors.accent, false: colors.hairline }} />} divider />
            <Setting ic="target" label="주간 목표"  sub="스트릭 커밋 설정"     right={<Text style={s.settingVal}>{state.weeklyGoalLabel || '꾸준히'}</Text>} divider />
            <Setting ic="tag"    label="관심 분야"  sub="탐색 추천에 반영돼요"  right={<Text style={s.settingVal}>{interests?.slice(0, 2).join(' · ') || 'NLP · CV'}</Text>} divider />
            <Setting
              ic="book-open"
              label="AI 지식수준"
              sub="논문 설명 난이도에 반영돼요 — 탭해서 전환"
              right={
                <Pressable onPress={() => set({ aiLevel: AI_LEVEL_NEXT[state.aiLevel] })}>
                  <Text style={s.settingVal}>{AI_LEVEL_LABEL[state.aiLevel] || '입문'}</Text>
                </Pressable>
              }
              divider
            />
            <Setting ic="info"   label="앱 정보"    sub="버전 1.0.0"           right={<Feather name="chevron-right" size={18} color={colors.faint} />} divider />
          </View>

          <Pressable
            style={s.logout}
            onPress={() => Alert.alert('초기화', '캐릭터 정보와 진행률을 모두 초기화할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '초기화', style: 'destructive', onPress: () => resetStore() },
            ])}
          >
            <Text style={s.logoutText}>데이터 초기화</Text>
          </Pressable>
        </ScrollView>
      {state.isGuest && <GuestLockOverlay navigation={navigation} />}
    </SafeAreaView>
  );
}

function Setting({ ic, label, sub, right, divider }: { ic: string; label: string; sub: string; right: React.ReactNode; divider?: boolean }) {
  return (
    <View style={[s.setting, divider && s.settingDiv]}>
      <Feather name={ic} size={17} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        <Text style={s.settingSub}>{sub}</Text>
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 20, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 20 },

  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 24,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent2, borderRadius: 24,
    padding: 24, marginBottom: 20,
  },
  avatar: { width: 90, height: 90 },
  nick:     { fontSize: 22, fontFamily: 'Pretendard-Bold', color: colors.ink },
  lvlText:  { fontSize: 13, fontFamily: 'Pretendard-Bold', color: colors.accent2 },
  personality: { fontSize: 13, fontFamily: 'Pretendard-Regular', color: colors.muted },
  xpValue:  { fontSize: 11.5, fontFamily: 'Pretendard-Regular', color: colors.muted },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statBox: {
    flex: 1, minWidth: '22%', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.hairline, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 16,
  },
  statBig: { fontSize: 24, fontFamily: 'Pretendard-ExtraBold', color: colors.ink, marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Pretendard-Regular', color: colors.muted },

  slotLabel: { fontSize: 14, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 12 },
  slotRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  slot: { width: 64, height: 64, borderRadius: 999, borderWidth: 1.5, borderColor: colors.accent2, alignItems: 'center', justifyContent: 'center' },
  slotLocked: { borderStyle: 'dashed', borderColor: colors.hairline },
  slotNames: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  slotName: { width: 64, fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.muted, textAlign: 'center' },

  setting:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  settingDiv: { borderTopWidth: 1, borderColor: colors.hairline },
  settingLabel:{ fontSize: 14.5, fontFamily: 'Pretendard-Medium', color: colors.ink },
  settingSub: { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.muted, marginTop: 1 },
  settingVal: { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.muted },

  logout:     { paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 13.5, fontFamily: 'Pretendard-Regular', color: colors.muted },
});

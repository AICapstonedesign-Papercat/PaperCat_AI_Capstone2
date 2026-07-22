import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const LABEL_FOR: Record<string, string> = {
  Home: '홈',
  Explore: '탐색',
  Study: '학습',
  Collection: '도감',
  Profile: '프로필',
};

// Figma "확정판" 모노 인덱스 레일 — 하단 탭바 대신 좌측 세로 내비게이션.
// 01~05 번호 + 라벨, 활성 항목만 왼쪽에 얇은 accent 바.
export default function SideRail({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={s.rail}>
      <View style={s.list}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <Pressable key={route.key} onPress={onPress} style={s.item}>
              <View style={[s.accent, focused && s.accentOn]} />
              <View>
                <Text style={[s.n, focused && s.nOn]}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={[s.label, focused && s.labelOn]}>{LABEL_FOR[route.name] || options.title}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  rail: { width: 96, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.hairline },
  list: { marginTop: 44, alignItems: 'flex-start', paddingLeft: 22 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, height: 59 },
  accent: { width: 3, height: 22, borderRadius: 999, backgroundColor: 'transparent' },
  accentOn: { backgroundColor: colors.accent },
  n: { fontSize: 10, fontFamily: 'Pretendard-Regular', color: colors.faint },
  nOn: { color: colors.accent },
  label: { fontSize: 12.5, fontFamily: 'Pretendard-SemiBold', color: colors.faint, marginTop: 1 },
  labelOn: { color: colors.ink },
});

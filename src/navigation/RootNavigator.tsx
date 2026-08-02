import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import { loadStore } from '../store';

import PlayFirstScreen from '../screens/onboarding/PlayFirstScreen';
import AuthScreen from '../screens/onboarding/AuthScreen';
import CatAdoptionScreen from '../screens/onboarding/CatAdoptionScreen';
import InterestPickerScreen from '../screens/onboarding/InterestPickerScreen';
import StreakCommitScreen from '../screens/onboarding/StreakCommitScreen';

import MainTabNavigator from './MainTabNavigator';

import StageMapScreen from '../screens/stack/StageMapScreen';
import StorytellingScreen from '../screens/stack/StorytellingScreen';
import PaperDetailScreen from '../screens/stack/PaperDetailScreen';
import QAChatbotScreen from '../screens/stack/QAChatbotScreen';
import SummaryChallengeScreen from '../screens/stack/SummaryChallengeScreen';
import DiscussionScreen from '../screens/stack/DiscussionScreen';
import LearningCompleteScreen from '../screens/stack/LearningCompleteScreen';

const Stack = createNativeStackNavigator();

// 캡디1(github.com/itsinseong/PaperCat_AI_Capstone1, src/Nav.js) 구조 그대로 계승 —
// 온보딩 스크린도 별도 네비게이터로 감싸지 않고 루트 스택에 평평하게 나열(원본과 동일).
// 스플릿뷰 같은 iPad 전용 레이아웃은 아직 안 만듦 — iPhone 착수 시점에 이 파일만 조건 분기 추가하면 됨.
export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    loadStore().then(state => {
      setInitialRoute(state.onboardingDone && !state.isGuest ? 'Tabs' : 'PlayFirst');
    });
  }, []);

  if (!initialRoute) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayFirst" component={PlayFirstScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="CatAdoption" component={CatAdoptionScreen} />
      <Stack.Screen name="InterestPicker" component={InterestPickerScreen} />
      <Stack.Screen name="StreakCommit" component={StreakCommitScreen} />
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="StageMap" component={StageMapScreen} />
      <Stack.Screen name="Storytelling" component={StorytellingScreen} />
      <Stack.Screen name="PaperDetail" component={PaperDetailScreen} />
      <Stack.Screen name="QAChatbot" component={QAChatbotScreen} />
      <Stack.Screen name="SummaryChallenge" component={SummaryChallengeScreen} />
      <Stack.Screen name="Discussion" component={DiscussionScreen} />
      <Stack.Screen name="LearningComplete" component={LearningCompleteScreen} />
    </Stack.Navigator>
  );
}

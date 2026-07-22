import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SideRail from './SideRail';

import HomeScreen from '../screens/main/HomeScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import StudyScreen from '../screens/main/StudyScreen';
import CollectionScreen from '../screens/main/CollectionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

// Figma "확정판" 그대로 — 하단 탭바가 아니라 좌측 모노 인덱스 레일(SideRail).
// tabBarPosition:'left'는 @react-navigation/bottom-tabs v7에 내장된 옵션.
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <SideRail {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'left',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: '탐색' }} />
      <Tab.Screen name="Study" component={StudyScreen} options={{ title: '학습' }} />
      <Tab.Screen name="Collection" component={CollectionScreen} options={{ title: '도감' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '프로필' }} />
    </Tab.Navigator>
  );
}

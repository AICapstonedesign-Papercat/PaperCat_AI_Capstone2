/**
 * PaperCat
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/onboarding/SplashScreen';
import { loadStore } from './src/store';

// 온보딩.mp4 전체화면 재생. 마운트 시 디졸브인, 영상 끝나면(onEnd) 디졸브아웃 후 앱으로 전환.
// 프로필 "온보딩 영상" 토글이 꺼져있으면 아예 안 띄움 — RootNavigator와 동일하게 store 로드부터 기다림
// (기본값 true로 먼저 그렸다가 로드 후 꺼서 깜빡이는 걸 피하기 위해).
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const splashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStore().then(state => setShowSplash(state.showOnboardingVideo));
  }, []);

  useEffect(() => {
    if (showSplash) {
      Animated.timing(splashOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [showSplash, splashOpacity]);

  const dismissSplash = () => {
    Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
      .start(() => setShowSplash(false));
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      {showSplash && (
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: splashOpacity }}
          pointerEvents="none"
        >
          <SplashScreen onEnd={dismissSplash} />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}

export default App;

/**
 * PaperCat
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/onboarding/SplashScreen';
import { colors } from './src/theme/tokens';

const { width, height } = Dimensions.get('window');
const DIAG = Math.sqrt(width * width + height * height);

// 캡디1(App.js)의 원형 리빌 스플래시를 이식. 원본은 expo-font의 fontsLoaded를 기다렸다가
// 스플래시를 시작했는데, bare RN은 Info.plist로 링크한 폰트를 동기적으로 쓸 수 있어서
// 그 게이트는 불필요 — 마운트되자마자 바로 타이머 시작.
// TODO(expo-av): 0.7초 시점 냐옹 소리 재생 로직 미이식 (expo-av 없음, 오디오 라이브러리 도입 시 추가)
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const circleAnim = useRef(new Animated.Value(0)).current;
  const overlayFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(circleAnim, {
          toValue: 1,
          duration: 930,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayFade, {
          toValue: 0,
          duration: 230,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSplash(false));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      {showSplash && (
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: overlayFade }}
          pointerEvents="none"
        >
          <SplashScreen brand="papercat" />
          <Animated.View
            style={{
              position: 'absolute',
              width: DIAG,
              height: DIAG,
              borderRadius: DIAG / 2,
              backgroundColor: colors.bg,
              top: height / 2 - DIAG / 2,
              left: width / 2 - DIAG / 2,
              transform: [{ scale: circleAnim }],
            }}
          />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}

export default App;

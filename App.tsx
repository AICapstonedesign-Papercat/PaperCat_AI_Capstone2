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

// 온보딩.mp4 전체화면 재생. 마운트 시 디졸브인, 영상 끝나면(onEnd) 디졸브아웃 후 앱으로 전환.
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(splashOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [splashOpacity]);

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

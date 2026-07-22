import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../theme/tokens';

const { height } = Dimensions.get('window');

export default function SplashScreen({ brand = 'papercat' }: { brand?: string }) {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -12, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={{ transform: [{ translateY: floatY }] }}>
        <Image
          source={require('../../../assets/cat/splash-cat.png')}
          style={s.cat}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={s.brand}>{brand}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cat: { width: 280, height: 280 },
  brand: {
    position: 'absolute',
    bottom: height * 0.15,
    color: '#FFFFFF',
    fontSize: 42,
    fontFamily: 'SUIT-Medium',
    fontWeight: undefined,
    letterSpacing: -1,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Video from 'react-native-video';
import { colors } from '../../theme/tokens';

const { height } = Dimensions.get('window');

export default function SplashScreen({ brand = 'papercat' }: { brand?: string }) {
  return (
    <View style={s.container}>
      <Video
        source={require('../../../assets/video/온보딩.mp4')}
        style={s.video}
        resizeMode="contain"
        repeat
        playInBackground={false}
      />

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
  video: { width: 280, height: 280 },
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

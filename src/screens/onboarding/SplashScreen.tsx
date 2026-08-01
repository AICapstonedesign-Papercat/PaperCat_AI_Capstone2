import React from 'react';
import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { colors } from '../../theme/tokens';

export default function SplashScreen({ onEnd }: { onEnd?: () => void }) {
  return (
    <View style={s.container}>
      <Video
        source={require('../../../assets/video/onboarding.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        playInBackground={false}
        onEnd={onEnd}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.accent },
});

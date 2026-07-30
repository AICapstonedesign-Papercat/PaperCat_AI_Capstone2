// react-native-audio-api의 루트 export는 react-native-reanimated가 필요한
// Audio/controls UI까지 같이 끌고 오므로, core만 deep-import한다(LearningCompleteScreen).
// 그 deep-import 경로엔 타입이 같이 안 딸려오길래 실제 .d.ts 위치를 그대로 재노출한다.
declare module 'react-native-audio-api/lib/module/core/AudioContext' {
  export { default } from 'react-native-audio-api/lib/typescript/core/AudioContext';
}

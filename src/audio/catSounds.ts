// 패키지 루트 export는 react-native-reanimated가 필요한 Audio/controls UI까지 끌고 오므로
// core만 deep-import(타입은 src/types/audio-api.d.ts에서 재노출).
import AudioContext from 'react-native-audio-api/lib/module/core/AudioContext';

// 컨텍스트/디코딩된 버퍼를 앱 전역에서 한 번만 만들어 재사용 — 화면 들어갈 때마다
// 새 AudioContext를 만들고 나갈 때 close()하면, 이전 디코딩이 끝나기 전에
// close()가 먼저 불려서 다음 재생이 죽은 컨텍스트를 잡는 레이스가 생김(첫 소리 무음 버그의 원인).
let ctx: AudioContext | null = null;
let purringBuffer: ReturnType<AudioContext['decodeAudioData']> | null = null;

// 재생 시작 후, 호출한 쪽에서 화면을 벗어날 때 불러야 하는 정지 함수를 반환한다.
export async function playPurring(): Promise<() => void> {
  ctx ??= new AudioContext();
  await ctx.resume();
  purringBuffer ??= ctx.decodeAudioData(require('../../assets/cat/cat-purring.mp3'));
  const buffer = await purringBuffer;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return () => source.stop();
}

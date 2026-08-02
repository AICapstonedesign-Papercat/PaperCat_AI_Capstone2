import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// .env가 비어있으면 createClient()가 import 시점에 바로 throw해서 앱 전체가 못 뜬다
// (네비게이터가 모든 화면 모듈을 미리 평가하기 때문) — 실제 키 넣기 전까지는 더미 URL로
// 죽지 않게만 하고, 인증 호출 자체는 네트워크 에러로 자연스럽게 실패하게 둔다.
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

// ponytail: .env 채워지기 전 화면 흐름 테스트용 임시 플래그 — 실제 키 들어오면 이 분기는 안 탐.
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
if (!SUPABASE_CONFIGURED) {
  console.warn('[supabase] .env 비어있음 — AuthScreen이 로컬 임시 통과 모드로 동작합니다.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

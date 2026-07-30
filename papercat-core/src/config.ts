// 공급자 설정. 비밀이 아니므로 .env가 아니라 여기서 관리한다.
// (.env는 키 전용이며 읽기·쓰기가 차단돼 있어서 설정을 넣으면 손댈 수가 없다.)
//
// 공급자를 바꾸려면 이 파일만 고치면 된다. 코드 나머지는 그대로.
//
//   OpenAI  : https://api.openai.com/v1                              / text-embedding-3-small (1536차원)
//   Gemini  : https://generativelanguage.googleapis.com/v1beta/openai / text-embedding-004     (768차원)
//
// Gemini는 OpenAI 호환 엔드포인트를 제공하므로 요청 형식·클라이언트 코드는 동일하다.
// 그래서 키 변수명도 OPENAI_API_KEY 그대로 쓴다.

export const PROVIDER = 'gemini' as const;

export const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

// 2026-07-27 실측으로 확정한 값들. 나머지 후보는 404(없음)이거나 429(무료 티어 쿼터 소진)였다.
//   text-embedding-004  → 404   gemini-1.5/2.5-flash → 404
//   gemini-2.0-flash(-001/-lite), gemini-pro-latest → 429
/** 임베딩: 3072차원. OpenAI(1536)의 2배라 저장 용량 산정이 달라진다. */
export const EMBED_MODEL = 'gemini-embedding-001';
export const EMBED_DIMS = 3072;

// gemini-flash-latest(내부적으로 gemini-3.6-flash)는 무료 티어 하루 20회 한도(RPD)라
// 테스트 중에 소진했다. gemini-flash-lite-latest는 이 프로젝트 키에서 별도 쿼터 버킷으로
// 아직 살아있는 걸 확인했다 — 모델별로 한도가 독립이라 하나가 막혀도 다른 모델은 산다.
/** 생성: 위 이유로 flash-latest 대신 사용 */
export const CHAT_MODEL = 'gemini-flash-lite-latest';

// 이 모델은 thinking 모델이라 max_tokens 예산을 내부 추론에 먼저 쓴다.
// 실측: 한 문장 답변에도 사고 875토큰 + 출력 67토큰. max_tokens를 작게 주면
// 출력이 나오기 전에 예산이 소진돼 빈 문자열이 돌아온다(디버깅하기 고약한 증상).
// reasoning_effort로 끄는 건 OpenAI 호환 레이어에서 400으로 거부된다.
export const CHAT_MAX_TOKENS = 3000;

/** probe용 후보 목록 — 쿼터 상황이 바뀌면 다시 훑는다 */
export const EMBED_MODELS = [EMBED_MODEL, 'text-embedding-004', 'embedding-001'];
export const CHAT_MODELS = [CHAT_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'];

export function apiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY 없음 — sh setkey.sh 로 넣으세요.');
  return k;
}

// 검색된 문단만 근거로 답을 생성한다. 배경지식으로 답하거나 근거를 지어내지 않도록
// 프롬프트에서 강제하고, 나온 결과는 guard.ts로 다시 한번 기계 검증한다.
//
// 기획서 차별점: "근거 문단을 찾지 못하면 답변 대신 범위 밖임을 안내".
// 그래서 검색 자체가 약하면(코사인 유사도가 낮으면) 애초에 LLM을 부르지 않고 거절한다 —
// LLM에게 "모르면 거절해"라고만 맡기면, 배경지식으로 그럴듯하게 답해버리는 걸 못 막는다.

import { BASE_URL, CHAT_MODEL, CHAT_MAX_TOKENS, apiKey } from './config.ts';
import { buildAnswerPrompt, newNonce } from './prompt.ts';
import { search, type Embedded } from './retrieve/search.ts';

// 코사인 0.3 미만이면 "관련 있어 보이는 문단이 없다"로 간주 — 검색 단계에서 이미 거절 신호.
// 절대 기준은 없어서 임의값이지만, 골든셋 범위밖 문항이 실제로 이 아래로 떨어지는지 실측으로 검증한다.
const RELEVANCE_FLOOR = 0.3;

export type GenInput = {
  question: string;
  paperTitle: string;
  corpus: Embedded[];
  chunkText: (id: string) => string;
  queryVec: number[];
};

export async function generateAnswer(input: GenInput): Promise<{ raw: unknown; usedChunkIds: string[] }> {
  // 키는 모듈 로드 시점이 아니라 호출 시점에 읽는다 — 모듈 최상단에서 읽으면 키 없이는
  // import조차 안 돼서, 호출하지 않는 오프라인 검증 스크립트까지 같이 죽는다.
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };
  const hits = search(input.queryVec, input.corpus, 5).filter(h => h.score >= RELEVANCE_FLOOR);

  if (hits.length === 0) {
    // 검색부터 실패 — LLM을 부르지도 않는다. 호출 없이 거절하니 비용도 0.
    return { raw: { status: 'refused', reason: '관련 근거 문단을 찾지 못했습니다.' }, usedChunkIds: [] };
  }

  // 사용자 질문과 논문 원문은 둘 다 비신뢰라 난수 구분자 안에 가둔다 — 근거는 prompt.ts 참고.
  const prompt = buildAnswerPrompt({
    paperTitle: input.paperTitle,
    passages: hits.map(h => ({ id: h.id, text: input.chunkText(h.id) })),
    question: input.question,
    nonce: newNonce(),
  });

  // 무료 티어 한도는 격리된 단일 요청에선 바로 풀리는데, 연속 호출 중엔 60초 누적 대기로도
  // 안 풀린 적이 실측으로 있었다(창 길이를 정확히 모름). 상한을 넉넉히 두고, 그래도 안 되면
  // eval/generation.ts의 체크포인트가 이번 문항 실패를 기록하지 않고 재시도 대상으로 남긴다.
  const MAX_RETRIES = 5;
  let json: any;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        model: CHAT_MODEL,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        max_tokens: CHAT_MAX_TOKENS,
      }),
    });
    if (res.ok) { json = await res.json(); break; }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = 4000 * 2 ** attempt;
      console.log(`    생성 429 — ${wait}ms 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    throw new Error(`생성 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const content = json.choices?.[0]?.message?.content ?? '';

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    raw = { __parse_error__: true, content }; // guard()가 schema 실패로 잡아준다
  }
  return { raw, usedChunkIds: hits.map(h => h.id) };
}

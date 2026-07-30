// LLM-as-judge — 기획서 (6) "LLM-as-judge 3축×0~2점 채점".
// 3축(정확성/완결성/명료성)은 기획서에 이름만 있고 정의가 없어 여기서 확정한다 — 성민·인성 리뷰 필요.
//   accuracy(정확성)     — 논문 abstract와 모순되지 않는가
//   completeness(완결성) — 핵심 아이디어(무엇을 왜 어떻게 바꿨는지)를 담았는가
//   clarity(명료성)      — 한 문장으로 읽혔을 때 이해되는가
//
// §9 "채점 불확실 → 점수 미부여, 다시 시도(불이익 없음)"에 대응해 status: 'uncertain'을 둔다 —
// 억지로 숫자를 뱉게 하면 그게 더 위험한 침묵 실패가 된다.

import { z } from 'zod';
import { BASE_URL, CHAT_MODEL, CHAT_MAX_TOKENS, apiKey } from './config.ts';
import { buildJudgePrompt, newNonce } from './prompt.ts';

export const JudgeSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('graded'),
    accuracy: z.number().int().min(0).max(2),
    completeness: z.number().int().min(0).max(2),
    clarity: z.number().int().min(0).max(2),
    feedback: z.string().min(1),
  }),
  z.object({
    status: z.literal('uncertain'),
    reason: z.string().min(1),
  }),
]);

export type JudgeOutput = z.infer<typeof JudgeSchema>;
export type ParseResult =
  | { ok: true; value: JudgeOutput }
  | { ok: false; failure: 'schema'; detail: string };

/** 네트워크 호출과 분리해서 순수 함수로 둔다 — LLM 없이 오프라인으로 테스트하기 위해(judge.check.ts). */
export function parseJudgeOutput(raw: unknown): ParseResult {
  const parsed = JudgeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, failure: 'schema', detail: parsed.error.issues[0]?.message ?? 'invalid shape' };
  }
  return { ok: true, value: parsed.data };
}

export type JudgeInput = {
  paperTitle: string;
  referenceText: string; // 논문 abstract — 채점 기준으로 쓰는 근거 원문
  studentSummary: string; // 사용자가 쓴 한 줄 요약(한국어)
};

export async function judgeSummary(input: JudgeInput): Promise<unknown> {
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };
  // 학생 요약은 점수를 올리려는 공격 동기가 실재하는 비신뢰 입력이다 — prompt.ts 참고.
  const prompt = buildJudgePrompt({ ...input, nonce: newNonce() });

  const MAX_RETRIES = 5;
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
    if (res.ok) {
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? '';
      try { return JSON.parse(content); } catch { return { __parse_error__: true, content }; }
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = 4000 * 2 ** attempt;
      console.log(`    채점 429 — ${wait}ms 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    throw new Error(`채점 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

// LLM 출력 가드레일 — 기획서 (6) 표에서 MVP 필수로 지정된 두 가지:
//   ① 출력 스키마 검증 (사실주장/비유 구분, 형식 깨지면 재요청)
//   ② 근거 문단 ID 존재 검증 + 근거 없는 사실주장 거절
//
// 여기서 하는 건 ①"인용이 존재하고, 이번에 실제로 준 문단인가"까지다.
// ②"그 문단이 주장을 실제로 뒷받침하는가"(충실성)는 기계로 판정 못 하며 RAGAS·사람 표본검수
// 몫이다 — 기획서가 둘을 섞지 말라고 명시한 부분.

import { z } from 'zod';

// 사실주장은 근거가 반드시 있어야 하고, 비유는 우리가 지어낸 설명이라 근거가 없는 게 정상이다.
// 이 구분이 없으면 "비유에 근거가 없다"고 오탐하거나 "사실주장에 근거가 없는데" 통과시킨다.
export const ClaimSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['fact', 'analogy']),
  citations: z.array(z.string()),
});

export const AnswerSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('answered'),
    claims: z.array(ClaimSchema).min(1),
  }),
  // 근거를 못 찾으면 지어내지 말고 거절 — 기획서 차별점 3
  z.object({
    status: z.literal('refused'),
    reason: z.string().min(1),
  }),
]);

export type Answer = z.infer<typeof AnswerSchema>;

export type GuardFailure =
  | 'schema'
  | 'unknown_citation'
  | 'citation_not_retrieved'
  | 'fact_without_citation';

export type GuardResult =
  | { ok: true; value: Answer }
  | { ok: false; failure: GuardFailure; detail: string };

export type GuardContext = {
  /** 이번 요청에서 실제로 프롬프트에 넣어준 문단 ID. 인용은 여기 안에 있어야 한다. */
  retrieved: ReadonlySet<string>;
  /** 인제스트로 만든 전체 문단 ID. 실패 원인을 구분하는 용도로만 쓴다. */
  known: ReadonlySet<string>;
};

/**
 * 인용 검증을 "존재하는가"가 아니라 "실제로 읽은 것인가"로 한다.
 *
 * 처음엔 known만 보고 검사했는데, 적대검증에서 이게 뚫린다는 걸 확인했다:
 * 실재하지만 이번에 주지 않은 문단 ID(심지어 다른 논문 것)를 인용해도 통과했다.
 * LLM은 읽지도 않은 문단을 근거로 댄 것이고, ID가 진짜라 사람이 확인해도 안 걸린다.
 * 존재 여부와 제공 여부를 나눠 보면 두 실패가 구분된다.
 *   unknown_citation       — ID 자체가 없음. 명백한 환각.
 *   citation_not_retrieved — ID는 실재하나 이번에 안 준 것. 더 조용하고 더 위험.
 */
export function guard(raw: unknown, ctx: GuardContext): GuardResult {
  const parsed = AnswerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, failure: 'schema', detail: parsed.error.issues[0]?.message ?? 'invalid shape' };
  }

  const value = parsed.data;
  if (value.status === 'refused') return { ok: true, value };

  for (const claim of value.claims) {
    for (const id of claim.citations) {
      if (!ctx.known.has(id)) {
        return { ok: false, failure: 'unknown_citation', detail: `존재하지 않는 문단 ID: ${id}` };
      }
      if (!ctx.retrieved.has(id)) {
        return {
          ok: false,
          failure: 'citation_not_retrieved',
          detail: `이번 요청에 주지 않은 문단을 인용함: ${id}`,
        };
      }
    }
    if (claim.type === 'fact' && claim.citations.length === 0) {
      return { ok: false, failure: 'fact_without_citation', detail: `근거 없는 사실주장: "${claim.text.slice(0, 40)}…"` };
    }
  }

  return { ok: true, value };
}

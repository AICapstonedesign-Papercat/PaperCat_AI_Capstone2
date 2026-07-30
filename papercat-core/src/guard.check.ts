// guard() 자체 검증 — LLM 없이 손으로 만든 출력 케이스로 전부 돌린다.
//   npx tsx src/guard.check.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { guard } from './guard.ts';

// 실제 인제스트 결과의 ID를 쓴다 — 하드코딩하면 스키마가 바뀌어도 통과해버림
const { chunks } = JSON.parse(await readFile(new URL('../out/attention.json', import.meta.url), 'utf8'));
const known = new Set<string>(chunks.map((c: any) => c.id));

// 이번 요청에서 "검색해서 준" 문단은 전체가 아니라 앞의 5개라고 가정한다.
const retrievedIds: string[] = chunks.slice(0, 5).map((c: any) => c.id);
const retrieved = new Set<string>(retrievedIds);
const realId = retrievedIds[0];
// 실재하지만 이번엔 주지 않은 문단 — 적대검증으로 찾은 구멍의 재현 케이스
const realButNotGivenId: string = chunks[40].id;
assert.ok(!retrieved.has(realButNotGivenId) && known.has(realButNotGivenId), '테스트 전제가 깨짐');

const ctx = { retrieved, known };

// 정상: 근거 붙은 사실주장 + 근거 없는 비유
let r = guard(
  {
    status: 'answered',
    claims: [
      { text: 'Transformer는 순환 없이 어텐션만 쓴다.', type: 'fact', citations: [realId] },
      { text: '편지를 한눈에 읽는 배달부 같아요.', type: 'analogy', citations: [] },
    ],
  },
  ctx,
);
assert.equal(r.ok, true, '정상 응답이 막힘');

// 거절도 유효한 응답이다
r = guard({ status: 'refused', reason: '이 논문에 근거가 없는 질문이에요' }, ctx);
assert.equal(r.ok, true, '거절 응답이 막힘');

// 환각 인용 — 겉보기엔 근거가 붙어있어서 사람 눈으로는 안 걸러지는 유형
r = guard(
  { status: 'answered', claims: [{ text: 'x', type: 'fact', citations: ['1706.03762:s99:0'] }] },
  ctx,
);
assert.equal(r.ok, false);
assert.equal(r.ok === false && r.failure, 'unknown_citation');

// 실재하지만 이번에 주지 않은 문단 인용 — 예전 guard는 이걸 통과시켰다.
// ID가 진짜라서 사람이 원문을 대조해도 "있는 문단이네" 하고 넘어간다.
r = guard(
  { status: 'answered', claims: [{ text: 'x', type: 'fact', citations: [realButNotGivenId] }] },
  ctx,
);
assert.equal(r.ok, false, '읽지 않은 문단 인용이 통과됨 — 침묵 실패');
assert.equal(r.ok === false && r.failure, 'citation_not_retrieved');

// 준 문단과 안 준 문단을 섞어도 잡아야 한다(하나만 검사하고 끝내면 놓침)
r = guard(
  { status: 'answered', claims: [{ text: 'x', type: 'fact', citations: [realId, realButNotGivenId] }] },
  ctx,
);
assert.equal(r.ok, false, '유효 인용 뒤에 숨은 무효 인용을 놓침');
assert.equal(r.ok === false && r.failure, 'citation_not_retrieved');

// 여러 claim 중 뒤쪽 claim의 무효 인용도 잡아야 한다
r = guard(
  {
    status: 'answered',
    claims: [
      { text: 'ok', type: 'fact', citations: [realId] },
      { text: 'bad', type: 'fact', citations: [realButNotGivenId] },
    ],
  },
  ctx,
);
assert.equal(r.ok, false, '뒤쪽 claim의 무효 인용을 놓침');
assert.equal(r.ok === false && r.failure, 'citation_not_retrieved');

// 근거 없는 사실주장
r = guard({ status: 'answered', claims: [{ text: 'x', type: 'fact', citations: [] }] }, ctx);
assert.equal(r.ok, false);
assert.equal(r.ok === false && r.failure, 'fact_without_citation');

// 거절인데 인용이 딸려와도 무해해야 한다(거절은 인용 검사 대상 아님)
r = guard({ status: 'refused', reason: '근거 없음' }, { retrieved: new Set(), known });
assert.equal(r.ok, true, '검색 0건 거절이 막힘');

// 형식 깨짐 (기획서: 재요청 대상)
for (const bad of [
  { status: 'answered' },                                  // claims 없음
  { status: 'answered', claims: [] },                      // 빈 배열
  { status: 'answered', claims: [{ text: 'x', type: 'guess', citations: [] }] }, // 없는 type
  { status: 'refused' },                                   // reason 없음
  'not json at all',
  null,
]) {
  const bad_r = guard(bad, ctx);
  assert.equal(bad_r.ok, false, `형식 오류가 통과됨: ${JSON.stringify(bad)}`);
  assert.equal(bad_r.ok === false && bad_r.failure, 'schema');
}

console.log(`OK — guard 12케이스 통과 (제공 ${retrieved.size}개 / 전체 ${known.size}개 문단 기준)`);

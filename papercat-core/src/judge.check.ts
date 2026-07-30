// parseJudgeOutput() 자체 검증 — LLM 없이 손으로 만든 출력 케이스로 돌린다.
//   npx tsx src/judge.check.ts
import assert from 'node:assert/strict';
import { parseJudgeOutput } from './judge.ts';

// 정상: 채점 성공
let r = parseJudgeOutput({ status: 'graded', accuracy: 2, completeness: 1, clarity: 2, feedback: '핵심은 담았지만 왜 바꿨는지가 빠졌어요.' });
assert.equal(r.ok, true, '정상 채점이 막힘');

// 정상: 채점 불가(§9 "채점 불확실 → 점수 미부여")
r = parseJudgeOutput({ status: 'uncertain', reason: '요약이 논문과 무관해 보입니다.' });
assert.equal(r.ok, true, '불확실 응답이 막힘');

// 형식 오류 — 전부 재요청 대상
for (const bad of [
  { status: 'graded', accuracy: 3, completeness: 1, clarity: 2, feedback: 'x' }, // 범위 초과
  { status: 'graded', accuracy: -1, completeness: 1, clarity: 2, feedback: 'x' }, // 음수
  { status: 'graded', accuracy: 1.5, completeness: 1, clarity: 2, feedback: 'x' }, // 정수 아님
  { status: 'graded', accuracy: 1, completeness: 1, clarity: 2, feedback: '' }, // 피드백 없음
  { status: 'graded', accuracy: 1, completeness: 1 }, // clarity 없음
  { status: 'uncertain' }, // reason 없음
  { status: 'guess' }, // 없는 status
  'not json at all',
  null,
]) {
  const bad_r = parseJudgeOutput(bad);
  assert.equal(bad_r.ok, false, `형식 오류가 통과됨: ${JSON.stringify(bad)}`);
  assert.equal(bad_r.ok === false && bad_r.failure, 'schema');
}

console.log('OK — judge 9케이스 통과');

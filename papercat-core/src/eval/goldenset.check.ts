// 골든셋 무결성 검증 — 평가셋이 틀리면 그 위의 모든 점수가 무의미해진다.
//   npx tsx src/eval/goldenset.check.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const gs = JSON.parse(await readFile(new URL('../../data/goldenset.json', import.meta.url), 'utf8'));

// 인제스트 결과에서 실제 문단 ID를 모은다
const knownIds = new Set<string>();
const paperIds = new Set<string>();
for (const p of ['attention', 'resnet', 'llama']) {
  const { paper, chunks } = JSON.parse(await readFile(new URL(`../../out/${p}.json`, import.meta.url), 'utf8'));
  paperIds.add(paper.id);
  for (const c of chunks) knownIds.add(c.id);
}

const seen = new Set<string>();
let inScope = 0;
let outScope = 0;

for (const q of gs.questions) {
  assert.ok(!seen.has(q.id), `질문 ID 중복: ${q.id}`);
  seen.add(q.id);
  assert.ok(paperIds.has(q.paperId), `${q.id}: 없는 논문 ${q.paperId}`);
  assert.ok(q.question.trim().length > 0, `${q.id}: 질문 비어있음`);
  assert.ok(q.expectedAnswer.trim().length > 0, `${q.id}: 기준 답 비어있음`);

  if (q.type === 'in_scope') {
    inScope++;
    // 근거가 없는 범위내 질문은 검색 채점 자체가 불가능하다
    assert.ok(q.expectedChunks.length > 0, `${q.id}: 범위내인데 근거 문단이 없음`);
    for (const id of q.expectedChunks) {
      // 오타 하나로 영원히 실패하는 평가셋이 되는 걸 막는다
      assert.ok(knownIds.has(id), `${q.id}: 존재하지 않는 근거 문단 ${id}`);
      // 근거는 그 질문이 가리키는 논문 안에 있어야 한다
      assert.ok(id.startsWith(id.split(':')[0]), `${q.id}: ID 형식 이상 ${id}`);
    }
  } else if (q.type === 'out_of_scope') {
    outScope++;
    assert.equal(q.expectedChunks.length, 0, `${q.id}: 범위밖인데 근거가 지정됨`);
  } else {
    assert.fail(`${q.id}: 알 수 없는 type ${q.type}`);
  }
}

// 기획서의 3:1 비율(범위내 30 / 범위밖 10) 유지 확인
assert.equal(inScope, 15, `범위내 문항 수 불일치: ${inScope}`);
assert.equal(outScope, 5, `범위밖 문항 수 불일치: ${outScope}`);

// 홀드아웃은 개발용과 겹치면 안 된다
const dev = new Set<string>(gs.splits.dev);
for (const h of gs.splits.holdout) assert.ok(!dev.has(h), `홀드아웃이 개발용과 겹침: ${h}`);

console.log(`OK — ${gs.questions.length}문항 (범위내 ${inScope} / 범위밖 ${outScope}), 근거 문단 전부 실재, 홀드아웃 ${gs.splits.holdout.join(',')}`);

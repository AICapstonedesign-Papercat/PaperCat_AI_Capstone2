// search() 자체 검증 — 임베딩 API 없이 합성 벡터로 순위 로직만 확인한다.
//   npx tsx src/retrieve/search.check.ts
import assert from 'node:assert/strict';
import { cosine, search, hitsExpected, type Embedded } from './search.ts';

// 코사인 기본 성질
assert.equal(cosine([1, 0], [1, 0]), 1);            // 같은 방향 = 1
assert.equal(cosine([1, 0], [0, 1]), 0);            // 직교 = 0
assert.ok(Math.abs(cosine([1, 0], [-1, 0]) + 1) < 1e-9); // 반대 방향 = -1
assert.equal(cosine([0, 0], [1, 0]), 0);            // 영벡터는 0으로 처리
// 크기가 달라도 방향이 같으면 1 — 정규화가 실제로 되는지
assert.ok(Math.abs(cosine([3, 0], [7, 0]) - 1) < 1e-9);
assert.throws(() => cosine([1, 0], [1, 0, 0]), /차원 불일치/);

const corpus: Embedded[] = [
  { id: 'a', vector: [1, 0, 0] },
  { id: 'b', vector: [0.9, 0.1, 0] },
  { id: 'c', vector: [0, 1, 0] },
  { id: 'd', vector: [0, 0, 1] },
];

const hits = search([1, 0, 0], corpus, 2);
assert.equal(hits.length, 2, 'topK가 안 지켜짐');
assert.equal(hits[0].id, 'a', '가장 가까운 벡터가 1위가 아님');
assert.equal(hits[1].id, 'b');
assert.ok(hits[0].score >= hits[1].score, '점수 내림차순이 아님');

// topK가 코퍼스보다 크면 있는 만큼만
assert.equal(search([1, 0, 0], corpus, 99).length, corpus.length);

// 골든셋 채점 규칙: 기대 문단 중 하나라도 들어오면 통과
assert.equal(hitsExpected(hits, ['b']), true);
assert.equal(hitsExpected(hits, ['zzz', 'a']), true);
assert.equal(hitsExpected(hits, ['c', 'd']), false);
assert.equal(hitsExpected(hits, []), false, '기대 문단이 없으면 통과로 치면 안 됨');

console.log('OK — search 14케이스 통과 (임베딩 키 없이 순위 로직만)');

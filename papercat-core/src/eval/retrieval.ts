// 기획서 §4 사전검증 "RAG 검색: 논문당 질문 5개에서 관련 문단 Top-5 포함" +
// §8 "검색 Top-5 포함률 80%↑"의 첫 실측.
//   npm run eval:retrieval

import { readFile } from 'node:fs/promises';
import { embedQuery } from '../embedQuery.ts';
import { search, hitsExpected } from '../retrieve/search.ts';

const gs = JSON.parse(await readFile(new URL('../../data/goldenset.json', import.meta.url), 'utf8'));

// 논문별 임베딩을 한 번에 로드 — 실제 서비스에서도 코퍼스는 논문 단위로 스코프된다
// (다른 논문 문단이 섞여 경쟁하면 Top-5가 실제보다 어려워져 왜곡된다).
const corpusByPaper: Record<string, { id: string; vector: number[] }[]> = {};
for (const id of ['attention', 'resnet', 'llama']) {
  const d = JSON.parse(await readFile(new URL(`../../out/${id}.embedded.json`, import.meta.url), 'utf8'));
  corpusByPaper[id] = d.embeddings;
}

const inScope = gs.questions.filter((q: any) => q.type === 'in_scope');
let hit = 0;
const misses: string[] = [];

for (const q of inScope) {
  const qVec = await embedQuery(q.question);
  const hits = search(qVec, corpusByPaper[q.paperId], 5);
  const ok = hitsExpected(hits, q.expectedChunks);
  if (ok) hit++; else misses.push(q.id);

  const topIds = hits.map(h => h.id.split(':').slice(1).join(':')).join(', ');
  console.log(`${ok ? 'OK  ' : 'MISS'} ${q.id}  기대:[${q.expectedChunks.map((c: string) => c.split(':').slice(1).join(':')).join(',')}]  top5:[${topIds}]`);

  await new Promise(r => setTimeout(r, 1500)); // 쿼리 임베딩도 같은 무료 티어 한도를 공유
}

const ratePct = hit / inScope.length * 100;
console.log(`\nTop-5 포함률: ${hit}/${inScope.length} (${ratePct.toFixed(1)}%) — 기획서 통과선 80%`);
if (misses.length) console.log(`미스: ${misses.join(', ')}`);
console.log(ratePct >= 80 ? '→ 통과' : '→ 미달');

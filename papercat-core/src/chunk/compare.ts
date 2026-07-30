// 청킹 전략별 Top-5 검색률을 같은 골든셋으로 비교한다.
//   npm run chunk:compare
//
// 공정성을 위해 채점은 "정답 원본 문단을 포함한 청크가 Top-5에 들어왔는가"로 한다.
// 전략마다 청크 경계가 달라 ID가 바뀌므로, ID 일치가 아니라 sourceIds 포함으로 판정해야
// 전략 간 비교가 의미를 갖는다.

import { readFile, writeFile } from 'node:fs/promises';
import { BASE_URL, EMBED_MODEL, apiKey } from '../config.ts';
import { embedQuery } from '../embedQuery.ts';
import { search } from '../retrieve/search.ts';
import { STRATEGIES, type BaseParagraph, type Chunk, type StrategyName } from './strategies.ts';

const PAPERS = ['attention', 'resnet', 'llama'] as const;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function embedBatch(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE_URL}/embeddings`, {
      method: 'POST', headers: H, body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
    if (res.ok) return (await res.json() as any).data.map((d: any) => d.embedding);
    if (res.status === 429 && attempt < 4) { await sleep(4000 * 2 ** attempt); continue; }
    throw new Error(`임베딩 실패 ${res.status}`);
  }
}

// 원본 문단 로드
const parasByPaper: Record<string, BaseParagraph[]> = {};
for (const p of PAPERS) {
  const { chunks } = JSON.parse(await readFile(new URL(`../../out/${p}.json`, import.meta.url), 'utf8'));
  parasByPaper[p] = chunks.map((c: any) => ({
    id: c.id, paperId: c.paperId, sectionId: c.sectionId, sectionTitle: c.sectionTitle, text: c.text,
  }));
}

const gs = JSON.parse(await readFile(new URL('../../data/goldenset.json', import.meta.url), 'utf8'));
const inScope = gs.questions.filter((q: any) => q.type === 'in_scope');

// 쿼리 임베딩은 전략과 무관하므로 한 번만 만들어 재사용한다(쿼터 절약)
const queryVecs: Record<string, number[]> = {};
for (const q of inScope) {
  queryVecs[q.id] = await embedQuery(q.question);
  await sleep(1200);
}
console.log(`쿼리 임베딩 ${Object.keys(queryVecs).length}건 준비\n`);

const summary: { name: string; chunks: number; avgChars: number; hit: number; total: number; misses: string[] }[] = [];

// 쿼터가 중간에 끊겨도 여기까지의 결과는 남긴다(실제로 3번째 전략에서 429로 끊긴 적 있음)
const persist = () => writeFile(
  new URL('../../out/chunk.compare.json', import.meta.url), JSON.stringify(summary, null, 2));

for (const [name, build] of Object.entries(STRATEGIES) as [StrategyName, any][]) {
  const chunksByPaper: Record<string, Chunk[]> = {};
  let totalChunks = 0, totalChars = 0;
  for (const p of PAPERS) {
    const cs = build(parasByPaper[p]);
    chunksByPaper[p] = cs;
    totalChunks += cs.length;
    totalChars += cs.reduce((n: number, c: Chunk) => n + c.chars, 0);
  }

  // 전략별 임베딩
  const vecsByPaper: Record<string, { chunk: Chunk; vector: number[] }[]> = {};
  for (const p of PAPERS) {
    const cs = chunksByPaper[p];
    const vecs: number[][] = [];
    for (let i = 0; i < cs.length; i += 20) {
      vecs.push(...await embedBatch(cs.slice(i, i + 20).map(c => c.text)));
      if (i + 20 < cs.length) await sleep(3000);
    }
    vecsByPaper[p] = cs.map((chunk, i) => ({ chunk, vector: vecs[i] }));
  }

  // K를 여러 개 재는 이유: 병합 전략은 청크가 커서 같은 K에서도 더 많은 원본 문단을 담는다.
  // 그래서 "의미적으로 더 잘 찾은 것"과 "그냥 더 많이 읽은 것"이 섞인다.
  // baseline을 K=10으로도 재보면(= 병합의 문단 커버리지와 비슷) 둘을 분리할 수 있다.
  const scoreAt = (k: number) => {
    let hit = 0;
    const misses: string[] = [];
    for (const q of inScope) {
      const corpus = vecsByPaper[q.paperId].map(v => ({ id: v.chunk.id, vector: v.vector }));
      const topIds = new Set(search(queryVecs[q.id], corpus, k).map(t => t.id));
      const ok = vecsByPaper[q.paperId].some(v =>
        topIds.has(v.chunk.id) && v.chunk.sourceIds.some(sid => q.expectedChunks.includes(sid)));
      if (ok) hit++; else misses.push(q.id);
    }
    return { hit, misses };
  };

  const k5 = scoreAt(5);
  const k10 = scoreAt(10);
  // Top-5가 실제로 담는 평균 원본 문단 수 — 커버리지 이득을 눈으로 확인하기 위한 값
  const avgParasInTop5 = Math.round(
    inScope.reduce((sum: number, q: any) => {
      const corpus = vecsByPaper[q.paperId].map(v => ({ id: v.chunk.id, vector: v.vector }));
      const topIds = new Set(search(queryVecs[q.id], corpus, 5).map(t => t.id));
      return sum + vecsByPaper[q.paperId].filter(v => topIds.has(v.chunk.id))
        .reduce((n, v) => n + v.chunk.sourceIds.length, 0);
    }, 0) / inScope.length);

  summary.push({
    name, chunks: totalChunks, avgChars: Math.round(totalChars / totalChunks),
    hit: k5.hit, total: inScope.length, misses: k5.misses,
    hitAt10: k10.hit, avgParasInTop5,
  } as any);

  console.log(
    `${name.padEnd(16)} 청크 ${String(totalChunks).padStart(3)}개(평균 ${String(Math.round(totalChars / totalChunks)).padStart(4)}자)  ` +
    `K=5 ${k5.hit}/${inScope.length}(${(k5.hit / inScope.length * 100).toFixed(1)}%)  ` +
    `K=10 ${k10.hit}/${inScope.length}(${(k10.hit / inScope.length * 100).toFixed(1)}%)  ` +
    `Top-5가 담는 문단 ~${avgParasInTop5}개` +
    (k5.misses.length ? `  미스: ${k5.misses.join(',')}` : ''));
  await persist();
}

console.log('\n=== 비교 (K=5 기준) ===');
const best = summary.reduce((a, b) => (b.hit > a.hit ? b : a));
for (const s of summary) {
  console.log(`${s.name === best.name ? '★' : ' '} ${s.name.padEnd(16)} ${(s.hit / s.total * 100).toFixed(1)}%  청크 ${s.chunks}개`);
}
console.log(`\n최고: ${best.name} (${(best.hit / best.total * 100).toFixed(1)}%) — 기획서 통과선 80%`);

// 커버리지 통제: baseline을 병합본과 비슷한 문단 수까지 읽게 해도 여전히 지는가?
const base = summary.find(s => s.name === 'paragraph') as any;
const mrg = summary.find(s => s.name === 'merged') as any;
console.log('\n=== 통제: "더 많이 읽어서" 이득인가, "더 잘 찾아서"인가 ===');
console.log(`paragraph K=10 (문단 10개 읽음): ${(base.hitAt10 / base.total * 100).toFixed(1)}%`);
console.log(`merged    K=5  (문단 ~${mrg.avgParasInTop5}개 읽음): ${(mrg.hit / mrg.total * 100).toFixed(1)}%`);
console.log(base.hitAt10 >= mrg.hit
  ? '→ 비슷한 문단 수를 읽으면 baseline도 따라잡음. 이득의 상당 부분은 커버리지.'
  : '→ 같은 문단 수를 읽어도 병합이 앞섬. 의미 단위로 묶인 것 자체가 효과.');

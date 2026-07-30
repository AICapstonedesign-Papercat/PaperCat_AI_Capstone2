// 기획서 §4 "거절 동작: 근거 없는 질문 3개 이상에서 거절 응답" +
// §8 "거절 정확도 80%↑(8/10)"의 첫 실측. 범위내 질문에서는 answered + 인용 유효성도 같이 본다.
//   npm run eval:generation
//
// 무료 티어 rate limit에 중간에 걸리면(실측됨) 스크립트가 죽는데, 그때마다 처음부터
// 다시 돌리면 이미 성공한 호출까지 낭비된다. 그래서 문항별 결과를 파일에 즉시 저장하고,
// 재실행 시 이미 끝난 문항은 건너뛴다 — 한도에 걸려도 "재시작"이지 "처음부터"가 아니다.

import { readFile, writeFile } from 'node:fs/promises';
import { embedQuery } from '../embedQuery.ts';
import { generateAnswer } from '../generate.ts';
import { guard } from '../guard.ts';

const CHECKPOINT = new URL('../../out/generation.results.json', import.meta.url);
const REQUEST_GAP_MS = 8000; // embed 1회 + generate 1회를 한 문항에서 쓰므로 넉넉히 둔다

// 가드나 프롬프트를 고치면 이전 측정치는 다른 시스템의 숫자다. 체크포인트를 그대로 이어받으면
// 전부 skip하고 옛 결과를 새 결과인 양 출력한다 — 실제로 그럴 뻔했다. 버전이 다르면 버린다.
//   v1: guard가 전체 문단 ID로 인용 검증
//   v2: guard가 "이번에 제공한 문단"으로 검증 + 프롬프트 난수 구분자 도입
const MEASUREMENT_VERSION = 2;

type Result = { id: string; type: string; status: string; guardOk: boolean; failure?: string; usedChunks: number };
type Checkpoint = { version: number; results: Record<string, Result> };

async function loadCheckpoint(): Promise<Record<string, Result>> {
  try {
    const raw = JSON.parse(await readFile(CHECKPOINT, 'utf8')) as Partial<Checkpoint>;
    if (raw.version !== MEASUREMENT_VERSION) {
      console.log(`이전 체크포인트(v${raw.version ?? 1})는 지금 시스템(v${MEASUREMENT_VERSION})과 다른 조건에서 측정됨 — 버리고 처음부터 재측정합니다.\n`);
      return {};
    }
    return raw.results ?? {};
  } catch { return {}; }
}

async function saveCheckpoint(results: Record<string, Result>) {
  await writeFile(CHECKPOINT, JSON.stringify({ version: MEASUREMENT_VERSION, results } satisfies Checkpoint, null, 2));
}

const gs = JSON.parse(await readFile(new URL('../../data/goldenset.json', import.meta.url), 'utf8'));

const chunksByPaper: Record<string, any[]> = {};
const corpusByPaper: Record<string, { id: string; vector: number[] }[]> = {};
const knownIds = new Set<string>();
const titleByPaper: Record<string, string> = {};

for (const id of ['attention', 'resnet', 'llama']) {
  const parsed = JSON.parse(await readFile(new URL(`../../out/${id}.json`, import.meta.url), 'utf8'));
  chunksByPaper[id] = parsed.chunks;
  titleByPaper[id] = parsed.paper.title;
  parsed.chunks.forEach((c: any) => knownIds.add(c.id));

  const embedded = JSON.parse(await readFile(new URL(`../../out/${id}.embedded.json`, import.meta.url), 'utf8'));
  corpusByPaper[id] = embedded.embeddings;
}

function chunkTextOf(paperId: string) {
  const map = new Map(chunksByPaper[paperId].map((c: any) => [c.id, c.text]));
  return (id: string) => map.get(id) ?? '';
}

const results = await loadCheckpoint();
const already = Object.keys(results).length;
if (already > 0) console.log(`체크포인트에서 ${already}문항 이어서 시작\n`);

for (const q of gs.questions) {
  if (results[q.id]) {
    console.log(`skip ${q.id} (이미 완료: ${results[q.id].status})`);
    continue;
  }

  const queryVec = await embedQuery(q.question);
  const { raw, usedChunkIds } = await generateAnswer({
    question: q.question,
    paperTitle: titleByPaper[q.paperId],
    corpus: corpusByPaper[q.paperId],
    chunkText: chunkTextOf(q.paperId),
    queryVec,
  });

  // 인용은 "실재하는가"가 아니라 "이번에 실제로 준 문단인가"로 검사한다.
  // 예전엔 knownIds(전 논문의 모든 문단)를 넘겨서, 읽지도 않은 문단 인용이 통과했다.
  const g = guard(raw, { retrieved: new Set(usedChunkIds), known: knownIds });
  const result: Result = {
    id: q.id, type: q.type,
    status: g.ok ? g.value.status : `guard_fail:${g.failure}`,
    guardOk: g.ok,
    usedChunks: usedChunkIds.length,
  };
  results[q.id] = result;
  await saveCheckpoint(results); // 매 문항마다 즉시 저장 — 다음 문항에서 죽어도 이번 건 남는다

  console.log(`${q.id} [${q.type}] → ${result.status}  검색근거:${result.usedChunks}개`);
  await new Promise(r => setTimeout(r, REQUEST_GAP_MS));
}

console.log('\n=== 전체 결과 ===');
const inScope = Object.values(results).filter(r => r.type === 'in_scope');
const outScope = Object.values(results).filter(r => r.type === 'out_of_scope');
const inAnswered = inScope.filter(r => r.status === 'answered').length;
const outRefused = outScope.filter(r => r.status === 'refused').length;
const guardFailures = Object.values(results).filter(r => !r.guardOk).length;

console.log(`범위내 응답률: ${inAnswered}/${inScope.length} (${(inAnswered / inScope.length * 100).toFixed(1)}%)`);
const refusalRate = outRefused / outScope.length * 100;
console.log(`거절 정확도  : ${outRefused}/${outScope.length} (${refusalRate.toFixed(1)}%) — 기획서 통과선 80%`);
console.log(`가드 실패    : ${guardFailures}건`);
if (Object.keys(results).length < gs.questions.length) {
  console.log(`\n미완료 ${gs.questions.length - Object.keys(results).length}문항 — 같은 명령 재실행하면 이어서 진행`);
} else {
  console.log(refusalRate >= 80 ? '→ 거절 정확도 통과' : '→ 거절 정확도 미달');
}

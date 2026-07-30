// 기획서 (6) "골든셋 회귀 테스트 — 사람 채점과 1점 이내 일치율 80%↑"의 첫 실측.
//   npm run eval:judge
//
// data/summary-goldenset.json의 humanScore는 초안이라 이 스크립트가 내는 숫자도 잠정치다 —
// 성민·인성이 실채점으로 갱신한 뒤 다시 돌려야 게이트로 쓸 수 있다(파일 note 참고).
//
// generation.ts와 같은 이유로 체크포인트를 둔다: 무료 티어 429에 걸려도 이미 채점한
// 표본은 남기고 이어서 진행한다.

import { readFile, writeFile } from 'node:fs/promises';
import { judgeSummary, parseJudgeOutput } from '../judge.ts';

const CHECKPOINT = new URL('../../out/judge.results.json', import.meta.url);
const REQUEST_GAP_MS = 6000;

type Result =
  | { id: string; paperId: string; status: 'graded'; score: { accuracy: number; completeness: number; clarity: number } }
  | { id: string; paperId: string; status: 'uncertain' | 'guard_fail' };

// 채점 프롬프트를 고치면 이전 점수는 다른 채점기의 점수다 — generation.ts와 같은 이유로 버전을 박는다.
//   v1: 난수 구분자 도입(비신뢰 입력 분리)
const MEASUREMENT_VERSION = 1;
type Checkpoint = { version: number; results: Record<string, Result> };

async function loadCheckpoint(): Promise<Record<string, Result>> {
  try {
    const raw = JSON.parse(await readFile(CHECKPOINT, 'utf8')) as Partial<Checkpoint>;
    if (raw.version !== MEASUREMENT_VERSION) {
      console.log(`이전 체크포인트(v${raw.version ?? 0})는 다른 채점 프롬프트로 측정됨 — 버리고 재측정합니다.\n`);
      return {};
    }
    return raw.results ?? {};
  } catch { return {}; }
}
async function saveCheckpoint(results: Record<string, Result>) {
  await writeFile(CHECKPOINT, JSON.stringify({ version: MEASUREMENT_VERSION, results } satisfies Checkpoint, null, 2));
}

const gs = JSON.parse(await readFile(new URL('../../data/summary-goldenset.json', import.meta.url), 'utf8'));

type Sample = { id: string; text: string; humanScore: { accuracy: number; completeness: number; clarity: number } | null };
const samples: { paperId: string; paperTitle: string; referenceText: string; sample: Sample }[] = [];
for (const p of gs.papers) {
  for (const sample of p.samples) {
    samples.push({ paperId: p.paperId, paperTitle: p.paperId, referenceText: p.referenceText, sample });
  }
}

const results = await loadCheckpoint();
const already = Object.keys(results).length;
if (already > 0) console.log(`체크포인트에서 ${already}건 이어서 시작\n`);

for (const { paperId, paperTitle, referenceText, sample } of samples) {
  if (results[sample.id]) {
    console.log(`skip ${sample.id} (이미 완료: ${results[sample.id].status})`);
    continue;
  }

  const raw = await judgeSummary({ paperTitle, referenceText, studentSummary: sample.text });
  const parsed = parseJudgeOutput(raw);

  let result: Result;
  if (!parsed.ok) {
    result = { id: sample.id, paperId, status: 'guard_fail' };
  } else if (parsed.value.status === 'uncertain') {
    result = { id: sample.id, paperId, status: 'uncertain' };
  } else {
    const { accuracy, completeness, clarity } = parsed.value;
    result = { id: sample.id, paperId, status: 'graded', score: { accuracy, completeness, clarity } };
  }
  results[sample.id] = result;
  await saveCheckpoint(results);

  console.log(`${sample.id} → ${result.status}${result.status === 'graded' ? ` ${JSON.stringify(result.score)}` : ''}`);
  await new Promise(r => setTimeout(r, REQUEST_GAP_MS));
}

console.log('\n=== 사람 초안 채점과 비교 (1점 이내 일치, 축별) ===');
const axes = ['accuracy', 'completeness', 'clarity'] as const;
let axisChecks = 0, axisAgree = 0;
let emptyOk = 0, emptyTotal = 0;

for (const { sample } of samples) {
  const r = results[sample.id];
  if (!r) continue;

  if (sample.humanScore === null) {
    // uncertain으로 답해야 정상인 표본 (예: 빈 요약)
    emptyTotal++;
    if (r.status === 'uncertain') emptyOk++;
    continue;
  }
  if (r.status !== 'graded') continue; // 채점됐어야 하는데 uncertain/실패면 일치율 계산에서 제외하고 아래서 별도 표시

  for (const axis of axes) {
    axisChecks++;
    if (Math.abs(r.score[axis] - sample.humanScore[axis]) <= 1) axisAgree++;
  }
}

console.log(`축별 일치: ${axisAgree}/${axisChecks} (${axisChecks ? (axisAgree / axisChecks * 100).toFixed(1) : '0.0'}%) — 기획서 통과선 80%`);
if (emptyTotal > 0) console.log(`빈 입력 방어(uncertain 응답): ${emptyOk}/${emptyTotal}`);

const missingOrFailed = samples.filter(({ sample }) => {
  const r = results[sample.id];
  return sample.humanScore !== null && r && r.status !== 'graded';
});
if (missingOrFailed.length > 0) {
  console.log(`\n채점됐어야 하는데 안 됨(uncertain/guard_fail): ${missingOrFailed.map(m => m.sample.id).join(', ')}`);
}
if (Object.keys(results).length < samples.length) {
  console.log(`\n미완료 ${samples.length - Object.keys(results).length}건 — 같은 명령 재실행하면 이어서 진행`);
}
console.log('\n주의: humanScore는 초안이다. 이 숫자를 기획서 게이트로 보고하기 전에 성민·인성 실채점으로 교체할 것.');

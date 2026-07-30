// out/*.json의 문단 텍스트를 임베딩해서 벡터를 붙인다.
//   npm run embed
//
// 배치 요청(input이 배열)을 지원하는 걸 실측 확인해서 182건을 개별 호출하지 않고 묶어 보낸다.
// 무료 티어는 분당 요청 수 제한이 있어서, 배치 사이에 지연을 두고 429는 지수 백오프로 재시도한다.

import { readFile, writeFile } from 'node:fs/promises';
import { BASE_URL, EMBED_MODEL, EMBED_DIMS, apiKey } from '../config.ts';

const BATCH_SIZE = 20;      // 한 번에 보낼 문단 수 — 너무 크면 페이로드/토큰 한도에 걸릴 수 있어 보수적으로
const BATCH_DELAY_MS = 4000; // 배치 사이 간격 — 무료 티어 RPM 여유를 둔다
const MAX_RETRIES = 4;

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function embedBatch(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${BASE_URL}/embeddings`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
    if (res.ok) {
      const json: any = await res.json();
      return json.data.map((d: any) => d.embedding);
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = BATCH_DELAY_MS * 2 ** attempt;
      console.log(`    429 — ${wait}ms 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`임베딩 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('재시도 소진');
}

for (const id of ['attention', 'resnet', 'llama']) {
  const path = new URL(`../../out/${id}.json`, import.meta.url);
  const { paper, chunks } = JSON.parse(await readFile(path, 'utf8'));

  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embs = await embedBatch(batch.map((c: any) => c.text));
    vectors.push(...embs);
    console.log(`  ${id} ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`);
    if (i + BATCH_SIZE < chunks.length) await sleep(BATCH_DELAY_MS);
  }

  vectors.forEach((v, i) => {
    if (v.length !== EMBED_DIMS) throw new Error(`${chunks[i].id}: 차원 불일치 ${v.length} != ${EMBED_DIMS}`);
  });

  const embedded = chunks.map((c: any, i: number) => ({ id: c.id, vector: vectors[i] }));
  await writeFile(
    new URL(`../../out/${id}.embedded.json`, import.meta.url),
    JSON.stringify({ paper: paper.id, model: EMBED_MODEL, dims: EMBED_DIMS, embeddings: embedded }),
  );
  console.log(`${id}: ${embedded.length}개 벡터 저장\n`);
}

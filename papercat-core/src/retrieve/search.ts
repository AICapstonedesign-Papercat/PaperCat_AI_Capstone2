// 벡터 검색. 지금은 로컬 JSON 위에서 코사인 유사도로 돈다.
//
// 3편 182문단 규모에서 Atlas Vector Search를 붙이는 건 과잉이고, 무엇보다 스키마·인덱스
// 네이밍이 백엔드 담당(김성민)과 겹쳐 충돌한다. 인터페이스를 search(queryVec, topK)로
// 고정해두면 나중에 이 함수 본문만 Atlas $vectorSearch 호출로 갈아끼우면 되고
// 호출부는 바뀌지 않는다.
// ponytail: 전수 스캔 O(n). 182개라 무의미한 비용이고, 논문이 수백 편 되면 그때 Atlas로 옮긴다.

export type Embedded = { id: string; vector: number[] };
export type Hit = { id: string; score: number };

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`차원 불일치: ${a.length} vs ${b.length}`);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0; // 영벡터는 유사도 정의 불가 — 0으로 떨어뜨린다
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function search(queryVec: number[], corpus: Embedded[], topK = 5): Hit[] {
  return corpus
    .map(c => ({ id: c.id, score: cosine(queryVec, c.vector) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, topK);
}

/** 골든셋 채점용: expectedChunks 중 하나라도 Top-K에 들어오면 통과 (기획서 §8 기준) */
export function hitsExpected(hits: Hit[], expected: string[]): boolean {
  const got = new Set(hits.map(h => h.id));
  return expected.some(id => got.has(id));
}

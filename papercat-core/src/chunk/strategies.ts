// 청킹 전략. 기획서 §11 "오버랩 청킹 기본 적용 + 시맨틱 청킹 비교 실험" 항목.
//
// 왜 필요한지는 실측으로 드러났다: 문단 1개 = 청크 1개(baseline)로 돌렸을 때 Top-5가 80.0%로
// 통과선 턱걸이였고, 실패한 q13의 정답 문단들이 각각 145~180자짜리 초단문이었다
// ("RMSNorm을 쓴다", "SwiGLU로 바꿨다" 같은 한 줄). 이런 조각은 그 자체로는
// "무엇을 바꿨나"라는 질문과 의미적으로 안 붙는다 — 맥락이 앞 문단에 있기 때문.

export type BaseParagraph = {
  id: string;
  paperId: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
};

export type Chunk = {
  id: string;
  paperId: string;
  /** 이 청크가 담고 있는 원본 문단 ID들. 골든셋 채점은 이걸로 판정한다 —
   *  전략마다 청크 경계가 달라져도 "정답 문단을 포함했는가"로 공정하게 비교할 수 있다. */
  sourceIds: string[];
  sectionTitle: string;
  text: string;
  chars: number;
};

/** 전략 1(baseline): 문단 1개 = 청크 1개. 지금까지 쓰던 방식. */
export function byParagraph(paras: BaseParagraph[]): Chunk[] {
  return paras.map(p => ({
    id: p.id,
    paperId: p.paperId,
    sourceIds: [p.id],
    sectionTitle: p.sectionTitle,
    text: p.text,
    chars: p.text.length,
  }));
}

/**
 * 전략 2: 같은 섹션 안에서 인접 문단을 목표 크기까지 병합.
 * 섹션 경계는 넘지 않는다 — 다른 주제가 한 청크에 섞이면 검색 정밀도가 떨어진다.
 */
export function merged(paras: BaseParagraph[], targetChars = 700, maxChars = 1400): Chunk[] {
  const chunks: Chunk[] = [];
  let buf: BaseParagraph[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    const text = buf.map(p => p.text).join(' ');
    chunks.push({
      id: `${buf[0].id}+${buf.length - 1}`, // 시작 문단 ID + 병합된 개수
      paperId: buf[0].paperId,
      sourceIds: buf.map(p => p.id),
      sectionTitle: buf[0].sectionTitle,
      text,
      chars: text.length,
    });
    buf = [];
  };

  for (const p of paras) {
    const sectionChanged = buf.length > 0 && buf[0].sectionId !== p.sectionId;
    const wouldOverflow = buf.length > 0 &&
      buf.reduce((n, b) => n + b.text.length, 0) + p.text.length > maxChars;

    if (sectionChanged || wouldOverflow) flush();

    buf.push(p);

    if (buf.reduce((n, b) => n + b.text.length, 0) >= targetChars) flush();
  }
  flush();
  return chunks;
}

/**
 * 전략 3: 병합 + 인접 청크 간 1문단 오버랩.
 * 답이 청크 경계에 걸쳐 있을 때를 대비한다. 대가는 임베딩 대상이 늘어나는 것.
 */
export function mergedWithOverlap(paras: BaseParagraph[], targetChars = 700, maxChars = 1400): Chunk[] {
  const base = merged(paras, targetChars, maxChars);
  const byId = new Map(paras.map(p => [p.id, p]));

  return base.map((c, i) => {
    if (i === 0) return c;
    const prev = base[i - 1];
    // 이전 청크의 마지막 문단을 앞에 덧붙인다 — 단, 섹션이 바뀌었으면 붙이지 않는다
    const tailId = prev.sourceIds[prev.sourceIds.length - 1];
    const tail = byId.get(tailId)!;
    const head = byId.get(c.sourceIds[0])!;
    if (tail.sectionId !== head.sectionId) return c;

    const text = `${tail.text} ${c.text}`;
    return {
      ...c,
      id: `${c.id}~ov`,
      sourceIds: [tailId, ...c.sourceIds],
      text,
      chars: text.length,
    };
  });
}

export const STRATEGIES = {
  paragraph: byParagraph,
  merged: (p: BaseParagraph[]) => merged(p),
  'merged-overlap': (p: BaseParagraph[]) => mergedWithOverlap(p),
} as const;

export type StrategyName = keyof typeof STRATEGIES;

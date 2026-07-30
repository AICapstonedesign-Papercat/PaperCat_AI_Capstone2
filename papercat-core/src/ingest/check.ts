// parse.ts 출력 자체 검증. 프레임워크 없이 assert만.
//   npx tsx src/ingest/check.ts
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const papers = ['attention', 'resnet', 'llama'];
const seen = new Set<string>();
let total = 0;

for (const id of papers) {
  const { paper, chunks } = JSON.parse(
    await readFile(new URL(`../../out/${id}.json`, import.meta.url), 'utf8'),
  );

  assert.ok(chunks.length >= 20, `${id}: 문단이 너무 적음 (${chunks.length}) — 파싱 실패 의심`);
  assert.ok(chunks.some((c: any) => c.sectionId === 'abs'), `${id}: abstract 없음`);

  for (const c of chunks) {
    assert.ok(!seen.has(c.id), `ID 중복: ${c.id}`); // 논문 간에도 유일해야 함
    seen.add(c.id);
    assert.equal(c.paperId, paper.id);
    assert.ok(c.text.length >= 80, `${c.id}: 80자 미만이 통과됨`);
    assert.ok(c.sectionTitle.length > 0, `${c.id}: 섹션 제목 비어있음`);
    assert.ok(c.sourceUrl.includes(paper.arxivId), `${c.id}: 딥링크가 arXiv ID와 불일치`);
    // LaTeXML 태그가 텍스트로 새어나오면 파싱이 깨진 것
    assert.ok(!/<[a-z/]/i.test(c.text), `${c.id}: HTML 태그 잔존`);
  }
  total += chunks.length;
}

// 수식이 alttext로 복원됐는지 — 전부 사라졌으면 extractText가 망가진 것
const attn = JSON.parse(await readFile(new URL('../../out/attention.json', import.meta.url), 'utf8'));
assert.ok(
  attn.chunks.some((c: any) => /_\{|\^\{|\\/.test(c.text)),
  '수식이 하나도 안 남음 — math alttext 복원 실패 의심',
);

console.log(`OK — ${papers.length}편 / ${total}문단 / ID 유일 ${seen.size}개`);

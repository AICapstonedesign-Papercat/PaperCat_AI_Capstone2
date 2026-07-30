// arXiv 논문 → 문단 단위 고정 ID JSON.
// 원문은 ar5iv(LaTeXML 변환 HTML)에서 가져온다 — arXiv 네이티브 HTML은 2023년 이후 논문에만
// 있어서 3편 중 2편이 404였고, ar5iv는 3편 모두 200이었음.
//
// 라이선스 주의: 여기서 만드는 JSON은 검색 인덱싱용 내부 데이터다. 화면에 원문 문단을
// 통째로 내보내면 안 되고(대부분 논문이 arXiv nonexclusive-distrib라 2차배포 권리 없음),
// 근거는 짧은 인용 + arXiv 딥링크로만 제공한다. papers.json의 quotePolicy 참고.

import * as cheerio from 'cheerio';
import { readFile, writeFile } from 'node:fs/promises';

type Paper = {
  id: string;
  arxivId: string;
  title: string;
  field: string;
};

// 논문마다 사람이 라이선스를 심사하면 "모든 AI 논문" 규모에서 병목이 된다.
// arXiv가 라이선스를 기계로 읽히게 제공하므로 인제스트가 직접 판정한다 —
// 논문 추가 시 arXiv ID만 넣으면 되고 수작업 큐레이션이 필요 없다.
//
// 표시 정책은 라이선스와 무관하게 모든 논문에 'short-quote-and-link'가 기본이고,
// CC BY 계열만 원문 표시로 자동 완화된다. 즉 편입 자체엔 제한이 없다.
type QuotePolicy = 'short-quote-and-link' | 'full-with-attribution';

type License = { license: string; allowsDerivatives: boolean; quotePolicy: QuotePolicy };

async function fetchLicense(arxivId: string): Promise<License> {
  const url = `https://export.arxiv.org/oai2?verb=GetRecord&identifier=oai:arXiv.org:${arxivId}&metadataPrefix=arXiv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${arxivId}: OAI-PMH ${res.status}`);
  const xml = await res.text();
  const license = xml.match(/<license>([^<]*)<\/license>/)?.[1]?.trim() ?? '';

  // CC BY / BY-SA / CC0·퍼블릭도메인만 2차 변형·재배포 허용.
  // NC(비영리)·ND(변형금지)는 제외 — ND는 정의상 변형 불가, NC는 서비스화 시 걸린다.
  const allowsDerivatives =
    /creativecommons\.org\/(publicdomain|licenses\/(by|by-sa)\/)/.test(license) &&
    !/\/by-n[cd]|-nd\//.test(license);

  return {
    license: license || '(명시 없음 — arXiv 기본)',
    allowsDerivatives,
    quotePolicy: allowsDerivatives ? 'full-with-attribution' : 'short-quote-and-link',
  };
}

type Chunk = {
  id: string;          // 고정 ID — 논문 버전을 고정했으므로 재실행해도 동일
  paperId: string;
  sectionId: string;   // 'abs' | 's1','s2'... — 위치 기반(추측 없음)
  sectionTitle: string; // 논문에 적힌 그대로. 인용 표시에 씀
  index: number;       // 섹션 내 문단 순번
  text: string;
  chars: number;
  sourceUrl: string;   // 근거 표시용 arXiv 딥링크
};

// 섹션을 abstract/method/experiments 같은 카테고리로 정규화하려 했다가 폐기했다.
// ResNet의 방법론 섹션 제목이 "3 Deep Residual Learning", Attention이 "4 Why Self-Attention"이라
// 키워드 매칭이 정확히 이런 핵심 섹션에서 빗나갔다. 논문마다 제목을 자유롭게 쓰므로
// 규칙을 늘려도 계속 샌다. 검색은 어차피 의미 기반이라 카테고리 라벨이 필요 없고,
// 인용 표시에는 논문에 적힌 실제 제목이 오히려 정확하다.

// LaTeXML은 수식을 <math>로 내보내면서 alttext에 원본 LaTeX를 넣어둔다.
// 수식을 통째로 버리면 문장이 끊기므로 alttext를 인라인으로 되살린다.
function extractText($: cheerio.CheerioAPI, el: any): string {
  const node = $(el).clone();
  node.find('math').each((_, m) => {
    const alt = $(m).attr('alttext');
    $(m).replaceWith(alt ? ` ${alt} ` : ' ');
  });
  node.find('cite, .ltx_bibref').remove(); // 인용 마커는 본문 의미에 기여 안 함
  return node.text().replace(/\s+/g, ' ').trim();
}

async function fetchHtml(arxivId: string): Promise<string> {
  const url = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${arxivId}: ar5iv ${res.status}`);
  return res.text();
}

function parse(html: string, paper: Paper): Chunk[] {
  const $ = cheerio.load(html);
  const chunks: Chunk[] = [];
  const absUrl = `https://arxiv.org/abs/${paper.arxivId}`;

  const push = (sectionId: string, sectionTitle: string, texts: string[]) => {
    let kept = 0;
    for (const text of texts) {
      // 한 문장도 안 되는 조각(표 캡션 파편 등)은 검색 노이즈라 버린다
      if (text.length < 80) continue;
      chunks.push({
        id: `${paper.arxivId}:${sectionId}:${kept}`,
        paperId: paper.id,
        sectionId,
        sectionTitle,
        index: kept,
        text,
        chars: text.length,
        sourceUrl: absUrl,
      });
      kept++;
    }
  };

  // Abstract는 별도 컨테이너
  const absEl = $('.ltx_abstract').first();
  if (absEl.length) {
    push('abs', 'Abstract', absEl.find('p.ltx_p').map((_, p) => extractText($, p)).get());
  }

  // 본문 섹션 — 순서대로 s1, s2, ...
  $('section.ltx_section').each((i, sec) => {
    const title = $(sec).find('> h2.ltx_title_section').first().text().replace(/\s+/g, ' ').trim()
      || $(sec).find('> .ltx_title').first().text().replace(/\s+/g, ' ').trim();
    const texts = $(sec).find('div.ltx_para p.ltx_p').map((_, p) => extractText($, p)).get();
    push(`s${i + 1}`, title || `Section ${i + 1}`, texts);
  });

  return chunks;
}

const papers: Paper[] = JSON.parse(await readFile(new URL('../../data/papers.json', import.meta.url), 'utf8'));

for (const paper of papers) {
  const [html, license] = await Promise.all([fetchHtml(paper.arxivId), fetchLicense(paper.arxivId)]);
  const chunks = parse(html, paper);
  const outPath = new URL(`../../out/${paper.id}.json`, import.meta.url);
  await writeFile(outPath, JSON.stringify({ paper: { ...paper, ...license }, chunks }, null, 2));

  const sections = [...new Set(chunks.map(c => `${c.sectionId}(${c.sectionTitle})`))];
  console.log(`${paper.id.padEnd(10)} ${String(chunks.length).padStart(3)}문단  ${sections.length}섹션  ${license.quotePolicy}`);
  console.log(`           ${sections.join(' · ')}`);

  // OAI-PMH는 연속 요청에 민감하다. 대량 편입 시엔 GetRecord 반복 대신
  // ListRecords로 한 번에 받아야 한다(현재 3편 규모라 순차로 충분).
  await new Promise(r => setTimeout(r, 3000));
}

import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

// Called from ExploreScreen when a user selects a category tab. Asks Gemini
// for real, well-known papers in that category (own knowledge — no web
// search), prioritized by citation count, skipping papers already in the
// `papers` table, and inserts the new ones. This is how the catalog grows
// beyond the original 8 seeded papers — see src/screens/main/ExploreScreen.tsx.

type Category = 'NLP' | 'CV' | 'RL' | '생성AI';

type RequestBody = { category: Category };

type DiscoveredPaper = {
  title: string;
  year: number;
  publishedDate: string; // 'YYYY.MM.DD'
  citesThousands: number;
  trending: boolean;
};

const CATEGORY_HINT: Record<Category, string> = {
  NLP: 'Natural Language Processing (language models, translation, text understanding/generation)',
  CV: 'Computer Vision (image classification, object detection, vision architectures)',
  RL: 'Reinforcement Learning (agents, policy/value learning, game-playing, control)',
  생성AI: 'Generative AI (diffusion models, GANs, generative modeling for image/video/audio, text-to-image)',
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    papers: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The exact, real, published title of the paper' },
          year: { type: 'integer', description: 'Publication year' },
          publishedDate: {
            type: 'string',
            description: 'Best-known publication date as YYYY.MM.DD (use YYYY.01.01 if only the year is known)',
          },
          citesThousands: {
            type: 'integer',
            description:
              'Best-effort real-world citation count expressed IN THOUSANDS (e.g. 80 means ~80,000 citations). Landmark papers can be in the hundreds — do not lowball them.',
          },
          trending: {
            type: 'boolean',
            description: 'true only if this is a recent paper (last ~3 years) still gaining significant attention',
          },
        },
        required: ['title', 'year', 'publishedDate', 'citesThousands', 'trending'],
      },
    },
  },
  required: ['papers'],
};

// ============================================================================
// PROMPT — edit this to change how ExploreScreen's category tabs pick which
// new papers get added to the shared `papers` catalog.
// ============================================================================
function discoverPrompt(category: Category, excludeTitles: string[]): string {
  return `You are curating a reading list of real, well-known AI research papers in the category "${category}" (${CATEGORY_HINT[category]}) for PaperCat, an app that teaches non-experts about influential AI papers.

Selection rule — THIS IS THE MOST IMPORTANT INSTRUCTION: prioritize the most highly-cited, seminal, historically important papers in this exact category. Rank candidates by real-world citation count, highest first, and return them in that order. Only include real papers you are confident actually exist and whose approximate real citation count you actually know — never invent a paper or fabricate a plausible-sounding title.

Do not include any of these papers — they are already in the catalog:
${excludeTitles.length ? excludeTitles.map(t => `- ${t}`).join('\n') : '(none yet)'}

Return up to 5 papers, most-cited first. For each paper give your best-effort real citation count in THOUSANDS (e.g. a paper with ~100,000 citations → citesThousands: 100) — do not lowball well-known landmark papers.

Respond with JSON only, matching the required schema.`;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `paper-${Math.random().toString(36).slice(2, 8)}`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { category }: RequestBody = await req.json();
    if (!category || !(category in CATEGORY_HINT)) {
      return new Response(JSON.stringify({ error: 'valid category is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = supabaseAdmin();

    // 이 카테고리에 이미 있는 논문 제목을 프롬프트에 넣어 중복 추천을 막는다.
    const { data: existing, error: fetchErr } = await db.from('papers').select('id, title').eq('cat', category);
    if (fetchErr) throw fetchErr;

    const existingTitles = (existing ?? []).map(p => p.title as string);
    const existingIds = new Set((existing ?? []).map(p => p.id as string));

    const raw = await callGemini({
      prompt: discoverPrompt(category, existingTitles),
      jsonSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    });
    const parsed = JSON.parse(raw) as { papers: DiscoveredPaper[] };

    // 제목 기준 2차 중복 제거 — 프롬프트로 막아도 모델이 이미 있는 논문을 다시 낼 수 있어서.
    const existingTitleSet = new Set(existingTitles.map(t => t.toLowerCase().trim()));
    const fresh = parsed.papers.filter(p => !existingTitleSet.has(p.title.toLowerCase().trim()));

    const rows = fresh.map(p => {
      let id = slugify(p.title);
      let suffix = 2;
      while (existingIds.has(id)) id = `${slugify(p.title)}-${suffix++}`;
      existingIds.add(id);

      // 등급 기준은 ExploreScreen의 CLASSIC 모드 설명과 동일: 인용 100k+ → S, 그 이하 → Normal.
      const citesNum = Math.max(0, Math.round(p.citesThousands));
      return {
        id,
        grade: citesNum >= 100 ? 'S' : 'Normal',
        cat: category,
        title: p.title,
        date_label: /^\d{4}\.\d{2}\.\d{2}$/.test(p.publishedDate) ? p.publishedDate : `${p.year}.01.01`,
        year: p.year,
        cites_label: `${citesNum}k+`,
        cites_num: citesNum,
        trending: Boolean(p.trending),
        quote_policy: 'short-quote-and-link',
        ingest_status: 'pending', // 원문 청킹/임베딩 전 — papercat-core 인제스트 파이프라인 대상
      };
    });

    if (rows.length > 0) {
      const { error: insertErr } = await db.from('papers').insert(rows);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ added: rows.map(r => ({ id: r.id, title: r.title })) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

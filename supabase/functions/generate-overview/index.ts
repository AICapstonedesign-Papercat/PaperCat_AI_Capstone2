import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import type { PaperContext } from '../_shared/types.ts';

type RequestBody = { paper: PaperContext };

type StructureGroup = { title: string; steps: string[] };

type OverviewResult = {
  groups: StructureGroup[];
  storyParagraphs: string[];
  pullQuote: string;
  conceptName: string;
  whyItMatters: string;
};

// Row shape of public.paper_overviews (supabase/migrations/20260826160000_paper_overview_cache.sql).
type OverviewRow = {
  groups: StructureGroup[];
  story_paragraphs: string[];
  pull_quote: string;
  concept_name: string;
  why_it_matters: string;
};

function rowToResult(row: OverviewRow): OverviewResult {
  return {
    groups: row.groups,
    storyParagraphs: row.story_paragraphs,
    pullQuote: row.pull_quote,
    conceptName: row.concept_name,
    whyItMatters: row.why_it_matters,
  };
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short Korean label for this stage/block of the architecture, e.g. "데이터 입력 및 전처리", "인코더", "디코더", "출력"' },
          steps: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: { type: 'string' },
            description: 'Ordered short Korean sub-steps that happen inside this stage',
          },
        },
        required: ['title', 'steps'],
      },
      description: 'The paper\'s method broken into 2-5 ordered stages/blocks (like the boxes in an architecture diagram), each containing 1-4 sub-steps. e.g. [{"title":"데이터 입력 및 전처리","steps":["입력 문장 토큰화","위치 인코딩"]},{"title":"인코더","steps":["Multi-Head Attention","Add & Norm","Feed Forward"]},{"title":"디코더","steps":["Masked Self-Attention","Encoder-Decoder Attention"]},{"title":"출력","steps":["Linear + Softmax"]}]',
    },
    storyParagraphs: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: { type: 'string' },
      description: '2-3 Korean narrative paragraphs explaining the paper via an accessible analogy/story, non-technical, building to a turning point',
    },
    pullQuote: { type: 'string', description: 'One short, dramatic, italicized-style Korean sentence marking the story\'s turning point (e.g. a line of dialogue)' },
    conceptName: { type: 'string', description: 'The single most important concept/term from this paper, e.g. "Self-Attention (자기 주의 메커니즘)"' },
    whyItMatters: { type: 'string', description: '2-3 sentence Korean paragraph on why this concept matters and its real downstream impact (name real follow-up models/uses where genuinely true)' },
  },
  required: ['groups', 'storyParagraphs', 'pullQuote', 'conceptName', 'whyItMatters'],
};

// ============================================================================
// PROMPT — edit this to change PaperDetailScreen's "핵심 구조 시각화" +
// "스토리텔링" + "핵심 개념" sections. This replaces what used to be a single
// static image (assets/transformer-arch.png) shown for every paper regardless
// of which one the user opened.
// ============================================================================
function overviewPrompt(paper: PaperContext): string {
  return `Generate the overview content for the AI paper "${paper.title}" (${paper.year}, category ${paper.cat}) for PaperCat, an app that teaches non-experts about AI papers.

This feeds three sections of a paper detail screen:
1. "핵심 구조 시각화" (core structure) — shown as a simplified version of the architecture diagram from the paper's actual Method section, NOT a flat list. Break the method into 2-5 major stages/blocks the way an architecture figure would box them (e.g. input processing / encoder / decoder / output, or whatever this paper's real architecture actually looks like), and list the 1-4 concrete sub-steps that happen inside each block, in order. Think "what would the labeled boxes and arrows in this paper's Figure 1 be" — reproduce that grouping, simplified, not an arbitrary even split of steps.
2. "스토리텔링" (storytelling) — explain the paper's core idea through an accessible narrative/analogy in Korean, ending with a dramatic pull-quote line.
3. "핵심 개념" (key concept) — name the single most important concept this paper introduces/relies on, and explain why it matters with real, specific downstream impact.

Ground everything in what this specific, real paper actually contributes — no generic AI hype, no fabricated details you're unsure of. The stage/block breakdown must reflect this paper's actual method, not a generic template reused across papers.

Respond with JSON only, matching the required schema.`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paper }: RequestBody = await req.json();
    if (!paper?.id || !paper?.title) {
      return new Response(JSON.stringify({ error: 'paper is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = supabaseAdmin();

    // 이 논문(같은 paper.id → 같은 title/category)의 개요를 다른 사용자가 이미 생성해
    // 뒀다면 캐시를 그대로 반환한다 — Gemini 호출 없이 즉시 응답, 비용도 0.
    const { data: cached, error: fetchErr } = await db
      .from('paper_overviews')
      .select('groups, story_paragraphs, pull_quote, concept_name, why_it_matters')
      .eq('paper_id', paper.id)
      .maybeSingle();
    if (fetchErr) console.warn('[generate-overview] cache lookup failed:', fetchErr.message);
    if (cached) {
      return new Response(JSON.stringify(rowToResult(cached as OverviewRow)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await callGemini({
      prompt: overviewPrompt(paper),
      jsonSchema: RESPONSE_SCHEMA,
      temperature: 0.8,
    });

    const parsed = JSON.parse(raw) as OverviewResult;

    // Write-through: 캐시 저장은 best-effort. 실패해도(경합으로 인한 conflict 포함) 이번
    // 요청의 응답 자체는 정상적으로 사용자에게 돌려준다.
    const { error: upsertErr } = await db.from('paper_overviews').upsert(
      {
        paper_id: paper.id,
        groups: parsed.groups,
        story_paragraphs: parsed.storyParagraphs,
        pull_quote: parsed.pullQuote,
        concept_name: parsed.conceptName,
        why_it_matters: parsed.whyItMatters,
      },
      { onConflict: 'paper_id' },
    );
    if (upsertErr) console.warn('[generate-overview] cache write failed:', upsertErr.message);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

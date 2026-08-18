import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import type { PaperContext } from '../_shared/types.ts';

type RequestBody = {
  paper: PaperContext;
  summary: string;
};

type GradeResult = {
  score: number;
  feedback: string;
  matchedKeywords: string[];
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', description: '0-100 quality score for the summary' },
    feedback: { type: 'string', description: 'One short Korean sentence of feedback, casual/encouraging tone, may end with 냥' },
    matchedKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key concepts from the paper that the summary correctly captured',
    },
  },
  required: ['score', 'feedback', 'matchedKeywords'],
};

// ============================================================================
// PROMPT — edit this to change how strictly/leniently one-sentence summaries
// are graded, or what feedback style is used.
// ============================================================================
function gradingPrompt(paper: PaperContext, summary: string): string {
  return `You are grading a learner's one-sentence summary of the paper "${paper.title}" (${paper.year}, category ${paper.cat}) for a non-expert-friendly learning app called PaperCat.

The learner's summary:
"""
${summary}
"""

Score it 0-100 based on:
- Correctness (does it accurately describe the paper's core idea?)
- Coverage of the paper's key mechanism/contribution (not just the topic name)
- Clarity (is it actually one coherent sentence, not a list or word salad?)

Be encouraging but honest — a vague or wrong summary should score low (below 50), a correct-but-shallow one mid (50-75), a sharp and accurate one high (80-100).

Write feedback in Korean, one short sentence, casual tone, may end with "냥". List 2-5 key concepts from the paper the summary correctly captured (in Korean or English as they'd naturally appear, e.g. "Self-Attention", "병렬 처리") — empty array if none.

Respond with JSON only, matching the required schema.`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paper, summary }: RequestBody = await req.json();
    if (!paper?.title || !summary?.trim()) {
      return new Response(JSON.stringify({ error: 'paper and summary are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await callGemini({
      prompt: gradingPrompt(paper, summary),
      jsonSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    });

    const parsed = JSON.parse(raw) as GradeResult;
    parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));

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

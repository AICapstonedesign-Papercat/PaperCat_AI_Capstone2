import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import type { PaperContext } from '../_shared/types.ts';

type RequestBody = { paper: PaperContext };

type DiscussionResult = {
  vsTitle: string;
  sides: { label: string; text: string }[];
  judge: string;
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    vsTitle: { type: 'string', description: 'Korean headline framing the debate, e.g. "X를 둘러싼 논쟁"' },
    sides: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '"찬성 진영" or "비판 진영"' },
          text: { type: 'string', description: '1-2 sentence Korean argument for this side' },
        },
        required: ['label', 'text'],
      },
    },
    judge: { type: 'string', description: '1-2 sentence balanced Korean verdict weighing both sides' },
  },
  required: ['vsTitle', 'sides', 'judge'],
};

// ============================================================================
// PROMPT — edit this to change the debate framing (DiscussionScreen renders
// `sides` as two VS cards and `judge` as a referee verdict callout).
// ============================================================================
function discussionPrompt(paper: PaperContext): string {
  return `Generate a short pro/con debate about the real strengths and limitations of the AI paper "${paper.title}" (${paper.year}, category ${paper.cat}), for PaperCat, an app teaching non-experts about AI papers via multi-perspective discussion.

Base both sides on genuine, specific tradeoffs of this paper's actual approach (not generic AI pros/cons). The "찬성 진영" (pro) side highlights what this paper's method does well / made possible. The "비판 진영" (critical) side highlights a real limitation, cost, or open problem with it.

Write in Korean, casual but informed tone, 1-2 sentences per side. The judge verdict should acknowledge both are valid and give a nuanced, practical take.

Respond with JSON only, matching the required schema.`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paper }: RequestBody = await req.json();
    if (!paper?.title) {
      return new Response(JSON.stringify({ error: 'paper is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await callGemini({
      prompt: discussionPrompt(paper),
      jsonSchema: RESPONSE_SCHEMA,
      temperature: 0.8,
    });

    const parsed = JSON.parse(raw) as DiscussionResult;

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

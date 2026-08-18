import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import type { PaperContext } from '../_shared/types.ts';

type RequestBody = { paper: PaperContext };

type StoryResult = {
  chapter: string;
  title: string;
  story: string;
  whisper: string;
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    chapter: { type: 'string', description: 'Small chapter label, e.g. "1장 · 우리가 몰랐던 이야기"' },
    title: { type: 'string', description: 'A punchy, story-like Korean title for this paper (not the literal paper title)' },
    story: { type: 'string', description: '3-5 sentence narrative explanation of the paper, in Korean, story/narrator voice' },
    whisper: { type: 'string', description: 'One casual, simplified 1-2 sentence "TL;DR" as if the cat mascot is whispering it, in Korean, may end with 냥' },
  },
  required: ['chapter', 'title', 'story', 'whisper'],
};

// ============================================================================
// PROMPT — edit this to change the narrative style (StorytellingScreen renders
// `story` as body text with a drop-cap, and `whisper` in a callout bubble).
// ============================================================================
function storyPrompt(paper: PaperContext): string {
  return `Write a short, engaging "storytelling" explanation of the AI research paper "${paper.title}" (${paper.year}, category ${paper.cat}) for PaperCat, an app that teaches non-experts about AI papers through narrative.

Tone: like a documentary narrator or a friendly explainer, in Korean — vivid and a bit dramatic, but never inaccurate. No jargon without explaining it. Ground it in what this specific, real paper actually contributes (its core idea/mechanism and why it mattered), not generic AI hype.

Respond with JSON only, matching the required schema:
- chapter: a short "1장 · ..." style label evoking the paper's theme
- title: a catchy narrative title (not just the paper's literal title)
- story: 3-5 sentences, flowing narrative prose
- whisper: one casual simplified takeaway sentence as if a cat mascot is whispering it to the reader, may end with "냥"`;
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
      prompt: storyPrompt(paper),
      jsonSchema: RESPONSE_SCHEMA,
      temperature: 0.9,
    });

    const parsed = JSON.parse(raw) as StoryResult;

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

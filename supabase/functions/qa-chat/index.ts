import { corsHeaders } from '../_shared/cors.ts';
import { callGemini, type GeminiTurn } from '../_shared/gemini.ts';
import type { PaperContext } from '../_shared/types.ts';

type ChatTurn = { who: 'cat' | 'me'; text: string };

type RequestBody = {
  paper: PaperContext;
  question: string;
  /** Prior turns from QAChatbotScreen's `messages` state, oldest first. */
  history?: ChatTurn[];
};

// ============================================================================
// PROMPT — edit this to change 식빵이's personality, tone, or how it explains
// papers. This is the only thing you need to touch to change chatbot behavior.
// ============================================================================
function systemPrompt(paper: PaperContext): string {
  return `You are 식빵이, a friendly cat mascot inside the PaperCat app who helps a non-expert learner understand an AI research paper.

Paper: "${paper.title}" (${paper.year}, category: ${paper.cat}, difficulty grade: ${paper.grade}).

Rules:
- Answer in Korean, in a warm, casual tone. End sentences with "냥" playfully sometimes (not every sentence).
- Keep answers short: 2-4 sentences, no walls of text.
- Explain concepts with simple analogies before jargon. Assume the reader knows little to no ML.
- Only answer questions relevant to this paper or the ML concepts it uses. If asked something unrelated, gently redirect back to the paper.
- If you're not certain about a specific implementation detail of this exact paper, say so honestly rather than making it up.`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paper, question, history = [] }: RequestBody = await req.json();
    if (!paper?.title || !question?.trim()) {
      return new Response(JSON.stringify({ error: 'paper and question are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiHistory: GeminiTurn[] = history.map(turn => ({
      role: turn.who === 'me' ? 'user' : 'model',
      text: turn.text,
    }));

    const answer = await callGemini({
      systemInstruction: systemPrompt(paper),
      history: geminiHistory,
      prompt: question,
      temperature: 0.8,
    });

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

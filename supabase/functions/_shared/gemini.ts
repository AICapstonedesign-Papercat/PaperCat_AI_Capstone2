// Thin wrapper around the Gemini API (generativelanguage.googleapis.com).
// Set the key once for all functions: `supabase secrets set GEMINI_API_KEY=...`
// Swap models without redeploying: `supabase secrets set GEMINI_MODEL=gemini-2.5-flash`

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// 'gemini-flash-latest' resolves to the newest flash model, which on a free-tier
// API key hits a very low daily quota (seen: 20 requests/day) shared across every
// screen in the app. 'gemini-flash-lite-latest' has a separate, much higher free
// quota and is plenty for these short, structured prompts. Override via
// `supabase secrets set GEMINI_MODEL=...` if you're on a paid plan and want the
// full model back.
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';

export type GeminiTurn = { role: 'user' | 'model'; text: string };

export type GeminiOptions = {
  systemInstruction?: string;
  prompt: string;
  history?: GeminiTurn[];
  /** Pass a JSON Schema object to force structured JSON output instead of free text. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
};

export async function callGemini(opts: GeminiOptions): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Run: supabase secrets set GEMINI_API_KEY=your-key');
  }

  const contents = [
    ...(opts.history ?? []).map(turn => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: opts.prompt }] },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.jsonSchema
        ? { responseMimeType: 'application/json', responseSchema: opts.jsonSchema }
        : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (!text) throw new Error('Gemini returned no text (possibly blocked by safety filters)');
  return text;
}

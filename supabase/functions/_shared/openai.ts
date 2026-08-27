// Thin wrapper around the OpenAI Chat Completions API — mirrors gemini.ts's
// shape so callers can swap providers without changing call-site structure.
// Set the key once: `supabase secrets set OPENAI_API_KEY=...`
// Swap models without redeploying: `supabase secrets set OPENAI_MODEL=gpt-4o`
//
// Currently unused — generate-discussion/index.ts runs both debate sides on
// Gemini alone (cost/quota reasons, see its TODO comment). Kept in place,
// ready to wire back in if a genuinely second model is needed later.

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

export type OpenAIOptions = {
  systemInstruction?: string;
  prompt: string;
  /** Pass a JSON Schema object to force structured JSON output via OpenAI's
   * Structured Outputs (strict mode) — every object level in the schema must
   * set `additionalProperties: false` for strict mode to accept it. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
};

export async function callOpenAI(opts: OpenAIOptions): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Run: supabase secrets set OPENAI_API_KEY=your-key');
  }

  const messages = [
    ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
    { role: 'user', content: opts.prompt },
  ];

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'response', strict: true, schema: opts.jsonSchema },
    };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned no text (possibly blocked or empty completion)');
  return text;
}

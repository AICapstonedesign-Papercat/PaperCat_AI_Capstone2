import { corsHeaders } from '../_shared/cors.ts';
import { callGemini } from '../_shared/gemini.ts';
import type { PaperContext } from '../_shared/types.ts';

type RequestBody = { paper: PaperContext };

type DiscussionResult = {
  vsTitle: string;
  sides: { label: string; text: string }[];
  judge: string;
};

const SIDE_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: '1-2 sentence Korean argument, casual but informed tone' },
  },
  required: ['text'],
};

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    vsTitle: { type: 'string', description: 'Korean headline framing the debate, e.g. "X를 둘러싼 논쟁"' },
    judge: { type: 'string', description: '1-2 sentence balanced Korean verdict weighing both sides' },
  },
  required: ['vsTitle', 'judge'],
};

// ============================================================================
// PROMPTS — 찬성/비판 두 진영 전부 Gemini 한 모델로 생성한다.
//
// TODO(추후 검토): 지금은 비용/쿼터 때문에 단일 제공자(Gemini)로 두 진영을 다
// 생성한다. 같은 모델이 내는 두 결과가 결국 비슷한 논증 습관 안에서만 갈리는
// 한계가 있음을 감안한 임시 절충안 — 트래픽이 늘거나 "진짜 다른 관점"의 품질이
// 더 중요해지면 비판 진영만 별도 제공자(OpenAI 등)로 분리하는 걸 재검토할 것.
// _shared/openai.ts(gpt-4o-mini용 callOpenAI 래퍼)를 안 쓰는 채로 그대로
// 남겨뒀다 — 이 저장소는 git 이력이 없어서 지우면 복구가 안 된다. 되돌릴 때는:
//   1. criticalPrompt 호출을 callGemini → callOpenAI로 교체
//   2. supabase secrets set OPENAI_API_KEY=... (사용자가 직접 등록해야 함)
//   3. OpenAI는 무료 티어가 없고 종량제라는 점 감안 (gpt-4o-mini는 호출당 비용
//      사실상 무시할 수준이지만 결제 계정이 별도로 필요함)
//
// 같은 모델이 논증 습관을 벗어나게 하려고 두 프롬프트를 일부러:
//   1) 문장 구조 자체를 다르게 썼다(반대말만 바꾼 대칭 프롬프트가 아님) — 프롬프트가
//      서로 거울상이면 출력도 거울상이 되는 경향이 있어서, 시점(과거 회고 vs 현재
//      운영 리스크)과 문단 흐름을 다르게 짰다.
//   2) 단순히 "찬성/비판 전문가" 라벨을 주는 대신, 서로 다른 구체적 역할극으로
//      감정적 몰입점을 다르게 줬다.
//   3) temperature를 다르게 줬다(0.85 vs 1.05) — 같은 모델이라도 샘플링이 갈리게.
//   4) 반대쪽을 언급/완화하지 말라고 명시했다 — 안 그러면 모델이 스스로 균형을
//      맞추려다 두 결과가 서로 닮아간다.
// ============================================================================
function proPrompt(paper: PaperContext): string {
  return `You are a senior researcher who was in the audience the day this paper was first presented at a conference. You're now looking back, recalling why the room reacted the way it did, and what actually became possible in the years since.

Paper: "${paper.title}" (${paper.year}, category ${paper.cat}).

Write ONE short Korean sentence or two, in a reminiscing tone, about why this paper's approach was genuinely valuable — name a specific real capability it unlocked. Do not mention any downsides or the opposing view — you are simply testifying to that moment's excitement. Casual but informed tone.

Respond with JSON only, matching the required schema.`;
}

function criticalPrompt(paper: PaperContext): string {
  return `You are a red-team engineer on a team about to deploy this paper's method into a real production system. Your job right now is to find, ahead of time, exactly what will break — cost, infrastructure, or correctness — if the team takes this paper's claims at face value.

Paper: "${paper.title}" (${paper.year}, category ${paper.cat}).

Write ONE short Korean sentence or two pointing out a specific, concrete cost, limitation, or unsolved problem you'd hit actually deploying this approach. No "but it's still valuable" softening, and don't mention the paper's strengths — dig only into the problem. Casual but informed tone.

Respond with JSON only, matching the required schema.`;
}

function judgePrompt(paper: PaperContext, pro: string, critical: string): string {
  return `Two independent reviewers just debated the AI paper "${paper.title}" (${paper.year}, category ${paper.cat}) for PaperCat, an app teaching non-experts about AI papers via multi-perspective discussion.

찬성 진영 argued: "${pro}"
비판 진영 argued: "${critical}"

Write a short Korean headline framing this debate (vsTitle), and a 1-2 sentence balanced Korean verdict (judge) that treats both arguments as valid and gives a nuanced, practical take — actually weigh them against each other, don't just restate both.

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

    // 두 진영을 병렬로 생성 — 한쪽이 느려도 다른 쪽 호출을 막지 않는다.
    // temperature를 다르게 줘서(0.85 / 1.05) 같은 모델이라도 표본이 갈리게 한다.
    const [proRaw, criticalRaw] = await Promise.all([
      callGemini({ prompt: proPrompt(paper), jsonSchema: SIDE_SCHEMA, temperature: 0.85 }),
      callGemini({ prompt: criticalPrompt(paper), jsonSchema: SIDE_SCHEMA, temperature: 1.05 }),
    ]);

    const pro = (JSON.parse(proRaw) as { text: string }).text;
    const critical = (JSON.parse(criticalRaw) as { text: string }).text;

    const judgeRaw = await callGemini({
      prompt: judgePrompt(paper, pro, critical),
      jsonSchema: JUDGE_SCHEMA,
      temperature: 0.6,
    });
    const { vsTitle, judge } = JSON.parse(judgeRaw) as { vsTitle: string; judge: string };

    const result: DiscussionResult = {
      vsTitle,
      sides: [
        { label: '찬성 진영', text: pro },
        { label: '비판 진영', text: critical },
      ],
      judge,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

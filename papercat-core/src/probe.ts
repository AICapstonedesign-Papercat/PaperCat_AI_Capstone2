// 이 키로 "무엇이 되는지" 실측한다. 모델 이름은 공급자마다 달라서 후보를 순서대로 시도한다.
// 키 값은 절대 출력하지 않는다.
//   npm run probe
import { BASE_URL, EMBED_MODELS, CHAT_MODELS, PROVIDER, apiKey } from './config.ts';

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };

async function call(path: string, body: unknown) {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const ms = Date.now() - t0;
  if (res.ok) return { ok: true as const, json: await res.json() as any, ms };
  const text = await res.text();
  const code = text.match(/"(?:code|status)":\s*"([^"]+)"/)?.[1] ?? String(res.status);
  return { ok: false as const, status: res.status, code, ms, text };
}

console.log(`공급자: ${PROVIDER}  (${BASE_URL})\n`);

let embedOk: string | null = null;
console.log('임베딩 (RAG 검색에 필수):');
for (const model of EMBED_MODELS) {
  const r = await call('/embeddings', { model, input: 'ping' });
  if (r.ok) {
    const dims = r.json.data?.[0]?.embedding?.length;
    console.log(`  OK   ${model.padEnd(24)} ${dims}차원  ${r.ms}ms`);
    embedOk = model;
    break;
  }
  console.log(`  실패 ${model.padEnd(24)} HTTP ${r.status} (${r.code})`);
}

let chatOk: string | null = null;
console.log('\n생성:');
for (const model of CHAT_MODELS) {
  const r = await call('/chat/completions', {
    model, messages: [{ role: 'user', content: 'say ok' }], max_tokens: 5,
  });
  if (r.ok) {
    console.log(`  OK   ${model.padEnd(24)} "${(r.json.choices?.[0]?.message?.content ?? '').trim()}"  ${r.ms}ms`);
    chatOk = model;
    break;
  }
  console.log(`  실패 ${model.padEnd(24)} HTTP ${r.status} (${r.code})`);
}

console.log('\n판정:');
console.log(`  임베딩: ${embedOk ? `사용 가능 → ${embedOk}` : '불가'}`);
console.log(`  생성  : ${chatOk ? `사용 가능 → ${chatOk}` : '불가'}`);
if (embedOk && chatOk) console.log('  → 전체 파이프라인 진행 가능');
else if (embedOk) console.log('  → 검색까지는 가능, 생성 단계에서 막힘');
else console.log('  → RAG 자체가 불가. 다른 공급자나 크레딧 필요');

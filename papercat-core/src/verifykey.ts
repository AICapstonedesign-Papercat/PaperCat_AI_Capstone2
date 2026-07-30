// 키가 실제로 동작하는지 확인. 키 값은 절대 출력하지 않는다.
//   npm run verifykey
//
// /models 조회가 아니라 실제 임베딩을 1건 호출한다 — 우리가 쓸 기능이 되는지가 중요하고,
// 키 권한이 모델별로 제한된 경우 /models만으로는 안 걸러진다.
const key = process.env.OPENAI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const model = process.env.EMBED_MODEL ?? 'text-embedding-3-small';

if (!key) {
  console.error('OPENAI_API_KEY 없음 — sh setkey.sh 로 먼저 넣으세요.');
  process.exit(1);
}
if (!key.startsWith('sk-')) {
  console.error(`키가 sk- 로 시작하지 않음 (${key.length}자). 잘못 저장된 값일 수 있습니다.`);
  process.exit(1);
}

const t0 = Date.now();
const res = await fetch(`${baseUrl}/embeddings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, input: 'PaperCat 키 동작 확인' }),
});

if (!res.ok) {
  const body = await res.text();
  // 본문에 키가 실려오진 않지만 만약을 대비해 sk- 로 시작하는 토큰은 가린다
  console.error(`실패 HTTP ${res.status}`);
  console.error(body.slice(0, 400).replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***'));
  if (res.status === 401) console.error('→ 키가 무효하거나 폐기됨. 재발급 후 sh setkey.sh 다시 실행.');
  if (res.status === 429) console.error('→ 요청 한도 또는 크레딧 소진.');
  process.exit(1);
}

const json: any = await res.json();
const dims = json.data?.[0]?.embedding?.length;
console.log(`OK — ${model}, ${dims}차원, ${Date.now() - t0}ms, 토큰 ${json.usage?.total_tokens}`);
if (dims !== 1536) {
  console.log(`주의: 기획서 용량 산정이 1536차원 기준인데 ${dims}차원입니다. 산정치 재계산 필요.`);
}

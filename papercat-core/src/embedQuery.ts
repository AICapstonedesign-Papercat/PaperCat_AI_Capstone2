// 쿼리 1건 임베딩 — retrieval.ts와 generate 평가에서 공용으로 쓴다.
import { BASE_URL, EMBED_MODEL, apiKey } from './config.ts';

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` };

export async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: 'POST', headers: H, body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`쿼리 임베딩 실패: ${res.status}`);
  const json: any = await res.json();
  return json.data[0].embedding;
}

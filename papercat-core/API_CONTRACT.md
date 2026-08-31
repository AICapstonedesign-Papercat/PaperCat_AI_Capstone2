# PaperCat API 계약 스펙

> 2026-08-02 시점 계약. 현행 구현(Edge Function 6종·테이블 6종·마이그레이션 3본, `supabase/` 기준)과
> 어긋나는 부분이 있어 갱신 대기 중 — 현행이 항상 우선한다(`docs/PROJECT.md` NF-05 참조).

**스택: Supabase** (Auth + Postgres + Edge Functions). 벡터 검색은 **Postgres + pgvector** —
같은 DB 안에서 벡터 검색이 되므로 별도 DB를 붙일 이유가 없습니다.

이 문서의 목적은 **앱과 서버가 주고받을 JSON의 모양과 의미를 미리 맞춰두는 것**입니다.
엔드포인트 이름·URL 구조는 편한 대로 바꿔도 되고, **응답 안의 필드 의미**만 지켜지면 됩니다.
그 의미들은 `papercat-core`에서 논문 3편으로 실측하고 적대검증까지 돌려서 확정한 것이라,
근거를 각 절에 같이 적어뒀습니다.

앱(RN)은 이 계약대로 목업 레이어를 깔아둘 예정이라, base URL만 바꾸면 실서버로 스왑됩니다.

---

## 0. 현재 위치

| 레이어 | 상태 |
|---|---|
| 인증 (이메일 가입·로그인) | **완료** — Supabase Auth, 앱 6개 화면 연결 |
| DB 테이블 | `profiles` / `paper_progress` / `summary_challenges` 생성됨. 마이그레이션 파일은 아직 없어서 스키마가 대시보드에만 있음 |
| DB 헬퍼 함수 | 6종 작성됨 (`src/lib/supabase.js`), 아직 화면에 연결 전 |
| Edge Function `papercat-ai` | 배포됨 — `{prompt, taskType}` → Gemini → `{reply}`. 아직 화면에 연결 전 |
| RAG (검색·근거·인용) | 미착수 — `papercat-core`에 로직만 있고 서버로 안 옮겨짐 |
| 학습 사이클 화면 | Q&A·요약채점 모두 아직 목업 데이터 |

**남은 일의 큰 덩어리는 RAG 레이어입니다.** 기획서 §1의 차별점 3개(근거 우선 사용 / 근거 ID 연결 /
근거 없으면 거절)가 전부 여기에 달려 있어요.

---

## 1. 먼저 처리할 것 (보안·비용)

기능보다 먼저입니다. 기획서 §2(6) "비용 남용 방어 — API키 서버 전용, 게스트ID, 요청/일별 한도"에
해당합니다.

**① 함수 접근 제한** — `config.toml`이 `verify_jwt = false`라 인증 없이 호출됩니다. 함수는 받은
`prompt`를 그대로 Gemini에 넘기므로, 함수 URL을 아는 사람은 우리 키로 아무 프롬프트나 돌릴 수
있어요.
→ `verify_jwt = true`. 게스트 체험을 유지하려면 Supabase 익명 로그인(`signInAnonymously`)으로
게스트에게도 JWT를 발급하면 됩니다.

**② 프롬프트 조립을 서버로** — 지금은 클라이언트가 프롬프트 전문을 만들어 보냅니다. 그러면
채팅 입력창에 "이전 지시는 무시하고 ~"를 넣는 것만으로 시스템 프롬프트를 우회할 수 있어요.
→ 클라이언트는 구조화된 값만 보내고(`{ paperId, question }`), 조립은 서버에서.
사용자 입력·논문 원문은 요청마다 **난수 구분자**로 감쌉니다 — 고정 문자열 구분자는 사용자가 그
문자열을 그대로 써서 구획을 위조할 수 있습니다(`papercat-core`에서 실제로 뚫렸던 부분,
`src/prompt.ts`의 `newNonce()` 참고).

**③ 모델 확인** — 현재 `gemini-1.5-flash`. `papercat-core` 실측(2026-07-27)에선 이 계열이 404였습니다.
지금 응답이 오면 그대로 두고, 404가 나면 `gemini-flash-lite-latest`로. 무료 티어는 **모델별로 쿼터
버킷이 독립**이라 하나 막혀도 다른 모델은 살아있습니다.

---

## 2. Q&A — 핵심

### 지금
```
POST /functions/v1/papercat-ai
Body: { "prompt": "Attention이 뭐야?", "taskType": "qa" }
→ { "reply": "어텐션은 ~다냥!" }
```
논문 원문을 읽지 않고 모델의 배경지식으로 답하는 구조라, 근거가 없어서 인용도 거절도 불가능합니다.

### 목표
```
POST /functions/v1/papercat-qa
Body: { "paperId": "attention", "question": "Attention이 뭐야?" }
```

서버가 하는 일:
1. 질문 임베딩 → `pgvector`로 해당 논문 문단 Top-5 검색
2. 코사인 유사도 0.3 미만이면 **LLM 호출 없이 즉시 거절** (검색부터 실패 = 근거 없음. 비용 0)
3. 검색된 문단만 프롬프트에 넣고 생성
4. 아래 스키마로 검증 → 실패 시 재생성 → 그래도 안 되면 거절

**응답 — 두 형태만 존재** (`guard.ts`의 `AnswerSchema`)

```json
{
  "status": "answered",
  "claims": [
    { "text": "어텐션은 ~다냥", "type": "fact",    "citations": ["1706.03762:s3:2"] },
    { "text": "쉽게 말하면 ~", "type": "analogy", "citations": [] }
  ]
}
```
```json
{ "status": "refused", "reason": "관련 근거 문단을 찾지 못했습니다." }
```

- `type: "fact"`는 citations가 **비어있으면 안 됨**. `analogy`(비유·쉬운 설명)는 우리가 지어낸
  표현이라 비어있는 게 정상. 앱은 이 둘을 다르게 렌더링해서 "원문 대조 뷰"를 만듭니다.
- `refused`는 에러가 아니라 **정상 응답(HTTP 200)**. "모른다"고 답하는 게 차별점이라, 앱은 이걸
  "질문 바꾸기 제안" UI로 처리합니다.
- 고양이 말투(`~다냥`)는 그대로 유지 — `claims[].text` 안에 들어갑니다.

**응답 전 서버가 하는 인용 검증** (`guard.ts` — 적대검증으로 확정)

1. citations의 ID가 실재하는가 → 아니면 `unknown_citation` (환각)
2. **citations가 "이번 요청에 실제로 검색해서 넣어준 문단"인가** → 아니면 `citation_not_retrieved`

2번이 필요한 이유: 처음엔 "논문 전체에 존재하는 ID인가"만 봤는데, 적대검증에서 **실재하지만 이번에
안 준 문단(다른 논문 것 포함)을 인용해도 통과**하는 걸 확인했습니다. ID가 진짜라 사람이 대조해도
안 걸리는 조용한 실패라, `retrieved`(이번에 준 것) / `known`(전체 존재하는 것) 두 집합을 따로 들고
비교해야 잡힙니다.

**문단 ID 포맷**: `{arxivId}:{sectionId}:{index}` — 예 `1706.03762:s3:2`. 위치 기반이라 재실행해도
고정. 앱의 "원문 이동" 기능이 이 ID로 문단을 찾습니다.

---

## 3. 인제스트 — 논문을 DB에 넣기

RAG가 돌려면 논문 원문이 문단 단위로 쪼개져 임베딩된 채 DB에 있어야 합니다. `papercat-core`가
3편(attention·resnet·llama) 182문단으로 검증해둔 로직이 있어서, 그걸 Supabase로 옮기면 됩니다.

```sql
create table chunks (
  id            text primary key,     -- '1706.03762:s3:2'
  paper_id      text not null,
  section_id    text not null,        -- 'abs' | 's1' | 's2' ...
  section_title text not null,        -- 논문에 적힌 그대로 (인용 표시용)
  idx           int  not null,        -- 섹션 내 문단 순번
  text          text not null,
  source_url    text not null,        -- arXiv 딥링크
  embedding     vector(3072)          -- Gemini gemini-embedding-001
);
```

- **차원 주의**: Gemini 임베딩은 3072차원(OpenAI는 1536). 기획서 용량 산정이 1536 기준이었어서
  재계산 — 3편 ≈2.1MB, 20편 ≈14MB. Supabase 무료 티어(500MB) 대비 여유 큼.
- **Claude는 임베딩 API가 없습니다**(생성 전용). RAG엔 임베딩이 필수라 OpenAI나 Gemini가 항상
  필요해요. 지금 Gemini 하나로 생성·임베딩 둘 다 되니 그대로 가면 됩니다.
- **청킹**: 문단 단위가 아니라 **인접 문단을 700자 목표로 병합**. 정확도 때문이 아니라 비용
  때문입니다 — 같은 Top-5 정확도를 청크 182개→94개(-48%)로 달성. 오버랩은 정확도를 떨어뜨려 기각.

`papers` 테이블에 `quote_policy` 컬럼도 필요합니다:
- `'short-quote-and-link'` (기본, 대부분 논문) — 원문은 1~2문장 인용 + arXiv 링크만
- `'full-with-attribution'` (CC BY 계열만) — 원문 표시 허용

라이선스는 arXiv OAI-PMH에서 기계로 읽히니 인제스트가 자동 판정합니다. 유명 AI 논문 18편 중 CC BY는
1편뿐이라(실측), **대부분 논문은 원문을 통째로 화면에 뿌리면 안 됩니다.**

---

## 4. 요약 채점

### 지금
```
Body: { "prompt": "<요약문>", "taskType": "summary" }
→ { "reply": "{\"score\": 85, \"feedback\": \"...\"}" }
```

### 목표
```
POST /functions/v1/papercat-grade
Body: { "paperId": "attention", "summary": "Transformer는 ..." }
```
```json
{
  "status": "graded",
  "accuracy": 2, "completeness": 1, "clarity": 2,
  "feedback": "핵심은 맞았지만 병렬화 이점이 빠졌어요"
}
```
```json
{ "status": "uncertain", "reason": "요약이 너무 짧아 판정할 수 없음" }
```

**① 0~100점 → 3축 × 0~2점.** 기획서 §2(6)이 "3축×0~2점"으로 정해져 있고 골든셋도 그 기준으로
만들어져 있습니다.
- `accuracy` — 논문 내용과 모순되지 않는가
- `completeness` — 핵심 아이디어(무엇을 왜 어떻게 바꿨는지)를 담았는가
- `clarity` — 한 문장으로 읽혔을 때 이해되는가

화면에 100점으로 보여주고 싶으면 합계(0~6)를 환산하면 됩니다 — API는 3축 그대로 주는 게 맞아요.
골든셋 비교·회귀 테스트가 축별로 이뤄지기 때문입니다.

**② `uncertain` 상태 추가.** 억지로 점수를 뱉게 하면 그게 더 위험한 침묵 실패가 됩니다. 기획서 §5
실패UX의 "채점 불확실 → 점수 미부여, 다시 시도(불이익 없음)"가 이 상태로 구현됩니다.

**주의**: 3축 판정 기준이 될 골든셋 13건이 아직 인성 초안이라 게이트 숫자로 못 씁니다. 성민·인성이
같이 리뷰해서 확정해야 해요 (`papercat-core/data/summary-goldenset.json` 상단 note).

---

## 5. 스토리텔링 (Q&A 계약 재사용)

`papercat-core`에도 아직 전용 프롬프트가 없습니다. 구조상 Q&A와 같은 `AnswerSchema`를 재사용하는 게
맞아요 — "서론을 근거로 쉽게 재작성"도 결국 "근거를 달아 답하기"의 한 종류이고,
`type: fact|analogy` 구분이 그대로 "원문 대조 뷰"가 됩니다.

---

## 6. 아직 안 정한 것

- **긴 생성 작업 처리** — Edge Function 실행 시간 제한 안에서 동기로 할지, 작업 큐+폴링으로 갈지.
  MVP는 동기로 두고 재시도는 앱의 재요청 버튼으로 해도 됩니다.
- **에러 포맷** — `refused`/`uncertain`(정상 응답)과 진짜 서버 오류를 앱이 구분할 수 있게 정리 필요.
- **요청 한도** — 기획서 §2(6)의 "요청/일별 한도, 일일 전역 예산". Postgres에 카운터 테이블 두고
  Edge Function에서 체크하는 게 제일 단순합니다.
- **DB 마이그레이션** — 스키마를 `supabase/migrations/`로 빼두면 팀원이 로컬에서 같은 DB를 재현할 수
  있고, 리뷰도 됩니다.

---

## 7. 앱(RN) 쪽 대응

- `SummaryChallengeScreen`이 아직 로컬 목업이고 `uncertain` 분기가 없습니다 — 실채점 붙일 때 추가.
- 앱은 논문 8편을 보여주는데 인제스트된 건 3편입니다. P1 단계에선 3편만 `ready`, 나머지는
  `pending`으로 내려주면 시연 때 안 깨집니다.

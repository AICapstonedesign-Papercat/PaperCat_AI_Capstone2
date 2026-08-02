# PaperCat API 계약 스펙 (초안)

성민 백엔드 ADR(S1 1주차) 참고용. 새로 설계한 게 아니라 `papercat-core`에서 이미 실측 검증한
스키마(`guard.ts`, `judge.ts`, `generate.ts`)를 HTTP API 모양으로 옮긴 것입니다. 엔드포인트 이름·URL
구조는 백엔드 후보(A: Node 서버 / B': Vercel 서버리스) 어느 쪽으로 가든 자유롭게 바꿔도 됩니다 —
**바뀌면 안 되는 건 응답 안의 필드 의미**입니다. 이유는 각 절에 적어뒀습니다.

프론트(RN 앱)는 지금 이 계약 그대로 목업 API 레이어를 깔아둘 예정이라, 나중에 base URL만 바꾸면
실제 백엔드로 스왑됩니다.

---

## 0. 기본 원칙

- **API 키는 서버 전용.** 클라이언트(RN 앱)에 임베딩/생성 API 키가 노출되면 안 됨 — 기획서 §2(6) 비용
  남용 방어 항목.
- **Claude는 임베딩 API가 없습니다.** 생성엔 Claude/GPT/Gemini 아무거나 되지만, 임베딩(검색에 필수)은
  OpenAI 또는 Gemini가 항상 따로 필요합니다. `papercat-core`는 Gemini 하나로 둘 다 씁니다
  (`generativelanguage.googleapis.com/v1beta/openai` — OpenAI 호환 엔드포인트).
- **인용 문단 ID 포맷**: `{arxivId}:{sectionId}:{index}` — 예 `1706.03762:s3:2`. 위치 기반이라 재실행해도
  고정입니다. 프론트가 "원문 이동" 기능을 만들 때 이 ID로 문단을 찾습니다.

---

## 1. 논문 목록 / 상세

```
GET /papers
GET /papers/:id
```

**응답 (논문 하나)**
```json
{
  "id": "attention",
  "arxivId": "1706.03762",
  "title": "Attention is All You Need",
  "field": "NLP",
  "quotePolicy": "short-quote-and-link",
  "status": "ready"
}
```

- `quotePolicy`: `"short-quote-and-link"` (기본, 대부분 논문) | `"full-with-attribution"` (CC BY 계열만).
  라이선스는 인제스트 단계에서 arXiv OAI-PMH로 자동 판정됩니다(`ingest/parse.ts`) — 프론트가 임의로
  원문을 통째로 보여주면 안 되고, 이 필드로 표시 범위를 분기해야 합니다.
- `status`: `"ready"`(파싱·임베딩 완료) | `"abstract-only"`(원문 파싱 실패, 초록만) | `"pending"`.
  §5 실패UX의 "Abstract-only 배지"가 이 필드로 결정됩니다.

**참고**: 앱(`src/data/papers.ts`)은 지금 8편(attention·bert·resnet·vit·gpt2·dqn·diffusion·llama)을
보여주지만, `papercat-core`가 실제로 처리·검증한 건 3편(attention·resnet·llama)뿐입니다. P1(3편
수직슬라이스) 단계에선 이 3편만 `status:"ready"`로, 나머지는 `"pending"`으로 내려주는 게 맞습니다.

---

## 2. Q&A 챗봇

```
POST /papers/:id/qa
Body: { "question": "Attention이 뭐야?" }
```

**응답 — 두 가지 형태만 존재** (`guard.ts`의 `AnswerSchema`, discriminated union)

성공(근거 찾음):
```json
{
  "status": "answered",
  "claims": [
    { "text": "Attention은 ...", "type": "fact", "citations": ["1706.03762:s3:2"] },
    { "text": "쉽게 말하면 ...", "type": "analogy", "citations": [] }
  ]
}
```

거절(근거 없음):
```json
{ "status": "refused", "reason": "관련 근거 문단을 찾지 못했습니다." }
```

- `type: "fact"`는 **citations가 비어있으면 안 됩니다** (백엔드가 이미 걸러야 함 — 아래 가드 참고).
  `type: "analogy"`(비유·쉬운 설명)는 우리가 지어낸 표현이라 citations가 비어있는 게 정상입니다.
  이 둘을 프론트에서 다른 스타일로 렌더링해야 "원문 대조"가 됩니다(사실은 원문과 연결, 비유는
  "설명용 비유" 라벨).
- `refused`는 에러가 아니라 **정상 응답**입니다(HTTP 200). "모른다"고 답하는 게 이 서비스의
  차별점이라 프론트는 이 상태를 "질문 바꾸기 제안" UI로 처리해야 합니다(§5 실패UX).

**백엔드가 응답 전에 반드시 해야 하는 검증** (`guard.ts`, 실측+적대검증으로 확정됨):

1. citations의 ID가 실재하는가 (`unknown_citation`이면 명백한 환각 — 재생성)
2. **citations가 "이번 요청에 실제로 검색해서 프롬프트에 넣어준 문단"인가** (`citation_not_retrieved`).
   이게 중요한 이유 — 처음엔 "논문 전체에 존재하는 ID인가"만 검사했는데, 적대검증에서
   **실재하지만 이번에 안 준 문단(심지어 다른 논문 것)을 인용해도 통과**하는 걸 확인했습니다. ID가
   진짜라 사람이 봐도 안 걸리는 조용한 실패입니다. 검증하려면 "이번 검색에서 실제로 넘긴 문단 ID
   집합"을 요청마다 따로 들고 있어야 합니다 — `retrieved`(이번에 준 것) vs `known`(전체 존재하는 것)
   두 세트를 분리하세요.
3. 둘 다 통과 못 하면 재생성(최대 재시도 있음) → 그래도 안 되면 `refused`로 폴백.

**프롬프트 인젝션 방어**: 사용자 질문과 논문 원문 둘 다 비신뢰 입력입니다. 요청마다 난수 구분자로
데이터 구획을 감싸세요(`prompt.ts`의 `newNonce()`) — 고정 문자열(`[검색된 문단]` 같은)을 쓰면 사용자가
질문 안에 그 문자열을 그대로 써서 구획을 위조할 수 있습니다(실제로 뚫렸던 취약점).

---

## 3. 한 줄 요약 채점

```
POST /papers/:id/summary/grade
Body: { "summary": "Transformer는 ..." }
```

**응답 — 두 가지 형태만 존재** (`judge.ts`의 `JudgeSchema`)

채점됨:
```json
{
  "status": "graded",
  "accuracy": 2, "completeness": 1, "clarity": 2,
  "feedback": "핵심은 맞았지만 병렬화 이점이 빠졌어요"
}
```

불확실:
```json
{ "status": "uncertain", "reason": "요약이 너무 짧아 판정할 수 없음" }
```

- 3축은 각 0~2점: **accuracy**(논문과 모순 없는가) · **completeness**(핵심 아이디어를 담았는가) ·
  **clarity**(한 문장으로 읽혀서 이해되는가).
- `uncertain`은 **억지로 점수를 뱉지 않는 안전장치**입니다(§5 "채점 불확실 → 점수 미부여, 다시 시도
  불이익 없음"). 프론트는 `uncertain`을 받으면 점수 UI 대신 "다시 시도" 버튼을 보여줘야 합니다 —
  지금 `SummaryChallengeScreen.tsx`의 `Math.random()` 목업엔 이 상태가 아예 없어서, 실채점 연결 시
  이 분기를 새로 추가해야 합니다.
- **주의**: 3축 판정 기준의 골든셋(정답 예시 13건)이 아직 인성 초안입니다 — 실제 채점기와 비교할
  "정답"으로 쓰려면 성민·인성이 같이 리뷰해서 확정해야 합니다(`papercat-core/data/summary-goldenset.json`
  상단 note 참고).

---

## 4. 스토리텔링 (미구현 — Q&A와 같은 계약 재사용 예정)

기획서상 별도 기능이지만, `papercat-core`엔 아직 스토리텔링 전용 프롬프트가 없습니다. 구조상
Q&A와 같은 `AnswerSchema`(`status: answered|refused`, `claims[]`)를 재사용하는 게 맞습니다 — "서론을
근거로 이야기 재작성"도 결국 "질문에 근거를 달아 답하기"의 한 종류이기 때문입니다. 다만 `type`
필드로 사실/비유를 구분해서 "원문 대조 뷰"를 만드는 건 이 스키마가 이미 지원합니다.

---

## 5. 아직 안 정해진 것 (성민이 정할 것)

- **긴 생성 작업의 상태 관리** — 스토리텔링처럼 오래 걸리는 요청을 동기(sync) vs 비동기(작업 큐+폴링)
  중 뭘로 할지. 기획서 §6은 "서버 형태 무관하게 상태 DB 저장·재시도·중복 방지·완료 알림 공통 설계,
  MVP는 서버리스 함수 실행 한도 이내 동기 실행"이라고만 되어 있어 세부 API(폴링 엔드포인트 등)는
  미정입니다.
- **HTTP 상태 코드 컨벤션** — 이 문서는 성공 응답의 JSON *모양*만 정의했고, 실패(네트워크 오류·서버
  다운 등 guard 통과 이전 단계의 실패)의 HTTP status/에러 포맷은 안 정했습니다.
- **인증/게스트 ID** — 기획서 §2(6) "게스트ID, 요청/일별 한도"가 있는데 그 게스트 ID를 어디서
  발급하고 어떻게 전달하는지(헤더? 쿠키?) 미정입니다.

이 세 개는 응답 JSON *의미*와 무관하게 백엔드 구조(후보 A vs B')에 따라 자연스럽게 달라질 수 있는
부분이라 일부러 안 정했습니다 — ADR 짤 때 같이 정하면 됩니다.

# Paper Cat — iPad 앱 (React Native)
![온보딩 영상 미리보기](assets/video/onboarding.gif)

고양이를 키우며 논문을 학습하는 게이미피케이션 모바일 앱 서비스.
iPad를 메인 타겟으로, 실제 논문 데이터·실 LLM 연동으로 학습 사이클 전 구간을 완성해 실제 배포(TestFlight → App Store)까지 가는 프로젝트입니다.

## 이 앱이 하는 일

영어 논문이 어려워서 못 읽는 비전공자를 위해, 논문을 큐레이션 → 쉬운 이야기로 변환 → 질문하면 답변 → 한 줄 요약 채점 → 도감에 모으는 학습 사이클을 제공합니다. 답변은 논문 원문 근거에 링크되고, 근거 없는 질문에는 명확히 "모른다"고 답합니다.

백엔드는 [`supabase/`](supabase/)(Edge Functions 6종 + DB 마이그레이션), RAG 파이프라인 검증은 [`papercat-core/`](papercat-core/)에서 관리합니다.

## 빠른 시작

```bash
npm install
bundle install && bundle exec pod install --project-directory=ios
npm start        # Metro
npm run ios       # 또 다른 터미널에서
```

Expo는 쓰지 않습니다(팀 결정, bare RN CLI + New Architecture).

## 구조

```
src/
├── navigation/
│   ├── RootNavigator.tsx     # 온보딩 → 탭 → 학습 스택 전체 흐름
│   ├── MainTabNavigator.tsx  # 홈/탐색/학습/도감/프로필
│   └── SideRail.tsx          # 하단 탭바 대신 좌측 모노 인덱스 레일(Figma 확정판)
├── screens/
│   ├── onboarding/  # Splash · PlayFirst · CatAdoption(이름·성격) · InterestPicker · StreakCommit · Auth
│   ├── main/        # Home · Explore · Study · Collection(도감) · Profile
│   └── stack/       # StageMap · Storytelling · PaperDetail · QAChatbot · SummaryChallenge · Discussion · LearningComplete
├── theme/tokens.ts   # 색상·타이포·반경 등 디자인 토큰
├── components.tsx    # 공용 UI 컴포넌트
├── lib/               # Supabase 클라이언트 · Edge Function 호출(ai.ts) · DB 헬퍼(db.ts)
├── store.ts           # 전역 상태(레벨·XP·스트릭·도감 진행도) — AsyncStorage 로컬 캐시 + Supabase 동기화
├── data/papers.ts      # 논문 목록 로더(Supabase 우선, 로컬 시드 폴백)
└── audio/catSounds.ts  # 고양이 상호작용 사운드
```

## 문서

자세한 기획 배경은 [기획서 아티팩트](https://claude.ai/code/artifact/437ce165-aa9a-4382-8c42-c508e31e25eb)와 [`docs/PROJECT.md`](docs/PROJECT.md)(통합 기획 문서)를 참고하세요.

## 진행 중

마스코트(식빵이) 이미지·영상 에셋을 Higgsfield로 제작 중입니다. 이미지는 Seedream 5.0 Lite, 영상은 Seedance 2.0 사용.

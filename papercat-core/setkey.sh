#!/bin/sh
# API 키를 .env에 넣는다. 키는 화면에 절대 출력하지 않는다.
#
# 본인 터미널에서:
#   cd ~/dev/git_inseong/papercat-core && sh setkey.sh
# 입력창이 뜨면 키를 붙여넣고 엔터. 입력 중 화면에 안 보이는 게 정상.
set -e
cd "$(dirname "$0")"

if [ -t 0 ]; then
  # 직접 입력 — 에코를 꺼서 키가 화면·스크롤백에 안 남게 한다
  # 변수명은 OPENAI_API_KEY로 고정이지만(OpenAI 호환 엔드포인트를 쓰므로) 공급자는 무엇이든 된다.
  printf 'API 키 입력 — Gemini/OpenAI 무엇이든 (화면에 안 보임): '
  stty -echo 2>/dev/null || true
  read -r KEY
  stty echo 2>/dev/null || true
  printf '\n'
else
  # 파이프로 실행된 경우 클립보드에서 읽는다
  KEY=$(pbpaste 2>/dev/null | tr -d '\r\n')
fi

KEY=$(printf '%s' "$KEY" | tr -d '\r\n')

if [ -z "$KEY" ]; then
  echo "입력이 비어있음."
  exit 1
fi

# 실행할 명령어를 복사하다 클립보드가 덮어써지는 사고가 실제로 났다. 저장 전에 막는다.
case "$KEY" in
  '!'*|*setkey.sh*|*' '*)
    echo "API 키 형태가 아닙니다(명령어이거나 공백 포함). 다시 실행하세요."
    exit 1 ;;
esac

if [ "${#KEY}" -lt 20 ]; then
  echo "키가 너무 짧습니다(${#KEY}자). 일부만 붙여넣지 않았는지 확인하세요."
  exit 1
fi

# 기존 키 줄은 지우고 새로 넣는다 — 키 교체 시 같은 명령 재실행하면 되고 중복이 안 쌓인다
if [ -f .env ]; then
  grep -v '^OPENAI_API_KEY=' .env > .env.tmp || true
  mv .env.tmp .env
fi

printf 'OPENAI_API_KEY=%s\n' "$KEY" >> .env
chmod 600 .env

# 키 자체는 안 찍고 형식만 확인
echo "저장 완료 — ${#KEY}자, 시작 $(printf '%.7s' "$KEY")…"
case "$KEY" in
  sk-*) echo "형식: OpenAI 키 정상" ;;
  *)    echo "주의: sk- 로 시작하지 않음. 키가 맞는지 확인하세요." ;;
esac

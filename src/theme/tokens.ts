// 캡디1 원본(github.com/itsinseong/PaperCat_AI_Capstone1, src/theme.js) 그대로 이식.
// 폰트 파일(assets/fonts) + Feather 아이콘 폰트 링크 완료(react-native-asset).
export const colors = {
  bg: '#F7F3EF',
  bgDeep: '#EFE6DA',
  surface: '#FFFFFF',
  cream: '#FFF7EB',
  creamDeep: '#FDF7EC',
  panel: '#F4ECDE',

  border: '#E7D9C5',
  borderSoft: '#EBDFCC',
  divider: '#DCC7AC',
  hairline: '#E4D8C4',

  ink: '#3A2C20',
  text: '#574636',
  muted: '#857458',
  mutedSoft: '#A89784',
  faint: '#C2B09A',

  brand: '#D4A574',
  brandDeep: '#B88955',
  brandShadow: '#9C7548',

  // 2톤 악센트(식빵이 유래) — accent=카카오(윤곽), accent2=캐러멜(털그림자)
  accent: '#5E4632',
  accent2: '#9B6B43',
  accent3: '#C2410C',

  green: '#5FA84A',
  greenSoft: '#B8E0A8',
  greenBg: '#E6F2DC',

  yellow: '#FFD64F',
  yellowSoft: '#FFE48A',
  yellowBg: '#FFF1BF',
  yellowText: '#8C6A1D',

  orange: '#C46B2A',
  orangeSoft: '#FFB87A',
  orangeBg: '#FFE6D0',

  purple: '#6B4E8E',
  purpleSoft: '#C9B8DE',
  purpleBg: '#E8DCF2',

  blue: '#3D6E8E',
  blueBg: '#DCEAF2',

  red: '#C04848',
  redBg: '#FFE0E0',

  heartRed: '#FF0000',
  zapGreen: '#71C837',
  kakaoYellow: '#FEE500',

  medalGoldText: '#5C4400',
  medalSilver: '#E3E0D6',
  medalSilverText: '#6B6657',
  medalBronze: '#E7B98F',
  medalBronzeText: '#6B3F1A',

  // 구 화면(HomeScreen 등)이 참조하던 범용 이름 — 실제 화면 포팅하면서 위 캡디1 이름으로 정리 예정
  background: '#F7F3EF',
  primary: '#D4A574',
  textMuted: '#857458',
} as const;

export const CAT_COLORS = {
  NLP: { bg: '#6E8FB8', fg: '#fff' },
  CV: { bg: '#5FA84A', fg: '#fff' },
  RL: { bg: '#6B4E8E', fg: '#fff' },
  생성AI: { bg: '#C46B2A', fg: '#fff' },
  추론: { bg: '#3D6E8E', fg: '#fff' },
  멀티모달: { bg: '#8E4E6E', fg: '#fff' },
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 캡디1은 iPhone(~390pt) 폭 기준이라 읽기 전용 단일 컬럼 화면(스토리·토론·리뷰 등)은
// 그대로 두면 iPad(1024pt+)에서 텍스트 줄이 화면 끝까지 늘어져 가독성이 깨짐.
// 주의: ScrollView의 contentContainerStyle에 alignSelf:'center'를 넣는 건 RN에서 안 먹음
// (컨텐츠 컨테이너가 자기 부모 기준으로 정렬되지 않음) — 대신 ①바깥 컨테이너에 centerColumn으로
// alignItems:center를 주고 ②ScrollView 자체의 style(= contentContainerStyle 아님)에 readingWidth로 폭을 캡.
// 탭 화면(Home/Explore/Study/Collection/Profile)은 좌측 SideRail 옆 나머지 폭을 그대로 씀 — 이 토큰 쓰지 않음.
// 스택 화면(PaperDetail/StageMap/Storytelling/Discussion/QAChatbot/SummaryChallenge/LearningComplete)은
// 레일 없는 전체화면 라우트라 가독성을 위해 폭을 캡하고 가운데 정렬 — 계속 사용.
export const centerColumn = { flex: 1, alignItems: 'center' as const };
export const readingWidth = { width: '100%' as const, maxWidth: 960 };

// Pretendard(한글) + SUIT(영문). 폰트 파일은 assets/fonts에 있고 Info.plist UIAppFonts에 등록됨.
export const font = {
  regular: { fontFamily: 'Pretendard-Regular' },
  medium: { fontFamily: 'Pretendard-Medium' },
  semibold: { fontFamily: 'Pretendard-SemiBold' },
  bold: { fontFamily: 'Pretendard-Bold' },
  extrabold: { fontFamily: 'Pretendard-ExtraBold' },
  body: { fontFamily: 'Pretendard-Regular', color: colors.text },
  futura: { fontFamily: 'SUIT-Medium' },
  futuraBold: { fontFamily: 'SUIT-Bold' },
};

export const kicker = {
  fontFamily: 'SUIT-Medium',
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: colors.muted,
};

// 구 화면이 쓰던 범용 타이포 스케일 — 캡디1 화면 포팅되면서 font.*로 점차 대체 예정
export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};

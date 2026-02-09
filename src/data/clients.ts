// ============================================================================
// 계약 정보 타입 정의
// ============================================================================

/**
 * 계약 채널 (어떻게 계약했는가)
 */
export type ContractChannel =
  | 'naramarket_service'  // 나라장터 용역계약
  | 'naramarket_goods'    // 나라장터 물품계약
  | 'document'            // 서류계약 (표준이용계약서)
  | 'simple';             // 간편가입 (이용약관)

/**
 * 정산 방식 (어떻게 돈을 받는가)
 */
export type PaymentMethod =
  | 'prepaid_card'        // 카드 선불 충전
  | 'prepaid_cash'        // 현금 선불 충전
  | 'postpaid_cash'       // 현금 후불 청구
  | 'auto_card'           // 카드 자동결제
  | 'narabill';           // 나라빌 청구

/**
 * 과금 방식 (얼마를 받는가)
 */
export type BillingType =
  | 'usage'               // 종량제 (사용량 기반) - 가장 중요!
  | 'fixed'               // 월정액
  | 'poc';                // PoC (사실상 무료체험)

/**
 * 계약 정보 전체
 */
export interface ContractInfo {
  channel?: ContractChannel;    // 계약 채널
  payment?: PaymentMethod;      // 정산 방식
  billing?: BillingType;        // 과금 방식
  note?: string;                // 메모
}

// ============================================================================
// 레이블 정의
// ============================================================================

export const CONTRACT_CHANNEL_LABELS: Record<ContractChannel, string> = {
  naramarket_service: '나라장터 용역',
  naramarket_goods: '나라장터 물품',
  document: '서류계약',
  simple: '간편가입',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  prepaid_card: '카드 선불',
  prepaid_cash: '현금 선불',
  postpaid_cash: '현금 후불',
  auto_card: '카드 자동결제',
  narabill: '나라빌',
};

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  usage: '종량제',
  fixed: '월정액',
  poc: 'PoC',
};

// ============================================================================
// 색상 정의
// ============================================================================

export const CONTRACT_CHANNEL_COLORS: Record<ContractChannel, { bg: string; text: string; border: string }> = {
  naramarket_service: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  naramarket_goods: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  document: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  simple: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { bg: string; text: string; border: string }> = {
  prepaid_card: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  prepaid_cash: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  postpaid_cash: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  auto_card: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  narabill: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
};

export const BILLING_TYPE_COLORS: Record<BillingType, { bg: string; text: string; border: string }> = {
  usage: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  fixed: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  poc: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

// ============================================================================
// 설명 텍스트
// ============================================================================

export const CONTRACT_CHANNEL_DESC: Record<ContractChannel, string> = {
  naramarket_service: '국가계약법에 따른 공식 전자 조달 시스템 (용역)',
  naramarket_goods: 'GS인증 기반 중소기업우선구매제도 (물품)',
  document: '표준이용계약서를 통한 직접 수의계약',
  simple: '이용약관 동의로 신속하게 서비스 개시',
};

export const PAYMENT_METHOD_DESC: Record<PaymentMethod, string> = {
  prepaid_card: '법인카드로 적립금 충전 후 차감',
  prepaid_cash: '세금계산서 발행 후 현금 입금으로 충전',
  postpaid_cash: '매월 사용량 기반 세금계산서 발행',
  auto_card: '등록된 법인카드로 매월 자동 결제',
  narabill: '나라빌 시스템으로 전자 청구서 발송',
};

export const BILLING_TYPE_DESC: Record<BillingType, string> = {
  usage: '실제 사용량(API 호출)에 따라 과금',
  fixed: '월 고정 요금제',
  poc: '시범운영/무료체험 (10만원 미만)',
};

// ============================================================================
// 대표 사례 (sample.md 기반)
// ============================================================================

export const CONTRACT_EXAMPLES: Record<string, string[]> = {
  // 나라장터 용역 + 후불
  'naramarket_service+postpaid_cash+usage': ['창원시청', '성동구청', '부산교육청'],
  // 나라장터 물품 + 선불
  'naramarket_goods+prepaid_cash+usage': ['서울시교육청'],
  // 서류계약 + 카드선불
  'document+prepaid_card+usage': ['울산교육청'],
  // 서류계약 + 현금선불
  'document+prepaid_cash+usage': ['국민체육진흥공단'],
  // 서류계약 + 현금후불
  'document+postpaid_cash+usage': ['강남구청', '성북구청', '강서구청', '장성군청', '하동군청'],
  // 간편가입 + 카드자동결제
  'simple+auto_card+usage': ['서귀포시청', '제주시청'],
  // 간편가입 + 나라빌
  'simple+narabill+usage': ['통일부'],
};

/**
 * 고객사 데이터 인터페이스
 */
export interface Client {
  name: string;
  region?: string;
  subRegion?: string;
  charge: number;
  usage: number;
  activeUsers?: number;   // 활성사용자수
  totalUsers?: number;    // 전체가입자수
}

// 교육청 (시/도 단위)
export const educationData: Client[] = [
  { name: "서울시교육청", region: "서울특별시", charge: 106292168, usage: 534491, activeUsers: 9314, totalUsers: 39249 },
  { name: "경상북도교육청", region: "경상북도", charge: 57704414, usage: 240524, activeUsers: 3152, totalUsers: 6702 },
  { name: "전라남도교육청", region: "전라남도", charge: 19096923, usage: 70416, activeUsers: 1179, totalUsers: 2680 },
  { name: "부산교육청", region: "부산광역시", charge: 14749784, usage: 104585, activeUsers: 3731, totalUsers: 24021 },
  { name: "울산교육청", region: "울산광역시", charge: 1910508, usage: 6490, activeUsers: 362, totalUsers: 457 },
  { name: "세종특별자치시교육청", region: "세종특별자치시", charge: 92657, usage: 379 },
  { name: "충청북도교육청", region: "충청북도", charge: 2983, usage: 21 },
  { name: "대전광역시교육청", region: "대전광역시", charge: 1794, usage: 13, totalUsers: 58 },
  { name: "인천광역시교육청(Demo)", region: "인천광역시", charge: 883, usage: 3 },
];

// 중앙행정기관
export const centralGovData: Client[] = [
  { name: "기후부", region: "세종특별자치시", charge: 2304660, usage: 23565 },
  { name: "통일부", region: "서울특별시", charge: 440601, usage: 2220 },
  { name: "농림축산검역본부 동물질병관리부", region: "경기도", subRegion: "김천시", charge: 335903, usage: 720 },
  { name: "농림축산검역본부 영남지역본부", region: "경상북도", charge: 292824, usage: 1461 },
  { name: "농림축산검역본부 식물검역부", region: "경기도", charge: 214686, usage: 1112 },
  { name: "농림축산검역본부 인천공항지역본부", region: "인천광역시", charge: 132047, usage: 301 },
  { name: "농림축산검역본부 서울지역본부", region: "서울특별시", charge: 91148, usage: 250 },
  { name: "농림축산검역본부 중부지역본부", region: "경기도", charge: 72516, usage: 190 },
  { name: "농림축산검역본부 호남지역본부", region: "전라북도", charge: 58736, usage: 161 },
  { name: "농림축산검역본부", region: "경기도", subRegion: "김천시", charge: 32587, usage: 371 },
  { name: "농림축산검역본부 제주지역본부", region: "제주특별자치도", charge: 17186, usage: 154 },
  { name: "대한민국정부", region: "서울특별시", charge: 243, usage: 7 },
];

// 시/도청 (광역 지자체)
export const provinceGovData: Client[] = [
  { name: "충청북도", region: "충청북도", charge: 34317, usage: 268 },
  { name: "경상남도청", region: "경상남도", charge: 15462, usage: 27 },
];

// 지자체 (시/군/구 - 기초 지자체)
export const localGovData: Client[] = [
  { name: "수원특례시청", region: "경기도", subRegion: "수원시", charge: 10287387, usage: 54714 },
  { name: "창원특례시", region: "경상남도", subRegion: "창원시", charge: 9714009, usage: 73385 },
  { name: "강동구청", region: "서울특별시", subRegion: "강동구", charge: 3993167, usage: 24797 },
  { name: "서초구청", region: "서울특별시", subRegion: "서초구", charge: 3973222, usage: 20281 },
  { name: "영등포구청", region: "서울특별시", subRegion: "영등포구", charge: 3108248, usage: 18033 },
  { name: "성북구청", region: "서울특별시", subRegion: "성북구", charge: 2793432, usage: 20618 },
  { name: "장성군청", region: "전라남도", subRegion: "장성군", charge: 2497221, usage: 14979 },
  { name: "광주광역시 동구청", region: "광주광역시", subRegion: "동구", charge: 2236987, usage: 13861 },
  { name: "성동구청", region: "서울특별시", subRegion: "성동구", charge: 2153298, usage: 20775 },
  { name: "음성군청", region: "충청북도", subRegion: "음성군", charge: 1986386, usage: 17770 },
  { name: "송파구청", region: "서울특별시", subRegion: "송파구", charge: 1952891, usage: 13380 },
  { name: "동작구청", region: "서울특별시", subRegion: "동작구", charge: 1718474, usage: 14304 },
  { name: "사천시", region: "경상남도", subRegion: "사천시", charge: 1166959, usage: 8726 },
  { name: "강남구청", region: "서울특별시", subRegion: "강남구", charge: 1134954, usage: 10595 },
  { name: "광진구청", region: "서울특별시", subRegion: "광진구", charge: 1115933, usage: 13341 },
  { name: "강서구청", region: "서울특별시", subRegion: "강서구", charge: 1083216, usage: 8744 },
  { name: "서산시청", region: "충청남도", subRegion: "서산시", charge: 932163, usage: 9733 },
  { name: "남해군청", region: "경상남도", subRegion: "남해군", charge: 881206, usage: 7859 },
  { name: "하동군", region: "경상남도", subRegion: "하동군", charge: 767328, usage: 6910 },
  { name: "광양시청", region: "전라남도", subRegion: "광양시", charge: 650583, usage: 10368 },
  { name: "대전광역시 중구", region: "대전광역시", subRegion: "중구", charge: 630397, usage: 2301 },
  { name: "용산구청", region: "서울특별시", subRegion: "용산구", charge: 565038, usage: 2607 },
  { name: "옥천군청", region: "충청북도", subRegion: "옥천군", charge: 417395, usage: 2209 },
  { name: "의왕시청", region: "경기도", subRegion: "의왕시", charge: 306002, usage: 9685 },
  { name: "동작구청+", region: "서울특별시", subRegion: "동작구", charge: 98350, usage: 243 },
  { name: "금천구의회", region: "서울특별시", subRegion: "금천구", charge: 86762, usage: 451 },
  { name: "괴산군청", region: "충청북도", subRegion: "괴산군", charge: 74864, usage: 200 },
  { name: "군포시청", region: "경기도", subRegion: "군포시", charge: 34753, usage: 314 },
  { name: "증평군청", region: "충청북도", subRegion: "증평군", charge: 31499, usage: 172 },
  { name: "양산시청", region: "경상남도", subRegion: "양산시", charge: 28905, usage: 363 },
  { name: "서초구의회", region: "서울특별시", subRegion: "서초구", charge: 27090, usage: 175 },
  { name: "부여군청", region: "충청남도", subRegion: "부여군", charge: 26628, usage: 80 },
  { name: "서귀포시", region: "제주특별자치도", subRegion: "서귀포시", charge: 25274, usage: 177 },
  { name: "금천구청", region: "서울특별시", subRegion: "금천구", charge: 18078, usage: 23 },
  { name: "강진군청", region: "전라남도", subRegion: "강진군", charge: 17419, usage: 100 },
  { name: "강릉시청", region: "강원특별자치도", subRegion: "강릉시", charge: 10718, usage: 41 },
  { name: "은평구청", region: "서울특별시", subRegion: "은평구", charge: 8551, usage: 60 },
  { name: "강서구의회", region: "서울특별시", subRegion: "강서구", charge: 7918, usage: 40 },
  { name: "안양시청", region: "경기도", subRegion: "안양시", charge: 4434, usage: 53 },
  { name: "노원구청", region: "서울특별시", subRegion: "노원구", charge: 2646, usage: 28 },
  { name: "신안군청", region: "전라남도", subRegion: "신안군", charge: 55, usage: 1 },
  { name: "아산시청", region: "충청남도", subRegion: "아산시", charge: 12, usage: 1 },
];

// 공공기관
export const publicInstitutionData: Client[] = [
  { name: "국립공원공단", region: "강원특별자치도", charge: 4206435, usage: 15791 },
  { name: "서울경제진흥원", region: "서울특별시", charge: 3326466, usage: 14718 },
  { name: "제주개발공사", region: "제주특별자치도", charge: 3027877, usage: 19331 },
  { name: "세종시설관리공단", region: "세종특별자치시", charge: 1087748, usage: 4562 },
  { name: "우체국금융개발원", region: "서울특별시", charge: 641929, usage: 2853 },
  { name: "한국개발연구원", region: "세종특별자치시", charge: 446931, usage: 1527 },
  { name: "한국원자력환경복원연구원", region: "대전광역시", charge: 375383, usage: 1302 },
  { name: "남북하나재단", region: "서울특별시", charge: 333638, usage: 2334 },
  { name: "서울예술단", region: "서울특별시", charge: 322746, usage: 1680 },
  { name: "서울투자진흥재단", region: "서울특별시", charge: 284242, usage: 1860 },
  { name: "노원구시설관리공단", region: "서울특별시", subRegion: "노원구", charge: 264996, usage: 1209 },
  { name: "한국전기안전공사", region: "전라북도", charge: 248715, usage: 1453 },
  { name: "경남소방", region: "경상남도", charge: 198384, usage: 2047 },
  { name: "남북교류협력지원협회", region: "서울특별시", charge: 154581, usage: 998 },
  { name: "스포츠가치센터", region: "서울특별시", charge: 126177, usage: 462 },
  { name: "소마미술관", region: "서울특별시", charge: 119038, usage: 571 },
  { name: "성동구도시관리공단", region: "서울특별시", subRegion: "성동구", charge: 111099, usage: 1294 },
  { name: "대구2.28기념학생도서관", region: "대구광역시", charge: 100288, usage: 765 },
  { name: "국제개발협력센터", region: "세종특별자치시", charge: 148110, usage: 181 },
  { name: "한국산업은행", region: "서울특별시", charge: 84727, usage: 354 },
  { name: "하남도시공사", region: "경기도", subRegion: "하남시", charge: 60272, usage: 443 },
  { name: "한국상하수도협회", region: "서울특별시", charge: 37653, usage: 122 },
  { name: "시립도서관", region: "서울특별시", charge: 24063, usage: 110 },
  { name: "한국농수산식품유통공사", region: "전라남도", charge: 19292, usage: 62 },
  { name: "공무원연금공단", region: "제주특별자치도", charge: 18576, usage: 221 },
  { name: "지역스포츠과학지원센터", region: "서울특별시", charge: 17433, usage: 76 },
  { name: "사립학교교직원연금공단", region: "제주특별자치도", charge: 17096, usage: 171 },
  { name: "전주시설공단", region: "전라북도", subRegion: "전주시", charge: 16945, usage: 123 },
  { name: "대전연구원", region: "대전광역시", charge: 16796, usage: 96 },
  { name: "차세대스포츠과학지원센터", region: "서울특별시", charge: 15672, usage: 199 },
  { name: "광주광역시도시공사", region: "광주광역시", charge: 13025, usage: 96 },
  { name: "국가대표스포츠과학지원센터", region: "서울특별시", charge: 12749, usage: 80 },
  { name: "강북구도시관리공단", region: "서울특별시", subRegion: "강북구", charge: 11693, usage: 173 },
  { name: "도서관운영사무소", region: "경기도", charge: 11159, usage: 28 },
  { name: "서부보건소", region: "서울특별시", charge: 11075, usage: 232 },
  { name: "수원시정연구원", region: "경기도", subRegion: "수원시", charge: 10739, usage: 40 },
  { name: "동부보건소", region: "서울특별시", charge: 7897, usage: 132 },
  { name: "경정훈련원", region: "경기도", charge: 4610, usage: 94 },
  { name: "대구체력인증센터", region: "대구광역시", charge: 4253, usage: 81 },
  { name: "서귀포공립미술관", region: "제주특별자치도", subRegion: "서귀포시", charge: 4185, usage: 117 },
  { name: "인천교통공사", region: "인천광역시", charge: 4083, usage: 35 },
  { name: "노사발전재단", region: "서울특별시", charge: 3520, usage: 14 },
  { name: "한전KPS", region: "전라남도", charge: 2231, usage: 28 },
  { name: "서귀포예술의전당", region: "제주특별자치도", subRegion: "서귀포시", charge: 2223, usage: 74 },
  { name: "한국마사회", region: "경기도", charge: 1154, usage: 35 },
  { name: "불법대응센터", region: "서울특별시", charge: 700, usage: 14 },
];

// 민간기업
export const privateData: Client[] = [
  { name: "바로AI", charge: 39037887, usage: 186264 },
  { name: "모노솔루션", charge: 24761, usage: 300 },
  { name: "한국지역난방기술", charge: 4131, usage: 44 },
  { name: "요거트월드", charge: 1473, usage: 9 },
  { name: "에콜리안제천지사", charge: 92, usage: 3 },
  { name: "AI3", charge: 58, usage: 2 },
];

// 대학교
export const universityData: Client[] = [
  { name: "숭의여자대학교", region: "서울특별시", charge: 31799, usage: 100 },
];

// 유틸리티 함수
export function formatMoney(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억원';
  if (n >= 10000) return Math.round(n / 10000).toLocaleString() + '만원';
  return n.toLocaleString() + '원';
}

export interface AggregatedData {
  charge: number;
  usage: number;
  items: Client[];
}

export function aggregateByRegion(data: Client[]): Record<string, AggregatedData> {
  const result: Record<string, AggregatedData> = {};
  data.forEach(item => {
    const region = item.region || '기타';
    if (!result[region]) {
      result[region] = { charge: 0, usage: 0, items: [] };
    }
    result[region].charge += item.charge;
    result[region].usage += item.usage;
    result[region].items.push(item);
  });
  return result;
}

export function aggregateBySubRegion(data: Client[]): Record<string, AggregatedData> {
  const result: Record<string, AggregatedData> = {};
  data.forEach(item => {
    const key = item.subRegion || item.region || '기타';
    if (!result[key]) {
      result[key] = { charge: 0, usage: 0, items: [] };
    }
    result[key].charge += item.charge;
    result[key].usage += item.usage;
    result[key].items.push(item);
  });
  return result;
}

// 기존 호환성을 위한 alias
export const localData = localGovData;

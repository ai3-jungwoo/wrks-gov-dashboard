/**
 * 지역명 매핑 데이터
 *
 * GeoJSON 데이터는 영어로 되어있고, 우리 고객 데이터는 한글로 되어있어서
 * 양방향 매핑이 필요합니다.
 *
 * @file regionMappings.ts
 * @description 영어 ↔ 한글 지역명 변환을 위한 매핑 테이블
 */

/**
 * 시/도 단위 영어 → 한글 매핑
 * GeoJSON의 NAME_1 필드와 매핑됩니다.
 */
export const PROVINCE_EN_TO_KR: Record<string, string> = {
  'Seoul': '서울특별시',
  'Busan': '부산광역시',
  'Daegu': '대구광역시',
  'Incheon': '인천광역시',
  'Gwangju': '광주광역시',
  'Daejeon': '대전광역시',
  'Ulsan': '울산광역시',
  'Sejong': '세종특별자치시',
  'Gyeonggi-do': '경기도',
  'Gangwon-do': '강원특별자치도',
  'Chungcheongbuk-do': '충청북도',
  'Chungcheongnam-do': '충청남도',
  'Jeollabuk-do': '전북특별자치도',
  'Jeollanam-do': '전라남도',
  'Gyeongsangbuk-do': '경상북도',
  'Gyeongsangnam-do': '경상남도',
  'Jeju': '제주특별자치도',
};

/**
 * 시/도 단위 한글 → 영어 매핑 (역매핑)
 */
export const PROVINCE_KR_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_EN_TO_KR).map(([en, kr]) => [kr, en])
);

/**
 * 시/군/구 단위 한글 → 영어 매핑
 * GeoJSON의 NAME_2 필드와 매핑됩니다.
 *
 * 참고: 동일한 이름의 구(예: 동구, 중구, 서구 등)가 여러 시/도에 존재할 수 있어
 * 실제 매칭 시에는 시/도 정보와 함께 사용해야 합니다.
 */
export const MUNICIPALITY_KR_TO_EN: Record<string, string> = {
  // 경기도
  '수원시': 'Suwon',
  '성남시': 'Seongnam',
  '안양시': 'Anyang',
  '안산시': 'Ansan',
  '용인시': 'Yongin',
  '부천시': 'Bucheon',
  '광명시': 'Gwangmyeong',
  '평택시': 'Pyeongtaek',
  '과천시': 'Gwacheon',
  '오산시': 'Osan',
  '시흥시': 'Siheung',
  '군포시': 'Gunpo',
  '의왕시': 'Uiwang',
  '하남시': 'Hanam',
  '이천시': 'Icheon',
  '안성시': 'Anseong',
  '김포시': 'Gimpo',
  '화성시': 'Hwaseong',
  '광주시': 'Gwangju-si',
  '여주시': 'Yeoju',
  '양평군': 'Yangpyeong',
  '고양시': 'Goyang',
  '파주시': 'Paju',
  '의정부시': 'Uijeongbu',
  '동두천시': 'Dongducheon',
  '양주시': 'Yangju',
  '포천시': 'Pocheon',
  '구리시': 'Guri',
  '남양주시': 'Namyangju',
  '가평군': 'Gapyeong',
  '연천군': 'Yeoncheon',

  // 서울특별시
  '종로구': 'Jongno',
  '중구': 'Jung',
  '용산구': 'Yongsan',
  '성동구': 'Seongdong',
  '광진구': 'Gwang-jin',
  '동대문구': 'Dongdaemun',
  '중랑구': 'Jungnang',
  '성북구': 'Seongbuk',
  '강북구': 'Gangbuk',
  '도봉구': 'Dobong',
  '노원구': 'Nowon',
  '은평구': 'Eun-pyeong',
  '서대문구': 'Seodaemun',
  '마포구': 'Mapo',
  '양천구': 'Yangcheon',
  '강서구': 'Gangseo',
  '구로구': 'Guro',
  '금천구': 'Geum-cheon',
  '영등포구': 'Yeongdeungpo',
  '동작구': 'Dongjak',
  '관악구': 'Gwanak',
  '서초구': 'Seocho',
  '강남구': 'Gangnam',
  '송파구': 'Songpa',
  '강동구': 'Gandong',

  // 부산광역시
  '해운대구': 'Haeundae',
  '사하구': 'Saha',
  '금정구': 'Geumjeong',
  '북구': 'Buk',
  '사상구': 'Sasang',
  '연제구': 'Yeonje',
  '수영구': 'Suyeong',
  '남구': 'Nam',
  '동구': 'Dong',
  '서구': 'Seo',
  '영도구': 'Yeongdo',
  '부산진구': 'Busanjin',
  '기장군': 'Gijang',

  // 경상남도
  '창원시': 'Changwon',
  '진주시': 'Jinju',
  '통영시': 'Tongyeong',
  '사천시': 'Sacheon',
  '김해시': 'Gimhae',
  '밀양시': 'Miryang',
  '거제시': 'Geoje',
  '양산시': 'Yangsan',
  '의령군': 'Uiryeong',
  '함안군': 'Haman',
  '창녕군': 'Changnyeong',
  '고성군(경남)': 'Goseong',
  '남해군': 'Namhae',
  '하동군': 'Hadong',
  '산청군': 'Sancheong',
  '함양군': 'Hamyang',
  '거창군': 'Geochang',
  '합천군': 'Hapcheon',

  // 충청북도
  '청주시': 'Cheongju',
  '충주시': 'Chungju',
  '제천시': 'Jecheon',
  '보은군': 'Boeun',
  '옥천군': 'Okcheon',
  '영동군': 'Yeongdong',
  '증평군': 'Jeungpyeong',
  '진천군': 'Jincheon',
  '괴산군': 'Goesan',
  '음성군': 'Eumseong',
  '단양군': 'Danyang',

  // 충청남도
  '천안시': 'Cheonan',
  '공주시': 'Gongju',
  '보령시': 'Boryeong',
  '아산시': 'Asan',
  '서산시': 'Seosan',
  '논산시': 'Nonsan',
  '계룡시': 'Gyeryong',
  '당진시': 'Dangjin',
  '금산군': 'Geumsan',
  '부여군': 'Buyeo',
  '서천군': 'Seocheon',
  '청양군': 'Cheongyang',
  '홍성군': 'Hongseong',
  '예산군': 'Yesan',
  '태안군': 'Taean',

  // 전라남도
  '목포시': 'Mokpo',
  '여수시': 'Yeosu',
  '순천시': 'Suncheon',
  '나주시': 'Naju',
  '광양시': 'Gwangyang',
  '담양군': 'Damyang',
  '곡성군': 'Gokseong',
  '구례군': 'Gurye',
  '고흥군': 'Goheung',
  '보성군': 'Boseong',
  '화순군': 'Hwasun',
  '장흥군': 'Jangheung',
  '강진군': 'Gangjin',
  '해남군': 'Haenam',
  '영암군': 'Yeongam',
  '무안군': 'Muan',
  '함평군': 'Hampyeong',
  '영광군': 'Yeonggwang',
  '장성군': 'Jangseong',
  '완도군': 'Wando',
  '진도군': 'Jindo',
  '신안군': 'Sinan',

  // 경상북도
  '포항시': 'Pohang',
  '경주시': 'Gyeongju',
  '김천시': 'Gimcheon',
  '안동시': 'Andong',
  '구미시': 'Gumi',
  '영주시': 'Yeongju',
  '영천시': 'Yeongcheon',
  '상주시': 'Sangju',
  '문경시': 'Mungyeong',
  '경산시': 'Gyeongsan',
  '군위군': 'Gunwi',
  '의성군': 'Uiseong',
  '청송군': 'Cheongsong',
  '영양군': 'Yeongyang',
  '영덕군': 'Yeongdeok',
  '청도군': 'Cheongdo',
  '고령군': 'Goryeong',
  '성주군': 'Seongju',
  '칠곡군': 'Chilgok',
  '예천군': 'Yecheon',
  '봉화군': 'Bonghwa',
  '울진군': 'Uljin',
  '울릉군': 'Ulleung',

  // 강원특별자치도
  '춘천시': 'Chuncheon',
  '원주시': 'Wonju',
  '강릉시': 'Gangneung',
  '동해시': 'Donghae',
  '태백시': 'Taebaek',
  '속초시': 'Sokcho',
  '삼척시': 'Samcheok',
  '홍천군': 'Hongcheon',
  '횡성군': 'Hoengseong',
  '영월군': 'Yeongwol',
  '평창군': 'Pyeongchang',
  '정선군': 'Jeongseon',
  '철원군': 'Cheorwon',
  '화천군': 'Hwacheon',
  '양구군': 'Yanggu',
  '인제군': 'Inje',
  '고성군(강원)': 'Goseong-gun',
  '양양군': 'Yangyang',

  // 제주특별자치도
  '제주시': 'Jeju-si',
  '서귀포시': 'Seogwipo',

  // 광역시 구 (추가 매핑)
  // 대전
  '유성구': 'Yuseong',
  '대덕구': 'Daedeok',

  // 대구
  '달서구': 'Dalseo',
  '달성군': 'Dalseong',
  '수성구': 'Suseong',

  // 인천
  '연수구': 'Yeonsu',
  '남동구': 'Namdong',
  '부평구': 'Bupyeong',
  '계양구': 'Gyeyang',
  '미추홀구': 'Michuhol',
  '옹진군': 'Ongjin',
  '강화군': 'Ganghwa',

  // 광주
  '광산구': 'Gwangsan',

  // 울산
  '울주군': 'Ulju',
};

/**
 * 시/군/구 단위 영어 → 한글 매핑 (역매핑)
 */
export const MUNICIPALITY_EN_TO_KR: Record<string, string> = Object.fromEntries(
  Object.entries(MUNICIPALITY_KR_TO_EN).map(([kr, en]) => [en, kr])
);

/**
 * 시/도 약어 → 영어 전체명 매핑
 * 데이터에서 '경남', '충북' 등으로 되어있을 때 사용
 */
export const PROVINCE_ABBR_TO_EN: Record<string, string> = {
  '서울': 'Seoul',
  '부산': 'Busan',
  '대구': 'Daegu',
  '인천': 'Incheon',
  '광주': 'Gwangju',
  '대전': 'Daejeon',
  '울산': 'Ulsan',
  '세종': 'Sejong',
  '경기': 'Gyeonggi-do',
  '강원': 'Gangwon-do',
  '충북': 'Chungcheongbuk-do',
  '충남': 'Chungcheongnam-do',
  '전북': 'Jeollabuk-do',
  '전남': 'Jeollanam-do',
  '경북': 'Gyeongsangbuk-do',
  '경남': 'Gyeongsangnam-do',
  '제주': 'Jeju',
};

/**
 * 영어 지역명을 한글로 변환
 * @param englishName GeoJSON에서 가져온 영어 지역명
 * @param type 'province' | 'municipality'
 * @returns 한글 지역명 (매핑이 없으면 원본 반환)
 */
export function toKoreanName(englishName: string, type: 'province' | 'municipality' = 'province'): string {
  if (type === 'province') {
    return PROVINCE_EN_TO_KR[englishName] || englishName;
  }
  return MUNICIPALITY_EN_TO_KR[englishName] || englishName;
}

/**
 * 한글 지역명을 영어로 변환
 * @param koreanName 한글 지역명
 * @param type 'province' | 'municipality'
 * @returns 영어 지역명 (매핑이 없으면 원본 반환)
 */
export function toEnglishName(koreanName: string, type: 'province' | 'municipality' = 'province'): string {
  if (type === 'province') {
    // 먼저 약어 확인
    if (PROVINCE_ABBR_TO_EN[koreanName]) {
      return PROVINCE_ABBR_TO_EN[koreanName];
    }
    return PROVINCE_KR_TO_EN[koreanName] || koreanName;
  }
  return MUNICIPALITY_KR_TO_EN[koreanName] || koreanName;
}

/**
 * 지역명에서 접미사(시, 군, 구, 특별시 등)를 제거
 * 부분 매칭 시 사용
 */
export function cleanRegionName(name: string): string {
  return name.replace(/특별시|광역시|특별자치시|특별자치도|도|시|군|구/g, '').trim();
}

/**
 * 두 지역명이 같은 지역을 가리키는지 확인 (부분 매칭)
 * @param name1 첫 번째 지역명
 * @param name2 두 번째 지역명
 * @returns 같은 지역이면 true
 */
export function isSameRegion(name1: string, name2: string): boolean {
  if (name1 === name2) return true;

  const clean1 = cleanRegionName(name1);
  const clean2 = cleanRegionName(name2);

  return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
}

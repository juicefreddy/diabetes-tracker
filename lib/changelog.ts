export type ChangeType = 'feature' | 'fix' | 'initial'

export interface ChangelogEntry {
  version: string
  date: string       // YYYY-MM-DD HH:MM (KST)
  type: ChangeType
  title: string
  items: string[]
}

export const CURRENT_VERSION = 'v1.4.2'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.4.2',
    date: '2026-05-30 10:30',
    type: 'fix',
    title: '시간 저장 오류 근본 수정',
    items: [
      '브라우저 Intl API 미지원으로 발생하던 9시간 오차 완전 해결',
      '타임존 계산을 고정 UTC 오프셋 산술 방식으로 교체 (브라우저 호환성 문제 제거)',
      '서울(UTC+9) 기준 09:17 입력 시 정확히 00:17 UTC로 저장됨',
    ],
  },
  {
    version: 'v1.4.1',
    date: '2026-05-30 09:56',
    type: 'fix',
    title: '시간대 저장·표시 로직 개선',
    items: [
      '혈당·식단 기록 시간이 00:17로 잘못 표시되던 문제 수정',
      '입력한 시간을 설정된 시간대 기준으로 정확히 UTC 변환하여 저장',
      '시간대 설정을 SSR 렌더 시점부터 즉시 적용',
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-05-30 09:22',
    type: 'feature',
    title: '표준시간대 설정 추가',
    items: [
      '프로필 → 시간대 설정 메뉴 추가 (기본값: 서울 UTC+9)',
      '혈당·식단 기록 시간 표시를 선택된 시간대 기준으로 변환',
      '서울·도쿄·뉴욕·런던·UTC 등 주요 시간대 선택 가능',
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-05-30 08:56',
    type: 'feature',
    title: '운동 기록 사진 자동 입력 (무료 OCR)',
    items: [
      '운동 앱 스크린샷을 올리면 시간·거리·칼로리·심박수 자동 입력',
      '브라우저 내장 Tesseract.js OCR 사용 — API 비용 없음',
      '다크모드 스크린샷 자동 감지 후 색상 반전으로 인식률 향상',
      '애플 피트니스, 삼성 헬스 등 다양한 형식 지원',
    ],
  },
  {
    version: 'v1.2.1',
    date: '2026-05-29 23:58',
    type: 'fix',
    title: '운동 소수점 입력 허용',
    items: [
      '운동 거리·시간 등 모든 수치 입력 필드에서 소수점 입력 가능',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-05-29 23:40',
    type: 'feature',
    title: '날짜/시간 입력 개선 및 기록 시간 표시',
    items: [
      '혈당·식단 입력 화면에 시간 입력 필드 추가 (현재 시각 자동 입력)',
      '혈당 기록 목록에 측정 시간 표시',
      '식단 기록 목록에 식사 시간 표시',
      'iOS에서 날짜 입력 텍스트가 잘리던 스타일 버그 수정',
    ],
  },
  {
    version: 'v1.1.1',
    date: '2026-05-29 22:44',
    type: 'fix',
    title: '날짜 계산 전체 로컬 기준으로 통일',
    items: [
      '운동 페이지 AI 분석 표시 완전 제거',
      '트렌드 페이지 날짜 범위 계산을 UTC 대신 로컬 시간 기준으로 수정',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-05-29 22:30',
    type: 'fix',
    title: '날짜 버그 수정 및 AI 분석 기능 제거',
    items: [
      '접속 시 어제 날짜가 표시되고 오늘 버튼이 오작동하던 버그 수정 (UTC→로컬 날짜 기준)',
      '대시보드 AI 일일 분석 기능 제거 (별도 API 크레딧 불필요)',
      '식단 페이지 AI 식단 분석 버튼 제거',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-05-29 14:08',
    type: 'initial',
    title: '첫 출시',
    items: [
      '혈당 기록 (공복·아침식후·점심식후·저녁식후·취침전)',
      '식단 기록 (밥 섭취량, 방울토마토·식사순서 체크)',
      '운동 기록 (종류·시간·거리·심박수·칼로리·강도)',
      '검사결과 기록 (HbA1c, 공복혈당, 지질, 크레아티닌)',
      '대시보드 7일 혈당 추이 차트',
      '트렌드 분석 (공복·식후 혈당, HbA1c 예측, 운동량)',
      'PWA 지원 (홈 화면 추가 가능)',
    ],
  },
]

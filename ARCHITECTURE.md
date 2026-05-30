# 혈당 트래커 — 아키텍처 문서

> **버전** v1.4.2 · **최종 수정** 2026-05-30

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [전체 구성도](#3-전체-구성도)
4. [디렉터리 구조](#4-디렉터리-구조)
5. [페이지별 상세 설명](#5-페이지별-상세-설명)
6. [데이터베이스 스키마](#6-데이터베이스-스키마)
7. [공통 라이브러리](#7-공통-라이브러리)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [차트 컴포넌트](#9-차트-컴포넌트)
10. [타임존 처리 방식](#10-타임존-처리-방식)
11. [이미지 OCR 파싱 흐름](#11-이미지-ocr-파싱-흐름)
12. [PWA 설정](#12-pwa-설정)
13. [환경 변수](#13-환경-변수)
14. [버전 이력](#14-버전-이력)

---

## 1. 프로젝트 개요

당뇨 환자를 위한 **자기 관리 트래킹 앱**. 혈당·식단·운동·검사 결과를 기록하고 트렌드를 분석한다.

| 항목 | 내용 |
|------|------|
| 대상 사용자 | 한국어권 당뇨(제2형) 환자, 1인 사용 |
| 배포 플랫폼 | Vercel (Next.js) + 스마트폰 홈 화면 설치 (PWA) |
| 데이터 저장 | Supabase (PostgreSQL) |
| UI 언어 | 한국어 |
| 인증 | 없음 (단일 사용자, 공개 Anon Key 사용) |

---

## 2. 기술 스택

```
┌─────────────────────────────────────────────────────┐
│  프론트엔드                                          │
│  Next.js 16.2.6  ·  React 19.2.4  ·  TypeScript 5  │
│  Tailwind CSS v4  ·  Recharts 3.8.1                 │
├─────────────────────────────────────────────────────┤
│  백엔드 / 데이터                                     │
│  Supabase (PostgreSQL + REST API)                   │
│  Next.js API Routes (Claude AI 연동)                │
├─────────────────────────────────────────────────────┤
│  외부 서비스                                         │
│  Anthropic Claude API (식단·일일 AI 분석, 현재 비활성)│
│  Tesseract.js 7.0 (브라우저 OCR — 한국어+영어)       │
└─────────────────────────────────────────────────────┘
```

---

## 3. 전체 구성도

```
사용자 (스마트폰 브라우저 / PWA)
          │
          │  HTTPS
          ▼
┌─────────────────────────────────────────────────────┐
│                    Vercel (CDN)                     │
│  Next.js 16 App Router                              │
│                                                     │
│  Pages (모두 'use client')                          │
│  ┌──────┐ ┌────────┐ ┌───────┐ ┌──────┐ ┌───────┐ │
│  │대시   │ │ 혈당   │ │ 식단  │ │ 운동 │ │트렌드 │ │
│  │보드  │ │/glucose│ │/meals │ │/exer-│ │/trends│ │
│  │  /   │ │        │ │       │ │cise  │ │       │ │
│  └──────┘ └────────┘ └───────┘ └──────┘ └───────┘ │
│                                                     │
│  ┌───────────┐   ┌────────────────────────────────┐ │
│  │프로필     │   │  API Routes                    │ │
│  │/profile   │   │  /api/analyze-meal   (비활성)  │ │
│  │           │   │  /api/daily-analysis (비활성)  │ │
│  └───────────┘   └────────────────────────────────┘ │
│                           │                         │
│  lib/                     │ Anthropic SDK           │
│  ├─ supabase.ts           ▼                         │
│  ├─ timezone.ts   ┌──────────────┐                 │
│  ├─ utils.ts      │ Claude API   │                 │
│  ├─ types.ts      │ (claude-     │                 │
│  └─ parseWork-    │ sonnet-4-6)  │                 │
│     outImage.ts   └──────────────┘                 │
└─────────────────────────────────────────────────────┘
          │
          │  Supabase JS Client (Anon Key)
          ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)               │
│                                                     │
│  blood_glucose   meals   exercise                   │
│  patient_profiles        lab_results                │
└─────────────────────────────────────────────────────┘
```

**데이터 흐름 요약**

```
[사용자 입력]
     │
     ├─ 시간 입력 → localToUTCIso() → UTC 변환 → Supabase INSERT
     │
     └─ 기록 조회 ← formatTimeInTZ() ← UTC ← Supabase SELECT
```

---

## 4. 디렉터리 구조

```
diabetes-tracker/
│
├── app/                         # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃 (하단 내비게이션)
│   ├── page.tsx                 # 대시보드 (/)
│   ├── globals.css              # Tailwind + CSS 변수
│   │
│   ├── api/                     # 서버 사이드 API
│   │   ├── analyze-meal/
│   │   │   └── route.ts         # Claude AI 식단 분석
│   │   └── daily-analysis/
│   │       └── route.ts         # Claude AI 일일 총평
│   │
│   ├── components/
│   │   └── charts/
│   │       ├── GlucoseLineChart.tsx   # 혈당 꺾은선 차트
│   │       ├── MiniLineChart.tsx      # 7일 요약 스파크라인
│   │       └── ExerciseBarChart.tsx   # 운동 시간 막대 차트
│   │
│   ├── glucose/page.tsx         # 혈당 입력 & 기록
│   ├── meals/page.tsx           # 식단 입력 & 기록
│   ├── exercise/page.tsx        # 운동 입력 & OCR
│   ├── trends/page.tsx          # 트렌드 분석 & 통계
│   ├── labs/page.tsx            # 검사 결과 입력 & 이력
│   └── profile/page.tsx         # 프로필 & 타임존 설정
│
├── lib/                         # 공통 유틸리티
│   ├── types.ts                 # TypeScript 데이터 타입
│   ├── utils.ts                 # 혈당 판정, 날짜 포맷 등
│   ├── timezone.ts              # 타임존 변환 (UTC 오프셋 산술)
│   ├── supabase.ts              # Supabase 클라이언트 (Anon)
│   ├── supabase-server.ts       # Supabase 어드민 클라이언트
│   ├── parseWorkoutImage.ts     # 운동 이미지 OCR 파싱
│   └── changelog.ts             # 앱 버전 이력
│
└── public/
    ├── manifest.json            # PWA 매니페스트
    ├── icon-192.png
    └── icon-512.png
```

---

## 5. 페이지별 상세 설명

### 5-1. 대시보드 (`/`)

특정 날짜의 전체 데이터를 한눈에 조회하는 홈 화면.

```
┌─────────────────────────────┐
│  대시보드    ◀ 2026-05-30 ▶ │
│                             │
│  [공복] [아침후] [점심후] [저녁후]  ← blood_glucose
│   125    142     138    131       (색상 판정 포함)
│                             │
│  ── 7일 공복 혈당 추이 ──   ← MiniLineChart
│  ▁▃▅▄▆▃▅                   │
│                             │
│  오늘 운동 ─────────────    ← exercise
│  걷기 30분 · 2.5km          │
│                             │
│  오늘 식단 ─────────────    ← meals
│  아침: 현미밥, 닭가슴살...  │
└─────────────────────────────┘
```

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `blood_glucose`, `exercise`, `meals` |
| 쓰는 테이블 | 없음 (읽기 전용) |
| 특이사항 | 날짜 선택 시 해당 날짜 데이터 재조회, 차트는 `next/dynamic` (SSR 비활성) |

---

### 5-2. 혈당 (`/glucose`)

혈당 측정값 입력, 수정, 삭제 및 이력 조회.

```
[입력 탭]                    [기록 보기 탭]
──────────────               ──────────────────
날짜/시간 입력               5월 30일 (토)
측정 시점 선택               ┌────────────────┐
  공복 / 아침식후2h / ...    │ 아침식후2h  14:29│
혈당 수치 (mg/dL)            │ 142  🟡 주의    │
  [  142  ] 🟡 주의          ├────────────────┤
메모 (선택)                  │ 공복      07:15 │
[저장하기]                   │  98  ✅ 정상    │
                             └────────────────┘
```

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `blood_glucose` |
| 쓰는 테이블 | `blood_glucose` (INSERT / UPDATE / DELETE) |
| 핵심 로직 | `judgeGlucose()` → 정상/주의/위험 판정, `localToUTCIso()` → 저장 시각 UTC 변환 |

---

### 5-3. 식단 (`/meals`)

식사 기록 입력, 음식 목록 관리, 체크리스트.

```
[입력 탭]
──────────────────────────────
날짜 / 식사 시간
끼니: [아침] [점심] [저녁] [간식]
체크리스트:
  ☑ 🍅 방울토마토 먹었음
  ☐ ✅ 식사순서 지켰음 (채소→단백질→탄수화물)
밥 섭취량: [안먹음] [1/4] [반] [3/4] [1공기]
음식 목록:
  현미밥 ✕  닭가슴살 ✕  브로콜리 ✕
  [음식 추가 입력]  [추가]
[저장하기]
```

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `meals` |
| 쓰는 테이블 | `meals` (INSERT / UPDATE foods / DELETE) |
| 특이사항 | 음식은 배열(`text[]`)로 저장, 수정은 foods 배열만 변경 가능 |

---

### 5-4. 운동 (`/exercise`)

운동 기록 입력 (수동 또는 스크린샷 자동 파싱).

```
[입력 탭]
──────────────────────────────
[📷 운동 기록 사진으로 자동 입력]  ← Tesseract.js OCR
날짜
운동 종류: [걷기] [스테퍼] [밴드] [자전거] [기타]
시간대: [아침] [점심후] [저녁후] [저녁]
┌──────────┬──────────┐
│운동시간(분)│  거리(km) │
│    30    │    2.5   │
├──────────┼──────────┤
│평균심박(bpm)│  고도(m) │
│   125    │    45   │
└──────────┴──────────┘
칼로리(kcal): 280
강도: [낮음] [보통] [높음]
[저장하기]
```

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `exercise` |
| 쓰는 테이블 | `exercise` (INSERT / UPDATE / DELETE) |
| 특이사항 | `duration_minutes`, `avg_heart_rate`, `elevation`, `calories` → 정수 저장(Math.round), `distance_km` → 소수 허용 |

---

### 5-5. 트렌드 (`/trends`)

기간별 혈당·운동 통계 및 차트.

```
[30일] [90일] [전체]

┌─────────┬─────────┐
│7일 공복 │목표달성율│
│  106    │  71%   │
├─────────┼─────────┤
│최저/최고 │운동일수  │
│ 92/167  │  23일  │
└─────────┴─────────┘

예측 당화혈색소: 6.4%  ← (평균혈당 + 46.7) / 28.7

── 공복 혈당 추이 ─────  (GlucoseLineChart)
── 식후 혈당 추이 ─────  (GlucoseLineChart)
── 운동 시간 현황 ─────  (ExerciseBarChart)
```

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `blood_glucose`, `exercise` |
| 쓰는 테이블 | 없음 |
| 특이사항 | 날짜별 평균 계산, 누락 날짜 null 채움, 차트는 SSR 비활성 |

---

### 5-6. 검사 결과 (`/labs`)

혈액 검사 결과 입력 및 이력.

| 항목 | 목표 기준 |
|------|----------|
| 당화혈색소 (HbA1c) | < 7.0 % |
| 공복 혈당 | < 130 mg/dL |
| LDL 콜레스테롤 | < 100 mg/dL |
| HDL 콜레스테롤 | > 40 mg/dL (남) / > 50 mg/dL (여) |
| 중성지방 | < 150 mg/dL |
| 크레아티닌 | < 1.2 mg/dL |

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `lab_results` |
| 쓰는 테이블 | `lab_results` (INSERT만, 수정 없음) |

---

### 5-7. 프로필 (`/profile`)

환자 기본 정보 및 앱 설정.

| 항목 | 내용 |
|------|------|
| 읽는 테이블 | `patient_profiles` |
| 쓰는 테이블 | `patient_profiles` (INSERT or UPDATE — 레코드 1개 upsert 패턴) |
| 타임존 설정 | `localStorage`에 저장 (`userTimezone` 키) — Supabase에 저장하지 않음 |
| 표시 정보 | 버전(CURRENT_VERSION) + CHANGELOG 접기/펼치기 |

---

## 6. 데이터베이스 스키마

### blood_glucose

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| date | text | YYYY-MM-DD |
| time_point | text | fasting / after_breakfast / after_lunch / after_dinner / bedtime |
| value | integer | mg/dL |
| memo | text | 선택 입력 |
| created_at | timestamptz | UTC 저장 (앱에서 localToUTCIso로 변환) |

### meals

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| date | text | YYYY-MM-DD |
| meal_type | text | breakfast / lunch / dinner / snack |
| foods | text[] | 음식 이름 배열 |
| rice_amount | text | none / quarter / half / three_quarter / full |
| tomato_check | boolean | 방울토마토 체크 |
| meal_order_check | boolean | 식사 순서 체크 |
| ai_analysis | text | Claude 분석 결과 (현재 미사용) |
| created_at | timestamptz | |

### exercise

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| date | text | YYYY-MM-DD |
| type | text | walking / stepper / band / cycling / other |
| time_of_day | text | morning / after_lunch / after_dinner / evening |
| duration_minutes | integer | 운동 시간 (분) |
| distance_km | numeric | |
| avg_heart_rate | integer | bpm |
| elevation | integer | 고도 상승 (m) |
| intensity | text | low / medium / high |
| calories | integer | kcal |
| created_at | timestamptz | 저장 시각 (앱에서 new Date().toISOString()) |

### patient_profiles

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| diagnosis_date | text | YYYY-MM-DD |
| diabetes_type | text | 제1형 / 제2형 / 임신성 |
| height_cm | numeric | |
| weight_kg | numeric | |
| medications | text[] | 약물 목록 |
| comorbidities | text[] | 동반질환 목록 |
| protein_goal_g | numeric | 하루 단백질 목표 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### lab_results

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| date | text | YYYY-MM-DD |
| hba1c | numeric | % |
| fasting_glucose | numeric | mg/dL |
| ldl | numeric | mg/dL |
| hdl | numeric | mg/dL |
| triglycerides | numeric | mg/dL |
| creatinine | numeric | mg/dL |
| notes | text | |
| created_at | timestamptz | |

---

## 7. 공통 라이브러리

### `lib/utils.ts`

```
judgeGlucose(value, type)
  공복: <70 저혈당 · 70-99 정상 · 100-125 주의 · ≥126 위험
  식후: ≤140 정상 · 141-199 주의 · ≥200 위험
  반환: { label, bg(배경색), text(글자색) }

estimateHbA1c(avgGlucose)
  공식: (평균혈당 + 46.7) / 28.7
  반환: 소수점 1자리 문자열

formatDate(dateStr)
  "2026-05-30" → "5월 30일 (토)"

getTodayString()
  브라우저 로컬 시간 기준 YYYY-MM-DD

getTimePointLabel / getExerciseTypeLabel / getTimeOfDayLabel
  영어 enum → 한국어 레이블 변환
```

### `lib/timezone.ts`

타임존 변환의 모든 함수. `Intl` API 대신 **고정 UTC 오프셋 산술**을 사용한다 (브라우저 호환성 문제 해결).

```
TZ_OFFSETS (분 단위)
  Asia/Seoul  : +540 (UTC+9, DST 없음 — 정확)
  Asia/Tokyo  : +540
  Asia/Shanghai: +480
  America/New_York: -300
  America/Los_Angeles: -480
  Europe/London: 0
  UTC: 0

localToUTCIso(dateStr, timeStr, tz)
  사용자 입력 로컬 시각 → UTC ISO 문자열
  예) "2026-05-30", "14:29", "Asia/Seoul" → "2026-05-30T05:29:00.000Z"

formatTimeInTZ(iso, tz)
  UTC ISO → 표시용 "HH:MM"
  (Supabase가 Z 없이 반환 시 강제로 UTC 처리)

getCurrentTimeInTZ(tz)
  현재 시각 → "HH:MM" (기본값 입력용)

getTodayInTZ(tz)
  현재 날짜 → "YYYY-MM-DD"

getStoredTZ() / setStoredTZ(tz)
  localStorage "userTimezone" 키 읽기/쓰기
```

### `lib/types.ts`

TypeScript 인터페이스 정의.

```typescript
BloodGlucose · Meal · Exercise · PatientProfile · LabResult
GlucoseTimePoint · MealType · ExerciseType · TimeOfDay  ← 편의 타입 별칭
```

---

## 8. API 엔드포인트

> 현재 UI에서 비활성화 상태 (v1.1.0에서 API 크레딧 절약을 위해 제거). 라우트 파일은 유지.

### `POST /api/analyze-meal`

```
요청: { foods: string[], mealType: string, date: string }
응답: { analysis: string }

모델: claude-sonnet-4-6 · max_tokens: 1024
용도: 식단 영양 분석 및 혈당 영향 예측
```

### `POST /api/daily-analysis`

```
요청: { date, glucose[], meals[], exercise[] }
응답: { analysis: string }

모델: claude-sonnet-4-6 · max_tokens: 1024
용도: 하루 전체 데이터 종합 피드백 생성
```

두 엔드포인트 모두 `lib/supabase-server.ts`의 어드민 클라이언트(`SUPABASE_SERVICE_ROLE_KEY`) 사용 가능.

---

## 9. 차트 컴포넌트

모두 `recharts` 기반. `next/dynamic({ ssr: false })`로 로드 (canvas API 의존성).

### `MiniLineChart` — 대시보드 7일 스파크라인

```
Props: DataPoint[] { date: string, value: number | null }
크기: 높이 120px, 가득 채우기
특징: 축·눈금 없음, 심플한 선만 표시
```

### `GlucoseLineChart` — 트렌드 혈당 추이

```
Props: DataPoint[], type: 'fasting' | 'postprandial'
특징:
  - X축: MM-DD 형식
  - Y축: mg/dL
  - 공복 기준선: 99 (초록), 125 (노랑)
  - 식후 기준선: 140 (초록), 199 (노랑)
  - null 값 구간은 선 끊김 처리
```

### `ExerciseBarChart` — 트렌드 운동 시간

```
Props: ExercisePoint[] { date: string, minutes: number }
특징: 일별 총 운동 시간(분) 막대 차트
```

---

## 10. 타임존 처리 방식

한국(서울) 사용자 기준 정확성을 보장하는 흐름.

```
[사용자가 14:29 입력]
       │
       ▼
getCurrentTimeInTZ('Asia/Seoul')
  Date.now() + 9h(오프셋) → getUTCHours/Minutes
  → "14:29" (기본값으로 표시)
       │
[저장 클릭]
       │
       ▼
localToUTCIso("2026-05-30", "14:29", "Asia/Seoul")
  new Date("2026-05-30T14:29:00Z").getTime() - 9h×60000
  → "2026-05-30T05:29:00.000Z"
       │
       ▼
Supabase INSERT created_at = "2026-05-30T05:29:00.000Z"
       │
[기록 조회]
       │
       ▼
formatTimeInTZ("2026-05-30T05:29:00.000Z", "Asia/Seoul")
  new Date(iso).getTime() + 9h×60000 → getUTCHours/Minutes
  → "14:29" (화면 표시)
```

**설계 원칙**
- `Intl.DateTimeFormat` / `toLocaleString({ timeZone })` 미사용 (브라우저별 동작 불일치)
- 모든 DB 저장값은 UTC, 표시만 선택 타임존으로 변환
- 서울(UTC+9)은 DST 없음 → 오프셋 고정, 100% 정확

---

## 11. 이미지 OCR 파싱 흐름

운동 기록 스크린샷 → 자동 입력 기능.

```
[사용자가 운동 앱 스크린샷 선택]
       │
       ▼
preprocessImage(file)
  1. Canvas로 이미지 리사이즈 (최대 1500px)
  2. 중앙 50×50 픽셀 밝기 측정
  3. 밝기 < 80 (다크모드) → 색상 반전 (OCR 정확도 향상)
  4. PNG dataURL 반환
       │
       ▼
Tesseract.js createWorker(['kor', 'eng'])
  OCR 실행 → 텍스트 추출
       │
       ▼
extractWorkoutData(text)
  ┌─────────────────────────────────────────┐
  │ 운동 시간: H:MM:SS or MM:SS 패턴        │
  │ 거리:     XX.X km / XXX M 패턴          │
  │ 칼로리:   XXX KCAL / kcal 패턴          │
  │ 심박수:   XXX BPM (40-250 범위 검증)    │
  │ 고도:     고도/등반/오르막 + Xm 패턴     │
  │           Elev/Ascent + Xm 패턴(영어)   │
  └─────────────────────────────────────────┘
       │
       ▼
WorkoutData { duration_minutes, distance_km,
              calories, avg_heart_rate, elevation }
       │
       ▼
각 필드 자동 입력 (null 이면 해당 필드 무시)
```

**지원 앱 스크린샷**: 삼성 헬스, 애플 피트니스, Garmin Connect, Strava 등 (한국어·영어 혼용)

---

## 12. PWA 설정

```json
{
  "name": "혈당 트래커",
  "short_name": "혈당관리",
  "display": "standalone",
  "theme_color": "#2e6da4",
  "background_color": "#f5f7fa",
  "start_url": "/",
  "orientation": "portrait"
}
```

- 홈 화면 설치 후 **브라우저 UI 없이** 앱처럼 실행
- Android / iOS 모두 지원
- 아이콘: 192×192, 512×512 (PNG)

---

## 13. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...          # 공개 키 (클라이언트)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...               # 비공개 키 (서버 전용)
ANTHROPIC_API_KEY=sk-ant-...                        # Claude API (현재 비활성)
```

| 변수 | 노출 범위 | 용도 |
|------|----------|------|
| NEXT_PUBLIC_SUPABASE_URL | 브라우저 공개 | DB 접속 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 브라우저 공개 | RLS 적용 읽기/쓰기 |
| SUPABASE_SERVICE_ROLE_KEY | 서버 전용 | RLS 우회 관리 작업 |
| ANTHROPIC_API_KEY | 서버 전용 | Claude API 호출 |

> **보안 주의**: 현재 RLS(Row Level Security) 미설정 상태. 단일 사용자 개인 앱이므로 허용된 운영 방식이나, 다중 사용자 확장 시 반드시 인증 + RLS 적용 필요.

---

## 14. 버전 이력

| 버전 | 날짜 | 분류 | 주요 변경 |
|------|------|------|----------|
| v1.4.2 | 2026-05-30 | 버그수정 | Supabase 타임스탬프 UTC 파싱 강제 (이중 오프셋 버그 수정) |
| v1.4.1 | 2026-05-30 | 버그수정 | 타임존 저장·표시 로직 개선 |
| v1.4.0 | 2026-05-30 | 신기능 | 표준시간대 설정 (서울/도쿄/NY 등 7개 구간) |
| v1.3.0 | 2026-05-30 | 신기능 | 운동 기록 사진 자동 파싱 (Tesseract.js OCR) |
| v1.2.1 | 2026-05-29 | 버그수정 | 운동 시간 소수 입력 오류 수정 (Math.round 적용) |
| v1.2.0 | 2026-05-29 | 신기능 | 날짜/시간 입력, 기록별 저장 시각 표시 |
| v1.1.0 | 2026-05-29 | 버그수정 | AI 분석 비활성화(크레딧 절약), 날짜 버그 수정 |
| v1.0.0 | 2026-05-29 | 최초출시 | 혈당·식단·운동·검사결과·트렌드 기능 출시 |

---

*이 문서는 `/ARCHITECTURE.md` 파일로 저장되어 있습니다.*

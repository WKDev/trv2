# TRv2 - Electron + Next.js Application

TRv2는 Electron과 Next.js를 결합한 데스크톱 애플리케이션입니다. 철도 데이터 분석을 위한 ZIP 파일 처리 및 CSV 데이터 분석 기능을 제공합니다.

## 프로젝트 구조

```
TRv2/
├── app/                    # Next.js 앱 디렉토리
├── components/             # React 컴포넌트
├── electron/              # Electron 관련 파일들
│   ├── main/              # 메인 프로세스
│   │   └── index.js       # 메인 프로세스 진입점
│   ├── preload/           # Preload 스크립트
│   │   └── index.js       # Preload 스크립트
│   ├── renderer/          # 렌더러 프로세스
│   │   └── index.js       # 렌더러 프로세스 스크립트
│   └── services/          # 백엔드 서비스들
│       ├── file-service.js
│       ├── zip-validation-service.js
│       ├── zip-extraction-service.js
│       ├── data-correction-service.js
│       └── csv-data-reader-service.js
├── hooks/                 # React 훅들
├── lib/                   # 유틸리티 라이브러리
└── out/                   # Next.js 빌드 출력
```

## 주요 기능

- **ZIP 파일 처리**: 철도 데이터가 포함된 ZIP 파일을 선택하고 처리
- **데이터 검증**: CSV 파일(data.csv, meta.csv, step.csv)의 유효성 검사
- **보정 파일 관리**: data_correction.json 파일 자동 생성/업데이트
- **데이터 품질 검사**: 로드된 데이터의 품질 및 유효성 검증
- **최근 파일 관리**: 이전에 열었던 파일들의 목록 관리

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
# Next.js 개발 서버만 실행
npm run dev

# Electron 개발 환경 실행 (Next.js + Electron)
npm run electron-dev
```

### 3. 프로덕션 빌드

```bash
# Next.js 빌드
npm run build

# Electron 앱 빌드
npm run electron-build
```

## 사용 방법

1. 애플리케이션을 실행합니다
2. '파일 열기' 탭에서 'ZIP 파일 선택' 버튼을 클릭합니다
3. 철도 데이터가 포함된 ZIP 파일을 선택합니다
4. 자동으로 파일 검증, 압축 해제, 데이터 로드가 수행됩니다
5. 처리된 데이터의 요약 정보와 품질 검사 결과를 확인할 수 있습니다

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Desktop**: Electron 32
- **UI**: Tailwind CSS, Radix UI
- **Data Processing**: yauzl, yazl, csv-parser
- **Build**: electron-builder

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

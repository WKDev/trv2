project/
├── app/
│   ├── layout.tsx                 # 전역 레이아웃 (Navbar 포함)
│   ├── page.tsx                   # 홈/대시보드
│   │
│   ├── file-menu/
│   │   └── page.tsx               # 파일열기
│   │
│   ├── preprocessing-menu/
│   │   ├── layout.tsx             # 전처리 공통 레이아웃
│   │   ├── page.tsx               # 전처리 메인 (리다이렉트 또는 개요)
│   │   ├── raw-analysis/
│   │   │   └── page.tsx
│   │   ├── outlier-replacement/
│   │   │   └── page.tsx
│   │   ├── scale-offset/
│   │   │   └── page.tsx
│   │   └── aggregation/
│   │       └── page.tsx
│   │
│   ├── analysis-menu/
│   │   ├── layout.tsx             # 데이터 분석 공통 레이아웃
│   │   ├── page.tsx               # 분석 메인
│   │   ├── level-deviation/
│   │   │   └── page.tsx
│   │   ├── cross-level/
│   │   │   └── page.tsx
│   │   ├── lon-level-irregularity/
│   │   │   └── page.tsx
│   │   ├── guide-rail-clearance/
│   │   │   └── page.tsx
│   │   ├── alignment/
│   │   │   └── page.tsx
│   │   ├── planarity/
│   │   │   └── page.tsx
│   │   └── joint-step/
│   │       └── page.tsx
│   │
│   └── export-menu/
│       └── page.tsx               # 출력
│
└── components/
    ├── layout/
    │   ├── Navbar.tsx
    │   ├── Sidebar.tsx
    │   └── SubMenu.tsx
    │
    ├── file-menu/
    │   └── FileUploader.tsx
    │
    ├── preprocessing-menu/
    │   ├── PrepChart.tsx
    │   ├── OutlierTable.tsx
    │   ├── ScaleOffsetForm.tsx
    │   └── AggregationPanel.tsx
    │
    ├── analysis-menu/
    │   ├── AnalysisChart.tsx
    │   └── ...
    │
    ├── export-menu/
    │   └── ReportGenerator.tsx
    │
    └── shared/
        ├── DataTable.tsx
        ├── Chart.tsx
        └── Button.tsx
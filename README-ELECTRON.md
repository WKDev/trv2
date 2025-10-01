# TRv2 Electron App

이 프로젝트는 Next.js 기반의 웹 애플리케이션을 Electron 데스크톱 앱으로 변환한 것입니다.

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 또는
yarn install
```

## 🛠️ 개발

### 개발 모드 실행

```bash
# Next.js 개발 서버와 Electron 앱을 동시에 실행
npm run electron-dev

# 또는 개별적으로 실행
npm run dev          # Next.js 개발 서버만 실행
npm run electron     # Electron 앱만 실행 (Next.js 서버가 실행 중이어야 함)
```

### 빌드

```bash
# 프로덕션 빌드
npm run build

# Electron 앱 빌드
npm run electron-build

# 배포용 패키지 생성
npm run electron-dist
```

## 📁 프로젝트 구조

```
TRv2/
├── main.js              # Electron 메인 프로세스
├── preload.js           # 보안을 위한 preload 스크립트
├── renderer.js          # 렌더러 프로세스용 JavaScript
├── electron-builder.json # Electron 빌더 설정
├── electron-dev.js      # 개발 환경 스크립트
├── app/                 # Next.js 앱 소스
├── components/          # React 컴포넌트
├── out/                 # Next.js 빌드 출력 (자동 생성)
└── dist/                # Electron 배포 패키지 (자동 생성)
```

## 🔧 주요 기능

### Electron API

렌더러 프로세스에서 사용할 수 있는 Electron API:

```javascript
// 앱 정보
const version = await window.electronAPI.getAppVersion();
const platform = await window.electronAPI.getPlatform();

// 파일 시스템
const file = await window.electronHelpers.selectFile();
await window.electronHelpers.saveFile(data, 'filename.txt');

// 데이터 저장/로드
await window.electronHelpers.saveData('key', data);
const data = await window.electronHelpers.loadData('key');

// 알림
await window.electronHelpers.showNotification('제목', '내용');

// 메시지 박스
const result = await window.electronHelpers.showMessageBox({
  type: 'question',
  buttons: ['예', '아니오'],
  message: '정말로 삭제하시겠습니까?'
});
```

### 이벤트 리스너

```javascript
// 커스텀 이벤트 리스너
window.electronHelpers.on('electron-ready', (event) => {
  console.log('Electron 앱이 준비되었습니다!');
});

window.electronHelpers.on('window-resize', (event) => {
  console.log('윈도우 크기:', event.detail);
});
```

## 🎨 스타일링

Electron 앱임을 나타내는 CSS 클래스가 자동으로 추가됩니다:

```css
/* Electron 앱 전체 */
.electron-app {
  /* Electron 앱 스타일 */
}

/* 플랫폼별 스타일 */
.platform-win32 { /* Windows */ }
.platform-darwin { /* macOS */ }
.platform-linux { /* Linux */ }
```

## 🔒 보안

- `contextIsolation: true`로 설정하여 보안 강화
- `nodeIntegration: false`로 Node.js API 직접 접근 차단
- preload 스크립트를 통해서만 안전한 API 노출

## 📦 배포

### Windows

```bash
npm run electron-dist
```

생성된 파일: `dist/TRv2 Setup 0.1.0.exe`

### macOS

```bash
npm run electron-dist
```

생성된 파일: `dist/TRv2-0.1.0.dmg`

### Linux

```bash
npm run electron-dist
```

생성된 파일: `dist/TRv2-0.1.0.AppImage`

## 🐛 문제 해결

### 일반적인 문제

1. **Next.js 서버가 시작되지 않는 경우**
   ```bash
   # 포트 3000이 사용 중인지 확인
   netstat -ano | findstr :3000
   
   # 다른 포트 사용
   PORT=3001 npm run dev
   ```

2. **Electron 앱이 열리지 않는 경우**
   ```bash
   # Next.js 서버가 실행 중인지 확인
   curl http://localhost:3000
   
   # Electron 직접 실행
   npx electron .
   ```

3. **빌드 오류가 발생하는 경우**
   ```bash
   # 캐시 정리
   npm run build
   rm -rf out/
   npm run build
   ```

## 📝 스크립트 설명

- `npm run dev`: Next.js 개발 서버 실행
- `npm run build`: Next.js 프로덕션 빌드
- `npm run electron`: Electron 앱 실행 (개발 서버 필요)
- `npm run electron-dev`: 개발 서버와 Electron 앱 동시 실행
- `npm run electron-build`: Electron 앱 빌드
- `npm run electron-dist`: 배포용 패키지 생성

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.


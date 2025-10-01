// Electron 개발 환경용 스크립트
const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

console.log('🚀 Starting TRv2 Electron Development Environment...\n');

// Next.js 개발 서버 시작
console.log('📦 Starting Next.js development server...');
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: isWindows
});

// Next.js 서버가 준비될 때까지 대기
const waitForNext = () => {
  return new Promise((resolve) => {
    const checkServer = () => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Next.js server is ready!');
          resolve();
        } else {
          setTimeout(checkServer, 1000);
        }
      });
      
      req.on('error', () => {
        setTimeout(checkServer, 1000);
      });
    };
    
    checkServer();
  });
};

// Electron 앱 시작
const startElectron = async () => {
  try {
    await waitForNext();
    
    console.log('⚡ Starting Electron app...');
    const electronProcess = spawn('npm', ['run', 'electron'], {
      stdio: 'inherit',
      shell: isWindows,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    // 프로세스 종료 처리
    const cleanup = () => {
      console.log('\n🛑 Shutting down development environment...');
      nextProcess.kill();
      electronProcess.kill();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    electronProcess.on('close', (code) => {
      console.log(`Electron process exited with code ${code}`);
      nextProcess.kill();
      process.exit(code);
    });
    
  } catch (error) {
    console.error('❌ Failed to start development environment:', error);
    process.exit(1);
  }
};

startElectron();


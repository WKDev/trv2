/** @type {import('next').NextConfig} */
const nextConfig = {
  // Electron을 위한 설정
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // 정적 파일 경로 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  // Electron에서 사용할 수 있도록 설정
  distDir: 'out',
  // CORS 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ]
      }
    ];
  }
};

export default nextConfig;

import { redirect } from 'next/navigation'

export default function Home() {
  // 홈페이지에서 파일 열기 페이지로 리다이렉트
  redirect('/file')
}

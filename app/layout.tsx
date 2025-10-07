import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { MainLayout } from "@/components/layout/main-layout"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "TRv2",
  description: "Track Record Analysis & Report Generator v2",
  generator: "wkl",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Studio Kit",
  description: "AI-powered content management for Pilates studios",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Studio Kit",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${geist.className} antialiased bg-gray-50`}>
        <div className="min-h-screen md:flex">
          <Navigation />
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

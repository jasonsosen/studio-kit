import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Studio Kit",
  description: "AI-powered content management for Pilates studios",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${geist.className} antialiased bg-gray-50`}>
        <div className="min-h-screen flex">
          <Navigation />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Settings, BarChart3, Sparkles, FolderOpen } from "lucide-react"

const navItems = [
  { href: "/", label: "カレンダー", icon: Calendar },
  { href: "/weekly", label: "週間プラン", icon: Sparkles },
  { href: "/assets", label: "素材", icon: FolderOpen },
  { href: "/usage", label: "API", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white border-r border-gray-200 p-4 flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Studio Kit</h1>
          <p className="text-sm text-gray-500">Web版</p>
        </div>
        
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <ul className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] mt-1">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

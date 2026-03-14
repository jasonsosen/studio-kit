"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Settings, BarChart3, Sparkles, FolderOpen, ChevronDown, Building2, Plus } from "lucide-react"
import { useStudio } from "@/lib/studio-context"
import { useState } from "react"

const navItems = [
  { href: "/", label: "カレンダー", icon: Calendar },
  { href: "/weekly", label: "週間プラン", icon: Sparkles },
  { href: "/assets", label: "素材", icon: FolderOpen },
  { href: "/usage", label: "API", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { studios, currentStudio, setCurrentStudioId, isLoading } = useStudio()
  const [isStudioOpen, setIsStudioOpen] = useState(false)

  // Don't show navigation on login page
  if (pathname === "/login") {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white border-r border-gray-200 p-4 flex-col">
        {/* Studio Selector */}
        <div className="mb-6">
          <div className="relative">
            <button
              onClick={() => setIsStudioOpen(!isStudioOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900 truncate flex-1 text-left">
                {isLoading ? "読込中..." : currentStudio?.name || "店舗を選択"}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isStudioOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStudioOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStudioOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {studios.map((studio) => (
                      <button
                        key={studio.id}
                        onClick={() => {
                          setCurrentStudioId(studio.id)
                          setIsStudioOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          studio.id === currentStudio?.id
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-medium truncate">{studio.name}</div>
                          {studio.instagram_handle && (
                            <div className="text-xs text-gray-500">@{studio.instagram_handle}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => {
                        router.push("/settings?new=1")
                        setIsStudioOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新しい店舗を追加</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <ul className="space-y-1 flex-1">
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

        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400 px-3">Studio Kit Web</div>
        </div>
      </nav>

      {/* Mobile Header (Studio Selector) */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-2 safe-area-top">
        <div className="relative">
          <button
            onClick={() => setIsStudioOpen(!isStudioOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900 truncate max-w-[200px]">
              {isLoading ? "..." : currentStudio?.name || "店舗を選択"}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isStudioOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStudioOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsStudioOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="p-2 max-h-64 overflow-y-auto">
                  {studios.map((studio) => (
                    <button
                      key={studio.id}
                      onClick={() => {
                        setCurrentStudioId(studio.id)
                        setIsStudioOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        studio.id === currentStudio?.id
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="text-left flex-1">
                        <div className="font-medium">{studio.name}</div>
                        {studio.instagram_handle && (
                          <div className="text-xs text-gray-500">@{studio.instagram_handle}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={() => {
                      router.push("/settings?new=1")
                      setIsStudioOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新しい店舗を追加</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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

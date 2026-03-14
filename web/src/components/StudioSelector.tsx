"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Plus, Building2 } from "lucide-react"

interface Studio {
  id: string
  name: string
  instagram_handle?: string
}

interface StudioSelectorProps {
  studios: Studio[]
  currentStudioId: string | null
  onStudioChange: (studioId: string) => void
  onCreateStudio: () => void
}

export function StudioSelector({
  studios,
  currentStudioId,
  onStudioChange,
  onCreateStudio,
}: StudioSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentStudio = studios.find(s => s.id === currentStudioId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors w-full md:w-auto"
      >
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900 truncate max-w-[150px]">
          {currentStudio?.name || "店舗を選択"}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                店舗を切り替え
              </div>
              
              {studios.map((studio) => (
                <button
                  key={studio.id}
                  onClick={() => {
                    onStudioChange(studio.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    studio.id === currentStudioId
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium truncate">{studio.name}</div>
                    {studio.instagram_handle && (
                      <div className="text-xs text-gray-500 truncate">
                        @{studio.instagram_handle}
                      </div>
                    )}
                  </div>
                  {studio.id === currentStudioId && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={() => {
                  onCreateStudio()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新しい店舗を追加</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

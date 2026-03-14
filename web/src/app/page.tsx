"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react"
import { ContentEditor } from "@/components/ContentEditor"

// Temporary mock data - will be replaced with database
const mockPosts: Record<string, { topic: string; caption?: string; status: string }> = {}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [posts, setPosts] = useState(mockPosts)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad to start on Sunday
  const startDay = monthStart.getDay()
  const paddedDays = [...Array(startDay).fill(null), ...days]

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"))
  }

  const handleSavePost = (date: string, topic: string, caption: string) => {
    setPosts(prev => ({
      ...prev,
      [date]: { topic, caption, status: caption ? 'scheduled' : 'draft' }
    }))
    setSelectedDate(null)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">投稿カレンダー</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Sparkles className="w-4 h-4" />
          週間プラン生成
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, "yyyy年 M月", { locale: ja })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
            <div
              key={day}
              className={`p-3 text-center text-sm font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-28 border-b border-r border-gray-100" />
            }

            const dateStr = format(day, "yyyy-MM-dd")
            const post = posts[dateStr]
            const dayOfWeek = day.getDay()

            return (
              <div
                key={dateStr}
                onClick={() => handleDateClick(day)}
                className={`h-28 p-2 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isSameMonth(day, currentDate) ? "bg-gray-50 text-gray-400" : ""
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday(day) ? "w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center" :
                  dayOfWeek === 0 ? "text-red-500" :
                  dayOfWeek === 6 ? "text-blue-500" : ""
                }`}>
                  {format(day, "d")}
                </div>
                
                {post ? (
                  <div className={`text-xs p-1.5 rounded ${
                    post.caption ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    <div className="truncate font-medium">{post.topic}</div>
                    {post.caption && <div className="truncate text-green-600">✓ 生成済み</div>}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                    <Plus className="w-3 h-3" />
                    追加
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content Editor Modal */}
      {selectedDate && (
        <ContentEditor
          date={selectedDate}
          initialTopic={posts[selectedDate]?.topic || ""}
          initialCaption={posts[selectedDate]?.caption || ""}
          onSave={(topic, caption) => handleSavePost(selectedDate, topic, caption)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2 } from "lucide-react"
import { ContentEditor } from "@/components/ContentEditor"
import { useStudio } from "@/lib/studio-context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Post {
  id: string
  date: string
  topic: string
  caption: string | null
  status: string
}

export default function CalendarPage() {
  const { currentStudioId, isLoading: studioLoading } = useStudio()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [posts, setPosts] = useState<Record<string, Post>>({})
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad to start on Sunday
  const startDay = monthStart.getDay()
  const paddedDays = [...Array(startDay).fill(null), ...days]

  // Fetch posts when studio or month changes
  useEffect(() => {
    if (!currentStudioId) {
      setIsLoadingPosts(false)
      return
    }

    async function fetchPosts() {
      setIsLoadingPosts(true)
      
      const startDate = format(monthStart, "yyyy-MM-dd")
      const endDate = format(monthEnd, "yyyy-MM-dd")

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("studio_id", currentStudioId)
        .gte("date", startDate)
        .lte("date", endDate)

      if (error) {
        console.error("Error fetching posts:", error)
      } else {
        const postsMap: Record<string, Post> = {}
        data?.forEach((post: Post) => {
          postsMap[post.date] = post
        })
        setPosts(postsMap)
      }
      
      setIsLoadingPosts(false)
    }

    fetchPosts()
  }, [currentStudioId, currentDate])

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"))
  }

  const handleSavePost = async (date: string, topic: string, caption: string) => {
    if (!currentStudioId) return

    const postData = {
      studio_id: currentStudioId,
      date,
      topic,
      caption: caption || null,
      status: caption ? 'scheduled' : 'draft',
    }

    const existingPost = posts[date]

    if (existingPost) {
      // Update existing post
      const { error } = await supabase
        .from("posts")
        .update(postData)
        .eq("id", existingPost.id)

      if (!error) {
        setPosts(prev => ({
          ...prev,
          [date]: { ...existingPost, ...postData }
        }))
      }
    } else {
      // Insert new post
      const { data, error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single()

      if (!error && data) {
        setPosts(prev => ({
          ...prev,
          [date]: data
        }))
      }
    }

    setSelectedDate(null)
  }

  if (studioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header - Responsive */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">投稿カレンダー</h1>
        <button 
          onClick={() => router.push("/weekly")}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm md:text-base"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">週間プラン生成</span>
          <span className="sm:hidden">生成</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base md:text-lg font-semibold">
            {format(currentDate, "yyyy年 M月", { locale: ja })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
            <div
              key={day}
              className={`py-2 md:p-3 text-center text-xs md:text-sm font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {isLoadingPosts && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 relative">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-16 md:h-28 border-b border-r border-gray-100 bg-gray-50/50" />
            }

            const dateStr = format(day, "yyyy-MM-dd")
            const post = posts[dateStr]
            const dayOfWeek = day.getDay()

            return (
              <div
                key={dateStr}
                onClick={() => handleDateClick(day)}
                className={`h-16 md:h-28 p-1 md:p-2 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  !isSameMonth(day, currentDate) ? "bg-gray-50 text-gray-400" : ""
                }`}
              >
                <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${
                  isToday(day) ? "w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] md:text-sm" :
                  dayOfWeek === 0 ? "text-red-500" :
                  dayOfWeek === 6 ? "text-blue-500" : ""
                }`}>
                  {format(day, "d")}
                </div>
                
                {post ? (
                  <div className={`text-[10px] md:text-xs p-1 md:p-1.5 rounded ${
                    post.caption ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    <div className="truncate font-medium">{post.topic}</div>
                    <div className="hidden md:block truncate text-green-600">
                      {post.caption && "✓ 生成済み"}
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:flex text-xs text-gray-400 items-center gap-1 mt-2">
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

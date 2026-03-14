"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sparkles, Loader2, Calendar, Check, Edit2 } from "lucide-react"
import { format, addDays, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"

interface WeeklyPlan {
  date: string
  topic: string
  generated: boolean
}

export default function WeeklyPlanPage() {
  const [studioId, setStudioId] = useState<string | null>(null)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadStudio()
  }, [])

  async function loadStudio() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('studios')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setStudioId(data.id)
    }
  }

  async function generateWeeklyPlan() {
    if (!studioId) {
      setError("先に設定でスタジオ情報を登録してください")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId }),
      })

      if (!response.ok) throw new Error("生成に失敗しました")

      const data = await response.json()
      
      // Create plan for next 7 days
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }) // Start from Monday
      const plan: WeeklyPlan[] = data.topics.map((topic: string, index: number) => ({
        date: format(addDays(startDate, index), "yyyy-MM-dd"),
        topic,
        generated: false,
      }))

      setWeeklyPlan(plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsGenerating(false)
    }
  }

  async function savePlanToPosts() {
    if (!studioId || weeklyPlan.length === 0) return

    setIsSaving(true)
    setError(null)

    try {
      // Insert all posts
      const posts = weeklyPlan.map(plan => ({
        studio_id: studioId,
        date: plan.date,
        topic: plan.topic,
        status: 'draft',
      }))

      const { error } = await supabase
        .from('posts')
        .upsert(posts, { onConflict: 'studio_id,date' })

      if (error) throw error

      setSuccess("週間プランをカレンダーに保存しました")
      setWeeklyPlan([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  function updateTopic(index: number, topic: string) {
    setWeeklyPlan(prev => 
      prev.map((p, i) => i === index ? { ...p, topic } : p)
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">週間プラン生成</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {weeklyPlan.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              週間投稿プランを生成
            </h2>
            <p className="text-gray-500 mb-6">
              AIが今週の投稿トピックを7つ提案します
            </p>
            <button
              onClick={generateWeeklyPlan}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? "生成中..." : "プランを生成"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              提案されたプラン
            </h2>
            
            {weeklyPlan.map((plan, index) => (
              <div
                key={plan.date}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-20 text-sm text-gray-500">
                  {format(new Date(plan.date), "M/d(E)", { locale: ja })}
                </div>
                <input
                  type="text"
                  value={plan.topic}
                  onChange={(e) => updateTopic(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Edit2 className="w-4 h-4 text-gray-400" />
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-6">
              <button
                onClick={() => setWeeklyPlan([])}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={savePlanToPosts}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                カレンダーに保存
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}

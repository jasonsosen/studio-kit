"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Save, Loader2, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Studio } from "@/lib/types"

export default function SettingsPage() {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [name, setName] = useState("")
  const [features, setFeatures] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [instagramHandle, setInstagramHandle] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStudio()
  }, [])

  async function loadStudio() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('studios')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setStudio(data)
      setName(data.name || "")
      setFeatures(data.features || "")
      setTargetAudience(data.target_audience || "")
      setInstagramHandle(data.instagram_handle || "")
    }
    setIsLoading(false)
  }

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const studioData = {
        name,
        features,
        target_audience: targetAudience,
        instagram_handle: instagramHandle,
        user_id: user.id,
      }

      if (studio) {
        await supabase
          .from('studios')
          .update(studioData)
          .eq('id', studio.id)
      } else {
        const { data } = await supabase
          .from('studios')
          .insert(studioData)
          .select()
          .single()
        setStudio(data)
      }

      setMessage("保存しました")
    } catch (error) {
      setMessage("保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            スタジオ名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ピラティススタジオ○○"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            スタジオの特徴
          </label>
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="例: 少人数制、初心者歓迎、姿勢改善に特化"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            AIがキャプション生成時に参照します
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ターゲット層
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="例: 30-50代の健康志向の女性"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram ユーザー名
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
              @
            </span>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="your_studio"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes("失敗") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {message}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

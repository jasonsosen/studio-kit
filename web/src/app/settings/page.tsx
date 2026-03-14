"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Save, Loader2, LogOut, Plus, Trash2, Building2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useStudio } from "@/lib/studio-context"

export default function SettingsPage() {
  const { currentStudio, currentStudioId, refreshStudios, isLoading: studioLoading } = useStudio()
  const searchParams = useSearchParams()
  const isNewMode = searchParams.get("new") === "1"
  
  const [name, setName] = useState("")
  const [features, setFeatures] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [instagramHandle, setInstagramHandle] = useState("")
  const [tone, setTone] = useState("")
  const [hashtags, setHashtags] = useState("")
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showNewForm, setShowNewForm] = useState(isNewMode)
  
  const router = useRouter()
  const supabase = createClient()

  // Load current studio data
  useEffect(() => {
    if (currentStudio && !showNewForm) {
      setName(currentStudio.name || "")
      setFeatures(currentStudio.features || "")
      setTargetAudience(currentStudio.target_audience || "")
      setInstagramHandle(currentStudio.instagram_handle || "")
      setTone(currentStudio.tone || "")
      setHashtags(currentStudio.hashtags || "")
    }
  }, [currentStudio, showNewForm])

  // Reset form for new studio
  useEffect(() => {
    if (showNewForm) {
      setName("")
      setFeatures("")
      setTargetAudience("")
      setInstagramHandle("")
      setTone("")
      setHashtags("")
    }
  }, [showNewForm])

  async function handleSave() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "店舗名を入力してください" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const studioData = {
        name: name.trim(),
        features: features.trim() || null,
        target_audience: targetAudience.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
        tone: tone.trim() || null,
        hashtags: hashtags.trim() || null,
        user_id: user.id,
      }

      if (showNewForm) {
        // Create new studio
        const { error } = await supabase
          .from('studios')
          .insert(studioData)

        if (error) throw error
        
        setMessage({ type: "success", text: "新しい店舗を作成しました" })
        setShowNewForm(false)
        router.replace("/settings")
      } else if (currentStudioId) {
        // Update existing studio
        const { error } = await supabase
          .from('studios')
          .update(studioData)
          .eq('id', currentStudioId)

        if (error) throw error
        
        setMessage({ type: "success", text: "保存しました" })
      }

      await refreshStudios()
    } catch (error) {
      console.error(error)
      setMessage({ type: "error", text: "保存に失敗しました" })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!currentStudioId || !confirm("この店舗を削除しますか？投稿データも全て削除されます。")) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('studios')
        .delete()
        .eq('id', currentStudioId)

      if (error) throw error
      
      await refreshStudios()
      setMessage({ type: "success", text: "店舗を削除しました" })
    } catch (error) {
      setMessage({ type: "error", text: "削除に失敗しました" })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (studioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {showNewForm ? "新しい店舗を追加" : "店舗設定"}
        </h1>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新規追加</span>
          </button>
        )}
      </div>

      {/* Current Studio Indicator */}
      {!showNewForm && currentStudio && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            <strong>{currentStudio.name}</strong> の設定を編集中
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 space-y-5">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            店舗名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ピラティススタジオ○○ 渋谷店"
            className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            店舗の特徴・コンセプト
          </label>
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="例: 少人数制、初心者歓迎、姿勢改善に特化、駅から徒歩3分"
            rows={3}
            className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
          />
          <p className="mt-1 text-xs text-gray-500">
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
            placeholder="例: 30-50代の健康志向の女性、産後ママ"
            className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        {/* Tone & Style */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">投稿スタイル</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文章のトーン
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
              >
                <option value="">選択してください</option>
                <option value="friendly">フレンドリー・親しみやすい</option>
                <option value="professional">プロフェッショナル・信頼感</option>
                <option value="elegant">エレガント・上品</option>
                <option value="energetic">エネルギッシュ・元気</option>
                <option value="calm">穏やか・リラックス</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                よく使うハッシュタグ
              </label>
              <textarea
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#ピラティス #姿勢改善 #渋谷ピラティス"
                rows={2}
                className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
              />
              <p className="mt-1 text-xs text-gray-500">
                生成時に自動で追加されます
              </p>
            </div>
          </div>
        </div>

        {/* Instagram */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">SNS連携</h3>
          
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
                className="flex-1 px-3 py-3 md:py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200">
          {showNewForm ? (
            <>
              <button
                onClick={() => {
                  setShowNewForm(false)
                  router.replace("/settings")
                }}
                className="px-4 py-3 md:py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !name}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                店舗を追加
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-3 md:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
                {currentStudio && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-3 md:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving || !name}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

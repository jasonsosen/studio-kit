"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Loader2, Copy, Check } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ja } from "date-fns/locale"

interface ContentEditorProps {
  date: string
  initialTopic: string
  initialCaption: string
  onSave: (topic: string, caption: string) => void
  onClose: () => void
}

export function ContentEditor({
  date,
  initialTopic,
  initialCaption,
  onSave,
  onClose,
}: ContentEditorProps) {
  const [topic, setTopic] = useState(initialTopic)
  const [caption, setCaption] = useState(initialCaption)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("トピックを入力してください")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, date }),
      })

      if (!response.ok) {
        throw new Error("生成に失敗しました")
      }

      const data = await response.json()
      setCaption(data.caption)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    onSave(topic, caption)
  }

  const formattedDate = format(parseISO(date), "M月d日(E)", { locale: ja })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      {/* Mobile: slide up from bottom, Desktop: centered modal */}
      <div className="bg-white w-full md:rounded-xl shadow-xl md:w-full md:max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-xl animate-in slide-in-from-bottom md:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{formattedDate} の投稿</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(95vh-140px)] md:max-h-[calc(90vh-140px)]">
          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トピック
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: ピラティスで姿勢改善"
              className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-3 md:py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGenerating ? "生成中..." : "AIでキャプション生成"}
          </button>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                キャプション
              </label>
              {caption && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 active:text-gray-900"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      コピー
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="AIで生成、または直接入力..."
              rows={8}
              className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-200 bg-gray-50 safe-area-bottom">
          <button
            onClick={onClose}
            className="flex-1 md:flex-none px-4 py-3 md:py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg transition-colors font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

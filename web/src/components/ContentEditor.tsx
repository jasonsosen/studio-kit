"use client"

import { useState, useEffect, useRef } from "react"
import { X, Sparkles, Loader2, Copy, Check, Send, MessageSquare } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import { useStudio } from "@/lib/studio-context"

interface ContentEditorProps {
  date: string
  initialTopic: string
  initialCaption: string
  onSave: (topic: string, caption: string) => void
  onClose: () => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function ContentEditor({
  date,
  initialTopic,
  initialCaption,
  onSave,
  onClose,
}: ContentEditorProps) {
  const { currentStudio } = useStudio()
  const [topic, setTopic] = useState(initialTopic)
  const [caption, setCaption] = useState(initialCaption)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Chat state
  const [chatMode, setChatMode] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

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
        body: JSON.stringify({ 
          topic, 
          date,
          studioInfo: currentStudio ? {
            name: currentStudio.name,
            features: currentStudio.features,
            target: currentStudio.target_audience,
          } : undefined,
        }),
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

  const handleSendChat = async () => {
    if (!chatInput.trim() || isSending) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setIsSending(true)
    setError(null)

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userMessage }
    ]
    setChatMessages(newMessages)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          currentCaption: caption,
          studioInfo: currentStudio ? {
            name: currentStudio.name,
            features: currentStudio.features,
            target: currentStudio.target_audience,
          } : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("送信に失敗しました")
      }

      const data = await response.json()
      
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: data.reply }
      ])

      // If AI returned a new caption, update it
      if (data.newCaption) {
        setCaption(data.newCaption)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsSending(false)
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
      <div className="bg-white w-full md:rounded-xl shadow-xl md:w-full md:max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold">{formattedDate} の投稿</h2>
          <div className="flex items-center gap-2">
            {caption && (
              <button
                onClick={() => setChatMode(!chatMode)}
                className={`p-2 rounded-lg transition-colors ${
                  chatMode ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-600"
                }`}
                title="AIとチャット"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {chatMode ? (
            // Chat Mode
            <div className="flex flex-col h-full">
              {/* Chat Messages */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px] max-h-[40vh]">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    AIに修正を依頼できます 💬<br />
                    例: 「もっと元気な感じで」「絵文字を減らして」
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Current Caption Preview */}
              <div className="border-t border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">現在のキャプション</div>
                <div className="text-sm text-gray-700 line-clamp-3">{caption || "(未生成)"}</div>
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                    placeholder="修正を依頼..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={isSending || !chatInput.trim()}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Normal Edit Mode
            <div className="p-4 space-y-4">
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
                {caption && (
                  <p className="mt-1 text-xs text-gray-500">
                    💬 AIと会話で修正したい場合は右上のチャットボタン
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-200 bg-gray-50 safe-area-bottom shrink-0">
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

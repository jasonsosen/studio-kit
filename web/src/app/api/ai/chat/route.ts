import { NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages, currentCaption, studioInfo } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "メッセージが必要です" },
        { status: 400 }
      )
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "API キーが設定されていません" },
        { status: 500 }
      )
    }

    const systemPrompt = buildSystemPrompt(currentCaption, studioInfo)
    
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ]

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: fullMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API error:", error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.choices[0].message.content

    // Check if the reply contains a new caption (marked with special tags)
    const captionMatch = reply.match(/【キャプション】\n?([\s\S]*?)(?:【|$)/)
    const newCaption = captionMatch ? captionMatch[1].trim() : null

    return NextResponse.json({
      reply,
      newCaption,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
    })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { error: "エラーが発生しました" },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(currentCaption?: string, studioInfo?: { name?: string; features?: string; target?: string }) {
  const studio = studioInfo || {}
  
  return `あなたはピラティススタジオのInstagram投稿作成アシスタントです。
ユーザーと会話しながら、投稿キャプションを改善・修正します。

スタジオ情報:
- 名前: ${studio.name || "ピラティススタジオ"}
- 特徴: ${studio.features || "少人数制、初心者歓迎"}
- ターゲット: ${studio.target || "健康志向の女性"}

${currentCaption ? `現在のキャプション:\n${currentCaption}\n` : ""}

ルール:
1. ユーザーの要望に応じてキャプションを修正・改善します
2. 修正したキャプションを提示する時は、以下の形式で出力:
   【キャプション】
   (修正後のキャプション全文)
   【説明】
   (変更点の簡単な説明)
3. 質問や相談には親切に答えてください
4. 日本語で返答してください

例:
ユーザー: 「もっと元気な感じにして」
あなた: 
【キャプション】
✨ 今日も元気にピラティス！💪
...
【説明】
絵文字を増やし、文頭を元気な表現に変更しました！`
}

import { NextRequest, NextResponse } from "next/server"

// This will use environment variables for API keys
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { topic, date, studioInfo } = await request.json()

    if (!topic) {
      return NextResponse.json(
        { error: "トピックが必要です" },
        { status: 400 }
      )
    }

    // Default to Claude, fallback to OpenAI
    const useOpenAI = !ANTHROPIC_API_KEY && OPENAI_API_KEY

    const prompt = buildPrompt(topic, date, studioInfo)

    let caption: string
    let usage: { inputTokens: number; outputTokens: number }

    if (useOpenAI && OPENAI_API_KEY) {
      const result = await generateWithOpenAI(prompt)
      caption = result.caption
      usage = result.usage
    } else if (ANTHROPIC_API_KEY) {
      const result = await generateWithClaude(prompt)
      caption = result.caption
      usage = result.usage
    } else {
      // Demo mode - return mock caption
      caption = generateMockCaption(topic)
      usage = { inputTokens: 0, outputTokens: 0 }
    }

    // TODO: Log usage to database for cost tracking

    return NextResponse.json({
      caption,
      usage,
      model: useOpenAI ? "openai" : "claude",
    })
  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json(
      { error: "生成に失敗しました" },
      { status: 500 }
    )
  }
}

function buildPrompt(topic: string, date?: string, studioInfo?: { name?: string; features?: string; target?: string }) {
  const studio = studioInfo || {}
  
  return `あなたは日本のピラティススタジオのInstagram投稿を作成するエキスパートです。

スタジオ情報:
- 名前: ${studio.name || "ピラティススタジオ"}
- 特徴: ${studio.features || "少人数制、初心者歓迎"}
- ターゲット: ${studio.target || "健康志向の女性"}

以下のトピックについて、魅力的なInstagram投稿キャプションを作成してください:

トピック: ${topic}
${date ? `投稿予定日: ${date}` : ""}

要件:
- 親しみやすく、読みやすい文体
- 適切な改行とスペース
- 関連する絵文字を自然に使用
- ハッシュタグは5-8個程度
- 全体で200-400文字程度

キャプションのみを出力してください。説明や前置きは不要です。`
}

async function generateWithClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    caption: data.content[0].text,
    usage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    },
  }
}

async function generateWithOpenAI(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    caption: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    },
  }
}

function generateMockCaption(topic: string) {
  return `✨ ${topic} ✨

今日も素敵な1日をお過ごしですか？

ピラティスで体の芯から整えて、
毎日をもっと快適に過ごしましょう 💪

初めての方も大歓迎！
まずは体験レッスンからどうぞ 🌸

#ピラティス #pilates #姿勢改善 #体幹トレーニング #健康 #ボディメイク #神戸

📍 体験レッスン受付中
詳しくはプロフィールのリンクから ✨`
}

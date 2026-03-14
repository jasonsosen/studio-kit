import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { studioId } = await request.json()

    if (!studioId) {
      return NextResponse.json(
        { error: "スタジオIDが必要です" },
        { status: 400 }
      )
    }

    // Get studio info
    const supabase = await createClient()
    const { data: studio } = await supabase
      .from('studios')
      .select('*')
      .eq('id', studioId)
      .single()

    if (!studio) {
      return NextResponse.json(
        { error: "スタジオが見つかりません" },
        { status: 404 }
      )
    }

    const prompt = buildWeeklyPrompt(studio)
    const useOpenAI = !ANTHROPIC_API_KEY && OPENAI_API_KEY

    let topics: string[]

    if (useOpenAI && OPENAI_API_KEY) {
      topics = await generateWithOpenAI(prompt)
    } else if (ANTHROPIC_API_KEY) {
      topics = await generateWithClaude(prompt)
    } else {
      // Demo mode
      topics = generateMockTopics()
    }

    return NextResponse.json({ topics })
  } catch (error) {
    console.error("Weekly plan generation error:", error)
    return NextResponse.json(
      { error: "生成に失敗しました" },
      { status: 500 }
    )
  }
}

function buildWeeklyPrompt(studio: { name: string; features?: string; target_audience?: string }) {
  return `あなたは日本のピラティススタジオのInstagramコンテンツプランナーです。

スタジオ情報:
- 名前: ${studio.name}
- 特徴: ${studio.features || "少人数制、初心者歓迎"}
- ターゲット: ${studio.target_audience || "健康志向の女性"}

今週（月曜〜日曜）の7日間の投稿トピックを提案してください。

要件:
- バリエーションを持たせる（レッスン紹介、効果説明、お客様の声、スタジオ紹介など）
- 季節感や時事を意識
- エンゲージメントを意識した内容
- 各トピックは20文字以内の簡潔な表現

以下のJSON形式で出力してください:
["トピック1", "トピック2", "トピック3", "トピック4", "トピック5", "トピック6", "トピック7"]

JSONのみを出力してください。`
}

async function generateWithClaude(prompt: string): Promise<string[]> {
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
  const text = data.content[0].text

  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  
  throw new Error("Invalid response format")
}

async function generateWithOpenAI(prompt: string): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content

  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  
  throw new Error("Invalid response format")
}

function generateMockTopics(): string[] {
  return [
    "春の体調管理とピラティス",
    "デスクワークの肩こり解消",
    "初心者向けクラス紹介",
    "インストラクター紹介",
    "お客様ビフォーアフター",
    "自宅でできる簡単エクササイズ",
    "週末リフレッシュのすすめ",
  ]
}

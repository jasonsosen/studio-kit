// Studio Kit Web - Type Definitions

export interface Studio {
  id: string
  name: string
  features: string
  target: string
  createdAt: Date
  updatedAt: Date
}

export interface Post {
  id: string
  studioId: string
  date: string // YYYY-MM-DD
  topic: string
  caption: string | null
  status: 'draft' | 'scheduled' | 'published'
  mediaUrl: string | null
  thumbnailUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AIGeneration {
  id: string
  postId: string
  prompt: string
  response: string
  model: 'claude' | 'openai'
  inputTokens: number
  outputTokens: number
  costJpy: number
  createdAt: Date
}

export interface ApiUsage {
  id: string
  studioId: string
  date: string
  model: string
  inputTokens: number
  outputTokens: number
  costJpy: number
}

export interface SubtitleJob {
  id: string
  postId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  language: 'ja' | 'en' | 'zh' | 'ko'
  srtContent: string | null
  createdAt: Date
  completedAt: Date | null
}

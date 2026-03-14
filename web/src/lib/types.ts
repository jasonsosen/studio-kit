// Studio Kit Web - Type Definitions

export interface Studio {
  id: string
  user_id: string
  name: string
  features: string | null
  target_audience: string | null
  instagram_handle: string | null
  tone: string | null  // friendly, professional, elegant, energetic, calm
  hashtags: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  studio_id: string
  date: string // YYYY-MM-DD
  topic: string
  caption: string | null
  status: 'draft' | 'scheduled' | 'published'
  media_url: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface AIGeneration {
  id: string
  studio_id: string
  post_id: string | null
  model: string
  prompt: string
  response: string
  input_tokens: number
  output_tokens: number
  cost_jpy: number
  created_at: string
}

export interface Asset {
  id: string
  studio_id: string
  filename: string
  file_type: string
  file_size: number | null
  storage_path: string
  thumbnail_path: string | null
  created_at: string
}

export interface SubtitleJob {
  id: string
  studio_id: string
  asset_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  language: 'ja' | 'en' | 'zh' | 'ko'
  srt_content: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface ApiUsageDaily {
  id: string
  studio_id: string
  date: string
  model: string
  total_input_tokens: number
  total_output_tokens: number
  total_cost_jpy: number
  request_count: number
}

// Form types
export interface StudioFormData {
  name: string
  features: string
  target_audience: string
  instagram_handle: string
}

export interface PostFormData {
  topic: string
  caption: string
}

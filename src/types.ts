export type ContentStatus = 'planned' | 'ai_generated' | 'ready_to_post' | 'posted' | 'skipped';
export type ContentType = 'reel' | 'post' | 'story' | 'carousel';
export type MediaType = 'video' | 'image';

export interface Content {
  id: string;
  scheduled_date: string;
  content_type: ContentType;
  topic: string;
  caption: string | null;
  hashtags: string | null;
  status: ContentStatus;
  notes: string | null;
  media_path: string | null;
  media_type: MediaType | null;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  total: number;
  pending: number;
  ready: number;
  contents: Content[];
}

export type AiProvider = 'claude' | 'openai';

export interface AppConfig {
  claude_api_key: string | null;
  openai_api_key: string | null;
  ai_provider: AiProvider;
  studio_name: string;
  studio_location: string;
  target_audience: string;
}

export interface UsageSummary {
  today_tokens: number;
  today_cost_jpy: number;
  month_tokens: number;
  month_cost_jpy: number;
  total_tokens: number;
  total_cost_jpy: number;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  planned: '📝 企画中',
  ai_generated: '🤖 AI生成済み',
  ready_to_post: '✅ 投稿準備完了',
  posted: '📤 投稿済み',
  skipped: '⏭️ スキップ',
};

export const TYPE_LABELS: Record<ContentType, string> = {
  reel: '🎬 リール',
  post: '📷 投稿',
  story: '📱 ストーリー',
  carousel: '🎠 カルーセル',
};

export interface SchedulerNotification {
  title: string;
  body: string;
  pending_count: number;
  ready_count: number;
}

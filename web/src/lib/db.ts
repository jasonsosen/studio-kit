// Database access functions
import { createClient } from './supabase/server'
import type { Post, Studio, AIGeneration } from './types'

// Studio functions
export async function getStudio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('studios')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data as Studio | null
}

export async function createStudio(studio: Partial<Studio>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('studios')
    .insert({ ...studio, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Studio
}

export async function updateStudio(id: string, updates: Partial<Studio>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('studios')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Studio
}

// Post functions
export async function getPosts(studioId: string, startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('studio_id', studioId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data as Post[]
}

export async function getPost(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Post
}

export async function upsertPost(post: Partial<Post> & { studio_id: string; date: string }) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .upsert(post, { onConflict: 'studio_id,date' })
    .select()
    .single()

  if (error) throw error
  return data as Post
}

export async function deletePost(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// AI Generation logging
export async function logAIGeneration(gen: Omit<AIGeneration, 'id' | 'created_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_generations')
    .insert(gen)
    .select()
    .single()

  if (error) throw error
  
  // Also update daily usage summary
  await updateDailyUsage(gen.studio_id, gen.model, gen.input_tokens, gen.output_tokens, gen.cost_jpy)
  
  return data
}

async function updateDailyUsage(
  studioId: string, 
  model: string, 
  inputTokens: number, 
  outputTokens: number, 
  costJpy: number
) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Try to update existing record, insert if not exists
  const { data: existing } = await supabase
    .from('api_usage_daily')
    .select('*')
    .eq('studio_id', studioId)
    .eq('date', today)
    .eq('model', model)
    .single()

  if (existing) {
    await supabase
      .from('api_usage_daily')
      .update({
        total_input_tokens: existing.total_input_tokens + inputTokens,
        total_output_tokens: existing.total_output_tokens + outputTokens,
        total_cost_jpy: existing.total_cost_jpy + costJpy,
        request_count: existing.request_count + 1,
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('api_usage_daily')
      .insert({
        studio_id: studioId,
        date: today,
        model,
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
        total_cost_jpy: costJpy,
        request_count: 1,
      })
  }
}

// API Usage stats
export async function getUsageStats(studioId: string, days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('api_usage_daily')
    .select('*')
    .eq('studio_id', studioId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

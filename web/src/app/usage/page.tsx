"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { BarChart3, TrendingUp, Coins, Loader2 } from "lucide-react"
import { format, subDays } from "date-fns"
import { ja } from "date-fns/locale"
import type { ApiUsageDaily } from "@/lib/types"

export default function UsagePage() {
  const [usage, setUsage] = useState<ApiUsageDaily[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 30>(7)
  
  const supabase = createClient()

  useEffect(() => {
    loadUsage()
  }, [period])

  async function loadUsage() {
    setIsLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: studio } = await supabase
      .from('studios')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!studio) {
      setIsLoading(false)
      return
    }

    const startDate = format(subDays(new Date(), period), "yyyy-MM-dd")
    
    const { data } = await supabase
      .from('api_usage_daily')
      .select('*')
      .eq('studio_id', studio.id)
      .gte('date', startDate)
      .order('date', { ascending: true })

    setUsage(data || [])
    setIsLoading(false)
  }

  // Calculate totals
  const totalCost = usage.reduce((sum, u) => sum + Number(u.total_cost_jpy), 0)
  const totalRequests = usage.reduce((sum, u) => sum + u.request_count, 0)
  const totalTokens = usage.reduce((sum, u) => sum + u.total_input_tokens + u.total_output_tokens, 0)

  // Group by model
  const byModel = usage.reduce((acc, u) => {
    if (!acc[u.model]) {
      acc[u.model] = { cost: 0, requests: 0 }
    }
    acc[u.model].cost += Number(u.total_cost_jpy)
    acc[u.model].requests += u.request_count
    return acc
  }, {} as Record<string, { cost: number; requests: number }>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API使用量</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              period === 7
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            7日間
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              period === 30
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            30日間
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">合計コスト</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ¥{totalCost.toFixed(0)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">リクエスト数</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {totalRequests.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">総トークン数</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">モデル別内訳</h2>
        {Object.keys(byModel).length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            まだ使用データがありません
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byModel).map(([model, data]) => (
              <div
                key={model}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{model}</div>
                  <div className="text-sm text-gray-500">
                    {data.requests} リクエスト
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ¥{data.cost.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Usage Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">日別使用量</h2>
        {usage.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            まだ使用データがありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">日付</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">モデル</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">リクエスト</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">トークン</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">コスト</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm">
                      {format(new Date(u.date), "M/d(E)", { locale: ja })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{u.model}</td>
                    <td className="py-3 px-4 text-sm text-right">{u.request_count}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      {(u.total_input_tokens + u.total_output_tokens).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      ¥{Number(u.total_cost_jpy).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

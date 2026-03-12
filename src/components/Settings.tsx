import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppConfig, AiProvider, UsageSummary } from '../types';

interface Props {
  onClose: () => void;
}

export function Settings({ onClose }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>('claude');
  const [studioName, setStudioName] = useState('');
  const [location, setLocation] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    loadUsage();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke<AppConfig>('get_config');
      setConfig(cfg);
      setClaudeKey(cfg.claude_api_key || '');
      setOpenaiKey(cfg.openai_api_key || '');
      setAiProvider(cfg.ai_provider);
      setStudioName(cfg.studio_name);
      setLocation(cfg.studio_location);
      setTargetAudience(cfg.target_audience);
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  async function loadUsage() {
    try {
      const u = await invoke<UsageSummary>('get_usage_summary');
      setUsage(u);
    } catch (e) {
      console.error('Failed to load usage:', e);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (claudeKey !== (config?.claude_api_key || '')) {
        await invoke('save_config', { key: 'claude_api_key', value: claudeKey });
      }
      if (openaiKey !== (config?.openai_api_key || '')) {
        await invoke('save_config', { key: 'openai_api_key', value: openaiKey });
      }
      if (aiProvider !== config?.ai_provider) {
        await invoke('save_config', { key: 'ai_provider', value: aiProvider });
      }
      if (studioName !== config?.studio_name) {
        await invoke('save_config', { key: 'studio_name', value: studioName });
      }
      if (location !== config?.studio_location) {
        await invoke('save_config', { key: 'studio_location', value: location });
      }
      if (targetAudience !== config?.target_audience) {
        await invoke('save_config', { key: 'target_audience', value: targetAudience });
      }
      onClose();
    } catch (e) {
      console.error('Failed to save config:', e);
      alert(`設定の保存に失敗しました: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  const formatJpy = (amount: number) => {
    return `¥${amount.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">⚙️ 設定</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スタジオ名
            </label>
            <input
              type="text"
              value={studioName}
              onChange={e => setStudioName(e.target.value)}
              placeholder="ピラティススタジオ○○"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所在地
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="大阪・心斎橋"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ターゲット層
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="30-40代女性"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AIプロバイダー
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAiProvider('claude')}
                className={`flex-1 py-2 px-4 rounded-md border-2 transition-all ${
                  aiProvider === 'claude'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Claude</div>
                <div className="text-xs text-gray-500">Anthropic</div>
              </button>
              <button
                onClick={() => setAiProvider('openai')}
                className={`flex-1 py-2 px-4 rounded-md border-2 transition-all ${
                  aiProvider === 'openai'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">GPT-4o mini</div>
                <div className="text-xs text-gray-500">OpenAI</div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claude API Key
              </label>
              <input
                type="password"
                value={claudeKey}
                onChange={e => setClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener"
                  className="text-orange-600 hover:underline"
                >
                  Anthropic Console →
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener"
                  className="text-green-600 hover:underline"
                >
                  OpenAI Platform →
                </a>
              </p>
            </div>
          </div>

          {usage && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">💰 使用量</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">今日</div>
                  <div className="font-bold text-lg">{formatJpy(usage.today_cost_jpy)}</div>
                  <div className="text-xs text-gray-400">{formatTokens(usage.today_tokens)} tokens</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">今月</div>
                  <div className="font-bold text-lg">{formatJpy(usage.month_cost_jpy)}</div>
                  <div className="text-xs text-gray-400">{formatTokens(usage.month_tokens)} tokens</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">累計</div>
                  <div className="font-bold text-lg">{formatJpy(usage.total_cost_jpy)}</div>
                  <div className="text-xs text-gray-400">{formatTokens(usage.total_tokens)} tokens</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                ※ 為替レートは毎日自動更新（USD→JPY）
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

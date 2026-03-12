import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppConfig } from '../types';

interface Props {
  onClose: () => void;
}

export function Settings({ onClose }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [claudeKey, setClaudeKey] = useState('');
  const [studioName, setStudioName] = useState('');
  const [location, setLocation] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke<AppConfig>('get_config');
      setConfig(cfg);
      setClaudeKey(cfg.claude_api_key || '');
      setStudioName(cfg.studio_name);
      setLocation(cfg.studio_location);
      setTargetAudience(cfg.target_audience);
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (claudeKey !== (config?.claude_api_key || '')) {
        await invoke('save_config', { key: 'claude_api_key', value: claudeKey });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
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
              AI文案生成に必要です。
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener"
                className="text-primary-600 hover:underline"
              >
                Anthropic Console
              </a>
              で取得できます。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
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

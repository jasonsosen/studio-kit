import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Content } from '../types';

interface Props {
  onGenerated: () => void;
  onClose: () => void;
}

export function WeeklyPlanGenerator({ onGenerated, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<Content[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const contents = await invoke<Content[]>('generate_weekly_plan');
      setGenerated(contents);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDone() {
    onGenerated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">🤖 今週のプランを生成</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          {!generated.length && !error && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                AIが今週の投稿トピックを7つ提案します。
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 text-lg"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🔄</span>
                    生成中...
                  </span>
                ) : (
                  '✨ 生成する'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              <p className="font-medium">エラーが発生しました</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={handleGenerate}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                再試行
              </button>
            </div>
          )}

          {generated.length > 0 && (
            <div>
              <p className="text-green-600 font-medium mb-3">
                ✅ {generated.length}件のトピックを生成しました
              </p>
              <ul className="space-y-2">
                {generated.map(content => (
                  <li
                    key={content.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                  >
                    <span className="text-gray-500 text-sm">
                      {content.scheduled_date}
                    </span>
                    <span>{content.topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          {generated.length > 0 ? (
            <button
              onClick={handleDone}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
            >
              完了
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

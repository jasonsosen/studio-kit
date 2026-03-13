import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Content, SubtitleResult } from '../types';

interface Props {
  content: Content;
  onSubtitleChange: (content: Content) => void;
}

export function SubtitleGenerator({ content, onSubtitleChange }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [language, setLanguage] = useState('ja');

  useEffect(() => {
    if (content.subtitle_path) {
      invoke<string | null>('get_subtitle_content', { contentId: content.id })
        .then(setSubtitleText)
        .catch(console.error);
    } else {
      setSubtitleText(null);
    }
  }, [content.id, content.subtitle_path]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await invoke<SubtitleResult>('generate_subtitles', {
        contentId: content.id,
        language,
      });
      setSubtitleText(result.subtitle_text);
      onSubtitleChange(result.content);
    } catch (e) {
      console.error('Failed to generate subtitles:', e);
      alert(`字幕生成に失敗しました: ${e}`);
    } finally {
      setIsGenerating(false);
    }
  }, [content.id, language, onSubtitleChange]);

  const handleRemove = useCallback(async () => {
    if (!confirm('字幕を削除しますか？')) return;

    try {
      const updated = await invoke<Content>('remove_subtitles', {
        contentId: content.id,
      });
      setSubtitleText(null);
      onSubtitleChange(updated);
    } catch (e) {
      console.error('Failed to remove subtitles:', e);
      alert(`削除に失敗しました: ${e}`);
    }
  }, [content.id, onSubtitleChange]);

  if (content.media_type !== 'video') {
    return null;
  }

  if (!content.media_path) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          AI字幕
        </label>
        <p className="text-sm text-gray-400">
          動画をアップロードすると字幕を生成できます
        </p>
      </div>
    );
  }

  if (content.subtitle_path) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            AI字幕
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {showPreview ? '閉じる' : 'プレビュー'}
            </button>
            <button
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-700"
            >
              削除
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span>✓</span>
          <span>字幕生成済み (.srt)</span>
        </div>
        {showPreview && subtitleText && (
          <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
            {subtitleText}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        AI字幕
      </label>
      <div className="flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
          disabled={isGenerating}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ko">한국어</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-colors
            ${isGenerating
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-primary-500 text-white hover:bg-primary-600'}
          `}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <span>🎤</span>
              <span>字幕を生成</span>
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Whisperで音声から字幕を自動生成します
      </p>
    </div>
  );
}

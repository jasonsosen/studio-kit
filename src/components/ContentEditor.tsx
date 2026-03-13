import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Content, ContentStatus, ContentType, STATUS_LABELS, TYPE_LABELS } from '../types';
import { MediaUploader } from './MediaUploader';

interface Props {
  content: Content | null;
  selectedDate: string | null;
  onSave: () => void;
  onClose: () => void;
}

export function ContentEditor({ content, selectedDate, onSave, onClose }: Props) {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType>('reel');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [status, setStatus] = useState<ContentStatus>('planned');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [currentContent, setCurrentContent] = useState<Content | null>(content);

  const isEditing = !!content;

  useEffect(() => {
    checkClaudeKey();
    setCurrentContent(content);
    if (content) {
      setTopic(content.topic);
      setContentType(content.content_type);
      setCaption(content.caption || '');
      setHashtags(content.hashtags || '');
      setStatus(content.status);
      setNotes(content.notes || '');
    } else {
      setTopic('');
      setContentType('reel');
      setCaption('');
      setHashtags('');
      setStatus('planned');
      setNotes('');
    }
  }, [content]);

  async function checkClaudeKey() {
    try {
      const has = await invoke<boolean>('has_claude_key');
      setHasClaudeKey(has);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSave() {
    try {
      if (isEditing && content) {
        await invoke('update_content', {
          content: {
            ...content,
            topic,
            content_type: contentType,
            caption: caption || null,
            hashtags: hashtags || null,
            status,
            notes: notes || null,
          },
        });
      } else if (selectedDate) {
        await invoke('create_content', {
          date: selectedDate,
          topic,
          contentType,
        });
      }
      onSave();
    } catch (e) {
      console.error('Failed to save:', e);
      alert(`保存に失敗しました: ${e}`);
    }
  }

  async function handleDelete() {
    if (!content) return;
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      await invoke('delete_content', { id: content.id });
      onSave();
    } catch (e) {
      console.error('Failed to delete:', e);
      alert(`削除に失敗しました: ${e}`);
    }
  }

  async function handleGenerateCaption() {
    if (!content) return;
    setIsGenerating(true);
    try {
      const updated = await invoke<Content>('generate_caption', { contentId: content.id });
      setCaption(updated.caption || '');
      setHashtags(updated.hashtags || '');
      setStatus(updated.status);
    } catch (e) {
      console.error('Failed to generate:', e);
      alert(`文案生成に失敗しました: ${e}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleMarkPosted() {
    if (!content) return;
    try {
      await invoke('mark_as_posted', { contentId: content.id });
      onSave();
    } catch (e) {
      console.error('Failed to mark as posted:', e);
    }
  }

  if (!content && !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? '投稿を編集' : '新規投稿'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="text"
              value={content?.scheduled_date || selectedDate || ''}
              disabled
              className="w-full px-3 py-2 border rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トピック
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例: 腰痛改善ストレッチ"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイプ
            </label>
            <select
              value={contentType}
              onChange={e => setContentType(e.target.value as ContentType)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ContentStatus)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    キャプション
                  </label>
                  {hasClaudeKey && (
                    <button
                      onClick={handleGenerateCaption}
                      disabled={isGenerating || !topic}
                      className="text-sm px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? '生成中...' : '🤖 AIで生成'}
                    </button>
                  )}
                </div>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={6}
                  placeholder="投稿のキャプションを入力..."
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ハッシュタグ
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="#ピラティス #大阪ピラティス ..."
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="撮影メモなど..."
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {currentContent && (
                <MediaUploader
                  content={currentContent}
                  onMediaChange={(updated) => {
                    setCurrentContent(updated);
                  }}
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                削除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing && status !== 'posted' && (
              <button
                onClick={handleMarkPosted}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                投稿済みにする
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!topic}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

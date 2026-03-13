import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Content } from '../types';

interface Props {
  content: Content;
  onMediaChange: (content: Content) => void;
}

export function MediaUploader({ content, onMediaChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']
        }]
      });

      if (selected) {
        setIsUploading(true);
        const updated = await invoke<Content>('upload_media', {
          contentId: content.id,
          filePath: selected,
        });
        onMediaChange(updated);
      }
    } catch (e) {
      console.error('Failed to upload:', e);
      alert(`アップロードに失敗しました: ${e}`);
    } finally {
      setIsUploading(false);
    }
  }, [content.id, onMediaChange]);

  const handleRemove = useCallback(async () => {
    if (!confirm('素材を削除しますか？')) return;

    try {
      const updated = await invoke<Content>('remove_media', {
        contentId: content.id,
      });
      onMediaChange(updated);
    } catch (e) {
      console.error('Failed to remove:', e);
      alert(`削除に失敗しました: ${e}`);
    }
  }, [content.id, onMediaChange]);

  const thumbnailSrc = content.thumbnail_path
    ? convertFileSrc(content.thumbnail_path)
    : null;

  const mediaSrc = content.media_path
    ? convertFileSrc(content.media_path)
    : null;

  if (content.media_path) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          素材
        </label>
        <div className="relative group">
          {content.media_type === 'video' ? (
            <div className="relative">
              {thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt="Video thumbnail"
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-4xl drop-shadow-lg">▶</span>
              </div>
            </div>
          ) : (
            <img
              src={mediaSrc || thumbnailSrc || ''}
              alt="Media preview"
              className="w-full h-40 object-cover rounded-lg"
            />
          )}
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {content.media_path?.split('/').pop()}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        素材
      </label>
      <div
        onClick={handleSelectFile}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors
          ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            <span className="text-sm text-gray-500">アップロード中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📁</span>
            <span className="text-sm text-gray-600">
              クリックして選択
            </span>
            <span className="text-xs text-gray-400">
              動画: mp4, mov / 画像: jpg, png
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

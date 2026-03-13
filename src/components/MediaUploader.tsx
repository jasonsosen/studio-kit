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

  const uploadFromPath = useCallback(async (filePath: string) => {
    setIsUploading(true);
    try {
      const updated = await invoke<Content>('upload_media', {
        contentId: content.id,
        filePath,
      });
      onMediaChange(updated);
    } catch (e) {
      console.error('Failed to upload:', e);
      alert(`アップロードに失敗しました: ${e}`);
    } finally {
      setIsUploading(false);
    }
  }, [content.id, onMediaChange]);

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']
        }]
      });

      if (typeof selected === 'string') {
        await uploadFromPath(selected);
      }
    } catch (e) {
      console.error('Failed to upload:', e);
      alert(`アップロードに失敗しました: ${e}`);
    }
  }, [uploadFromPath]);

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
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">素材</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectFile}
              disabled={isUploading}
              className="text-xs px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
            >
              置き換え
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
            >
              削除
            </button>
          </div>
        </div>

        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {content.media_type === 'video' ? (
            <div className="space-y-2 p-2">
              <video
                src={mediaSrc || undefined}
                poster={thumbnailSrc || undefined}
                controls
                className="w-full h-48 bg-black rounded-lg object-contain"
              />
              <p className="text-[11px] text-gray-500">動画プレビュー</p>
            </div>
          ) : (
            <img
              src={mediaSrc || thumbnailSrc || ''}
              alt="Media preview"
              className="w-full h-48 object-cover"
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{content.media_path?.split('/').pop()}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {content.media_type === 'video' ? '動画' : '画像'}
          </span>
        </div>
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
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragOver(false);
          const droppedFile = e.dataTransfer.files[0] as (File & { path?: string }) | undefined;
          const droppedPath = droppedFile?.path;
          if (!droppedPath) {
            alert('ドラッグ&ドロップのファイルパスを取得できませんでした。クリックして選択してください。');
            return;
          }
          await uploadFromPath(droppedPath);
        }}
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

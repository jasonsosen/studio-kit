"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Upload, Loader2, Image, Video, Trash2, X } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import type { Asset } from "@/lib/types"

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [studioId, setStudioId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadAssets()
  }, [])

  async function loadAssets() {
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

    setStudioId(studio.id)

    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('studio_id', studio.id)
      .order('created_at', { ascending: false })

    setAssets(data || [])
    setIsLoading(false)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFiles(e.dataTransfer.files)
    }
  }, [studioId])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFiles(e.target.files)
    }
  }

  async function uploadFiles(files: FileList) {
    if (!studioId) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Check file type
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        
        if (!isImage && !isVideo) continue

        // Upload to Supabase Storage
        const fileName = `${Date.now()}-${file.name}`
        const storagePath = `${studioId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('assets')
          .getPublicUrl(storagePath)

        // Create asset record
        const { data: asset, error: dbError } = await supabase
          .from('assets')
          .insert({
            studio_id: studioId,
            filename: file.name,
            file_type: isVideo ? 'video' : 'image',
            file_size: file.size,
            storage_path: storagePath,
            thumbnail_path: isImage ? storagePath : null,
          })
          .select()
          .single()

        if (!dbError && asset) {
          setAssets(prev => [asset, ...prev])
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  async function deleteAsset(asset: Asset) {
    if (!confirm('この素材を削除しますか？')) return

    // Delete from storage
    await supabase.storage
      .from('assets')
      .remove([asset.storage_path])

    // Delete from database
    await supabase
      .from('assets')
      .delete()
      .eq('id', asset.id)

    setAssets(prev => prev.filter(a => a.id !== asset.id))
    setSelectedAsset(null)
  }

  function getAssetUrl(path: string) {
    const { data } = supabase.storage.from('assets').getPublicUrl(path)
    return data.publicUrl
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">素材管理</h1>

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 mb-6 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {isUploading ? (
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          )}
          <p className="text-gray-600 mb-2">
            {isUploading ? "アップロード中..." : "ファイルをドラッグ＆ドロップ"}
          </p>
          <p className="text-sm text-gray-500 mb-4">または</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            ファイルを選択
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">素材がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            >
              {asset.file_type === 'image' ? (
                <img
                  src={getAssetUrl(asset.storage_path)}
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Video className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 truncate">
                {selectedAsset.filename}
              </h2>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="aspect-video bg-gray-100">
              {selectedAsset.file_type === 'image' ? (
                <img
                  src={getAssetUrl(selectedAsset.storage_path)}
                  alt={selectedAsset.filename}
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={getAssetUrl(selectedAsset.storage_path)}
                  controls
                  className="w-full h-full"
                />
              )}
            </div>

            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">サイズ</span>
                <span>{formatFileSize(selectedAsset.file_size)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">アップロード日</span>
                <span>
                  {format(new Date(selectedAsset.created_at), "yyyy/M/d", { locale: ja })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => deleteAsset(selectedAsset)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

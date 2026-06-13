import React, { useState, useRef, useCallback } from 'react';
import { compressImage } from '../utils/image';
import type { ImageAttachment } from '../types';

interface ImageUploaderProps {
  imageAttachments: ImageAttachment[];
  onAddImage: (image: ImageAttachment) => void;
  onDeleteImage: (imageId: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageAttachments,
  onAddImage,
  onDeleteImage,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          const attachment = await compressImage(file);
          onAddImage(attachment);
        }
      } catch (err: any) {
        setError(err.message || '图片处理失败');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onAddImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) processFiles(e.target.files);
    },
    [processFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) imageItems.push(file);
        }
      }
      if (imageItems.length > 0) processFiles(imageItems);
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const getImageUrl = useCallback((blob: Blob): string => {
    return URL.createObjectURL(blob);
  }, []);

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
          transition-all duration-200
          ${isDragOver
            ? 'border-sky-400 bg-sky-50 scale-[1.02] shadow-lg'
            : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/50'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-8 h-8 border-[3px] border-sky-400 border-t-transparent
                            rounded-full animate-spin-slow" />
            <span className="text-sm text-gray-500 font-medium">压缩上传中…</span>
          </div>
        ) : (
          <div className="py-1">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-100 flex items-center justify-center
                            mb-3 transition-transform duration-200 group-hover:scale-110">
              <span className="text-2xl">🖼️</span>
            </div>
            <p className="text-sm font-medium text-gray-600">
              {isDragOver ? '✨ 释放以上传' : '点击、粘贴或拖拽上传'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">自动压缩 · 最大 10MB</p>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-red-500 mt-2 bg-red-50 rounded-lg py-1">{error}</p>
        )}
      </div>

      {/* 图片网格 */}
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imageAttachments.map((img, idx) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100
                         cursor-pointer animate-scale-in shadow-sm hover:shadow-md
                         transition-all duration-200 hover:scale-[1.03]"
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
              onClick={() => setLightboxImage(getImageUrl(img.blob))}
            >
              <img
                src={getImageUrl(img.blob)}
                alt={img.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* 悬停覆盖层 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-200
                              flex items-end justify-between p-2">
                <span className="text-[10px] text-white font-medium">
                  {img.width}×{img.height}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteImage(img.id); }}
                  className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-lg
                             backdrop-blur-sm transition-all duration-200"
                  title="删除图片"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 灯箱 */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4
                     animate-fade-in backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="预览"
            className="max-w-full max-h-full object-contain rounded-2xl animate-scale-in"
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white
                       rounded-2xl backdrop-blur-sm transition-all duration-200
                       border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

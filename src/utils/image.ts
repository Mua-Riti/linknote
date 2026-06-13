import imageCompression from 'browser-image-compression';
import { generateId } from '../db';
import type { ImageAttachment } from '../types';

const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * 压缩并处理图片文件
 */
export async function compressImage(file: File): Promise<ImageAttachment> {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`图片文件不能超过 ${MAX_IMAGE_SIZE_MB}MB`);
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件');
  }

  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: MAX_IMAGE_WIDTH,
    useWebWorker: true,
    fileType: file.type as string,
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // 获取压缩后的图片尺寸
    const dimensions = await getImageDimensions(compressedFile);

    const attachment: ImageAttachment = {
      id: generateId(),
      blob: compressedFile,
      name: file.name,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: Date.now(),
    };

    return attachment;
  } catch (error) {
    // 如果压缩失败，使用原文件
    console.warn('图片压缩失败，使用原文件:', error);

    const dimensions = await getImageDimensions(file);

    return {
      id: generateId(),
      blob: file,
      name: file.name,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: Date.now(),
    };
  }
}

/**
 * 获取图片尺寸
 */
function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片尺寸'));
    };
    img.src = url;
  });
}

/**
 * 将 Blob 转换为 Base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 Base64 data URL 转换回 Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

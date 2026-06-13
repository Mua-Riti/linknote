import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { NoteDB, ExportData } from '../types';
import { blobToDataUrl, dataUrlToBlob } from './image';

/**
 * 将所有便签导出为 JSON 文件
 */
export async function exportAsJson(notes: NoteDB[]): Promise<void> {
  const exportData: ExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    notes: await Promise.all(notes.map(convertNoteToExport)),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  saveAs(blob, `linknote-backup-${formatDate(new Date())}.json`);
}

/**
 * 将所有便签导出为包含 JSON + 媒体文件的 ZIP 包
 */
export async function exportAsZip(notes: NoteDB[]): Promise<void> {
  const zip = new JSZip();

  const exportData: ExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    notes: await Promise.all(notes.map(convertNoteToExport)),
  };

  // 添加 JSON 主文件
  zip.file('data.json', JSON.stringify(exportData, null, 2));

  // 创建媒体文件夹
  const audioFolder = zip.folder('audio');
  const imageFolder = zip.folder('images');

  // 将媒体 Blob 作为单独文件添加
  for (const note of notes) {
    for (const audio of note.audioAttachments) {
      if (audioFolder && audio.blob) {
        const ext = getExtensionFromBlob(audio.blob);
        audioFolder.file(`${audio.id}${ext}`, audio.blob);
      }
    }
    for (const img of note.imageAttachments) {
      if (imageFolder && img.blob) {
        const ext = getExtensionFromBlob(img.blob, 'png');
        imageFolder.file(`${img.id}.${ext}`, img.blob);
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `linknote-full-backup-${formatDate(new Date())}.zip`);
}

/**
 * 从 ZIP 文件导入数据
 */
export async function importFromZip(file: File): Promise<NoteDB[]> {
  const zip = await JSZip.loadAsync(file);

  // 读取 JSON 数据
  const jsonFile = zip.file('data.json');
  if (!jsonFile) {
    throw new Error('无效的备份文件：找不到 data.json');
  }

  const jsonStr = await jsonFile.async('string');
  const exportData: ExportData = JSON.parse(jsonStr);

  if (!exportData.version || !Array.isArray(exportData.notes)) {
    throw new Error('无效的备份文件格式');
  }

  // 转换回 NoteDB 格式
  const notes: NoteDB[] = [];

  for (const exportedNote of exportData.notes) {
    const audioAttachments = exportedNote.audioAttachments.map((a) => {
      // 从 dataUrl 或 zip 中的文件还原 Blob
      const blob = dataUrlToBlob(a.dataUrl);
      return {
        id: a.id,
        blob,
        name: a.name,
        duration: a.duration,
        createdAt: a.createdAt,
      };
    });

    const imageAttachments = exportedNote.imageAttachments.map((img) => {
      const blob = dataUrlToBlob(img.dataUrl);
      return {
        id: img.id,
        blob,
        name: img.name,
        width: img.width,
        height: img.height,
        createdAt: img.createdAt,
      };
    });

    notes.push({
      id: exportedNote.id,
      title: exportedNote.title,
      content: exportedNote.content,
      audioAttachments,
      imageAttachments,
      createdAt: exportedNote.createdAt,
      updatedAt: exportedNote.updatedAt,
    });
  }

  return notes;
}

/**
 * 从 JSON 文件导入数据
 */
export async function importFromJson(file: File): Promise<NoteDB[]> {
  const text = await file.text();
  const exportData: ExportData = JSON.parse(text);

  if (!exportData.version || !Array.isArray(exportData.notes)) {
    throw new Error('无效的备份文件格式');
  }

  const notes: NoteDB[] = [];

  for (const exportedNote of exportData.notes) {
    const audioAttachments = exportedNote.audioAttachments.map((a) => ({
      id: a.id,
      blob: dataUrlToBlob(a.dataUrl),
      name: a.name,
      duration: a.duration,
      createdAt: a.createdAt,
    }));

    const imageAttachments = exportedNote.imageAttachments.map((img) => ({
      id: img.id,
      blob: dataUrlToBlob(img.dataUrl),
      name: img.name,
      width: img.width,
      height: img.height,
      createdAt: img.createdAt,
    }));

    notes.push({
      id: exportedNote.id,
      title: exportedNote.title,
      content: exportedNote.content,
      audioAttachments,
      imageAttachments,
      createdAt: exportedNote.createdAt,
      updatedAt: exportedNote.updatedAt,
    });
  }

  return notes;
}

/**
 * 将 NoteDB 转换为导出格式
 */
async function convertNoteToExport(note: NoteDB): Promise<ExportData['notes'][0]> {
  const audioAttachments = await Promise.all(
    note.audioAttachments.map(async (a) => ({
      id: a.id,
      name: a.name,
      duration: a.duration,
      createdAt: a.createdAt,
      dataUrl: await blobToDataUrl(a.blob),
      mimeType: a.blob.type,
    }))
  );

  const imageAttachments = await Promise.all(
    note.imageAttachments.map(async (img) => ({
      id: img.id,
      name: img.name,
      width: img.width,
      height: img.height,
      createdAt: img.createdAt,
      dataUrl: await blobToDataUrl(img.blob),
      mimeType: img.blob.type,
    }))
  );

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    audioAttachments,
    imageAttachments,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * 从 Blob 获取文件扩展名
 */
function getExtensionFromBlob(blob: Blob, fallback: string = 'webm'): string {
  if (blob.type.includes('webm')) return '.webm';
  if (blob.type.includes('mp4') || blob.type.includes('m4a')) return '.m4a';
  if (blob.type.includes('ogg')) return '.ogg';
  if (blob.type.includes('wav')) return '.wav';
  if (blob.type.includes('jpeg') || blob.type.includes('jpg')) return '.jpg';
  if (blob.type.includes('png')) return '.png';
  if (blob.type.includes('gif')) return '.gif';
  if (blob.type.includes('webp')) return '.webp';
  return `.${fallback}`;
}

/**
 * 格式化日期为文件名安全格式
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

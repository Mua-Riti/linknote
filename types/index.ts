// ========== 附件类型 ==========
export interface AudioAttachment {
  id: string;
  blob: Blob;
  name: string;
  duration: number; // 秒
  createdAt: number;
}

export interface ImageAttachment {
  id: string;
  blob: Blob;
  name: string;
  width: number;
  height: number;
  createdAt: number;
}

// ========== 便签核心类型 ==========
export interface Note {
  id: string;
  title: string;
  content: string; // 纯文本内容，含 [[title]] 引用语法
  audioAttachments: AudioAttachment[];
  imageAttachments: ImageAttachment[];
  createdAt: number;
  updatedAt: number;
}

// IndexedDB 中存储的序列化版本（Blob 直接存）
export interface NoteDB {
  id: string;
  title: string;
  content: string;
  audioAttachments: Array<{
    id: string;
    blob: Blob;
    name: string;
    duration: number;
    createdAt: number;
  }>;
  imageAttachments: Array<{
    id: string;
    blob: Blob;
    name: string;
    width: number;
    height: number;
    createdAt: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

// ========== 导出/导入类型 ==========
export interface ExportData {
  version: string;
  exportedAt: number;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    audioAttachments: Array<{
      id: string;
      name: string;
      duration: number;
      createdAt: number;
      dataUrl: string; // base64
      mimeType: string;
    }>;
    imageAttachments: Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      createdAt: number;
      dataUrl: string; // base64
      mimeType: string;
    }>;
    createdAt: number;
    updatedAt: number;
  }>;
}

// ========== 链接类型 ==========
export interface NoteLink {
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
}

// ========== 视图状态 ==========
export type AppView = 'list' | 'editor' | 'graph';

// ========== 搜索高亮 ==========
export interface SearchMatch {
  noteId: string;
  field: 'title' | 'content';
  indices: Array<[number, number]>; // [start, end] 字符位置对
}

// ========== 图谱节点 ==========
export interface GraphNode {
  id: string;
  title: string;
  refCount: number; // 被引用次数
}

export interface GraphEdge {
  source: string;
  target: string;
}

// ========== 过滤排序 ==========
export type SortOrder = 'updatedAt-desc' | 'updatedAt-asc' | 'title-asc' | 'title-desc' | 'createdAt-desc' | 'createdAt-asc';

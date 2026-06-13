import { create } from 'zustand';
import type { Note, NoteDB, NoteLink, AppView, SortOrder } from '../types';
import * as db from '../db';
import { parseLinks, findNoteByTitle } from '../utils/parser';

// ========== Store 接口 ==========
interface NoteStore {
  // 状态
  notes: NoteDB[];
  selectedNoteId: string | null;
  searchQuery: string;
  view: AppView;
  sortOrder: SortOrder;
  isLoading: boolean;
  isSaving: boolean;

  // 初始化
  loadNotes: () => Promise<void>;

  // CRUD
  createNote: () => Promise<string>;
  updateNote: (id: string, updates: Partial<NoteDB>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<string>;

  // 选择
  selectNote: (id: string | null) => void;

  // 搜索 & 视图
  setSearchQuery: (query: string) => void;
  setView: (view: AppView) => void;
  setSortOrder: (order: SortOrder) => void;

  // 计算属性辅助
  getNoteById: (id: string) => NoteDB | undefined;
  getBacklinks: (noteId: string) => Array<{ note: NoteDB; matchedTitle: string }>;
  getForwardLinks: (noteId: string) => Array<{ noteId: string; title: string }>;
  getAllLinks: () => NoteLink[];
  getFilteredNotes: () => NoteDB[];

  // 图谱数据
  getGraphData: () => { nodes: Array<{ id: string; title: string; refCount: number }>; edges: Array<{ source: string; target: string }> };
}

// ========== 辅助函数 ==========
function sortNotes(notes: NoteDB[], order: SortOrder): NoteDB[] {
  const sorted = [...notes];
  switch (order) {
    case 'updatedAt-desc':
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    case 'updatedAt-asc':
      return sorted.sort((a, b) => a.updatedAt - b.updatedAt);
    case 'createdAt-desc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'createdAt-asc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'));
    default:
      return sorted;
  }
}

// ========== Store 实现 ==========
export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  searchQuery: '',
  view: 'list',
  sortOrder: 'updatedAt-desc',
  isLoading: true,
  isSaving: false,

  // ---------- 加载所有便签 ----------
  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await db.getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('加载便签失败:', error);
      set({ isLoading: false });
    }
  },

  // ---------- 创建便签 ----------
  createNote: async () => {
    const id = db.generateId();
    const now = Date.now();
    const newNote: NoteDB = {
      id,
      title: `便签 ${new Date(now).toLocaleString('zh-CN')}`,
      content: '',
      audioAttachments: [],
      imageAttachments: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.putNote(newNote);
      set((state) => ({ notes: [newNote, ...state.notes], selectedNoteId: id, view: 'editor' }));
    } catch (error) {
      console.error('创建便签失败:', error);
    }
    return id;
  },

  // ---------- 更新便签 ----------
  updateNote: async (id, updates) => {
    set({ isSaving: true });
    try {
      const { notes } = get();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return;

      const updatedNote: NoteDB = {
        ...notes[index],
        ...updates,
        updatedAt: Date.now(),
      };

      const newNotes = [...notes];
      newNotes[index] = updatedNote;
      set({ notes: newNotes });

      // 异步写入 IndexedDB（自动保存）
      await db.putNote(updatedNote);
    } catch (error) {
      console.error('保存便签失败:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  // ---------- 删除便签 ----------
  deleteNote: async (id) => {
    try {
      await db.deleteNoteFromDB(id);
      set((state) => {
        const newNotes = state.notes.filter((n) => n.id !== id);
        const newSelectedId = state.selectedNoteId === id ? null : state.selectedNoteId;
        return { notes: newNotes, selectedNoteId: newSelectedId };
      });
    } catch (error) {
      console.error('删除便签失败:', error);
    }
  },

  // ---------- 复制便签 ----------
  duplicateNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return '';

    const newId = db.generateId();
    const now = Date.now();
    const duplicated: NoteDB = {
      ...note,
      id: newId,
      title: `${note.title} (副本)`,
      createdAt: now,
      updatedAt: now,
      // 复制 Blob 数据
      audioAttachments: note.audioAttachments.map((a) => ({ ...a, id: db.generateId() })),
      imageAttachments: note.imageAttachments.map((img) => ({ ...img, id: db.generateId() })),
    };

    await db.putNote(duplicated);
    set((state) => ({ notes: [duplicated, ...state.notes], selectedNoteId: newId }));
    return newId;
  },

  // ---------- 选择便签 ----------
  selectNote: (id) => {
    set({ selectedNoteId: id, view: id ? 'editor' : 'list' });
  },

  // ---------- 搜索 ----------
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // ---------- 视图 ----------
  setView: (view) => {
    set({ view });
  },

  // ---------- 排序 ----------
  setSortOrder: (order) => {
    set({ sortOrder: order });
  },

  // ---------- 获取单个便签 ----------
  getNoteById: (id) => {
    return get().notes.find((n) => n.id === id);
  },

  // ---------- 反向链接：哪些便签引用了当前便签 ----------
  getBacklinks: (noteId) => {
    const { notes } = get();
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote) return [];

    const backlinks: Array<{ note: NoteDB; matchedTitle: string }> = [];

    for (const note of notes) {
      if (note.id === noteId) continue;

      // 解析该便签中的所有 [[链接]]
      const links = parseLinks(note.content);
      for (const linkTitle of links) {
        // 用标题匹配（大小写不敏感、去除首尾空格）
        const matchTitle = targetNote.title.trim();
        const linkTitleTrimmed = linkTitle.trim();
        if (
          linkTitleTrimmed.toLowerCase() === matchTitle.toLowerCase() ||
          // 也用 ID 匹配（通过标题查 ID）
          findNoteByTitle(notes, linkTitleTrimmed)?.id === noteId
        ) {
          backlinks.push({ note, matchedTitle: linkTitleTrimmed });
        }
      }
    }

    // 去重（同一个便签可能包含多个相同引用）
    const seen = new Set<string>();
    return backlinks.filter((b) => {
      const key = b.note.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  // ---------- 正向链接：当前便签引用了哪些便签 ----------
  getForwardLinks: (noteId) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return [];

    const links = parseLinks(note.content);
    const result: Array<{ noteId: string; title: string }> = [];
    const seen = new Set<string>();

    for (const linkTitle of links) {
      const target = findNoteByTitle(notes, linkTitle.trim());
      if (target && !seen.has(target.id)) {
        seen.add(target.id);
        result.push({ noteId: target.id, title: target.title });
      }
    }

    return result;
  },

  // ---------- 获取所有链接 ----------
  getAllLinks: () => {
    const { notes } = get();
    const links: NoteLink[] = [];
    const seen = new Set<string>();

    for (const note of notes) {
      const parsed = parseLinks(note.content);
      for (const linkTitle of parsed) {
        const target = findNoteByTitle(notes, linkTitle.trim());
        if (target && target.id !== note.id) {
          const key = `${note.id}->${target.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              sourceId: note.id,
              targetId: target.id,
              sourceTitle: note.title,
              targetTitle: target.title,
            });
          }
        }
      }
    }

    return links;
  },

  // ---------- 过滤便签 ----------
  getFilteredNotes: () => {
    const { notes, searchQuery, sortOrder } = get();
    let filtered = notes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      );
    }

    return sortNotes(filtered, sortOrder);
  },

  // ---------- 图谱数据 ----------
  getGraphData: () => {
    const { notes } = get();
    const allLinks = get().getAllLinks();

    // 计算每个节点的引用计数
    const refCounts = new Map<string, number>();
    for (const link of allLinks) {
      refCounts.set(link.targetId, (refCounts.get(link.targetId) || 0) + 1);
    }

    // 只包含有链接关系的节点 + 被链接的节点
    const linkedNodeIds = new Set<string>();
    for (const link of allLinks) {
      linkedNodeIds.add(link.sourceId);
      linkedNodeIds.add(link.targetId);
    }

    const nodes = notes
      .filter((n) => linkedNodeIds.has(n.id))
      .map((n) => ({
        id: n.id,
        title: n.title,
        refCount: refCounts.get(n.id) || 0,
      }));

    const edges = allLinks.map((l) => ({
      source: l.sourceId,
      target: l.targetId,
    }));

    return { nodes, edges };
  },
}));

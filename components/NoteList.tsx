import React, { useCallback, useMemo } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import NoteCard from './NoteCard';
import SearchBar from './SearchBar';
import type { SortOrder } from '../types';

interface NoteListProps {
  onClose?: () => void;
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'updatedAt-desc', label: '最近更新' },
  { value: 'createdAt-desc', label: '最近创建' },
  { value: 'title-asc', label: '标题 A-Z' },
  { value: 'title-desc', label: '标题 Z-A' },
];

const NoteList: React.FC<NoteListProps> = ({ onClose }) => {
  const {
    selectedNoteId,
    searchQuery,
    sortOrder,
    createNote,
    selectNote,
    setSortOrder,
    getFilteredNotes,
  } = useNoteStore();

  const filteredNotes = getFilteredNotes();

  const handleSelect = useCallback(
    (id: string) => {
      selectNote(id);
      onClose?.();
    },
    [selectNote, onClose]
  );

  const handleCreate = useCallback(async () => {
    await createNote();
    onClose?.();
  }, [createNote, onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-sm">
              📒
            </span>
            便签列表
          </h2>
          <button
            onClick={handleCreate}
            className="btn btn-primary w-9 h-9 rounded-xl text-lg shadow-glow-sm"
            title="新建便签"
          >
            +
          </button>
        </div>

        <SearchBar />

        {/* 排序选项 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortOrder(opt.value)}
              className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                sortOrder === opt.value
                  ? 'bg-brand-100 text-brand-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4
                            animate-float">
              <span className="text-3xl">
                {searchQuery ? '🔍' : '✨'}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {searchQuery ? '没有找到匹配的便签' : '还没有便签'}
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery
                ? '试试其他关键词'
                : '点击右上角 + 创建第一条便签'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNotes.map((note, idx) => (
              <div
                key={note.id}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
              >
                <NoteCard
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={handleSelect}
                  searchQuery={searchQuery}
                />
              </div>
            ))}
          </div>
        )}

        {/* 底部统计 */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            共 <span className="font-semibold text-gray-500">{filteredNotes.length}</span> 条
            {searchQuery && (
              <span> · 搜索 "<span className="text-brand-500">{searchQuery}</span>"</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoteList;

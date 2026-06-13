import React, { useMemo } from 'react';
import type { NoteDB } from '../types';
import { getContentPreview } from '../utils/parser';

interface NoteCardProps {
  note: NoteDB;
  isSelected: boolean;
  onSelect: (id: string) => void;
  searchQuery?: string;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isSelected, onSelect }) => {
  const preview = useMemo(() => getContentPreview(note.content, 100), [note.content]);
  const hasAudio = note.audioAttachments.length > 0;
  const hasImage = note.imageAttachments.length > 0;
  const hasContent = note.content.length > 0;
  const hasLinks = note.content.includes('[[');

  const formattedDate = useMemo(() => {
    const d = new Date(note.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 7) return `${diffDay} 天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }, [note.updatedAt]);

  return (
    <div
      onClick={() => onSelect(note.id)}
      className={`
        group cursor-pointer rounded-2xl p-4 transition-all duration-300
        border
        ${isSelected
          ? 'card-active animate-border-glow'
          : 'card hover:shadow-md hover:-translate-y-0.5 border-transparent hover:border-gray-200'
        }
      `}
    >
      {/* 顶部色条 */}
      <div className={`
        h-1 rounded-full mb-3 transition-all duration-300
        ${isSelected
          ? 'bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600'
          : 'bg-gradient-to-r from-gray-200 to-gray-100 group-hover:from-brand-200 group-hover:to-brand-300'
        }
      `} />

      {/* 标题行 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`
          font-semibold truncate flex-1 text-sm leading-snug transition-colors duration-200
          ${isSelected ? 'text-brand-700' : 'text-gray-800 group-hover:text-gray-900'}
        `}>
          {note.title || '无标题'}
        </h3>
        {/* 媒体徽标 */}
        <div className="flex items-center gap-1 shrink-0">
          {hasLinks && (
            <span className="badge badge-brand text-[10px]">🔗</span>
          )}
          {hasAudio && (
            <span className="badge text-[10px] bg-rose-100 text-rose-600" title={`${note.audioAttachments.length} 段录音`}>
              🎤 {note.audioAttachments.length}
            </span>
          )}
          {hasImage && (
            <span className="badge text-[10px] bg-sky-100 text-sky-600" title={`${note.imageAttachments.length} 张图片`}>
              🖼️ {note.imageAttachments.length}
            </span>
          )}
          {!hasContent && !hasAudio && !hasImage && (
            <span className="text-xs text-gray-300">📄</span>
          )}
        </div>
      </div>

      {/* 内容预览 */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
        {preview || (
          <span className="text-gray-300 italic">空便签 — 点击开始编辑</span>
        )}
      </p>

      {/* 底部信息栏 */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formattedDate}
        </span>
        <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          点击编辑 →
        </span>
      </div>
    </div>
  );
};

export default React.memo(NoteCard);

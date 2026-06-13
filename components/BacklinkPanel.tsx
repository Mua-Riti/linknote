import React, { useMemo } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { getContentPreview } from '../utils/parser';

interface BacklinkPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

const BacklinkPanel: React.FC<BacklinkPanelProps> = ({ noteId, onNavigate }) => {
  const getBacklinks = useNoteStore((s) => s.getBacklinks);
  const getForwardLinks = useNoteStore((s) => s.getForwardLinks);

  const backlinks = useMemo(() => getBacklinks(noteId), [noteId, getBacklinks]);
  const forwardLinks = useMemo(() => getForwardLinks(noteId), [noteId, getForwardLinks]);

  if (backlinks.length === 0 && forwardLinks.length === 0) {
    return (
      <div className="border-t border-gray-100 pt-5 mt-2">
        <div className="text-center py-6">
          <span className="text-2xl opacity-50">🔗</span>
          <p className="text-xs text-gray-400 mt-2">
            暂无关联 — 在其他便签中使用 <code className="bg-gray-100 text-brand-600 px-1 rounded">[[此便签标题]]</code> 即可建立引用
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 pt-5 mt-2 space-y-5">
      {/* 反向链接 — 谁引用了我 */}
      {backlinks.length > 0 && (
        <div className="animate-slide-up">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            被以下便签引用
            <span className="badge badge-warning text-[10px]">{backlinks.length}</span>
          </h4>
          <div className="space-y-2">
            {backlinks.map(({ note }) => (
              <button
                key={note.id}
                onClick={() => onNavigate(note.id)}
                className="w-full text-left p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/60
                           hover:bg-amber-100 hover:border-amber-300 hover:-translate-y-0.5
                           transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">
                      {note.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {getContentPreview(note.content, 60)}
                    </p>
                  </div>
                  <span className="shrink-0 text-amber-400 opacity-0 group-hover:opacity-100
                                   transition-all duration-200 transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 正向链接 — 我引用了谁 */}
      {forwardLinks.length > 0 && (
        <div className="animate-slide-up">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            引用了以下便签
            <span className="badge badge-brand text-[10px]">{forwardLinks.length}</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {forwardLinks.map((link) => (
              <button
                key={link.noteId}
                onClick={() => onNavigate(link.noteId)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl
                           bg-brand-50 text-brand-700 text-sm font-medium
                           border border-brand-200/60
                           hover:bg-brand-100 hover:border-brand-300
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="text-xs">📎</span>
                {link.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BacklinkPanel);

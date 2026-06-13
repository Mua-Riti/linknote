import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import VoiceRecorder from './VoiceRecorder';
import ImageUploader from './ImageUploader';
import BacklinkPanel from './BacklinkPanel';
import ConfirmDialog from './ConfirmDialog';
import type { AudioAttachment, ImageAttachment } from '../types';
import { renderContentWithLinks } from '../utils/parser';

interface NoteEditorProps {
  noteId: string;
  onClose?: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ noteId, onClose }) => {
  const {
    notes,
    updateNote,
    deleteNote,
    selectNote,
    duplicateNote,
  } = useNoteStore();

  const note = notes.find((n) => n.id === noteId);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [linkSuggestions, setLinkSuggestions] = useState<Array<{ id: string; title: string }>>([]);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaved, setIsSaved] = useState(true);

  // 同步 note 数据到本地状态（仅在切换便签时）
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsSaved(true);
    }
  }, [note?.id]);

  // 自动保存
  const save = useCallback(
    (newTitle?: string, newContent?: string) => {
      if (!note) return;
      const t = newTitle !== undefined ? newTitle : title;
      const c = newContent !== undefined ? newContent : content;

      setIsSaved(false);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(() => {
        updateNote(note.id, { title: t, content: c });
        setIsSaved(true);
      }, 600);
    },
    [note, title, content, updateNote]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTitle(val);
      save(val, undefined);
    },
    [save]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setContent(val);
      save(undefined, val);

      // [[ 自动补全检测
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = val.substring(0, cursorPos);
      const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');

      if (lastOpenBrackets !== -1) {
        const textAfterOpen = textBeforeCursor.substring(lastOpenBrackets + 2);
        if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n')) {
          const query = textAfterOpen.toLowerCase();
          const suggestions = notes
            .filter((n) => n.id !== noteId && n.title.toLowerCase().includes(query))
            .slice(0, 5)
            .map((n) => ({ id: n.id, title: n.title }));
          setLinkSuggestions(suggestions);
          setShowLinkSuggestions(suggestions.length > 0);
          return;
        }
      }
      setShowLinkSuggestions(false);
    },
    [save, notes, noteId]
  );

  const handleInsertLink = useCallback(
    (linkTitle: string) => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const textBefore = content.substring(0, cursorPos);
      const textAfter = content.substring(cursorPos);
      const lastOpen = textBefore.lastIndexOf('[[');

      if (lastOpen !== -1) {
        const newText = textBefore.substring(0, lastOpen + 2) + linkTitle + ']] ' + textAfter;
        setContent(newText);
        save(undefined, newText);
        const newCursorPos = lastOpen + 2 + linkTitle.length + 3;
        setTimeout(() => {
          textarea.selectionStart = newCursorPos;
          textarea.selectionEnd = newCursorPos;
          textarea.focus();
        }, 0);
      }
      setShowLinkSuggestions(false);
    },
    [content, save]
  );

  const handleDelete = useCallback(async () => {
    await deleteNote(noteId);
    setShowDeleteConfirm(false);
    onClose?.();
  }, [deleteNote, noteId, onClose]);

  const handleNavigate = useCallback(
    (targetId: string) => selectNote(targetId),
    [selectNote]
  );

  const handleAddAudio = useCallback(
    (audio: AudioAttachment) => {
      if (!note) return;
      updateNote(note.id, { audioAttachments: [...note.audioAttachments, audio] });
    },
    [note, updateNote]
  );

  const handleDeleteAudio = useCallback(
    (audioId: string) => {
      if (!note) return;
      updateNote(note.id, {
        audioAttachments: note.audioAttachments.filter((a) => a.id !== audioId),
      });
    },
    [note, updateNote]
  );

  const handleAddImage = useCallback(
    (image: ImageAttachment) => {
      if (!note) return;
      updateNote(note.id, { imageAttachments: [...note.imageAttachments, image] });
    },
    [note, updateNote]
  );

  const handleDeleteImage = useCallback(
    (imageId: string) => {
      if (!note) return;
      updateNote(note.id, {
        imageAttachments: note.imageAttachments.filter((img) => img.id !== imageId),
      });
    },
    [note, updateNote]
  );

  const handleDuplicate = useCallback(async () => {
    if (!note) return;
    const newId = await duplicateNote(note.id);
    if (newId) selectNote(newId);
  }, [note, duplicateNote, selectNote]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = content.substring(0, start) + '  ' + content.substring(end);
        setContent(newText);
        save(undefined, newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    },
    [content, save]
  );

  const previewHtml = note
    ? renderContentWithLinks(note.content, new Set(notes.map((n) => n.id)), notes)
    : '';

  const handlePreviewLinkClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const linkRef = target.closest('.link-ref') as HTMLElement | null;
      if (linkRef?.dataset.noteId) selectNote(linkRef.dataset.noteId);
    },
    [selectNote]
  );

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <span className="text-5xl animate-float">📭</span>
        <p className="text-gray-400 text-sm">便签不存在或已被删除</p>
      </div>
    );
  }

  const wordCount = content.replace(/\s/g, '').length;
  const linkCount = (content.match(/\[\[([^\]]+)\]\]/g) || []).length;

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-sm">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="lg:hidden btn-ghost p-2 rounded-lg"
            title="返回列表"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 便签元信息 */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(note.createdAt).toLocaleString('zh-CN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
            <span>·</span>
            <span>{wordCount} 字</span>
            {linkCount > 0 && (
              <>
                <span>·</span>
                <span className="text-brand-500">{linkCount} 条链接</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 保存状态 */}
          <span className={`text-[11px] mr-1 transition-colors duration-300 ${
            isSaved ? 'text-emerald-500' : 'text-amber-500 animate-pulse'
          }`}>
            {isSaved ? '✓ 已保存' : '● 保存中'}
          </span>

          {/* 预览切换 */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              showPreview
                ? 'bg-brand-100 text-brand-700 shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {showPreview ? '✏️ 编辑' : '👁 预览'}
          </button>

          {/* 复制 */}
          <button
            onClick={handleDuplicate}
            className="btn-ghost p-1.5 rounded-lg"
            title="复制便签"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* 删除 */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost p-1.5 rounded-lg hover:text-red-500 hover:bg-red-50"
            title="删除便签"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* 标题 */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="输入标题…"
            className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none
                       outline-none placeholder-gray-300 tracking-tight"
          />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-transparent
                          rounded-full opacity-50" />
        </div>

        {/* 内容 / 预览 */}
        {showPreview ? (
          <div
            className="prose prose-sm max-w-none min-h-[200px] p-5 bg-gradient-card rounded-2xl
                       border border-gray-100 shadow-inner
                       [&_.link-ref]:text-brand-600 [&_.link-ref]:cursor-pointer
                       [&_.link-ref]:font-semibold [&_.link-ref]:no-underline
                       [&_.link-ref]:bg-brand-50 [&_.link-ref]:px-1.5 [&_.link-ref]:rounded
                       [&_.link-ref:hover]:bg-brand-100
                       [&_.link-ref-unresolved]:text-gray-400 [&_.link-ref-unresolved]:cursor-not-allowed
                       [&_.link-ref-unresolved]:line-through
                       [&_.search-highlight]:bg-yellow-100 [&_.search-highlight]:rounded
                       whitespace-pre-wrap break-words leading-relaxed"
            onClick={handlePreviewLinkClick}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder={
                '开始输入内容…\n\n💡 使用 [[便签标题]] 创建双向关联\n⌨️ 按 Tab 键插入缩进'
              }
              className="w-full min-h-[240px] text-[15px] text-gray-700 bg-transparent
                         border-none outline-none resize-none placeholder-gray-300
                         leading-relaxed"
              rows={12}
            />

            {/* [[ 链接自动补全 */}
            {showLinkSuggestions && (
              <div className="absolute z-10 mt-1 w-72 bg-white border border-gray-200 rounded-2xl
                              shadow-xl overflow-hidden animate-scale-in">
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide
                                bg-gray-50 border-b border-gray-100">
                  引用便签
                </div>
                {linkSuggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleInsertLink(s.title)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-brand-50
                               transition-colors border-b border-gray-50 last:border-b-0
                               flex items-center gap-2"
                  >
                    <span className="text-brand-400">📎</span>
                    <span className="text-gray-800 font-medium">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 多媒体区域 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              多媒体附件
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-4 bg-rose-50/50 border-rose-100">
              <h4 className="text-xs font-semibold text-rose-600 mb-3 flex items-center gap-1.5">
                <span>🎤</span> 语音录音
              </h4>
              <VoiceRecorder
                audioAttachments={note.audioAttachments}
                onAddAudio={handleAddAudio}
                onDeleteAudio={handleDeleteAudio}
              />
            </div>
            <div className="card p-4 bg-sky-50/50 border-sky-100">
              <h4 className="text-xs font-semibold text-sky-600 mb-3 flex items-center gap-1.5">
                <span>🖼️</span> 图片附件
              </h4>
              <ImageUploader
                imageAttachments={note.imageAttachments}
                onAddImage={handleAddImage}
                onDeleteImage={handleDeleteImage}
              />
            </div>
          </div>
        </div>

        {/* 反向链接面板 */}
        <BacklinkPanel noteId={noteId} onNavigate={handleNavigate} />
      </div>

      {/* 删除确认 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除便签"
        message={`确定要删除「${note.title}」吗？此操作无法撤销。`}
        confirmLabel="确认删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default NoteEditor;

import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import GraphView from './GraphView';
import ExportImport from './ExportImport';

const Layout: React.FC = () => {
  const {
    isLoading,
    notes,
    view,
    selectedNoteId,
    loadNotes,
    selectNote,
    setView,
    isSaving,
  } = useNoteStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 当选中的便签被删除时，自动返回列表
  useEffect(() => {
    if (selectedNoteId && !notes.find((n) => n.id === selectedNoteId)) {
      selectNote(null);
      setView('list');
    }
  }, [notes, selectedNoteId, selectNote, setView]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-page gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand animate-float flex items-center justify-center shadow-glow-md">
            <span className="text-3xl">🔗</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-400 animate-pulse-soft" />
        </div>
        <p className="text-brand-600 font-medium animate-pulse-soft">LinkNote 加载中…</p>
        {/* 骨架预览 */}
        <div className="w-64 space-y-3">
          <div className="h-4 skeleton rounded-lg" />
          <div className="h-4 skeleton rounded-lg w-3/4" />
          <div className="h-4 skeleton rounded-lg w-1/2" />
        </div>
      </div>
    );
  }

  const selectedNote = selectedNoteId
    ? notes.find((n) => n.id === selectedNoteId)
    : null;

  return (
    <div className="h-screen flex flex-col bg-gradient-page">
      {/* ========== 顶部导航栏 ========== */}
      <header className="glass-strong sticky top-0 z-30 shrink-0 border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-full">
          {/* 左侧品牌 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                selectNote(null);
                setView('list');
              }}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center
                              shadow-md group-hover:shadow-glow-md transition-all duration-300
                              group-hover:scale-105 group-active:scale-95">
                <span className="text-lg">🔗</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                  Link<span className="text-brand-500">Note</span>
                </h1>
              </div>
            </button>
            <span className="hidden sm:inline-flex badge badge-brand text-[10px]">BETA</span>
          </div>

          {/* 中间视图切换 */}
          <div className="flex items-center bg-gray-100/80 rounded-xl p-0.5 backdrop-blur-sm">
            <button
              onClick={() => setView('list')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                view === 'list' || view === 'editor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-sm">📋</span>
              <span className="hidden sm:inline">列表</span>
            </button>
            <button
              onClick={() => setView('graph')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                view === 'graph'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-sm">🕸️</span>
              <span className="hidden sm:inline">图谱</span>
            </button>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-1">
            <ExportImport />
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg
                         hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ========== 主内容区 ========== */}
      <main className="flex-1 flex overflow-hidden">
        {/* 桌面端左侧列表 */}
        <aside
          className={`
            hidden lg:flex flex-col w-80 xl:w-84 shrink-0 border-r border-gray-200/60
            bg-white/40 backdrop-blur-sm
            ${view === 'graph' ? 'lg:hidden' : ''}
          `}
        >
          <NoteList />
        </aside>

        {/* 移动端列表视图 */}
        {(view === 'list' || (view === 'editor' && mobileMenuOpen)) && (
          <div className="flex-1 lg:hidden animate-slide-left">
            <NoteList onClose={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* 编辑区 */}
        {(view === 'editor' && !mobileMenuOpen) && selectedNoteId && (
          <div className="flex-1 flex flex-col animate-fade-in">
            <NoteEditor
              noteId={selectedNoteId}
              onClose={() => setView('list')}
            />
          </div>
        )}

        {/* 图谱视图 */}
        {view === 'graph' && (
          <div className="flex-1 animate-fade-in">
            <GraphView
              onNavigate={(id) => {
                selectNote(id);
                setView('editor');
              }}
              onClose={() => setView('list')}
            />
          </div>
        )}

        {/* 空状态（桌面端未选中便签） */}
        {view !== 'graph' && !selectedNoteId && (
          <div className="hidden lg:flex flex-1 items-center justify-center p-8">
            <div className="text-center max-w-sm animate-scale-in">
              {/* 装饰图标 */}
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-brand flex items-center justify-center
                                shadow-glow-md animate-float">
                  <span className="text-5xl">📝</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent-400
                                flex items-center justify-center text-white text-xs font-bold shadow-lg
                                animate-pulse-soft">
                  ✦
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                欢迎使用 <span className="text-gradient-brand">LinkNote</span>
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                一款以「双向关联」为核心的新式便签工具，帮助你构建个人知识网络
              </p>

              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-gray-100">
                  <span className="text-xl shrink-0">💡</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">双向链接</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      使用 <code className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded text-xs font-mono">[[便签标题]]</code> 创建关联
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-gray-100">
                  <span className="text-xl shrink-0">🎤</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">多媒体输入</p>
                    <p className="text-xs text-gray-500 mt-0.5">支持语音录音和图片粘贴上传</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-gray-100">
                  <span className="text-xl shrink-0">🕸️</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">知识图谱</p>
                    <p className="text-xs text-gray-500 mt-0.5">可视化浏览便签之间的关联网络</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const store = useNoteStore.getState();
                  store.createNote();
                }}
                className="mt-6 btn btn-primary px-6 py-3 text-sm gap-2 shadow-glow-sm"
              >
                <span className="text-lg">+</span>
                创建第一条便签
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========== 底部状态栏 ========== */}
      <footer className="glass-strong border-t border-gray-200/60 px-4 py-1.5
                        flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            <span className="font-semibold text-gray-700">{notes.length}</span> 条便签
          </span>
          {notes.length > 0 && (
            <span className="text-gray-400 hidden sm:inline">
              {notes.filter((n) => n.content.includes('[[')).length} 条含链接
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          }`} />
          <span className={isSaving ? 'text-amber-600' : 'text-gray-400'}>
            {isSaving ? '保存中…' : '已自动保存'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

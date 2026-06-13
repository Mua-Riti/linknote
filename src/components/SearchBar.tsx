import React, { useRef, useCallback, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';

const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery } = useNoteStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K 聚焦搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  return (
    <div className="relative group">
      {/* 搜索图标 */}
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
                   group-focus-within:text-brand-400 transition-colors duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索便签…"
        className="input-modern pl-10 pr-16 text-sm"
      />

      {/* 快捷键提示 / 清除按钮 */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {searchQuery ? (
          <button
            onClick={handleClear}
            className="w-6 h-6 flex items-center justify-center text-gray-400
                       hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]
                          text-gray-400 bg-gray-100 rounded-md font-mono">
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  );
};

export default SearchBar;

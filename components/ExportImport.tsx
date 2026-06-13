import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { exportAsJson, exportAsZip, importFromJson, importFromZip } from '../utils/exportData';
import { putNote } from '../db';
import ConfirmDialog from './ConfirmDialog';

const ExportImport: React.FC = () => {
  const { notes, loadNotes } = useNoteStore();
  const [showMenu, setShowMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingImportNotes, setPendingImportNotes] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const handleExportJson = useCallback(async () => {
    try {
      await exportAsJson(notes);
      showToast('📄 JSON 导出成功');
      setShowMenu(false);
    } catch (err) {
      showToast('❌ 导出失败，请重试');
    }
  }, [notes]);

  const handleExportZip = useCallback(async () => {
    try {
      await exportAsZip(notes);
      showToast('📦 ZIP 导出成功（含媒体文件）');
      setShowMenu(false);
    } catch (err) {
      showToast('❌ 导出失败，请重试');
    }
  }, [notes]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      let importedNotes: any[];
      if (file.name.endsWith('.zip')) {
        importedNotes = await importFromZip(file);
      } else if (file.name.endsWith('.json')) {
        importedNotes = await importFromJson(file);
      } else {
        showToast('⚠️ 不支持的文件格式');
        setImporting(false);
        return;
      }
      if (importedNotes.length === 0) {
        showToast('⚠️ 文件中没有便签数据');
        setImporting(false);
        return;
      }
      setPendingImportNotes(importedNotes);
      setShowOverwriteConfirm(true);
    } catch (err: any) {
      showToast(`❌ 导入失败: ${err.message || '未知错误'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    setShowOverwriteConfirm(false);
    setImporting(true);
    try {
      for (const note of pendingImportNotes) {
        await putNote(note);
      }
      await loadNotes();
      showToast(`✅ 成功导入 ${pendingImportNotes.length} 条便签`);
    } catch (err) {
      showToast('❌ 导入数据写入失败');
    } finally {
      setImporting(false);
      setPendingImportNotes([]);
    }
  }, [pendingImportNotes, loadNotes]);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`btn-ghost p-2 rounded-lg transition-all duration-200 ${
          showMenu ? 'bg-gray-100 text-gray-700' : ''
        }`}
        title="导出/导入"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl
                        shadow-xl z-30 overflow-hidden animate-scale-in">
          <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              数据管理
            </p>
          </div>
          <button
            onClick={handleExportJson}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50
                       flex items-center gap-3 transition-colors"
          >
            <span className="text-base">📄</span>
            <div>
              <p className="font-medium">导出 JSON</p>
              <p className="text-[11px] text-gray-400">纯数据备份文件</p>
            </div>
          </button>
          <button
            onClick={handleExportZip}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50
                       flex items-center gap-3 transition-colors"
          >
            <span className="text-base">📦</span>
            <div>
              <p className="font-medium">导出 ZIP</p>
              <p className="text-[11px] text-gray-400">含媒体文件完整备份</p>
            </div>
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50
                       flex items-center gap-3 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <>
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent
                                rounded-full animate-spin" />
                <span>导入中…</span>
              </>
            ) : (
              <>
                <span className="text-base">📥</span>
                <div>
                  <p className="font-medium">导入备份</p>
                  <p className="text-[11px] text-gray-400">恢复 JSON 或 ZIP</p>
                </div>
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* 导入确认 */}
      <ConfirmDialog
        open={showOverwriteConfirm}
        title="导入数据"
        message={`即将导入 ${pendingImportNotes.length} 条便签。相同 ID 的便签将被覆盖，确认继续？`}
        confirmLabel="确认导入"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setShowOverwriteConfirm(false);
          setPendingImportNotes([]);
        }}
      />

      {/* Toast */}
      {message && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
                        bg-gray-900 text-white text-sm px-4 py-2.5 rounded-2xl
                        shadow-xl animate-slide-up backdrop-blur-sm
                        flex items-center gap-2">
          {message}
        </div>
      )}
    </div>
  );
};

export default ExportImport;

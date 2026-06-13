import React, { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmBtnRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      {/* 对话框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6
                      animate-scale-in border border-gray-100">
        {/* 图标 */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto ${
          variant === 'danger'
            ? 'bg-red-100 text-red-500'
            : 'bg-brand-100 text-brand-500'
        }`}>
          {variant === 'danger' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
                       rounded-xl hover:bg-gray-200 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl
                        transition-all active:scale-95 ${
                          variant === 'danger'
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200'
                            : 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-lg shadow-brand-200'
                        }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

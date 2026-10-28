import { AlertTriangle, Info } from 'lucide-react';
import React from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  type?: 'danger' | 'warning' | 'primary';
  id?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant,
  type,
  id,
  isLoading = false,
}) => {
  const handleClose = onCancel || onClose || (() => {});
  const effectiveVariant = variant || type || 'danger';
  const effectiveConfirmLabel = confirmLabel || confirmText || 'Confirmar';
  const effectiveCancelLabel = cancelLabel || cancelText || 'Cancelar';

  const confirmBtnStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={isLoading ? () => {} : handleClose}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg shrink-0 border ${
              effectiveVariant === 'danger'
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : effectiveVariant === 'warning'
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            {effectiveVariant === 'danger' || effectiveVariant === 'warning' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed pt-0.5">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {effectiveCancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${confirmBtnStyles[effectiveVariant]}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            )}
            <span>{isLoading ? 'Processando...' : effectiveConfirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};


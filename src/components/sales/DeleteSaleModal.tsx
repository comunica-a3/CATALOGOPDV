import React, { useState } from 'react';
import { AlertTriangle, Trash2, Package, XCircle } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface DeleteSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (saleId: string, reason: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const DeleteSaleModal: React.FC<DeleteSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirm,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('Por favor, informe o motivo da exclusão da venda.');
      return;
    }
    if (cleanReason.length < 5) {
      setError('O motivo deve conter pelo menos 5 caracteres.');
      return;
    }

    try {
      setError(null);
      await onConfirm(sale.id, cleanReason);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir a venda.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) {
          setError(null);
          setReason('');
          onClose();
        }
      }}
      title="Exclusão de Venda Finalizada"
      subtitle={`Venda #${sale.saleNumber} • Operação com controle de auditoria`}
      maxWidth="lg"
      id="delete-sale-modal"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-950">
              Atenção: Ação com impacto em Estoque e Financeiro
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-rose-800">
              <li>O estoque dos produtos físicos será estornado automaticamente.</li>
              <li>As ordens de produção vinculadas serão canceladas.</li>
              <li>As contas a receber e parcelas serão canceladas.</li>
              <li>A venda será removida dos relatórios de faturamento e saldo de caixa.</li>
              <li>O histórico de auditoria registrará seu usuário, data, hora e motivo.</li>
            </ul>
          </div>
        </div>

        {/* Sale Summary Card */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Cliente:</span>
            <span className="font-bold text-slate-900">{sale.customerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Data da Venda:</span>
            <span className="font-mono text-slate-700">{formatDateTime(sale.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Valor Total:</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Valor Pago:</span>
            <span className="font-bold text-emerald-700">{formatCurrency(sale.paidAmount)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-medium block mb-1">Itens da Venda:</span>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {(sale.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                  <span>{item.quantity}x {item.itemName || (item as any)?.name || 'Item'}</span>
                  <span className="font-mono font-medium">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reason Field */}
        <div>
          <label htmlFor="deletion-reason" className="block text-xs font-bold text-slate-800 mb-1">
            Motivo da Exclusão <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="deletion-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Descreva detalhadamente o motivo da exclusão (ex: Venda duplicada, desistência do cliente com devolução de mercadoria, etc.)"
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            required
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-medium">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !reason.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

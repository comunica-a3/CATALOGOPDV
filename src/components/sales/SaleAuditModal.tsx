import React from 'react';
import { Clock, History, AlertTriangle, ShieldCheck, User as UserIcon, FileText } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface SaleAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleAuditModal: React.FC<SaleAuditModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  if (!sale) return null;

  const editHistory = sale.editHistory || [];
  const isExcluded = sale.status === 'EXCLUIDA' || sale.isDeleted;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Auditoria da Venda"
      subtitle={`Venda #${sale.saleNumber} • ${sale.customerName}`}
      maxWidth="xl"
      id="sale-audit-modal"
    >
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
        {/* Deletion Details if Excluded */}
        {isExcluded && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Venda Excluída (Soft Delete)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 font-medium">Excluída por:</span>{' '}
                <span className="font-bold text-rose-900">{sale.deletedByName || 'Administrador'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Data da Exclusão:</span>{' '}
                <span className="font-mono text-slate-800">
                  {sale.deletedAt ? formatDateTime(sale.deletedAt) : 'Registrado'}
                </span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-rose-200/60">
              <span className="text-slate-500 font-medium block">Motivo da Exclusão:</span>
              <p className="font-medium text-rose-950 bg-rose-100/60 p-2 rounded-lg mt-0.5 whitespace-pre-wrap">
                {sale.deletionReason || 'Motivo não informado.'}
              </p>
            </div>
          </div>
        )}

        {/* Creation Entry */}
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-900">Venda Criada e Finalizada</span>
              <span className="font-mono text-[10px] text-slate-400">{formatDateTime(sale.createdAt)}</span>
            </div>
            <p className="text-slate-600">
              Vendedor / Atendente: <strong>{sale.sellerName}</strong>
            </p>
            <p className="text-slate-600">
              Valor Original: <strong>{formatCurrency(sale.total)}</strong> • Itens: <strong>{(sale.items || []).length}</strong>
            </p>
          </div>
        </div>

        {/* Edit History Entries */}
        {editHistory.length > 0 ? (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Histórico de Alterações Realizadas ({editHistory.length})</span>
            </h4>

            {editHistory.map((entry, idx) => (
              <div key={entry.id || idx} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <History className="w-4 h-4" />
                </div>
                <div className="flex-1 bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                      Alteração realizada por {entry.editedByName || 'Usuário'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {formatDateTime(entry.editedAt)}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-amber-200 text-slate-800">
                    <span className="text-slate-500 font-medium block text-[10px] uppercase">
                      Motivo Informado:
                    </span>
                    <p className="font-medium text-slate-900 mt-0.5 whitespace-pre-wrap">{entry.reason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      Valor: {formatCurrency(entry.previousTotal)} →{' '}
                      <strong className="text-blue-700">{formatCurrency(entry.newTotal)}</strong>
                    </div>
                    <div>
                      Itens: {entry.previousItemsCount} →{' '}
                      <strong className="text-slate-900">{entry.newItemsCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isExcluded && (
            <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Esta venda ainda não sofreu nenhuma alteração posterior à sua finalização.
            </div>
          )
        )}

        {/* Annotations */}
        {Array.isArray((sale as any).annotations) && (sale as any).annotations.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Anotações e Observações Registradas</span>
            </h4>
            <div className="space-y-1.5">
              {(sale as any).annotations.map((ann: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1">
                    <span>{ann.authorName || 'Usuário'}</span>
                    <span>{formatDateTime(ann.createdAt)}</span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{ann.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};

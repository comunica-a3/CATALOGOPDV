import {
  AlertCircle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  StickyNote,
  User as UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage';
import { Sale, SaleAnnotation, User } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface SaleNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  currentUser?: User | null;
  onAnnotationAdded: () => void;
}

export const SaleNotesModal: React.FC<SaleNotesModalProps> = ({
  isOpen,
  onClose,
  sale,
  currentUser,
  onAnnotationAdded,
}) => {
  const [annotations, setAnnotations] = useState<SaleAnnotation[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load annotations whenever the modal is opened for a sale
  useEffect(() => {
    if (isOpen && sale) {
      setError(null);
      setNewNoteText('');
      const localAnnotations = StorageService.getSaleAnnotations(sale.id);
      setAnnotations(localAnnotations);
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteText.trim();
    if (!trimmed) {
      setError('Por favor, digite o conteúdo da anotação.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const added = await StorageService.addSaleAnnotation({
        saleId: sale.id,
        text: trimmed,
        user: currentUser || undefined,
      });

      setAnnotations((prev) => [added, ...prev]);
      setNewNoteText('');
      onAnnotationAdded();
    } catch (err: any) {
      setError(err?.message || 'Erro ao adicionar anotação na venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      id="sale-notes-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Anotações da Venda — ${sale.saleNumber}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Read-only Sale Header Overview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
              Cliente
            </span>
            <span className="font-bold text-slate-900 text-sm">{sale.customerName}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
              Vendedor Original
            </span>
            <span className="font-semibold text-slate-800">{sale.sellerName}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
              Data da Venda
            </span>
            <span className="font-mono text-slate-700">{formatDateTime(sale.createdAt)}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
              Valor Total
            </span>
            <span className="font-bold text-emerald-700 text-sm">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </div>

        {/* Security / Non-destructive guarantee notice */}
        <div className="flex items-start gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-800 text-[11px] leading-relaxed">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Adicionar anotações preserva integralmente os produtos, quantidades, valores, descontos,
            formas de pagamento e comissões da venda original.
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        {/* New Annotation Form */}
        <form onSubmit={handleAddAnnotation} className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Nova Anotação ou Observação Operacional
          </label>
          <div className="flex flex-col gap-2">
            <textarea
              id="new-sale-annotation-input"
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Ex: Cliente solicitou entrega via motoboy na quinta-feira; comprovante anexado; produto conferido..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Registrado por:{' '}
                <strong className="text-slate-600">{currentUser?.name || 'Usuário Atual'}</strong>
              </span>
              <button
                type="submit"
                id="submit-sale-annotation-button"
                disabled={isSubmitting || !newNoteText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Salvando...' : 'Adicionar Anotação'}</span>
              </button>
            </div>
          </div>
        </form>

        <hr className="border-slate-200 my-2" />

        {/* History of Annotations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <StickyNote className="w-3.5 h-3.5 text-blue-600" />
              <span>Histórico de Anotações ({annotations.length})</span>
            </h4>
          </div>

          {annotations.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-600">
                Nenhuma anotação registrada ainda para este pedido.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utilize o campo acima para adicionar anotações sem alterar os dados da venda.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {annotations.map((annot) => (
                <div
                  key={annot.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      <span>{annot.userName || 'Sistema'}</span>
                    </span>
                    <span className="font-mono text-slate-400 flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(annot.createdAt)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {annot.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Original/Legacy note if present */}
          {sale.notes && !annotations.some((a) => a.text === sale.notes) && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Observação Original do Pedido
              </span>
              <p className="text-amber-900 whitespace-pre-wrap text-[11px]">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            id="close-sale-notes-modal-button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Budget, CompanySettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { POSBudgetModal } from '../pos/POSBudgetModal';
import { BudgetDetailModal } from './BudgetDetailModal';

interface BudgetsViewProps {
  companySettings: CompanySettings;
  onNavigateToPDV?: (budgetItems?: any, customer?: any) => void;
  onSaleCreated?: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  companySettings,
  onNavigateToPDV,
  onSaleCreated,
}) => {
  const { isAdmin } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>(() => StorageService.getBudgets());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modals
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const term = (searchTerm || '').toLowerCase();
      const matchSearch =
        String(b.budgetNumber || '').toLowerCase().includes(term) ||
        String(b.customerName || '').toLowerCase().includes(term) ||
        (b.customerPhone && String(b.customerPhone).includes(term)) ||
        (b.sellerName && String(b.sellerName).toLowerCase().includes(term));

      const matchStatus = statusFilter === 'TODOS' || b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [budgets, searchTerm, statusFilter]);

  const handleRefresh = () => {
    setBudgets(StorageService.getBudgets());
  };

  const handleUpdateStatus = (budgetId: string, status: Budget['status']) => {
    StorageService.updateBudgetStatus(budgetId, status);
    handleRefresh();
    if (selectedBudget && selectedBudget.id === budgetId) {
      setSelectedBudget((prev) => (prev ? { ...prev, status } : null));
    }
    setToastMessage(`Status do orçamento atualizado para "${status}".`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleConvertToSale = (budget: Budget) => {
    try {
      const { sale } = StorageService.convertBudgetToSale(budget.id, {
        payments: [],
        paymentStatus: 'PENDENTE',
      });
      handleRefresh();
      if (onSaleCreated) {
        onSaleCreated();
      }
      setToastMessage(`Orçamento #${budget.budgetNumber} convertido na Venda #${sale.saleNumber} com sucesso!`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao converter orçamento');
    }
  };

  const handleConfirmDelete = () => {
    if (budgetToDelete) {
      StorageService.deleteBudget(budgetToDelete.id);
      setBudgetToDelete(null);
      handleRefresh();
      setToastMessage('Orçamento excluído com sucesso.');
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleExportCSV = () => {
    StorageService.exportBudgetsToCSV(filteredBudgets);
  };

  const handleSendWhatsApp = (b: Budget) => {
    let phone = b.customerPhone || '';
    if (!phone) {
      phone = prompt('Informe o número de WhatsApp do cliente (com DDD):', '') || '';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    let msg = `Olá *${b.customerName || 'Cliente'}*!\n\nSegue a proposta *Orçamento #${b.budgetNumber}* da *${companySettings.name || 'Nossa Empresa'}*:\n`;
    msg += `📅 *Emitido:* ${new Date(b.createdAt).toLocaleDateString('pt-BR')}\n`;
    msg += `⏳ *Validade:* ${new Date(b.validUntil).toLocaleDateString('pt-BR')}\n\n`;
    (b.items || []).forEach((item, index) => {
      const itemName = (item as any)?.itemName || item.item?.name || 'Item';
      msg += `${index + 1}. ${itemName} (Qtd: ${item.quantity}) - ${formatCurrency(item.totalPrice)}\n`;
    });
    msg += `\n💰 *VALOR TOTAL: ${formatCurrency(b.total)}*\n\nPodemos confirmar o seu pedido?`;

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getStatusBadge = (status: Budget['status']) => {
    switch (status) {
      case 'ABERTO':
        return <Badge variant="warning" size="sm">Em Aberto</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm">Aprovado</Badge>;
      case 'CONVERTIDO_EM_VENDA':
        return <Badge variant="primary" size="sm">Convertido</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm">Rejeitado</Badge>;
      case 'EXPIRADO':
        return <Badge variant="secondary" size="sm">Expirado</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  return (
    <div id="budgets-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Orçamentos e Propostas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gere e gerencie orçamentos comerciais com itens padrão ou itens personalizados sob demanda.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-export-budgets-csv"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Exportar orçamentos para CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            id="btn-create-direct-budget"
            onClick={() => setIsNewBudgetModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="budget-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número (#ORC-...), cliente, fone..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ABERTO', label: 'Em Aberto' },
              { id: 'APROVADO', label: 'Aprovados' },
              { id: 'CONVERTIDO_EM_VENDA', label: 'Convertidos em Venda' },
              { id: 'REJEITADO', label: 'Rejeitados' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Budgets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nº Orçamento</th>
                <th className="py-3.5 px-3">Cliente</th>
                <th className="py-3.5 px-3">Data / Validade</th>
                <th className="py-3.5 px-3">Itens</th>
                <th className="py-3.5 px-3">Valor Total</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>#{b.budgetNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block">
                        Por {b.sellerName || 'Vendedor'}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-900 break-words whitespace-normal leading-snug">{b.customerName}</p>
                      {b.customerPhone && (
                        <span className="text-[10px] text-slate-500 block">{b.customerPhone}</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-slate-700 font-medium block">
                        {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Válido até {new Date(b.validUntil).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    {/* Items count & preview */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800 block">
                        {(b.items || []).length} item(ns)
                      </span>
                      <span className="text-[11px] text-slate-600 block break-words whitespace-normal leading-tight">
                        {(b.items || []).map((i) => (i as any)?.itemName || i.item?.name || 'Item').join(', ')}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                      {formatCurrency(b.total)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      {getStatusBadge(b.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(b)}
                          title="Enviar via WhatsApp"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {/* Edit (if open) */}
                        {b.status === 'ABERTO' && (
                          <button
                            type="button"
                            onClick={() => setEditingBudget(b)}
                            title="Editar Orçamento"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Details & Print */}
                        <button
                          type="button"
                          onClick={() => setSelectedBudget(b)}
                          title="Ver Detalhes e Imprimir Proposta"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Convert to Sale */}
                        {b.status !== 'CONVERTIDO_EM_VENDA' && (
                          <button
                            type="button"
                            onClick={() => handleConvertToSale(b)}
                            title="Converter em Venda / Pedido"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete (Admin Only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setBudgetToDelete(b)}
                            title="Excluir Orçamento"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Nenhum orçamento encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clique em "+ Novo Orçamento" acima para criar uma proposta comercial com itens
                      ou itens personalizados.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View / Print Detail Modal */}
      {selectedBudget && (
        <BudgetDetailModal
          isOpen={!!selectedBudget}
          onClose={() => setSelectedBudget(null)}
          budget={selectedBudget}
          companySettings={companySettings}
          onConvertToSale={handleConvertToSale}
          onUpdateStatus={handleUpdateStatus}
          onEditBudget={(b) => {
            setSelectedBudget(null);
            setEditingBudget(b);
          }}
        />
      )}

      {/* Direct Create / Edit Budget Modal */}
      {(isNewBudgetModalOpen || editingBudget) && (
        <POSBudgetModal
          isOpen={isNewBudgetModalOpen || !!editingBudget}
          onClose={() => {
            setIsNewBudgetModalOpen(false);
            setEditingBudget(null);
          }}
          initialBudget={editingBudget}
          selectedCustomer={null}
          onSelectCustomer={() => {}}
          onBudgetSaved={() => {
            handleRefresh();
            setToastMessage('Orçamento salvo com sucesso!');
            setTimeout(() => setToastMessage(''), 4000);
          }}
          onBudgetUpdated={() => {
            handleRefresh();
            setToastMessage('Orçamento atualizado com sucesso!');
            setTimeout(() => setToastMessage(''), 4000);
          }}
          companySettings={companySettings}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Orçamento"
        message={`Deseja excluir o orçamento #${budgetToDelete?.budgetNumber}?`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />
    </div>
  );
};

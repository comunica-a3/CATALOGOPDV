import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  FileSpreadsheet,
  Filter,
  History,
  Layers,
  MessageCircle,
  MessageSquare,
  Percent,
  Printer,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { CompanySettings, PaymentStatus, Sale } from '../../types';
import { calculateSaleCommission } from '../../utils/commissions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadOrderReceiptPDF } from '../../utils/pdfReceipt';
import { buildSaleProductionTrackingWhatsAppMessage, openWhatsApp } from '../../utils/whatsappMessages';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { POSReceiptModal } from '../pos/POSReceiptModal';
import { ReceiptFormatSelectorModal } from '../pos/ReceiptFormatSelectorModal';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { SaleNotesModal } from './SaleNotesModal';
import { EditSaleModal } from './EditSaleModal';
import { DeleteSaleModal } from './DeleteSaleModal';
import { SaleAuditModal } from './SaleAuditModal';

interface SalesViewProps {
  sales: Sale[];
  companySettings: CompanySettings;
  onSalesChange: () => void;
  onNavigateToCommissions?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  companySettings,
  onSalesChange,
  onNavigateToCommissions,
}) => {
  const { isAdmin, currentUser, canEditCompletedSales, canDeleteCompletedSales } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [showDeletedSales, setShowDeletedSales] = useState(false);

  // Modals
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [downloadFormatSale, setDownloadFormatSale] = useState<Sale | null>(null);
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [notesSale, setNotesSale] = useState<Sale | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [auditSale, setAuditSale] = useState<Sale | null>(null);

  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Financial Metrics - Exclude CANCELADA and EXCLUIDA / isDeleted
  const metrics = useMemo(() => {
    const activeSales = sales.filter(
      (s) =>
        s.paymentStatus !== 'CANCELADO' &&
        s.status !== 'CANCELADA' &&
        s.status !== 'EXCLUIDA' &&
        !s.isDeleted
    );
    const totalBilled = activeSales.reduce((acc, s) => acc + s.total, 0);
    const totalPaid = activeSales.reduce((acc, s) => acc + s.paidAmount, 0);
    const totalReceivable = activeSales.reduce((acc, s) => acc + s.remainingAmount, 0);
    const totalProfit = activeSales.reduce((acc, s) => acc + (s.total - s.totalCost), 0);

    return {
      totalBilled,
      totalPaid,
      totalReceivable,
      totalProfit,
      count: activeSales.length,
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const isExcluded = s.status === 'EXCLUIDA' || s.isDeleted;

      // Handle soft deleted filter logic
      if (statusFilter !== 'EXCLUIDA' && isExcluded && !showDeletedSales) {
        return false;
      }
      if (statusFilter === 'EXCLUIDA' && !isExcluded) {
        return false;
      }
      if (statusFilter === 'EDITADA' && s.status !== 'EDITADA') {
        return false;
      }

      const term = (searchTerm || '').toLowerCase();
      const matchSearch =
        String(s.saleNumber || '').toLowerCase().includes(term) ||
        String(s.customerName || '').toLowerCase().includes(term) ||
        String(s.sellerName || '').toLowerCase().includes(term) ||
        Boolean(s.notes && String(s.notes).toLowerCase().includes(term));

      const matchStatus =
        statusFilter === 'TODOS' ||
        statusFilter === 'EXCLUIDA' ||
        statusFilter === 'EDITADA' ||
        s.paymentStatus === statusFilter ||
        (statusFilter === 'PENDENTE' && (s.paymentStatus === 'PENDENTE' || s.paymentStatus === 'A_PRAZO'));

      return matchSearch && matchStatus;
    });
  }, [sales, searchTerm, statusFilter, showDeletedSales]);

  const handleConfirmCancel = async () => {
    if (!saleToCancel) return;
    try {
      setIsCancelling(true);
      setCancelErrorMessage(null);
      StorageService.cancelSale(saleToCancel.id, currentUser || undefined);
      setSaleToCancel(null);
      setActionSuccessMessage(`Venda #${saleToCancel.saleNumber} cancelada com sucesso.`);
      onSalesChange();
    } catch (err: any) {
      console.error('Erro ao cancelar venda:', err);
      setCancelErrorMessage(err.message || 'Não foi possível cancelar a venda. Tente novamente.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmSoftDelete = async (saleId: string, reason: string) => {
    try {
      setIsDeleting(true);
      setCancelErrorMessage(null);
      StorageService.softDeleteSale({
        saleId,
        reason,
        user: currentUser || undefined,
      });
      setDeletingSale(null);
      setActionSuccessMessage('Venda excluída com sucesso. Estoque e contas a receber foram estornados.');
      onSalesChange();
    } catch (err: any) {
      console.error('Erro ao excluir venda:', err);
      setCancelErrorMessage(err.message || 'Não foi possível excluir a venda.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getProductionStatusLabel = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_PRODUCAO':
        return 'Aguardando Produção';
      case 'EM_PRODUCAO':
        return 'Em Produção';
      case 'REFAZER':
        return 'Refazer';
      case 'PRONTO':
        return 'Pronto para Entrega';
      case 'ENTREGUE':
        return 'Entregue ao Cliente';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleSendProductionStatus = (sale: Sale) => {
    // 1. Identificar cliente e telefone associados ao pedido
    let phone = sale.customerPhone;
    if (!phone && sale.customerId) {
      const customer = StorageService.getCustomerById(sale.customerId);
      if (customer && customer.phone) {
        phone = customer.phone;
      }
    }

    if (!phone) {
      alert(`O cliente ${sale.customerName} não possui telefone/WhatsApp cadastrado.`);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert(`O telefone do cliente ${sale.customerName} é inválido.`);
      return;
    }

    // 2. Identificar as ordens de produção gráfica do pedido
    const productionOrders = StorageService.getProductionOrders().filter(
      (po) => po.saleId === sale.id || po.saleNumber === sale.saleNumber
    );

    if (productionOrders.length === 0) {
      alert(`O pedido #${sale.saleNumber} não possui itens em produção gráfica gerados.`);
      return;
    }

    const companyName = companySettings?.name || 'Nossa Gráfica';
    const customerName = sale.customerName || 'Cliente';

    const ordersData = productionOrders.map((po) => ({
      quantity: po.quantity,
      itemName: po.itemName,
      statusLabel: getProductionStatusLabel(po.status),
      leadTime: po.leadTime,
    }));

    const msg = buildSaleProductionTrackingWhatsAppMessage({
      customerName,
      companyName,
      saleNumber: sale.saleNumber,
      orders: ordersData,
    });

    openWhatsApp(cleanPhone, msg);
  };

  const getStatusBadge = (sale: Sale) => {
    if (sale.status === 'EXCLUIDA' || sale.isDeleted) {
      return <Badge variant="danger" size="sm">Excluída</Badge>;
    }
    if (sale.paymentStatus === 'CANCELADO' || sale.status === 'CANCELADA') {
      return <Badge variant="gray" size="sm">Cancelada</Badge>;
    }

    switch (sale.paymentStatus) {
      case 'PAGO':
        return <Badge variant="success" size="sm">100% Pago</Badge>;
      case 'PARCIALMENTE_PAGO':
        return <Badge variant="warning" size="sm">Parcial (Saldo Aberto)</Badge>;
      case 'A_PRAZO':
        return <Badge variant="purple" size="sm">A Prazo</Badge>;
      case 'PENDENTE':
        return <Badge variant="danger" size="sm">Pendente</Badge>;
      default:
        return <Badge variant="gray" size="sm">{sale.paymentStatus}</Badge>;
    }
  };

  return (
    <div id="sales-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Faturamento e Contas a Receber</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visão consolidada de todas as vendas emitidas, baixas financeiras e saldos a receber.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-export-sales-csv"
            onClick={() => StorageService.exportSalesToCSV(filteredSales)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV ({filteredSales.length})</span>
          </button>

          {onNavigateToCommissions && (
            <button
              type="button"
              onClick={onNavigateToCommissions}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Relatório de Comissões</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Faturado</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.totalBilled)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            {metrics.count} vendas registradas
          </span>
        </div>

        {/* Total Paid in Cash/Cards */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recebido</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            Quitado no caixa/banco
          </span>
        </div>

        {/* Accounts Receivable (Saldo Aberto) */}
        <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">Contas a Receber</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrency(metrics.totalReceivable)}
          </p>
          <span className="text-[10px] text-amber-700/80 font-semibold block">
            Saldo pendente de clientes
          </span>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Lucro Bruto Estimado</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.totalProfit)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold block">
            Receita líquida (-) Custos
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº do pedido, cliente, vendedor..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'TODOS', label: 'Todas as Vendas' },
              { id: 'PAGO', label: '100% Pagas' },
              { id: 'PARCIALMENTE_PAGO', label: 'Parcial (A Receber)' },
              { id: 'A_PRAZO', label: 'A Prazo' },
              { id: 'PENDENTE', label: 'Pendentes' },
              { id: 'EDITADA', label: 'Editadas' },
              { id: 'CANCELADO', label: 'Canceladas' },
              { id: 'EXCLUIDA', label: 'Excluídas (Auditoria)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pedido e Data</th>
                <th className="py-3.5 px-3">Cliente</th>
                <th className="py-3.5 px-3">Itens</th>
                <th className="py-3.5 px-3">Total Líquido</th>
                <th className="py-3.5 px-3">Pago</th>
                <th className="py-3.5 px-3">Saldo a Receber</th>
                <th className="py-3.5 px-3">Status Pagamento</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const isExcluded = sale.status === 'EXCLUIDA' || sale.isDeleted;
                  const isEdited = sale.status === 'EDITADA';
                  const isCancelled = sale.paymentStatus === 'CANCELADO' || sale.status === 'CANCELADA';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExcluded
                          ? 'bg-rose-50/30 text-rose-950 opacity-60'
                          : isCancelled
                          ? 'opacity-40 line-through bg-slate-50'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {sale.saleNumber}
                          </span>
                          {isEdited && (
                            <Badge variant="purple" size="sm">
                              Editada
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                          {formatDateTime(sale.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900 break-words whitespace-normal leading-snug">{sale.customerName}</p>
                        <span className="text-[10px] text-slate-400 block">
                          Atendente: {sale.sellerName}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {(sale.items || []).reduce((a, b) => a + (b.quantity || 0), 0)} item(ns)
                        </span>
                        <div className="text-[11px] text-slate-500 break-words whitespace-normal leading-tight">
                          {(sale.items || []).map((i) => i.itemName || (i as any)?.name || 'Item').join(', ')}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {formatCurrency(sale.total)}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        {formatCurrency(sale.paidAmount)}
                      </td>

                      <td className="py-3.5 px-3 font-bold">
                        {sale.remainingAmount > 0 ? (
                          <div>
                            <span className="text-amber-700">
                              {formatCurrency(sale.remainingAmount)}
                            </span>
                            {sale.dueDate && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Venc: {new Date(sale.dueDate).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-normal">Quitado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">{getStatusBadge(sale)}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Payment Button if balance exists */}
                          {!isExcluded && !isCancelled && sale.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => setPaymentSale(sale)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Baixar Saldo</span>
                            </button>
                          )}

                          {/* Edit Finalized Sale */}
                          {!isExcluded && !isCancelled && canEditCompletedSales && (
                            <button
                              type="button"
                              onClick={() => setEditingSale(sale)}
                              title="Editar Venda Finalizada (Reabrir e recalcular)"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Send Production Status via WhatsApp */}
                          <button
                            type="button"
                            id={`sale-production-notify-btn-${sale.id}`}
                            onClick={() => handleSendProductionStatus(sale)}
                            title="Enviar status da produção gráfica para o cliente via WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Download Receipt PDF with Format Chooser */}
                          <button
                            type="button"
                            onClick={() => setDownloadFormatSale(sale)}
                            title="Baixar recibo em PDF (escolher A4, 80mm ou 58mm)"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* View Receipt Modal */}
                          <button
                            type="button"
                            onClick={() => setReceiptSale(sale)}
                            title="Visualizar e Baixar Recibo / Cupom"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Add / View Sale Annotations */}
                          <button
                            type="button"
                            id={`sale-notes-btn-${sale.id}`}
                            onClick={() => setNotesSale(sale)}
                            title="Anotações e Observações da Venda"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* View Audit History */}
                          <button
                            type="button"
                            onClick={() => setAuditSale(sale)}
                            title="Histórico de Auditoria e Alterações"
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Soft Delete Sale (Admin only) */}
                          {!isExcluded && canDeleteCompletedSales && (
                            <button
                              type="button"
                              onClick={() => setDeletingSale(sale)}
                              title="Excluir Venda (Soft Delete com Estorno)"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Sale (Admin only fallback) */}
                          {isAdmin && !isCancelled && !isExcluded && (
                            <button
                              type="button"
                              onClick={() => setSaleToCancel(sale)}
                              title="Cancelar Venda"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
          companySettings={companySettings}
          currentUser={currentUser}
          onSaleUpdated={() => {
            onSalesChange();
            setEditingSale(null);
            setActionSuccessMessage('Venda alterada e recalculada com sucesso!');
          }}
        />
      )}

      {/* Soft Delete Sale Modal */}
      {deletingSale && (
        <DeleteSaleModal
          isOpen={!!deletingSale}
          onClose={() => setDeletingSale(null)}
          sale={deletingSale}
          onConfirm={handleConfirmSoftDelete}
          isLoading={isDeleting}
        />
      )}

      {/* Audit History Modal */}
      {auditSale && (
        <SaleAuditModal
          isOpen={!!auditSale}
          onClose={() => setAuditSale(null)}
          sale={auditSale}
        />
      )}

      {/* Receipt Modal (Full View & Format Download) */}
      {receiptSale && (
        <POSReceiptModal
          isOpen={!!receiptSale}
          onClose={() => setReceiptSale(null)}
          sale={receiptSale}
          companySettings={companySettings}
        />
      )}

      {/* Quick Format Selector Modal */}
      {downloadFormatSale && (
        <ReceiptFormatSelectorModal
          isOpen={!!downloadFormatSale}
          onClose={() => setDownloadFormatSale(null)}
          sale={downloadFormatSale}
          companySettings={companySettings}
        />
      )}

      {/* Receive Payment Modal */}
      {paymentSale && (
        <ReceivePaymentModal
          isOpen={!!paymentSale}
          onClose={() => setPaymentSale(null)}
          sale={paymentSale}
          companySettings={companySettings}
          onPaymentRecorded={() => {
            onSalesChange();
            setPaymentSale(null);
          }}
        />
      )}

      {/* Sale Annotations Modal */}
      {notesSale && (
        <SaleNotesModal
          isOpen={!!notesSale}
          onClose={() => setNotesSale(null)}
          sale={notesSale}
          currentUser={currentUser}
          onAnnotationAdded={() => {
            onSalesChange();
            if (notesSale) {
              const fresh = StorageService.getSaleById(notesSale.id);
              if (fresh) setNotesSale(fresh);
            }
          }}
        />
      )}

      {/* Cancel Sale Error Banner */}
      {cancelErrorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-800 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{cancelErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setCancelErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cancel Sale Confirmation */}
      <ConfirmDialog
        isOpen={!!saleToCancel}
        onClose={() => {
          if (!isCancelling) {
            setSaleToCancel(null);
            setCancelErrorMessage(null);
          }
        }}
        onConfirm={handleConfirmCancel}
        isLoading={isCancelling}
        title="Confirmar Cancelamento de Venda"
        message={
          saleToCancel
            ? `Tem certeza de que deseja cancelar a Venda #${saleToCancel.saleNumber} (${saleToCancel.customerName}) no valor de ${formatCurrency(saleToCancel.total)}? Esta ação irá reverter o estoque dos itens físicos, cancelar as ordens de produção vinculadas e anular os recebíveis desta venda.`
            : 'Tem certeza de que deseja cancelar esta venda?'
        }
        confirmLabel="Sim, Cancelar Venda"
        cancelLabel="Voltar"
        variant="danger"
      />
    </div>
  );
};

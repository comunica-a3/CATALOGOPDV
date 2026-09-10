import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  List,
  Package,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { CompanySettings, ProductionOrder, ProductionOrderFile, ProductionStatus } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadProductionOrderPDF } from '../../utils/pdfReceipt';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface ProductionViewProps {
  orders: ProductionOrder[];
  onOrdersChange: () => void;
  companySettings: CompanySettings;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  orders,
  onOrdersChange,
  companySettings,
}) => {
  const { currentUser, isAdmin, isCollaborator, isSeller, isPromotor } = useAuth();

  // Permissions Differentiation:
  // - View: All authenticated users (Admin, Colaborador, Vendedor, Promotor)
  // - Edit/Update Status/Files: Admin, Colaborador, Vendedor
  // - Delete/Administer: Admin
  const canUpdateStatus = isAdmin || isCollaborator || isSeller;
  const canAttachFiles = isAdmin || isCollaborator || isSeller;
  const canDeleteOrder = isAdmin;

  // View & Filter State
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [newNotes, setNewNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Atualizar modal se a ordem for modificada por outro dispositivo conectado em tempo real
  useEffect(() => {
    const handleProductionUpdated = () => {
      onOrdersChange();
      if (selectedOrder) {
        const fresh = StorageService.getProductionOrderById(selectedOrder.id);
        if (fresh) {
          setSelectedOrder(fresh);
        }
      }
    };

    window.addEventListener('production-updated', handleProductionUpdated);
    window.addEventListener('storage-sync-completed', handleProductionUpdated);

    return () => {
      window.removeEventListener('production-updated', handleProductionUpdated);
      window.removeEventListener('storage-sync-completed', handleProductionUpdated);
    };
  }, [onOrdersChange, selectedOrder]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await StorageService.syncWithServer();
      onOrdersChange();
      if (selectedOrder) {
        const fresh = StorageService.getProductionOrderById(selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      }
      showToast('Ordens de produção sincronizadas em tempo real com todos os dispositivos.');
    } catch {
      showToast('Aviso ao sincronizar ordens com o servidor.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter Orders
  const filteredOrders = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        String(o.orderNumber || '').toLowerCase().includes(term) ||
        String(o.saleNumber || '').toLowerCase().includes(term) ||
        String(o.customerName || '').toLowerCase().includes(term) ||
        String(o.itemName || '').toLowerCase().includes(term);

      const matchStatus = statusFilter === 'TODAS' || o.status === statusFilter;
      const matchType = typeFilter === 'TODOS' || o.productionType === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [orders, searchTerm, statusFilter, typeFilter]);

  // Status Handlers
  const handleStatusChange = (orderId: string, newStatus: ProductionStatus) => {
    if (!canUpdateStatus) {
      alert('Você não tem permissão para alterar o status da ordem de produção.');
      return;
    }

    try {
      StorageService.updateProductionOrderStatus(orderId, newStatus);
      onOrdersChange();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(StorageService.getProductionOrderById(orderId) || null);
      }
      showToast(`Status da ordem alterado para ${getStatusLabel(newStatus)}.`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar status da ordem.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    if (!canAttachFiles) {
      alert('Você não tem permissão para anexar arquivos.');
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newFile: ProductionOrderFile = {
          id: `FILE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type,
        };
        StorageService.addProductionOrderFile(orderId, newFile);
        onOrdersChange();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(StorageService.getProductionOrderById(orderId) || null);
        }
        showToast(`Arquivo "${file.name}" anexado com sucesso!`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (orderId: string, fileId: string) => {
    if (!canAttachFiles) return;
    if (confirm('Deseja realmente remover este arquivo anexo?')) {
      StorageService.removeProductionOrderFile(orderId, fileId);
      onOrdersChange();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(StorageService.getProductionOrderById(orderId) || null);
      }
      showToast('Arquivo removido.');
    }
  };

  const handleSaveNotes = (orderId: string) => {
    if (!canUpdateStatus) return;
    StorageService.updateProductionOrderNotes(orderId, newNotes);
    onOrdersChange();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(StorageService.getProductionOrderById(orderId) || null);
    }
    showToast('Observações da ordem salvas com sucesso!');
  };

  const getStatusLabel = (status: ProductionStatus) => {
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
    }
  };

  const getStatusBadge = (status: ProductionStatus) => {
    switch (status) {
      case 'AGUARDANDO_PRODUCAO':
        return <Badge variant="warning" size="sm">Aguardando Produção</Badge>;
      case 'EM_PRODUCAO':
        return <Badge variant="primary" size="sm">Em Produção</Badge>;
      case 'REFAZER':
        return <Badge variant="danger" size="sm">Refazer</Badge>;
      case 'PRONTO':
        return <Badge variant="purple" size="sm">Pronto para Entrega</Badge>;
      case 'ENTREGUE':
        return <Badge variant="success" size="sm">Entregue ao Cliente</Badge>;
      case 'CANCELADO':
        return <Badge variant="secondary" size="sm">Cancelado</Badge>;
    }
  };

  // KANBAN COLUMNS (Includes all 6 columns as requested)
  const KANBAN_COLUMNS: {
    id: ProductionStatus;
    title: string;
    color: string;
    badgeColor: string;
    icon: any;
  }[] = [
    {
      id: 'AGUARDANDO_PRODUCAO',
      title: 'Aguardando',
      color: 'border-amber-200 bg-amber-50/80 text-amber-900',
      badgeColor: 'bg-amber-100 text-amber-800',
      icon: Clock,
    },
    {
      id: 'EM_PRODUCAO',
      title: 'Em Produção',
      color: 'border-blue-200 bg-blue-50/80 text-blue-900',
      badgeColor: 'bg-blue-100 text-blue-800',
      icon: RefreshCw,
    },
    {
      id: 'REFAZER',
      title: 'Refazer',
      color: 'border-orange-300 bg-orange-50/90 text-orange-950 ring-1 ring-orange-200',
      badgeColor: 'bg-orange-100 text-orange-900 font-black',
      icon: AlertTriangle,
    },
    {
      id: 'PRONTO',
      title: 'Pronto p/ Entrega',
      color: 'border-purple-200 bg-purple-50/80 text-purple-900',
      badgeColor: 'bg-purple-100 text-purple-800',
      icon: Sparkles,
    },
    {
      id: 'ENTREGUE',
      title: 'Entregue',
      color: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
    },
    {
      id: 'CANCELADO',
      title: 'Cancelado',
      color: 'border-slate-200 bg-slate-100/90 text-slate-700',
      badgeColor: 'bg-slate-200 text-slate-800',
      icon: XCircle,
    },
  ];

  const handleDownloadOrderPDF = () => {
    if (!selectedOrder) return;
    try {
      downloadProductionOrderPDF(selectedOrder, companySettings);
    } catch (err) {
      console.error('Erro ao gerar ordem de produção em PDF:', err);
    }
  };

  return (
    <div id="production-management-view" className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-600" />
            <span>Controle de Produção Gráfica</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ordens de produção geradas automaticamente a partir das vendas no PDV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Tempo Real Ativo</span>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Sincronizar ordens agora com outros dispositivos"
            className="p-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            {viewMode === 'kanban' ? 'Visualizar em Tabela' : 'Visualizar em Kanban'}
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ordem, venda, cliente, item..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="TODAS">Todos os Status</option>
              <option value="AGUARDANDO_PRODUCAO">Aguardando Produção</option>
              <option value="EM_PRODUCAO">Em Produção</option>
              <option value="REFAZER">Refazer</option>
              <option value="PRONTO">Pronto para Entrega</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>

            {/* Production Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="TODOS">Própria e Terceirizada</option>
              <option value="PRODUCAO_PROPRIA">Produção Própria (Interna)</option>
              <option value="PRODUCAO_TERCEIRIZADA">Produção Terceirizada (Parceiro)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. KANBAN VIEW (6 INTEGRATED COLUMNS)                                     */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.id);
            const Icon = col.icon;
            return (
              <div
                key={col.id}
                className="bg-slate-50/90 rounded-xl border border-slate-200 p-3 space-y-2.5 min-h-[480px] flex flex-col shadow-2xs"
              >
                {/* Column Header */}
                <div
                  className={`px-2.5 py-2 rounded-lg border font-bold text-xs flex items-center justify-between shadow-2xs ${col.color}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{col.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeColor}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[620px] pr-0.5">
                  {colOrders.length > 0 ? (
                    colOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewNotes(order.notes || '');
                        }}
                        className={`p-3 bg-white rounded-lg border transition-all cursor-pointer space-y-2 text-xs shadow-2xs ${
                          order.status === 'REFAZER'
                            ? 'border-orange-300 bg-orange-50/30 hover:border-orange-500'
                            : order.status === 'CANCELADO'
                            ? 'border-slate-300 opacity-75 hover:opacity-100'
                            : 'border-slate-200 hover:border-blue-400 hover:shadow-xs'
                        }`}
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded border text-[11px] ${
                              order.status === 'REFAZER'
                                ? 'bg-orange-100 text-orange-900 border-orange-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">{order.saleNumber}</span>
                        </div>

                        {/* Item Title */}
                        <div>
                          <h4 className="font-bold text-slate-900 line-clamp-2 leading-tight">
                            {order.quantity}x {order.itemName}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            Cliente: <strong className="text-slate-800">{order.customerName}</strong>
                          </p>
                        </div>

                        {/* Specs Recap */}
                        {(order.configuration.calculatedAreaM2 || order.configuration.variantName) && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 p-1.5 rounded space-y-0.5">
                            {order.configuration.variantName && (
                              <p className="font-semibold text-blue-700 truncate">
                                Var: {order.configuration.variantName}
                              </p>
                            )}
                            {order.configuration.calculatedAreaM2 && (
                              <p>
                                Área: {order.configuration.width}x{order.configuration.height}m (
                                {order.configuration.calculatedAreaM2}m²)
                              </p>
                            )}
                          </div>
                        )}

                        {/* Refazer Alert Banner */}
                        {order.status === 'REFAZER' && (
                          <div className="p-1.5 bg-orange-100 border border-orange-200 rounded text-[10px] text-orange-900 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-orange-700 shrink-0" />
                            <span>Solicitada refação</span>
                          </div>
                        )}

                        {/* Type & Lead Time */}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded ${
                              order.productionType === 'PRODUCAO_PROPRIA'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {order.productionType === 'PRODUCAO_PROPRIA' ? 'Interna' : 'Terceirizada'}
                          </span>

                          <div className="flex items-center gap-1 text-slate-500">
                            {order.files.length > 0 && (
                              <span className="flex items-center gap-0.5 text-blue-600 font-bold">
                                <Paperclip className="w-3 h-3" /> {order.files.length}
                              </span>
                            )}
                            <span>Prazo: {order.leadTime || '2d'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-[11px] italic">
                      Nenhuma ordem
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================================= */
        /* 2. TABLE VIEW                                                           */
        /* ======================================================================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ordem / Venda</th>
                  <th className="py-3.5 px-3">Item e Quantidade</th>
                  <th className="py-3.5 px-3">Cliente</th>
                  <th className="py-3.5 px-3">Tipo e Prazo</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Arquivos</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        order.status === 'REFAZER' ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded block w-fit border border-blue-200">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {order.saleNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900 break-words whitespace-normal leading-snug">
                          {order.quantity}x {order.itemName}
                        </p>
                        {order.configuration.calculatedAreaM2 && (
                          <span className="text-[10px] text-slate-500 block">
                            {order.configuration.width}x{order.configuration.height}m (
                            {order.configuration.calculatedAreaM2}m²)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-800 break-words whitespace-normal leading-snug">{order.customerName}</p>
                        {order.customerPhone && (
                          <span className="text-[10px] text-slate-400 block">{order.customerPhone}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[11px] text-slate-700 block">
                          {order.productionType === 'PRODUCAO_PROPRIA' ? 'Própria' : 'Terceirizada'}
                        </span>
                        <span className="text-[10px] text-slate-400">{order.leadTime}</span>
                      </td>

                      <td className="py-3.5 px-3">{getStatusBadge(order.status)}</td>

                      <td className="py-3.5 px-3">
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <Paperclip className="w-3.5 h-3.5" />
                          {order.files.length} arquivo(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setNewNotes(order.notes || '');
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Detalhes / Arquivos
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhuma ordem de produção encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRODUCTION ORDER DETAILS & FILES MODAL                                    */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <Modal
          id="production-order-modal"
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Ordem de Produção ${selectedOrder.orderNumber}`}
          subtitle={`Gerada pela venda ${selectedOrder.saleNumber} • ${formatDateTime(selectedOrder.createdAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Top Status & Printing Control Bar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 block">
                  Fase Atual da Produção:
                </span>
                <button
                  type="button"
                  id="btn-download-production-order-pdf"
                  onClick={handleDownloadOrderPDF}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Ordem (PDF)</span>
                </button>
              </div>

              {canUpdateStatus ? (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'AGUARDANDO_PRODUCAO', label: 'Aguardando' },
                    { id: 'EM_PRODUCAO', label: 'Em Produção' },
                    { id: 'REFAZER', label: 'Refazer (Ajustar/Repetir)' },
                    { id: 'PRONTO', label: 'Pronto p/ Entrega' },
                    { id: 'ENTREGUE', label: 'Entregue' },
                    { id: 'CANCELADO', label: 'Cancelar Ordem' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleStatusChange(selectedOrder.id, st.id as ProductionStatus)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedOrder.status === st.id
                          ? st.id === 'REFAZER'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : st.id === 'CANCELADO'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div>{getStatusBadge(selectedOrder.status)}</div>
              )}
            </div>

            {/* Printable Order Sheet Component */}
            <div
              id="printable-production-order-sheet"
              className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs font-sans text-slate-800"
            >
              {/* Printable Header */}
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold uppercase text-slate-900">
                    {companySettings.name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    ORDEM DE PRODUÇÃO: <strong>{selectedOrder.orderNumber}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold block text-slate-700">Venda: {selectedOrder.saleNumber}</span>
                  <span className="text-[10px] text-slate-500">
                    Emissão: {formatDateTime(selectedOrder.createdAt)}
                  </span>
                </div>
              </div>

              {/* Product & Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Especificações do Item</span>
                  <p className="font-bold text-sm text-slate-900">
                    {selectedOrder.quantity}x {selectedOrder.itemName}
                  </p>
                  {selectedOrder.configuration.variantName && (
                    <p className="text-xs font-semibold text-blue-700">
                      Variação: {selectedOrder.configuration.variantName}
                    </p>
                  )}
                  {selectedOrder.configuration.calculatedAreaM2 && (
                    <p className="text-xs text-slate-600">
                      Dimensões: {selectedOrder.configuration.width}x{selectedOrder.configuration.height}m (
                      {selectedOrder.configuration.calculatedAreaM2}m²)
                    </p>
                  )}
                  {selectedOrder.configuration.selectedOptions && (
                    <div className="text-xs text-slate-600 pt-1">
                      {Object.entries(selectedOrder.configuration.selectedOptions).map(([k, v]) => (
                        <p key={k}>
                          • <strong>{k}:</strong> {v}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Dados do Cliente e Prazo</span>
                  <p className="font-bold text-sm text-slate-900">{selectedOrder.customerName}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-xs text-slate-600">Tel: {selectedOrder.customerPhone}</p>
                  )}
                  <div className="pt-1">
                    <span className="text-xs font-bold text-blue-700 block">
                      Tipo: {selectedOrder.productionType === 'PRODUCAO_PROPRIA' ? 'Produção Própria (Interna)' : 'Produção Terceirizada'}
                    </span>
                    <p className="text-xs text-slate-500">Prazo: {selectedOrder.leadTime || '2 a 3 dias úteis'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Artwork Files Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    Arquivos de Arte e Documentos Anexos ({selectedOrder.files.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    PDF, JPG, PNG ou arquivos da arte para impressão
                  </p>
                </div>

                {canAttachFiles && (
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anexar Arquivo</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, selectedOrder.id)}
                    />
                  </label>
                )}
              </div>

              {selectedOrder.files.length > 0 ? (
                <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {selectedOrder.files.map((file) => (
                    <div key={file.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400">
                          ({(file.sizeBytes / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={file.url}
                          download={file.name}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Baixar</span>
                        </a>
                        {canAttachFiles && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(selectedOrder.id, file.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum arquivo anexado a esta ordem.</p>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Observações de Produção / Acabamento:
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                disabled={!canUpdateStatus}
                rows={2}
                placeholder="Insira detalhes sobre tintas, cores, sangria, refile ou instrução da gráfica..."
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              />
              {canUpdateStatus && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => handleSaveNotes(selectedOrder.id)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                  >
                    Salvar Observações
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellOff,
  Boxes,
  Calendar,
  CheckCircle2,
  EyeOff,
  Filter,
  History,
  Layers,
  Package,
  Plus,
  RotateCcw,
  Search,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { InventoryMovement, Item, MovementType } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface InventoryViewProps {
  items: Item[];
  movements: InventoryMovement[];
  onDataChange: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  movements,
  onDataChange,
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // New Movement Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('ENTRADA');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [documentRef, setDocumentRef] = useState<string>('');

  // Physical items only
  const physicalItems = useMemo(() => {
    return items.filter((i) => i.type === 'PRODUTO_FISICO');
  }, [items]);

  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>(() =>
    StorageService.getDismissedStockWarnings()
  );

  const lowStockItems = useMemo(() => {
    return physicalItems.filter(
      (i) => (i.stock || 0) <= (i.minStock || 5) && !dismissedWarnings.includes(i.id)
    );
  }, [physicalItems, dismissedWarnings]);

  const dismissedCount = useMemo(() => {
    return physicalItems.filter(
      (i) => (i.stock || 0) <= (i.minStock || 5) && dismissedWarnings.includes(i.id)
    ).length;
  }, [physicalItems, dismissedWarnings]);

  const handleDismissWarning = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    StorageService.dismissStockWarning(itemId);
    setDismissedWarnings(StorageService.getDismissedStockWarnings());
  };

  const handleDismissAll = () => {
    const idsToDismiss = lowStockItems.map((i) => i.id);
    StorageService.dismissAllStockWarnings(idsToDismiss);
    setDismissedWarnings(StorageService.getDismissedStockWarnings());
  };

  const handleRestoreWarnings = () => {
    StorageService.restoreStockWarnings();
    setDismissedWarnings([]);
  };

  const selectedItemObj = useMemo(() => {
    return physicalItems.find((i) => i.id === selectedItemId);
  }, [physicalItems, selectedItemId]);

  const filteredMovements = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return movements.filter((mov) => {
      const matchSearch =
        (mov.itemName || '').toLowerCase().includes(term) ||
        (mov.reason || '').toLowerCase().includes(term) ||
        (mov.documentRef ? mov.documentRef.toLowerCase().includes(term) : false) ||
        (mov.variantName ? mov.variantName.toLowerCase().includes(term) : false);

      const matchType = typeFilter === 'TODOS' || mov.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [movements, searchTerm, typeFilter]);

  const handleOpenMovementModal = (item?: Item) => {
    if (item) {
      setSelectedItemId(item.id);
      setSelectedVariantId(item.variants?.[0]?.id || '');
      setUnitCost(item.costPrice);
    } else if (physicalItems.length > 0) {
      setSelectedItemId(physicalItems[0].id);
      setSelectedVariantId(physicalItems[0].variants?.[0]?.id || '');
      setUnitCost(physicalItems[0].costPrice);
    }
    setMovementType('ENTRADA');
    setQuantity(10);
    setReason('');
    setDocumentRef('');
    setIsMovementModalOpen(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantity <= 0) {
      alert('Selecione um item e informe uma quantidade válida.');
      return;
    }

    try {
      StorageService.createInventoryMovement({
        itemId: selectedItemId,
        variantId: selectedVariantId || undefined,
        type: movementType,
        quantity,
        unitCost: movementType === 'ENTRADA' ? unitCost : undefined,
        reason: reason.trim() || (movementType === 'ENTRADA' ? 'Entrada manual' : 'Saída manual'),
        documentRef: documentRef.trim() || undefined,
        createdByName: currentUser.name,
      });

      onDataChange();
      setIsMovementModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar movimentação.');
    }
  };

  return (
    <div id="inventory-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-purple-600" />
            <span>Controle de Estoque e Movimentações</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe saldo de produtos físicos, variantes, entradas, saídas e alertas de reposição.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenMovementModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Movimentação</span>
        </button>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Atenção: {lowStockItems.length} item(ns) estão no estoque mínimo ou esgotados!</span>
            </div>
            <div className="flex items-center gap-2">
              {dismissedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreWarnings}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium underline cursor-pointer"
                >
                  Restaurar ignorados ({dismissedCount})
                </button>
              )}
              <button
                type="button"
                onClick={handleDismissAll}
                title="Ignorar todos os avisos de estoque baixo atuais sem alterar as quantidades reais"
                className="text-xs text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-amber-300"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>Ignorar Avisos</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {lowStockItems.map((item) => (
              <span
                key={item.id}
                className="text-[11px] bg-white border border-amber-300 text-amber-900 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <span
                  onClick={() => handleOpenMovementModal(item)}
                  className="cursor-pointer hover:underline"
                >
                  {item.name}: <strong className="text-rose-600">{item.stock || 0} un</strong>
                </span>
                <span
                  onClick={() => handleOpenMovementModal(item)}
                  className="cursor-pointer text-blue-600 underline text-[10px] ml-1"
                >
                  + Repor
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDismissWarning(item.id, e)}
                  title="Fechar/ignorar aviso deste item sem alterar estoque"
                  className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : dismissedCount > 0 ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <BellOff className="w-4 h-4 text-slate-400" />
            <span>Existem <strong>{dismissedCount}</strong> alerta(s) de estoque ignorado(s).</span>
          </div>
          <button
            type="button"
            onClick={handleRestoreWarnings}
            className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar alertas de estoque</span>
          </button>
        </div>
      ) : null}

      {/* Current Stock Table of Physical Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Posição Atual do Estoque Físico
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {physicalItems.length} produto(s) físicos cadastrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Item e SKU</th>
                <th className="py-3.5 px-3">Estoque Atual</th>
                <th className="py-3.5 px-3">Estoque Mínimo</th>
                <th className="py-3.5 px-3">Custo Unitário</th>
                <th className="py-3.5 px-3">Valor em Estoque</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {physicalItems.length > 0 ? (
                physicalItems.map((item) => {
                  const isLow = (item.stock || 0) <= (item.minStock || 5);
                  const totalValue = (item.stock || 0) * (item.costPrice || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.imageUrl ||
                              'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=100&auto=format&fit=crop&q=80'
                            }
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm break-words whitespace-normal leading-snug">{item.name}</p>
                            <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-bold inline-block mt-0.5">
                              {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`font-bold text-sm ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {item.stock || 0} un
                        </span>
                        {isLow && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {dismissedWarnings.includes(item.id) ? (
                              <span className="text-[10px] text-slate-400 italic">
                                Alerta ignorado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleDismissWarning(item.id, e)}
                                title="Ignorar alerta deste produto sem alterar estoque"
                                className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer flex items-center gap-0.5"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Ignorar aviso</span>
                              </button>
                            )}
                          </div>
                        )}
                        {item.variants && item.variants.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                            {item.variants.map((v) => (
                              <span key={v.id} className="block">
                                • {v.name}: <strong>{v.stock} un</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-500">
                        {item.minStock || 5} un
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-600">
                        {formatCurrency(item.costPrice)}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {formatCurrency(totalValue)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenMovementModal(item)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          + Movimentar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum produto físico cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement History Log */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Histórico de Movimentações de Estoque</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Auditoria de todas as entradas, saídas por vendas e ajustes manuais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no histórico..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
              <option value="AJUSTE_INVENTARIO">Ajustes</option>
            </select>
          </div>
        </div>

        {/* Movements Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Item / Variante</th>
                <th className="py-2.5 px-3">Quantidade</th>
                <th className="py-2.5 px-3">Motivo / Documento</th>
                <th className="py-2.5 px-3 text-right">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((mov) => {
                  const isEntry = mov.type === 'ENTRADA';
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {formatDateTime(mov.date)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-md ${
                            isEntry
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {mov.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 break-words whitespace-normal leading-snug">{mov.itemName}</p>
                        {mov.variantName && (
                          <span className="text-[10px] text-purple-700 block font-medium">
                            Var: {mov.variantName}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold text-xs ${
                            isEntry ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isEntry ? `+${mov.quantity}` : `-${mov.quantity}`} un
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <p>{mov.reason}</p>
                        {mov.documentRef && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Doc: {mov.documentRef}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-500 font-medium text-[11px]">
                        {mov.createdByName}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Movement Modal */}
      {isMovementModalOpen && (
        <Modal
          id="inventory-movement-modal"
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title="Lançar Movimentação de Estoque"
          subtitle="Entrada de mercadorias, baixa por avaria ou ajuste de contagem"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveMovement} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Produto Físico *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const found = physicalItems.find((i) => i.id === e.target.value);
                  if (found) {
                    setSelectedVariantId(found.variants?.[0]?.id || '');
                    setUnitCost(found.costPrice);
                  }
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {physicalItems.map((pi) => (
                  <option key={pi.id} value={pi.id}>
                    {pi.name} (Atual: {pi.stock || 0} un)
                  </option>
                ))}
              </select>
            </div>

            {/* Variant selector if item has variants */}
            {selectedItemObj && selectedItemObj.variants && selectedItemObj.variants.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Variante Específica
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Item Geral (Sem variante específica)</option>
                  {selectedItemObj.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Atual: {v.stock} un)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Movement Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tipo da Movimentação *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ENTRADA', label: 'Entrada / Compra' },
                  { id: 'SAIDA', label: 'Saída / Descarte' },
                  { id: 'AJUSTE_INVENTARIO', label: 'Ajuste Balanço' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMovementType(t.id as MovementType)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      movementType === t.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Unit Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-sm font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custo Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Reason & Doc */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Fornecedor
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Compra NF-e 4520, avaria..."
                  className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nº Documento / NF
                </label>
                <input
                  type="text"
                  value={documentRef}
                  onChange={(e) => setDocumentRef(e.target.value)}
                  placeholder="Ex: NF 10420"
                  className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Confirmar Lançamento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  History,
  Info,
  Package,
  Plus,
  Save,
  Trash2,
  User as UserIcon,
  X,
  Calendar,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import {
  CompanySettings,
  Item,
  PaymentRecord,
  Sale,
  SaleItem,
  User,
} from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  companySettings: CompanySettings;
  currentUser: User | null;
  onSaleUpdated: () => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  companySettings,
  currentUser,
  onSaleUpdated,
}) => {
  if (!sale) return null;

  // Catalog items for "Add Item" picker
  const [catalogItems] = useState<Item[]>(() => StorageService.getItems());
  const [users] = useState<User[]>(() => StorageService.getUsers());
  const sellers = useMemo(
    () => users.filter((u) => u.role === 'VENDEDOR' || u.role === 'VENDEDOR_EXTERNO' || u.role === 'ADMINISTRADOR' || u.role === 'COLABORADOR'),
    [users]
  );

  // Form states initialized with original sale data
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
  const [customerDocument, setCustomerDocument] = useState(sale.customerDocument || '');
  const [sellerId, setSellerId] = useState(sale.sellerId || '');
  const [sellerName, setSellerName] = useState(sale.sellerName || '');

  // Items state (cloned from sale.items)
  const [items, setItems] = useState<SaleItem[]>(() =>
    (sale.items || []).map((item) => ({
      ...item,
      configuration: { ...(item.configuration || {}) },
    }))
  );

  // Financial fields
  const [discount, setDiscount] = useState<number>(Number(sale.discount) || 0);
  const [addition, setAddition] = useState<number>(Number(sale.addition || sale.freight) || 0);
  const [dueDate, setDueDate] = useState<string>(
    sale.dueDate ? sale.dueDate.split('T')[0] : ''
  );
  const [notes, setNotes] = useState<string>(sale.notes || '');

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    (sale.payments || []).map((p) => ({ ...p }))
  );

  // Reason (MANDATORY)
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Item Picker Modal State
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
  }, [items]);

  const newTotal = useMemo(() => {
    return Math.max(0, Number((subtotal + Number(addition || 0) - Number(discount || 0)).toFixed(2)));
  }, [subtotal, addition, discount]);

  const paidAmount = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, Number((newTotal - paidAmount).toFixed(2)));
  }, [newTotal, paidAmount]);

  // Handle Item Modifications
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.quantity = newQty;
      item.totalPrice = Number((item.unitPrice * newQty).toFixed(2));
      item.totalCost = Number(((item.unitCost || 0) * newQty).toFixed(2));
      copy[index] = item;
      return copy;
    });
  };

  const handleUnitPriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.unitPrice = newPrice;
      item.totalPrice = Number((newPrice * item.quantity).toFixed(2));
      copy[index] = item;
      return copy;
    });
  };

  // For POR_M2 items: Width and Height changes
  // Respects exact formula: Area = (width_cm * height_cm) / 10000; UnitPrice = Area * price_per_m2
  const handleDimensionsChange = (index: number, widthCm: number, heightCm: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const config = { ...(item.configuration || {}) };

      config.width = widthCm;
      config.height = heightCm;
      const areaM2 = Number(((widthCm * heightCm) / 10000).toFixed(4));
      config.calculatedAreaM2 = areaM2;

      // Find price per m2 from item or base unit price
      const baseM2Price = (item as any).baseM2Price || item.unitPrice / (config.calculatedAreaM2 || 1) || item.unitPrice;
      item.unitPrice = Number((areaM2 * baseM2Price).toFixed(2));
      item.totalPrice = Number((item.unitPrice * item.quantity).toFixed(2));
      item.configuration = config;

      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('A venda deve conter pelo menos um item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCatalogItem = (catalogItem: Item) => {
    const isM2 = catalogItem.pricingModel === 'POR_M2';
    const initialWidth = isM2 ? 100 : undefined;
    const initialHeight = isM2 ? 100 : undefined;
    const areaM2 = isM2 ? 1 : undefined;
    const unitPrice = isM2
      ? Number(catalogItem.areaPricing?.salePricePerM2 || catalogItem.salePrice || 0)
      : Number(catalogItem.salePrice || 0);
    const unitCost = isM2
      ? Number(catalogItem.areaPricing?.costPerM2 || catalogItem.costPrice || 0)
      : Number(catalogItem.costPrice || 0);

    const newItem: SaleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: catalogItem.id,
      itemName: catalogItem.name,
      itemType: catalogItem.type,
      sku: catalogItem.sku || 'SKU-EDIT',
      quantity: 1,
      unitPrice,
      unitCost,
      totalPrice: unitPrice,
      totalCost: unitCost,
      configuration: {
        width: initialWidth,
        height: initialHeight,
        dimensionUnit: isM2 ? 'cm' : undefined,
        calculatedAreaM2: areaM2,
      },
    };

    setItems((prev) => [...prev, newItem]);
    setShowItemPicker(false);
  };

  // Payment management
  const handlePaymentAmountChange = (index: number, newAmount: number) => {
    setPayments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: Math.max(0, newAmount) };
      return copy;
    });
  };

  const handleRemovePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPayment = () => {
    const defaultMethod = companySettings.paymentMethods?.[0] || 'PIX';
    const amountToPay = Math.max(0, newTotal - paidAmount);
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      method: defaultMethod,
      amount: amountToPay,
      date: new Date().toISOString(),
    };
    setPayments((prev) => [...prev, newPayment]);
  };

  const handleSellerChange = (newSellerId: string) => {
    setSellerId(newSellerId);
    const sellerObj = sellers.find((s) => s.id === newSellerId);
    if (sellerObj) setSellerName(sellerObj.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorMessage('É obrigatório informar o motivo da alteração da venda.');
      return;
    }
    if (cleanReason.length < 5) {
      setErrorMessage('O motivo deve conter no mínimo 5 caracteres.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('A venda deve conter pelo menos um item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      StorageService.editCompletedSale({
        saleId: sale.id,
        reason: cleanReason,
        user: currentUser || undefined,
        customerId: sale.customerId,
        customerName: customerName.trim() || 'Consumidor Final',
        customerPhone: customerPhone.trim(),
        customerDocument: customerDocument.trim(),
        sellerId: sellerId || sale.sellerId,
        sellerName: sellerName || sale.sellerName,
        items,
        discount: Number(discount || 0),
        addition: Number(addition || 0),
        payments,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
        notes,
      });

      onSaleUpdated();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar alterações da venda:', err);
      setErrorMessage(err.message || 'Erro ao atualizar a venda.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Editar Venda Finalizada"
      subtitle={`Venda #${sale.saleNumber} • Criada em ${formatDateTime(sale.createdAt)}`}
      maxWidth="4xl"
      id="edit-sale-modal"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Info Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Reabertura de venda com recálculo automático:</span>
              <p className="text-blue-800 mt-0.5">
                O estoque dos itens antigos será estornado e o novo estoque será baixado com registro auditável.
                Os totais financeiros, comissões e contas a receber serão recalculados mantendo a precisão original.
              </p>
            </div>
          </div>

          {/* Customer & Seller Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Cliente e Vendedor</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Vendedor / Atendente</label>
                <select
                  value={sellerId}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">{sale.sellerName || 'Selecione o vendedor'}</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Produtos e Itens ({items.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowItemPicker(true)}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Medidas (m²)</th>
                    <th className="py-2.5 px-3 text-center w-20">Qtd</th>
                    <th className="py-2.5 px-3 text-right w-28">Preço Unit.</th>
                    <th className="py-2.5 px-3 text-right w-28">Total</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const isM2 =
                      item.configuration?.width !== undefined &&
                      item.configuration?.height !== undefined;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.itemName || (item as any)?.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.itemType} {item.sku ? `• ${item.sku}` : ''}
                          </span>
                        </td>

                        {/* Dimensions if m² */}
                        <td className="py-2.5 px-3 text-center">
                          {isM2 ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.configuration?.width || ''}
                                onChange={(e) =>
                                  handleDimensionsChange(
                                    idx,
                                    Number(e.target.value) || 0,
                                    item.configuration?.height || 0
                                  )
                                }
                                title="Largura em cm"
                                className="w-14 text-center p-1 border border-slate-300 rounded text-xs font-mono"
                              />
                              <span className="text-slate-400">×</span>
                              <input
                                type="number"
                                min="1"
                                value={item.configuration?.height || ''}
                                onChange={(e) =>
                                  handleDimensionsChange(
                                    idx,
                                    item.configuration?.width || 0,
                                    Number(e.target.value) || 0
                                  )
                                }
                                title="Altura em cm"
                                className="w-14 text-center p-1 border border-slate-300 rounded text-xs font-mono"
                              />
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({item.configuration?.calculatedAreaM2 || 0}m²)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value) || 1)}
                            className="w-16 text-center p-1 border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-[11px]">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value) || 0)}
                              className="w-20 text-right p-1 border border-slate-300 rounded text-xs font-mono font-bold"
                            />
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.totalPrice)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remover item"
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Adjustments */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Subtotal dos Itens</label>
              <div className="p-2 bg-white rounded-lg border border-slate-300 font-mono font-bold text-slate-800">
                {formatCurrency(subtotal)}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Desconto (R$)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Acréscimo / Frete (R$)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addition}
                  onChange={(e) => setAddition(Number(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pagamentos Registrados</span>
              </h4>
              <button
                type="button"
                onClick={handleAddPayment}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Parcela/Pagamento</span>
              </button>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={p.method}
                        onChange={(e) => {
                          const copy = [...payments];
                          copy[idx] = { ...copy[idx], method: e.target.value };
                          setPayments(copy);
                        }}
                        className="p-1 border border-slate-300 rounded font-semibold text-slate-800"
                      >
                        {(companySettings.paymentMethods || ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'A_PRAZO']).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-400 text-[11px]">
                        {p.date ? formatDateTime(p.date) : 'Hoje'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Valor:</span>
                      <div className="flex items-center">
                        <span className="text-slate-400 mr-1">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.amount}
                          onChange={(e) => handlePaymentAmountChange(idx, Number(e.target.value) || 0)}
                          className="w-24 p-1 text-right border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                Nenhum pagamento registrado nesta venda (Saldo permanecerá em aberto/Pendente).
              </div>
            )}

            {/* Remaining amount summary */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Total da Venda: <strong className="font-mono text-slate-900">{formatCurrency(newTotal)}</strong> • Pago: <strong className="font-mono text-emerald-700">{formatCurrency(paidAmount)}</strong>
              </span>
              <span className="font-bold">
                Saldo a Receber:{' '}
                <span className={remainingAmount > 0 ? 'text-amber-700 font-mono' : 'text-emerald-700 font-mono'}>
                  {formatCurrency(remainingAmount)}
                </span>
              </span>
            </div>

            {remainingAmount > 0 && (
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Data de Vencimento do Saldo em Aberto
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full sm:w-48 text-xs p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            )}
          </div>

          {/* Notes & Observations */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Observações da Venda</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações internas ou instruções da venda..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Reason for Edit (REQUIRED) */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5">
            <label htmlFor="edit-reason-input" className="block text-xs font-bold text-amber-950 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span>Motivo da Alteração (Obrigatório para Auditoria) *</span>
            </label>
            <textarea
              id="edit-reason-input"
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Descreva o motivo desta alteração (ex: Correção de medida pelo vendedor, inclusão de novo item a pedido do cliente, ajuste de desconto autorizado pelo gerente...)"
              className="w-full text-xs p-2.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              required
            />
          </div>

          {/* Comparison summary card */}
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Valor Anterior</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(sale.total)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Novo Valor</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{formatCurrency(newTotal)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Itens Anteriores</span>
              <span className="font-bold text-slate-700">{sale.items?.length || 0} item(ns)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Novos Itens</span>
              <span className="font-bold text-slate-900">{items.length} item(ns)</span>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !reason.trim() || items.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>

      {/* Catalog Item Picker Modal */}
      {showItemPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h4 className="font-bold text-slate-900 text-xs">Adicionar Item à Venda</h4>
              <button
                type="button"
                onClick={() => setShowItemPicker(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Buscar por nome, SKU ou categoria..."
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>
            <div className="p-3 overflow-y-auto space-y-1.5 flex-1 text-xs">
              {catalogItems
                .filter((ci) => {
                  const q = pickerSearch.toLowerCase();
                  return (
                    ci.name.toLowerCase().includes(q) ||
                    (ci.sku && ci.sku.toLowerCase().includes(q))
                  );
                })
                .slice(0, 30)
                .map((ci) => (
                  <div
                    key={ci.id}
                    onClick={() => handleAddCatalogItem(ci)}
                    className="p-2.5 hover:bg-blue-50/80 rounded-lg border border-slate-200 flex justify-between items-center cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{ci.name}</p>
                      <span className="text-[10px] text-slate-400">
                        {ci.pricingModel === 'POR_M2' ? 'Cobrança por m²' : 'Unidade'} • Estoque:{' '}
                        {ci.type === 'PRODUTO_FISICO' ? ci.stock : 'Serviço'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-blue-700">
                      {formatCurrency(ci.price)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

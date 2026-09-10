import confetti from 'canvas-confetti';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CreditCard,
  DollarSign,
  Lock,
  Percent,
  Plus,
  QrCode,
  Receipt,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  AccountType,
  CartItem,
  CompanySettings,
  Customer,
  PaymentRecord,
  PaymentStatus,
  ProductionOrder,
  ReceivingAccount,
  Sale,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { CustomerSearchModal } from '../customers/CustomerSearchModal';
import { OpenCashModal } from '../finance/OpenCashModal';
import { POSCustomerModal } from './POSCustomerModal';

interface POSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  initialDiscount?: number;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  companySettings: CompanySettings;
  onSaleCompleted: (sale: Sale, prodOrders: ProductionOrder[]) => void;
}

interface PaymentEntryItem {
  id: string;
  method: string;
  accountId: string;
  amount: number;
  notes?: string;
}

export const POSCheckoutModal: React.FC<POSCheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  initialDiscount = 0,
  selectedCustomer,
  onSelectCustomer,
  companySettings,
  onSaleCompleted,
}) => {
  const { currentUser, users } = useAuth();
  const availableSellers = useMemo(() => {
    // Listar todos os operadores/vendedores ativos do sistema sem restringir quando há usuário de teste
    const eligible = (users || []).filter(
      (u) =>
        u.active !== false &&
        (u.role === 'ADMINISTRADOR' ||
          u.role === 'COLABORADOR' ||
          u.role === 'VENDEDOR' ||
          u.role === 'VENDEDOR_EXTERNO')
    );
    if (eligible.length > 0) return eligible;
    return (users || []).filter((u) => u.active !== false);
  }, [users]);

  const [selectedSellerId, setSelectedSellerId] = useState<string>(() => {
    // Priorizar o usuário logado para manter a fluidez do operador atual
    if (currentUser?.id) {
      return currentUser.id;
    }
    const firstSeller = availableSellers[0];
    return firstSeller ? firstSeller.id : '';
  });

  useEffect(() => {
    if (!selectedSellerId && currentUser?.id) {
      setSelectedSellerId(currentUser.id);
    }
  }, [currentUser, selectedSellerId]);

  // Frete de produto terceirizado configurado pelo Administrador
  const hasThirdPartyProduct = useMemo(() => {
    return cartItems.some(
      (ci) =>
        ci.item?.productionType === 'PRODUCAO_TERCEIRIZADA' ||
        (ci.item as any)?.production_type === 'PRODUCAO_TERCEIRIZADA' ||
        (Number(ci.item?.supplierFreight) > 0)
    );
  }, [cartItems]);

  const freight = useMemo(() => {
    if (!hasThirdPartyProduct) return 0;
    const adminFreight =
      companySettings?.defaultSupplierFreight !== undefined
        ? Number(companySettings.defaultSupplierFreight)
        : Number(StorageService.getCompanySettings()?.defaultSupplierFreight);
    return adminFreight !== undefined && !isNaN(adminFreight) && adminFreight > 0
      ? adminFreight
      : 20.0;
  }, [hasThirdPartyProduct, companySettings]);

  const [discount, setDiscount] = useState<number>(initialDiscount);
  const [paymentMode, setPaymentMode] = useState<'INTEGRAL' | 'PARCIAL' | 'PENDENTE'>('INTEGRAL');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [isIdentifyCustomerOpen, setIsIdentifyCustomerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>(() =>
    StorageService.getCustomers()
  );

  // Receiving accounts and cash register from storage
  const [receivingAccounts, setReceivingAccounts] = useState<ReceivingAccount[]>(() =>
    StorageService.getReceivingAccounts()
  );
  const activeAccounts = useMemo(() => {
    return receivingAccounts.filter((a) => a.active);
  }, [receivingAccounts]);

  const currentCashRegister = StorageService.getCurrentCashRegister();

  const total = Math.max(0, Number((subtotal + freight - discount).toFixed(2)));

  // Multi-Payment List State
  const defaultAccount = activeAccounts.find((a) => a.isDefault) || activeAccounts[0];
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntryItem[]>(() => [
    {
      id: `pentry-${Date.now()}`,
      method: 'PIX',
      accountId: defaultAccount?.id || '',
      amount: total,
    },
  ]);

  // Keep single payment synchronized if in INTEGRAL mode and 1 payment entry
  useEffect(() => {
    if (paymentMode === 'INTEGRAL' && paymentEntries.length === 1) {
      setPaymentEntries((prev) => [
        {
          ...prev[0],
          amount: total,
        },
      ]);
    } else if (paymentMode === 'PENDENTE') {
      setPaymentEntries([]);
    }
  }, [total, paymentMode]);

  const totalPaid = useMemo(() => {
    if (paymentMode === 'PENDENTE') return 0;
    return Number(
      paymentEntries
        .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0)
        .toFixed(2)
    );
  }, [paymentEntries, paymentMode]);

  const remainingAmount = Math.max(0, Number((total - totalPaid).toFixed(2)));

  // Helper to add a new payment entry
  const handleAddPaymentEntry = () => {
    const defaultAcc = activeAccounts.find((a) => a.isDefault) || activeAccounts[0];
    const newEntry: PaymentEntryItem = {
      id: `pentry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      method: 'PIX',
      accountId: defaultAcc?.id || '',
      amount: remainingAmount > 0 ? remainingAmount : 0,
    };
    setPaymentEntries((prev) => [...prev, newEntry]);
  };

  const handleRemovePaymentEntry = (id: string) => {
    if (paymentEntries.length <= 1 && paymentMode === 'INTEGRAL') {
      return;
    }
    setPaymentEntries((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePaymentEntry = (id: string, updates: Partial<PaymentEntryItem>) => {
    setPaymentEntries((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const updated = { ...p, ...updates };

        // If method changed, auto-suggest a matching account
        if (updates.method && updates.method !== p.method) {
          const mLower = String(updates.method || '').toLowerCase();
          if (mLower.includes('dinheiro')) {
            const caixaAcc = activeAccounts.find((a) => a.type === 'CAIXA');
            if (caixaAcc) updated.accountId = caixaAcc.id;
          } else if (mLower.includes('pix')) {
            const pixAcc = activeAccounts.find((a) => a.type === 'PIX');
            if (pixAcc) updated.accountId = pixAcc.id;
          } else if (mLower.includes('cart') || mLower.includes('crédito') || mLower.includes('débito')) {
            const cartaoAcc = activeAccounts.find((a) => a.type === 'CARTAO');
            if (cartaoAcc) updated.accountId = cartaoAcc.id;
          }
        }

        return updated;
      })
    );
  };

  const handleDiscountChange = (val: number) => {
    const maxDiscount = subtotal + freight;
    const d = Math.max(0, Math.min(maxDiscount, val));
    setDiscount(d);
  };

  const handleModeChange = (mode: 'INTEGRAL' | 'PARCIAL' | 'PENDENTE') => {
    setPaymentMode(mode);
    const newTotal = Math.max(0, Number((subtotal + freight - discount).toFixed(2)));
    if (mode === 'INTEGRAL') {
      setPaymentEntries([
        {
          id: `pentry-${Date.now()}`,
          method: 'PIX',
          accountId: defaultAccount?.id || '',
          amount: newTotal,
        },
      ]);
    } else if (mode === 'PARCIAL') {
      const half = Number((newTotal / 2).toFixed(2));
      setPaymentEntries([
        {
          id: `pentry-${Date.now()}`,
          method: 'PIX',
          accountId: defaultAccount?.id || '',
          amount: half,
        },
      ]);
    } else if (mode === 'PENDENTE') {
      setPaymentEntries([]);
    }
  };

  // Validation before finalizing
  const hasCashPayment = paymentEntries.some(
    (p) => String(p.method || '').toLowerCase().includes('dinheiro') && p.amount > 0
  );

  const handleFinalize = () => {
    if (!cartItems.length) return;

    let paymentStatus: PaymentStatus = 'PAGO';
    const payments: PaymentRecord[] = [];
    const now = new Date().toISOString();

    if (paymentMode === 'INTEGRAL') {
      if (totalPaid < total - 0.01) {
        alert(
          `Para pagamento à vista, a soma dos pagamentos (${formatCurrency(
            totalPaid
          )}) deve cobrir o valor total de ${formatCurrency(total)}.`
        );
        return;
      }
      paymentStatus = 'PAGO';
    } else if (paymentMode === 'PARCIAL') {
      if (totalPaid <= 0) {
        alert('Para pagamento parcial, informe ao menos uma entrada maior que R$ 0,00.');
        return;
      }
      if (totalPaid >= total) {
        paymentStatus = 'PAGO';
      } else {
        paymentStatus = 'PARCIALMENTE_PAGO';
      }
    } else {
      paymentStatus = 'A_PRAZO';
      // Venda a Prazo: nenhum pagamento financeiro foi recebido no ato da venda.
      // Mantém saldo a receber pendente e status A_PRAZO até confirmação manual do vendedor.
    }

    // Build PaymentRecords with Account and Fee calculations
    if (paymentMode !== 'PENDENTE') {
      paymentEntries.forEach((entry, idx) => {
        const amt = Number(parseFloat(String(entry.amount)).toFixed(2));
        if (amt <= 0) return;

        let acc = activeAccounts.find((a) => a.id === entry.accountId);
        const entryMethodStr = String(entry.method || '');
        const isCredit =
          entryMethodStr.toLowerCase().includes('crédito') ||
          entryMethodStr.toLowerCase().includes('credito');
        const isDebit =
          entryMethodStr.toLowerCase().includes('débito') ||
          entryMethodStr.toLowerCase().includes('debito');
        const isCard = isCredit || isDebit || entryMethodStr.toLowerCase().includes('cart');

        if (isCard && (!acc || acc.type !== 'CARTAO')) {
          const cardAcc =
            activeAccounts.find((a) => a.type === 'CARTAO' && a.isDefault) ||
            activeAccounts.find((a) => a.type === 'CARTAO');
          if (cardAcc) acc = cardAcc;
        }

        let feePercent = 0;
        if (acc && acc.type === 'CARTAO') {
          if (isCredit && acc.creditFeePercent !== undefined) {
            feePercent = acc.creditFeePercent;
          } else if (isDebit && acc.debitFeePercent !== undefined) {
            feePercent = acc.debitFeePercent;
          }
        } else if (isCard) {
          feePercent = isCredit ? 3.5 : 1.5;
        }

        const feeAmount = feePercent > 0 ? Number(((amt * feePercent) / 100).toFixed(2)) : 0;
        const netAmount = Number((amt - feeAmount).toFixed(2));

        payments.push({
          id: `pay-${Date.now()}-${idx}`,
          method: entry.method,
          amount: amt,
          date: now,
          accountId: acc?.id,
          accountName: acc?.name || `${entry.method || 'Outro'} — Padrão`,
          accountType: acc?.type || (entryMethodStr.toLowerCase().includes('dinheiro') ? 'CAIXA' : entryMethodStr.toLowerCase().includes('pix') ? 'PIX' : 'CARTAO'),
          cardType: isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined,
          feePercent,
          feeAmount,
          netAmount,
          notes: entry.notes,
        });
      });
    }

    try {
      const sellerToAssign =
        availableSellers.find((s) => s.id === selectedSellerId) || currentUser;

      const result = StorageService.createSale({
        seller: sellerToAssign,
        customer: selectedCustomer || undefined,
        cartItems,
        freight,
        discount,
        payments,
        paymentStatus,
        dueDate: paymentMode !== 'INTEGRAL' ? dueDate : undefined,
        notes: notes.trim() || undefined,
      });

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      onSaleCompleted(result.sale, result.productionOrdersCreated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar venda.');
    }
  };

  return (
    <Modal
      id="pos-checkout-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Finalizar Venda no PDV"
      subtitle="Defina o vendedor, cliente, contas de recebimento e formas de pagamento"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Cash Register Alert if Cash is used while register is closed */}
        {hasCashPayment && !currentCashRegister && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> O caixa físico está fechado no momento. Deseja abrir o caixa para controle de troco?
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenCashModalOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shrink-0 cursor-pointer"
            >
              Abrir Caixa
            </button>
          </div>
        )}

        {/* Seller & Customer Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Seller Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Vendedor Responsável
              </span>
            </div>

            <select
              id="select-sale-seller"
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {availableSellers.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  {s.name}{' '}
                  {s.role === 'ADMINISTRADOR'
                    ? '(Administrador)'
                    : s.role === 'COLABORADOR'
                    ? '(Colaborador)'
                    : s.role === 'VENDEDOR_EXTERNO'
                    ? '(Vendedor Externo)'
                    : s.isTestUser
                    ? '(Simulação)'
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Identificação do Cliente
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsIdentifyCustomerOpen(true)}
                  className="text-xs text-slate-700 font-bold flex items-center gap-1 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Localizar cliente cadastrado"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Identificar
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cadastrar novo cliente"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Novo
                </button>
              </div>
            </div>

            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const found = customersList.find((c) => c.id === e.target.value);
                onSelectCustomer(found || null);
              }}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="" className="bg-white text-slate-900">
                Cliente Balcão / Não Identificado
              </option>
              {customersList.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Financial Breakdown & Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="block text-[10px] uppercase font-bold text-slate-500">
              Subtotal dos Itens
            </span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(subtotal + freight)}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
              Desconto (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={subtotal + freight}
              value={discount}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-0.5 text-sm font-bold text-rose-600 bg-white border border-slate-300 rounded-lg focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
            <span className="block text-[10px] uppercase font-bold text-emerald-800">
              Total Líquido da Venda
            </span>
            <span className="text-lg font-black text-emerald-700">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Payment Condition Mode */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Condição de Pagamento *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div
              onClick={() => handleModeChange('INTEGRAL')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                paymentMode === 'INTEGRAL'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p className="text-xs font-bold text-emerald-800">À Vista (Total Pago)</p>
              <p className="text-[10px] text-slate-500">100% quitado no ato</p>
            </div>

            <div
              onClick={() => handleModeChange('PARCIAL')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                paymentMode === 'PARCIAL'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p className="text-xs font-bold text-amber-800">Pagamento Parcial</p>
              <p className="text-[10px] text-slate-500">Entrada + Saldo a receber</p>
            </div>

            <div
              onClick={() => handleModeChange('PENDENTE')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                paymentMode === 'PENDENTE'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p className="text-xs font-bold text-purple-800">Venda a Prazo / Pendente</p>
              <p className="text-[10px] text-slate-500">Recebimento futuro</p>
            </div>
          </div>
        </div>

        {/* Multi-Payment List Section (When not 100% Pendente) */}
        {paymentMode !== 'PENDENTE' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Formas de Pagamento e Contas de Recebimento
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddPaymentEntry}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dividir Pagamento</span>
              </button>
            </div>

            {/* List of Payment Rows */}
            <div className="space-y-2.5">
              {paymentEntries.map((entry, idx) => {
                const account = activeAccounts.find((a) => a.id === entry.accountId);
                const entryMethodStr = String(entry.method || '');
                const isCredit = entryMethodStr.toLowerCase().includes('crédito');
                const isDebit = entryMethodStr.toLowerCase().includes('débito');

                let feeRate = 0;
                if (account && account.type === 'CARTAO') {
                  feeRate = isCredit
                    ? account.creditFeePercent ?? 3.5
                    : isDebit
                    ? account.debitFeePercent ?? 1.5
                    : 0;
                }
                const amt = parseFloat(String(entry.amount)) || 0;
                const feeCost = feeRate > 0 ? (amt * feeRate) / 100 : 0;
                const netAmt = Math.max(0, amt - feeCost);

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      {/* Forma de Pagamento */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                          Forma de Pagamento
                        </label>
                        <select
                          value={entry.method}
                          onChange={(e) =>
                            handleUpdatePaymentEntry(entry.id, { method: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                        >
                          {companySettings.paymentMethods.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Conta de Recebimento */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                          Conta de Recebimento
                        </label>
                        <select
                          value={entry.accountId}
                          onChange={(e) =>
                            handleUpdatePaymentEntry(entry.id, { accountId: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                        >
                          {activeAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.receiverName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valor R$ */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={total}
                          value={entry.amount}
                          onChange={(e) =>
                            handleUpdatePaymentEntry(entry.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      {/* Delete button if > 1 */}
                      <div className="sm:col-span-1 flex justify-end">
                        {paymentEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentEntry(entry.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover este pagamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Fee Calculation Info Badge */}
                    {account && account.type === 'CARTAO' && feeRate > 0 && amt > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[10px] text-indigo-900 font-semibold">
                        <span>
                          Taxa da Maquininha: {feeRate.toFixed(2)}% (-{formatCurrency(feeCost)})
                        </span>
                        <span className="font-bold text-indigo-700">
                          Líquido para a conta: {formatCurrency(netAmt)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Paid vs Total Venda vs Restante Status Bar */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">
                Total Informado: {formatCurrency(totalPaid)}
              </span>

              {remainingAmount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-700">
                    Restante a Pagar: {formatCurrency(remainingAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (paymentEntries.length > 0) {
                        const last = paymentEntries[paymentEntries.length - 1];
                        handleUpdatePaymentEntry(last.id, {
                          amount: Number((last.amount + remainingAmount).toFixed(2)),
                        });
                      }
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded transition-colors cursor-pointer"
                  >
                    Completar
                  </button>
                </div>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Total 100% coberto
                </span>
              )}
            </div>
          </div>
        )}

        {/* Due date if Partial or Pending */}
        {paymentMode !== 'INTEGRAL' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-[10px] uppercase font-bold text-amber-800">
                Saldo a Receber / Pendente
              </span>
              <span className="text-base font-extrabold text-amber-800">
                {formatCurrency(remainingAmount)}
              </span>
            </div>

            <div>
              <label
                htmlFor="pos-checkout-due-date"
                className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                Vencimento do Saldo *
              </label>
              <input
                id="pos-checkout-due-date"
                type="date"
                required
                value={dueDate}
                onClick={(e) => {
                  try {
                    (e.currentTarget as any).showPicker?.();
                  } catch {}
                }}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-900 focus:border-amber-500 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observações da Venda (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Entregar com nota, cliente busca na sexta..."
            className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Voltar ao Carrinho
          </button>
          <button
            type="button"
            id="btn-confirm-checkout"
            onClick={handleFinalize}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar e Emitir Pedido ({formatCurrency(total)})</span>
          </button>
        </div>
      </div>

      {/* Customer Identification (Search) Modal */}
      {isIdentifyCustomerOpen && (
        <CustomerSearchModal
          isOpen={isIdentifyCustomerOpen}
          onClose={() => setIsIdentifyCustomerOpen(false)}
          onSelectCustomer={(c) => {
            onSelectCustomer(c);
            setCustomersList(StorageService.getCustomers());
          }}
          onRequestNewCustomer={() => {
            setIsIdentifyCustomerOpen(false);
            setIsCustomerModalOpen(true);
          }}
        />
      )}

      {/* Customer Quick Registration Modal */}
      {isCustomerModalOpen && (
        <POSCustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectCustomer={(c) => {
            onSelectCustomer(c);
            setCustomersList(StorageService.getCustomers());
          }}
          onCustomerCreated={(c) => {
            setCustomersList(StorageService.getCustomers());
          }}
        />
      )}

      {/* Open Cash Quick Modal */}
      {isOpenCashModalOpen && (
        <OpenCashModal
          isOpen={isOpenCashModalOpen}
          onClose={() => setIsOpenCashModalOpen(false)}
          onCashOpened={() => {
            // Cash opened
          }}
        />
      )}
    </Modal>
  );
};

import { Building2, Check, CreditCard, DollarSign } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import { CompanySettings, ReceivingAccount, Sale } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  companySettings: CompanySettings;
  onPaymentRecorded: () => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  companySettings,
  onPaymentRecorded,
}) => {
  if (!sale) return null;

  const [receivingAccounts] = useState<ReceivingAccount[]>(() =>
    StorageService.getReceivingAccounts()
  );
  const activeAccounts = useMemo(
    () => receivingAccounts.filter((a) => a.active),
    [receivingAccounts]
  );
  const defaultAccount = activeAccounts.find((a) => a.isDefault) || activeAccounts[0];

  const [amount, setAmount] = useState<number>(sale.remainingAmount);
  const [method, setMethod] = useState<string>(companySettings.paymentMethods[0] || 'PIX');
  const [accountId, setAccountId] = useState<string>(defaultAccount?.id || '');
  const [notes, setNotes] = useState<string>('Recebimento de saldo em aberto');

  const selectedAccount = activeAccounts.find((a) => a.id === accountId);
  const methodStr = String(method || '');
  const isCredit = methodStr.toLowerCase().includes('crédito');
  const isDebit = methodStr.toLowerCase().includes('débito');

  let feeRate = 0;
  if (selectedAccount && selectedAccount.type === 'CARTAO') {
    feeRate = isCredit
      ? selectedAccount.creditFeePercent ?? 3.5
      : isDebit
      ? selectedAccount.debitFeePercent ?? 1.5
      : 0;
  }
  const feeCost = feeRate > 0 ? (amount * feeRate) / 100 : 0;
  const netAmount = Math.max(0, amount - feeCost);

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    const mLower = String(newMethod || '').toLowerCase();
    if (mLower.includes('dinheiro')) {
      const caixa = activeAccounts.find((a) => a.type === 'CAIXA');
      if (caixa) setAccountId(caixa.id);
    } else if (mLower.includes('pix')) {
      const pix = activeAccounts.find((a) => a.type === 'PIX');
      if (pix) setAccountId(pix.id);
    } else if (mLower.includes('cart') || mLower.includes('crédito') || mLower.includes('débito')) {
      const cartao = activeAccounts.find((a) => a.type === 'CARTAO');
      if (cartao) setAccountId(cartao.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > sale.remainingAmount) {
      alert('Valor de pagamento inválido.');
      return;
    }

    try {
      const subMethodStr = String(method || '');
      StorageService.recordSalePayment(sale.id, {
        method,
        amount,
        accountId: selectedAccount?.id,
        accountName: selectedAccount?.name || `${method || 'Outro'} — Padrão`,
        accountType:
          selectedAccount?.type ||
          (subMethodStr.toLowerCase().includes('dinheiro')
            ? 'CAIXA'
            : subMethodStr.toLowerCase().includes('pix')
            ? 'PIX'
            : 'CARTAO'),
        cardType: isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined,
        feePercent: feeRate,
        feeAmount: feeCost,
        netAmount,
        notes: notes.trim() || undefined,
      });
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pagamento.');
    }
  };

  return (
    <Modal
      id="receive-payment-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Baixar Saldo / Contas a Receber"
      subtitle={`Pedido ${sale.saleNumber} • Cliente: ${sale.customerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Balance Overview */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Total da Venda:</span>
            <span className="font-bold text-slate-800">{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Já Pago Anteriormente:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(sale.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-amber-900 pt-1 border-t border-amber-200">
            <span>Saldo em Aberto a Receber:</span>
            <span>{formatCurrency(sale.remainingAmount)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Valor a Receber Agora (R$) *
          </label>
          <input
            type="number"
            min="0.01"
            max={sale.remainingAmount}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3.5 py-2 text-base font-bold text-emerald-600 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma de Pagamento *
            </label>
            <select
              value={method}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {companySettings.paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conta de Recebimento *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.receiverName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card fee summary if applicable */}
        {selectedAccount && selectedAccount.type === 'CARTAO' && feeRate > 0 && (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <span>Taxa ({feeRate}%): -{formatCurrency(feeCost)}</span>
            <span className="font-bold">Líquido na conta: {formatCurrency(netAmount)}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observação do Recebimento
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Recebimento ({formatCurrency(amount)})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

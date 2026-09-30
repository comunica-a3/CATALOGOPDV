import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  DollarSign,
  AlertCircle,
  Building2,
  Check,
  Wallet,
  CreditCard,
  QrCode,
  Info,
} from 'lucide-react';
import { ReceivingAccount, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ReceivingAccount[];
  accountBalances: Record<string, number>;
  onTransferSuccess: () => void;
  defaultFromAccountId?: string;
  defaultToAccountId?: string;
  currentUser?: User;
}

export const AccountTransferModal: React.FC<AccountTransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountBalances,
  onTransferSuccess,
  defaultFromAccountId,
  defaultToAccountId,
  currentUser,
}) => {
  const activeAccounts = accounts.filter((a) => a.active);

  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize or reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      setAmount('');
      setObservation('');
      setDate(new Date().toISOString().split('T')[0]);

      // Set default from account
      if (defaultFromAccountId && activeAccounts.some((a) => a.id === defaultFromAccountId)) {
        setFromAccountId(defaultFromAccountId);
      } else if (activeAccounts.length > 0) {
        setFromAccountId(activeAccounts[0].id);
      } else {
        setFromAccountId('');
      }

      // Set default to account (distinct from fromAccount if possible)
      if (
        defaultToAccountId &&
        defaultToAccountId !== defaultFromAccountId &&
        activeAccounts.some((a) => a.id === defaultToAccountId)
      ) {
        setToAccountId(defaultToAccountId);
      } else {
        const other = activeAccounts.find((a) => a.id !== (defaultFromAccountId || activeAccounts[0]?.id));
        setToAccountId(other ? other.id : '');
      }
    }
  }, [isOpen, defaultFromAccountId, defaultToAccountId, accounts]);

  if (!isOpen) return null;

  const fromAccount = activeAccounts.find((a) => a.id === fromAccountId);
  const toAccount = activeAccounts.find((a) => a.id === toAccountId);

  const fromBalance = fromAccountId ? (accountBalances[fromAccountId] ?? StorageService.getAccountBalance(fromAccountId)) : 0;
  const toBalance = toAccountId ? (accountBalances[toAccountId] ?? StorageService.getAccountBalance(toAccountId)) : 0;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const simulatedFromBalance = fromBalance - parsedAmount;
  const simulatedToBalance = toBalance + parsedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromAccountId || !toAccountId) {
      setError('Selecione a conta de origem e a conta de destino.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('A conta de origem e a conta de destino devem ser diferentes.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('O valor da transferência deve ser maior que zero.');
      return;
    }

    if (!date) {
      setError('Informe a data da transferência.');
      return;
    }

    if (numAmount > fromBalance) {
      setError('Saldo insuficiente para realizar esta transferência.');
      return;
    }

    try {
      setIsSubmitting(true);
      await StorageService.saveFinancialTransfer({
        fromAccountId,
        toAccountId,
        amount: numAmount,
        date,
        observation: observation.trim() || undefined,
        user: currentUser,
      });

      onTransferSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar a transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case 'CAIXA':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      case 'PIX':
        return <QrCode className="w-4 h-4 text-teal-600" />;
      case 'CARTAO':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      default:
        return <Building2 className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Modal
      id="account-transfer-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Transferência entre Contas"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="form-account-transfer">
        {/* Informative Header Banner */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Transferência Interna de Recursos: </span>
            Apenas move o saldo de onde o dinheiro está armazenado.
            <strong className="block mt-0.5 text-blue-950 font-semibold">
              Não altera receitas, despesas, faturamento ou lucro da empresa.
            </strong>
          </div>
        </div>

        {error && (
          <div
            id="transfer-error-alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Source & Destination Accounts Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Conta de Origem */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="transfer-from-account" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Conta de Origem (Saída)</span>
              </label>
              <span className="text-[11px] font-extrabold text-slate-700">
                Saldo: {formatCurrency(fromBalance)}
              </span>
            </div>

            <select
              id="transfer-from-account"
              value={fromAccountId}
              onChange={(e) => {
                setFromAccountId(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">[ Selecionar conta ]</option>
              {activeAccounts.map((acc) => {
                const bal = accountBalances[acc.id] ?? StorageService.getAccountBalance(acc.id);
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatCurrency(bal)})
                  </option>
                );
              })}
            </select>

            {fromAccount && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                {getAccountIcon(fromAccount.type)}
                <span>Favorecido: {fromAccount.receiverName}</span>
              </div>
            )}
          </div>

          {/* Conta de Destino */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="transfer-to-account" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Conta de Destino (Entrada)</span>
              </label>
              <span className="text-[11px] font-extrabold text-slate-700">
                Saldo: {formatCurrency(toBalance)}
              </span>
            </div>

            <select
              id="transfer-to-account"
              value={toAccountId}
              onChange={(e) => {
                setToAccountId(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">[ Selecionar conta ]</option>
              {activeAccounts.map((acc) => {
                const bal = accountBalances[acc.id] ?? StorageService.getAccountBalance(acc.id);
                const isOrigin = acc.id === fromAccountId;
                return (
                  <option key={acc.id} value={acc.id} disabled={isOrigin}>
                    {acc.name} (Saldo: {formatCurrency(bal)}) {isOrigin ? '— [Origem]' : ''}
                  </option>
                );
              })}
            </select>

            {toAccount && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                {getAccountIcon(toAccount.type)}
                <span>Favorecido: {toAccount.receiverName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount & Date Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Valor */}
          <div>
            <label htmlFor="transfer-amount" className="block text-xs font-bold text-slate-700 mb-1">
              Valor a Transferir (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-extrabold text-slate-900 focus:border-blue-500 focus:outline-none placeholder-slate-400"
                required
              />
            </div>
            {fromAccountId && parsedAmount > fromBalance && (
              <p className="text-[11px] font-bold text-rose-600 mt-1">
                Atenção: valor superior ao saldo disponível ({formatCurrency(fromBalance)})
              </p>
            )}
          </div>

          {/* Data */}
          <div>
            <label htmlFor="transfer-date" className="block text-xs font-bold text-slate-700 mb-1">
              Data da Transferência
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="transfer-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Live Simulation Preview */}
        {fromAccountId && toAccountId && fromAccountId !== toAccountId && parsedAmount > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
              Simulação de Saldos após a Transferência:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="block text-[10px] text-slate-500 font-bold truncate">{fromAccount?.name}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-slate-400 line-through text-[11px]">{formatCurrency(fromBalance)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className={`font-extrabold ${simulatedFromBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(simulatedFromBalance)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-600">- {formatCurrency(parsedAmount)}</span>
              </div>

              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="block text-[10px] text-slate-500 font-bold truncate">{toAccount?.name}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-slate-400 line-through text-[11px]">{formatCurrency(toBalance)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-extrabold text-emerald-700">{formatCurrency(simulatedToBalance)}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">+ {formatCurrency(parsedAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Observação (Opcional) */}
        <div>
          <label htmlFor="transfer-observation" className="block text-xs font-bold text-slate-700 mb-1">
            Observação (Opcional)
          </label>
          <input
            id="transfer-observation"
            type="text"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Ex: Depósito das vendas do dia, reforço de caixa, transferência bancária..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            id="btn-cancel-transfer"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-confirm-transfer"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Transferindo...' : 'Transferir'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

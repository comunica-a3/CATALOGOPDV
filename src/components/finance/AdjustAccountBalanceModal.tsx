import React, { useState, useEffect } from 'react';
import {
  Sliders,
  DollarSign,
  AlertCircle,
  Building2,
  CreditCard,
  QrCode,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ReceivingAccount, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

interface AdjustAccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ReceivingAccount | null;
  currentBalance: number;
  onSuccess: () => void;
  currentUser?: User;
}

export const AdjustAccountBalanceModal: React.FC<AdjustAccountBalanceModalProps> = ({
  isOpen,
  onClose,
  account,
  currentBalance,
  onSuccess,
  currentUser,
}) => {
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && account) {
      setError('');
      setReason('');
      setNewBalanceInput(currentBalance.toFixed(2));
    }
  }, [isOpen, account, currentBalance]);

  if (!account) return null;

  const parsedNewBalance = parseFloat(newBalanceInput.replace(',', '.'));
  const isValidNumber = !isNaN(parsedNewBalance);
  const difference = isValidNumber ? parsedNewBalance - currentBalance : 0;
  const hasChanged = isValidNumber && Math.abs(difference) > 0.001;

  const AccountIcon =
    account.type === 'CAIXA'
      ? DollarSign
      : account.type === 'PIX'
      ? QrCode
      : account.type === 'CARTAO'
      ? CreditCard
      : Building2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidNumber) {
      setError('Por favor, informe um valor numérico válido para o novo saldo.');
      return;
    }

    if (!hasChanged) {
      setError('O novo saldo informado é idêntico ao saldo atual da conta.');
      return;
    }

    if (!reason.trim()) {
      setError('Por favor, informe a justificativa ou observação deste ajuste administrativo.');
      return;
    }

    setIsSubmitting(true);
    try {
      StorageService.saveAccountBalanceAdjustment({
        accountId: account.id,
        accountName: account.name,
        previousBalance: currentBalance,
        newBalance: parsedNewBalance,
        adjustedAmount: difference,
        reason: reason.trim(),
        userId: currentUser?.id,
        userName: currentUser?.name || currentUser?.username || 'Administrador',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao registrar ajuste administrativo:', err);
      setError(err?.message || 'Erro ao registrar o ajuste de saldo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste Administrativo de Saldo"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
        {/* Account Info Header */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <AccountIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{account.name}</h4>
              <p className="text-xs text-slate-500">
                Titular: <strong>{account.receiverName}</strong> • Tipo: {account.type}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Saldo Atual
            </span>
            <span className={`text-sm font-extrabold ${currentBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
        </div>

        {/* Informative Rule Badge */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Regra Contábil Administrativa:</strong> Este ajuste atualiza exclusivamente o saldo real disponível desta conta para conciliação. Ele <strong>NÃO</strong> é considerado receita, venda, faturamento, despesa ou custo, e não interfere no DRE.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input: Novo Saldo */}
        <div>
          <label htmlFor="adjust-new-balance" className="block text-xs font-bold text-slate-700 mb-1">
            Novo Saldo Real da Conta (R$) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
            <input
              id="adjust-new-balance"
              type="number"
              step="0.01"
              value={newBalanceInput}
              onChange={(e) => setNewBalanceInput(e.target.value)}
              placeholder="0.00"
              required
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Difference calculation preview */}
        {isValidNumber && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Saldo Atual da Conta:</span>
              <span className="font-bold text-slate-800">{formatCurrency(currentBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Novo Saldo Ajustado:</span>
              <span className="font-bold text-slate-900">{formatCurrency(parsedNewBalance)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                {difference > 0 ? (
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                ) : difference < 0 ? (
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                )}
                <span className={difference > 0 ? 'text-blue-700' : difference < 0 ? 'text-amber-700' : 'text-slate-600'}>
                  {difference > 0 ? 'Ajuste para Cima' : difference < 0 ? 'Ajuste para Baixo' : 'Sem Alteração'}
                </span>
              </div>
              <span className={`text-sm font-extrabold ${difference > 0 ? 'text-blue-700' : difference < 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                {difference > 0 ? `+ ${formatCurrency(difference)}` : difference < 0 ? `- ${formatCurrency(Math.abs(difference))}` : 'R$ 0,00'}
              </span>
            </div>
          </div>
        )}

        {/* Input: Justificativa / Observação */}
        <div>
          <label htmlFor="adjust-reason" className="block text-xs font-bold text-slate-700 mb-1">
            Motivo / Justificativa do Ajuste *
          </label>
          <textarea
            id="adjust-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Conferência física da gaveta do caixa, conciliação do extrato bancário, correção de abertura..."
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            id="btn-cancel-adjust"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-confirm-adjust"
            disabled={isSubmitting || !hasChanged}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Salvando Ajuste...' : 'Confirmar Ajuste de Saldo'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

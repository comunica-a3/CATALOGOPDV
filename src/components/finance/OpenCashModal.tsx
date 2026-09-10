import { AlertCircle, Check, DollarSign, Lock, User, Wallet } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { CashRegisterSession } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface OpenCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashOpened?: (session: CashRegisterSession) => void;
  onSuccess?: (session: CashRegisterSession) => void;
}

export const OpenCashModal: React.FC<OpenCashModalProps> = ({
  isOpen,
  onClose,
  onCashOpened,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [initialAmount, setInitialAmount] = useState<string>('0.00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickAmounts = [0, 50, 100, 150, 200, 300, 500];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(initialAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum < 0) {
      setError('Informe um valor de abertura válido (>= 0).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const session = StorageService.openCashRegister({
        initialAmount: amountNum,
        user: currentUser,
        notes: notes.trim() || undefined,
      });
      if (onCashOpened) {
        onCashOpened(session);
      }
      if (onSuccess) {
        onSuccess(session);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir o caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      id="open-cash-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Abertura de Caixa Físico"
      subtitle="Defina o saldo inicial (fundo de troco) para iniciar os atendimentos"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Responsible operator info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500">Operador responsável pelo caixa</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
            {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Initial Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Valor Inicial no Caixa (Fundo de Troco / Saldo em Dinheiro) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              autoFocus
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 text-xl font-black text-emerald-700 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Informe as notas e moedas físicas presentes na gaveta antes de começar a registrar vendas.
          </p>
        </div>

        {/* Quick Amount Pills */}
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Atalhos de Fundo de Caixa:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setInitialAmount(amt.toFixed(2))}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  parseFloat(initialAmount) === amt
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {formatCurrency(amt)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observações de Abertura (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Turno da manhã, troco em notas de R$ 5 e R$ 10..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Abrir Caixa Agora</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

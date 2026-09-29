import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Lock,
  QrCode,
  Receipt,
  User,
  Wallet,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { CashRegisterSession } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface CloseCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashRegisterSession;
  onCashClosed: (closedSession: CashRegisterSession) => void;
}

export const CloseCashModal: React.FC<CloseCashModalProps> = ({
  isOpen,
  onClose,
  session,
  onCashClosed,
}) => {
  const { currentUser } = useAuth();
  const [closingNotes, setClosingNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute live summary based on sales recorded so far
  const summary = useMemo(() => {
    return StorageService.calculateSessionSummary(session);
  }, [session]);

  const [countedCashInput, setCountedCashInput] = useState<string>(
    summary.expectedCashAmount.toFixed(2)
  );

  const countedNum = Math.max(0, parseFloat(countedCashInput.replace(',', '.')) || 0);
  const diff = Number((countedNum - summary.expectedCashAmount).toFixed(2));

  const handleFillExpected = () => {
    setCountedCashInput(summary.expectedCashAmount.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(countedNum)) {
      setError('Informe o valor físico contado no caixa.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const closedSession = StorageService.closeCashRegister({
        countedCashAmount: countedNum,
        user: currentUser,
        closingNotes: closingNotes.trim() || undefined,
      });
      onCashClosed(closedSession);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar o caixa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      id="close-cash-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Fechamento de Caixa — ${session.registerNumber}`}
      subtitle="Conferência de valores físicos, entradas e apuração do período"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header Summary Info */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Abertura
            </span>
            <span className="font-bold text-slate-800">
              {formatDateTime(session.openedAt)}
            </span>
            <p className="text-[11px] text-slate-500">Por: {session.openedByUserName}</p>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Fechamento Agora
            </span>
            <span className="font-bold text-slate-800">
              {formatDateTime(new Date().toISOString())}
            </span>
            <p className="text-[11px] text-slate-500">Operador: {currentUser.name}</p>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Total de Vendas do Período
            </span>
            <span className="text-base font-extrabold text-blue-700">
              {summary.totalSalesCount} venda(s)
            </span>
            <p className="text-[11px] text-slate-500">
              Bruto: {formatCurrency(summary.totalGrossSales)}
            </p>
          </div>
        </div>

        {/* Cash balance check card */}
        <div className="p-4 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <span className="text-sm font-bold text-emerald-900">
                1. Conferência do Caixa Físico (Dinheiro na Gaveta)
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillExpected}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Copiar Valor Esperado
            </button>
          </div>

          {/* Step Breakdown */}
          <div className={`grid grid-cols-1 ${summary.cashExpensesAmount > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
            <div className="p-3 bg-white border border-emerald-200 rounded-xl">
              <span className="block text-[10px] uppercase font-bold text-slate-500">
                Saldo Inicial (Fundo)
              </span>
              <span className="text-base font-extrabold text-slate-800">
                {formatCurrency(session.initialAmount)}
              </span>
            </div>

            <div className="p-3 bg-white border border-emerald-200 rounded-xl">
              <span className="block text-[10px] uppercase font-bold text-slate-500">
                + Entradas em Dinheiro
              </span>
              <span className="text-base font-extrabold text-emerald-700">
                {formatCurrency(summary.cashSalesAmount)}
              </span>
            </div>

            {summary.cashExpensesAmount > 0 && (
              <div className="p-3 bg-white border border-rose-200 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-rose-500">
                  - Saídas / Retiradas
                </span>
                <span className="text-base font-extrabold text-rose-600">
                  -{formatCurrency(summary.cashExpensesAmount)}
                </span>
              </div>
            )}

            <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl">
              <span className="block text-[10px] uppercase font-bold text-emerald-900">
                = Saldo Esperado na Gaveta
              </span>
              <span className="text-lg font-black text-emerald-900">
                {formatCurrency(summary.expectedCashAmount)}
              </span>
            </div>
          </div>

          {/* Counted input and difference indicator */}
          <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Quanto dinheiro você possui fisicamente no caixa agora? *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 text-lg font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Real-time difference pill */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  diff === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : diff < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}
              >
                {diff === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <p className="text-[11px] font-bold">
                    {diff === 0
                      ? 'Caixa conferido perfeitamente (Sem diferença)'
                      : diff < 0
                      ? `Diferença negativa (Falta no caixa): ${formatCurrency(Math.abs(diff))}`
                      : `Diferença positiva (Sobra no caixa): ${formatCurrency(diff)}`}
                  </p>
                  <p className="text-[10px] opacity-80">
                    Esperado: {formatCurrency(summary.expectedCashAmount)} | Contado:{' '}
                    {formatCurrency(countedNum)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Method and Account Totals Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* By Payment Method */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              2. Total por Forma de Pagamento
            </span>
            <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
              {summary.byMethod.length === 0 ? (
                <p className="text-slate-400 py-2 text-center text-xs">Nenhum pagamento registrado.</p>
              ) : (
                summary.byMethod.map((m) => (
                  <div key={m.method} className="py-1.5 flex items-center justify-between">
                    <span className="font-medium text-slate-700">{m.method}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatCurrency(m.grossAmount)}</span>
                      {m.feeAmount > 0 && (
                        <p className="text-[10px] text-rose-600 font-semibold">
                          Taxas: -{formatCurrency(m.feeAmount)} (Líq: {formatCurrency(m.netAmount)})
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* By Account */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              3. Onde está o dinheiro (Por Conta / Recebedor)
            </span>
            <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
              {summary.byAccount.length === 0 ? (
                <p className="text-slate-400 py-2 text-center text-xs">Nenhum pagamento registrado.</p>
              ) : (
                summary.byAccount.map((a) => (
                  <div key={a.accountId} className="py-1.5 flex items-center justify-between">
                    <span className="font-medium text-slate-700">{a.accountName}</span>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">{formatCurrency(a.netAmount)}</span>
                      <p className="text-[10px] text-slate-400">
                        {a.count} transação(ões) {a.feeAmount > 0 ? `| Taxa: ${formatCurrency(a.feeAmount)}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Total Financial Summary of Session */}
        <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Total Faturado no Período
            </span>
            <p className="text-lg font-black text-white">
              {formatCurrency(summary.totalGrossSales)}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Custo de Taxas de Cartão
            </span>
            <p className="text-lg font-black text-rose-400">
              -{formatCurrency(summary.totalCardFees)}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Total Líquido do Caixa
            </span>
            <p className="text-xl font-black text-emerald-400">
              {formatCurrency(summary.totalNetSales)}
            </p>
          </div>
        </div>

        {/* Closing Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observações de Fechamento (Opcional)
          </label>
          <input
            type="text"
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Ex: Tudo conferido, sangria de R$ 500 realizada para o cofre..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Confirmar Fechamento de Caixa</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

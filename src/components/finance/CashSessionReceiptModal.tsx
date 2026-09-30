import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  QrCode,
  User,
  Wallet,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { CashRegisterSession, CompanySettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadCashSessionPDF } from '../../utils/pdfReceipt';
import { Modal } from '../common/Modal';

interface CashSessionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashRegisterSession | null;
  companySettings: CompanySettings;
}

export const CashSessionReceiptModal: React.FC<CashSessionReceiptModalProps> = ({
  isOpen,
  onClose,
  session,
  companySettings,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!session) return null;

  const handleDownloadPDF = () => {
    try {
      setIsDownloading(true);
      downloadCashSessionPDF(session, companySettings);
    } catch (err) {
      console.error('Erro ao gerar comprovante de caixa:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      id="cash-session-receipt-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Comprovante de Fechamento de Caixa — ${session.registerNumber}`}
      subtitle="Relatório consolidado de movimentações e apuração física"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Printable Card */}
        <div
          ref={printAreaRef}
          id="printable-cash-receipt"
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4 text-xs font-sans text-slate-800"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
              {companySettings.name}
            </h3>
            {companySettings.document && (
              <p className="text-[11px] text-slate-500 font-medium">
                CNPJ: {companySettings.document}
              </p>
            )}
            <p className="text-xs font-bold text-slate-700 mt-1">
              FECHAMENTO DE CAIXA #{session.registerNumber}
            </p>
            <p className="text-[10px] text-slate-400">
              Emitido em {formatDateTime(new Date().toISOString())}
            </p>
          </div>

          {/* Session metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <p className="text-slate-500 font-medium">Aberto em:</p>
              <p className="font-bold text-slate-800">{formatDateTime(session.openedAt)}</p>
              <p className="text-[10px] text-slate-500">Por: {session.openedByUserName}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Fechado em:</p>
              <p className="font-bold text-slate-800">
                {session.closedAt ? formatDateTime(session.closedAt) : 'Ainda em Aberto'}
              </p>
              {session.closedByUserName && (
                <p className="text-[10px] text-slate-500">Por: {session.closedByUserName}</p>
              )}
            </div>
          </div>

          {/* 1. Physical cash breakdown */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>CONFERÊNCIA DE DINHEIRO (GAVETA)</span>
              <span className="text-[10px] font-semibold text-slate-500">Físico</span>
            </p>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-600">Saldo Inicial (Fundo de Caixa):</span>
              <span className="font-bold">{formatCurrency(session.initialAmount)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-600">(+) Entradas em Dinheiro:</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(session.cashSalesAmount)}
              </span>
            </div>
            {Boolean(session.cashExpensesAmount && session.cashExpensesAmount > 0) && (
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">(-) Saídas / Retiradas:</span>
                <span className="font-bold text-rose-600">
                  -{formatCurrency(session.cashExpensesAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-0.5 border-t border-slate-200 pt-1 font-bold text-slate-900">
              <span>(=) Saldo Esperado no Caixa:</span>
              <span>{formatCurrency(session.expectedCashAmount)}</span>
            </div>
            {session.countedCashAmount !== undefined && (
              <>
                <div className="flex justify-between py-0.5 font-bold text-blue-700">
                  <span>Valor Contado no Fechamento:</span>
                  <span>{formatCurrency(session.countedCashAmount)}</span>
                </div>
                <div
                  className={`flex justify-between py-1 px-2 rounded font-black text-xs ${
                    session.cashDifference === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : (session.cashDifference || 0) < 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span>DIFERENÇA NO CAIXA:</span>
                  <span>
                    {session.cashDifference === 0
                      ? 'R$ 0,00 (Exato)'
                      : (session.cashDifference || 0) < 0
                      ? `- ${formatCurrency(Math.abs(session.cashDifference || 0))} (Falta)`
                      : `+ ${formatCurrency(session.cashDifference || 0)} (Sobra)`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 2. Breakdown by payment method */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
              TOTAL POR FORMA DE PAGAMENTO
            </p>
            {session.byMethod.map((m) => (
              <div key={m.method} className="flex justify-between py-0.5 text-slate-700">
                <span>
                  {m.method} ({m.count}x):
                </span>
                <div className="text-right">
                  <span className="font-bold">{formatCurrency(m.grossAmount)}</span>
                  {m.feeAmount > 0 && (
                    <span className="text-[10px] text-rose-600 block">
                      Taxas: -{formatCurrency(m.feeAmount)} | Líq: {formatCurrency(m.netAmount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 3. Breakdown by account */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
              DESTINO DOS RECEBIMENTOS (ONDE ESTÁ O DINHEIRO)
            </p>
            {session.byAccount.map((a) => (
              <div key={a.accountId} className="flex justify-between py-0.5 text-slate-700">
                <span>{a.accountName}:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(a.netAmount)}
                </span>
              </div>
            ))}
          </div>

          {/* 4. Grand Totals */}
          <div className="bg-slate-900 text-white rounded-lg p-3 space-y-1">
            <div className="flex justify-between font-medium text-slate-300">
              <span>Total de Vendas do Período:</span>
              <span className="font-bold text-white">{session.totalSalesCount} venda(s)</span>
            </div>
            <div className="flex justify-between font-medium text-slate-300">
              <span>Faturamento Bruto:</span>
              <span className="font-bold text-white">{formatCurrency(session.totalGrossSales)}</span>
            </div>
            <div className="flex justify-between font-medium text-rose-300">
              <span>(-) Custo Taxas de Cartão:</span>
              <span className="font-bold">-{formatCurrency(session.totalCardFees)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm border-t border-slate-700 pt-1 text-emerald-400">
              <span>FATURAMENTO LÍQUIDO:</span>
              <span>{formatCurrency(session.totalNetSales)}</span>
            </div>
          </div>

          {session.closingNotes && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
              <span className="font-bold">Observações de Fechamento: </span>
              {session.closingNotes}
            </div>
          )}

          {/* Signature placeholder */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">{session.closedByUserName || session.openedByUserName}</p>
              <p>Operador do Caixa</p>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">Gerência / Financeiro</p>
              <p>Conferência</p>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            id="btn-download-cash-receipt-pdf"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Gerando PDF...' : 'Baixar Comprovante em PDF'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

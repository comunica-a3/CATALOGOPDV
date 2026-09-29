import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  Percent,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CompanySettings, Sale, User } from '../../types';
import { calculateSaleCommission } from '../../utils/commissions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadCommissionStatementPDF } from '../../utils/pdfReceipt';
import { Modal } from '../common/Modal';

interface CommissionStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: User;
  period: string;
  periodLabel: string;
  sales: Sale[];
  companySettings: CompanySettings;
}

export const CommissionStatementModal: React.FC<CommissionStatementModalProps> = ({
  isOpen,
  onClose,
  seller,
  period,
  periodLabel,
  sales,
  companySettings,
}) => {
  const isPromoter = seller.role === 'PROMOTOR';
  const [isDownloading, setIsDownloading] = useState(false);

  const totals = useMemo(() => {
    let totalSold = 0;
    let totalCommission = 0;
    let totalCompany = 0;

    sales.forEach((sale) => {
      const comm = calculateSaleCommission(sale);
      totalSold += sale.total;
      if (isPromoter) {
        totalCommission += comm.promoterCommissionAmount;
      } else {
        totalCommission += comm.sellerCommissionAmount;
      }
      totalCompany += comm.companyAmount;
    });

    const averageRate = totalSold > 0 ? (totalCommission / totalSold) * 100 : (isPromoter ? 20 : 50);

    return {
      totalSold: Number(totalSold.toFixed(2)),
      totalCommission: Number(totalCommission.toFixed(2)),
      totalCompany: Number(totalCompany.toFixed(2)),
      averageRate: Number(averageRate.toFixed(1)),
      count: sales.length,
    };
  }, [sales, isPromoter]);

  const handleDownloadPDF = () => {
    try {
      setIsDownloading(true);
      downloadCommissionStatementPDF(seller, periodLabel, sales, totals, companySettings);
    } catch (err) {
      console.error('Erro ao gerar extrato de comissões:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      id="commission-statement-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={isPromoter ? 'Extrato de Comissões do Promotor' : 'Extrato de Comissões do Vendedor'}
      subtitle={`Fechamento e autorização de repasse financeiro (${periodLabel})`}
      maxWidth="3xl"
    >
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Printable Statement Container */}
        <div
          id="printable-commission-statement"
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5 print:border-none print:p-0"
        >
          {/* Header with Company & Seller Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {companySettings.name || 'Gráfica Digital Express'}
              </h2>
              <p className="text-xs text-slate-500">{companySettings.document}</p>
              <p className="text-xs text-slate-500">{companySettings.address}</p>
            </div>

            <div className="sm:text-right bg-slate-50 border border-slate-200 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isPromoter ? 'Extrato de Promotor' : 'Extrato de Vendedor'}
              </span>
              <p className="text-xs font-bold text-slate-900">{seller.name}</p>
              <p className="text-[11px] text-slate-500">Período: {periodLabel}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Financial Totals Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="block text-[10px] uppercase font-bold text-slate-500">
                {isPromoter ? 'Total dos Meus Orçamentos' : 'Total de Vendas no Período'}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(totals.totalSold)}
              </span>
              <span className="block text-[10px] text-slate-400">
                {totals.count} pedido(s) faturados
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="block text-[10px] uppercase font-bold text-emerald-800">
                {isPromoter ? 'Comissão a Pagar ao Promotor' : 'Comissão a Pagar ao Vendedor'}
              </span>
              <span className="text-xl font-extrabold text-emerald-700">
                {formatCurrency(totals.totalCommission)}
              </span>
              <span className="block text-[10px] text-emerald-700/80">
                Taxa média: {totals.averageRate}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="block text-[10px] uppercase font-bold text-slate-500">
                Parte Retida pela Empresa
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(totals.totalCompany)}
              </span>
              <span className="block text-[10px] text-slate-400">
                Líquido operacional
              </span>
            </div>
          </div>

          {/* Sales Listing Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Relação de Pedidos e Comissões
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-2">Data</th>
                    <th className="py-2.5 px-2">Cliente</th>
                    <th className="py-2.5 px-2 text-right">Total Venda</th>
                    <th className="py-2.5 px-2 text-center">Taxa</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Comissão (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length > 0 ? (
                    sales.map((s) => {
                      const comm = calculateSaleCommission(s);
                      const earned = isPromoter
                        ? comm.promoterCommissionAmount
                        : comm.sellerCommissionAmount;
                      const effRate = s.total > 0 ? (earned / s.total) * 100 : 0;
                      return (
                        <tr key={s.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {s.saleNumber}
                          </td>
                          <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">
                            {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2 px-2 text-slate-800 font-medium truncate max-w-[140px]">
                            {s.customerName}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-900">
                            {formatCurrency(s.total)}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-500 font-mono text-[10px]">
                            {effRate.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {formatCurrency(earned)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Nenhuma venda registrada para este {isPromoter ? 'promotor' : 'vendedor'} no período.
                      </td>
                    </tr>
                  )}
                </tbody>
                {sales.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px] text-slate-600">
                        Total a Repassar
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-900">
                        {formatCurrency(totals.totalSold)}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono">—</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 text-sm">
                        {formatCurrency(totals.totalCommission)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Signatures and Authorization Box */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-300 pb-1 mb-1">
                <span className="font-semibold text-slate-800">{seller.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {isPromoter ? 'Assinatura do Promotor' : 'Assinatura do Vendedor'}
              </span>
            </div>

            <div>
              <div className="border-b border-slate-300 pb-1 mb-1">
                <span className="font-semibold text-slate-800">
                  {companySettings.name || 'Diretoria / Financeiro'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Autorização Financeira / Gestão
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
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
            id="btn-download-commission-pdf"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Gerando PDF...' : 'Baixar Extrato em PDF'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

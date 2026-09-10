import React, { useState } from 'react';
import { Download, FileText, Receipt, X, Check } from 'lucide-react';
import { CompanySettings, Sale } from '../../types';
import { downloadOrderReceiptPDF, formatReceiptDate, ReceiptFormat } from '../../utils/pdfReceipt';
import { formatCurrency } from '../../utils/formatters';
import { StorageService } from '../../services/storage';

interface ReceiptFormatSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  companySettings: CompanySettings;
}

export const ReceiptFormatSelectorModal: React.FC<ReceiptFormatSelectorModalProps> = ({
  isOpen,
  onClose,
  sale,
  companySettings,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ReceiptFormat>('a4');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !sale) return null;

  const customerAddress = sale.customerId
    ? StorageService.getCustomerById(sale.customerId)?.address
    : (sale as any).customerAddress;

  const handleDownload = (formatToUse?: ReceiptFormat) => {
    const format = formatToUse || selectedFormat;
    try {
      setIsDownloading(true);
      downloadOrderReceiptPDF(sale, companySettings, customerAddress, format);
      onClose();
    } catch (err) {
      console.error('Erro ao baixar recibo:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formats: Array<{
    id: ReceiptFormat;
    title: string;
    description: string;
    icon: typeof FileText;
    tag: string;
  }> = [
    {
      id: 'a4',
      title: 'Modelo Comercial A4',
      description: 'Documento completo em folha A4 com cabeçalho, tabela detalhada e resumo.',
      icon: FileText,
      tag: 'Recomendado para envio em PDF',
    },
    {
      id: '80mm',
      title: 'Bobina Térmica 80mm',
      description: 'Formato contínuo para impressoras térmicas padrão de balcão (80mm / 3 polegadas).',
      icon: Receipt,
      tag: 'Padrão Cupom',
    },
    {
      id: '58mm',
      title: 'Bobina Térmica 58mm',
      description: 'Formato compacto estreito para impressoras térmicas pequenas e maquininhas (58mm / 2 polegadas).',
      icon: Receipt,
      tag: 'Compacto',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Escolha o Formato do Recibo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedido {sale.saleNumber} • {formatCurrency(sale.total)} • {formatReceiptDate(sale.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Format Cards */}
        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Selecione em qual tamanho de papel deseja gerar o arquivo PDF:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {formats.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              const Icon = fmt.icon;
              return (
                <div
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{fmt.title}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {fmt.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{fmt.description}</p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btn-confirm-download-receipt-pdf"
            onClick={() => handleDownload()}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloading
                ? 'Gerando PDF...'
                : `Baixar Recibo em PDF (${selectedFormat.toUpperCase()})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

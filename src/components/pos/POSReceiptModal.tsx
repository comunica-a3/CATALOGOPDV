import {
  Check,
  ClipboardList,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  Receipt,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import { CompanySettings, ProductionOrder, Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getCustomerFacingPresentation } from '../../utils/freightUtils';
import { downloadOrderReceiptPDF, formatReceiptDate, ReceiptFormat } from '../../utils/pdfReceipt';
import { Modal } from '../common/Modal';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  productionOrders?: ProductionOrder[];
  companySettings: CompanySettings;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  productionOrders = [],
  companySettings,
}) => {
  const [receiptMode, setReceiptMode] = useState<'comercial' | 'termico' | 'termico_58mm'>('comercial');
  const [isDownloading, setIsDownloading] = useState(false);

  // Busca endereço do cliente caso não esteja diretamente no objeto da venda
  const customerAddress = useMemo(() => {
    if (!sale) return undefined;
    if ((sale as any).customerAddress) return (sale as any).customerAddress;
    if (sale.customerId) {
      const cust = StorageService.getCustomerById(sale.customerId);
      return cust?.address;
    }
    return undefined;
  }, [sale]);

  if (!sale) return null;

  const totalItemCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);

  const saleFreight = useMemo(() => {
    if (!sale) return 0;
    if (sale.freight !== undefined && Number(sale.freight) > 0) return Number(sale.freight);
    if (sale.shippingCost !== undefined && Number(sale.shippingCost) > 0) return Number(sale.shippingCost);
    if (sale.addition !== undefined && Number(sale.addition) > 0) return Number(sale.addition);
    const diff = Number((sale.total - (sale.subtotal - (sale.discount || 0))).toFixed(2));
    if (diff > 0) return diff;
    return 0;
  }, [sale]);

  const presentation = useMemo(() => {
    if (!sale) return null;
    return getCustomerFacingPresentation({
      items: sale.items || [],
      subtotal: sale.subtotal,
      freight: saleFreight,
      discount: sale.discount,
      total: sale.total,
    });
  }, [sale, saleFreight]);

  const getFormatFromMode = (mode: 'comercial' | 'termico' | 'termico_58mm'): ReceiptFormat => {
    if (mode === 'termico') return '80mm';
    if (mode === 'termico_58mm') return '58mm';
    return 'a4';
  };

  const handleDownloadPDF = (specificFormat?: ReceiptFormat) => {
    try {
      setIsDownloading(true);
      const targetFormat = specificFormat || getFormatFromMode(receiptMode);
      downloadOrderReceiptPDF(sale, companySettings, customerAddress, targetFormat);
    } catch (err) {
      console.error('Erro ao gerar recibo em PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!sale.customerPhone) {
      alert('Cliente sem telefone cadastrado.');
      return;
    }
    const cleanPhone = sale.customerPhone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá, ${sale.customerName}! Segue o comprovante do seu pedido na *${companySettings.name}*:\n\n*Pedido:* ${sale.saleNumber}\n*Data:* ${formatReceiptDate(sale.createdAt)}\n*Total:* ${formatCurrency(sale.total)}\n*Pago:* ${formatCurrency(sale.paidAmount)}\n${
        sale.remainingAmount > 0 ? `*Saldo a Pagar:* ${formatCurrency(sale.remainingAmount)}\n` : ''
      }\nAgradecemos a preferência!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const getDownloadButtonLabel = () => {
    if (isDownloading) return 'Gerando PDF...';
    if (receiptMode === 'termico') return '↓ Baixar Cupom PDF (80mm)';
    if (receiptMode === 'termico_58mm') return '↓ Baixar Cupom PDF (58mm)';
    return '↓ Baixar Recibo PDF (A4)';
  };

  return (
    <Modal
      id="pos-receipt-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Recibo do Pedido / Comprovante"
      subtitle={`Pedido ${sale.saleNumber} • ${formatReceiptDate(sale.createdAt)}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar: Format Selection & Direct Download Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Format Selector: 3 Format Options */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setReceiptMode('comercial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                receiptMode === 'comercial'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Formato A4</span>
            </button>

            <button
              type="button"
              onClick={() => setReceiptMode('termico')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                receiptMode === 'termico'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bobina 80mm</span>
            </button>

            <button
              type="button"
              onClick={() => setReceiptMode('termico_58mm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                receiptMode === 'termico_58mm'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bobina 58mm</span>
            </button>
          </div>

          {/* Primary Action: Download PDF in chosen format */}
          <button
            type="button"
            id="btn-download-receipt-top"
            onClick={() => handleDownloadPDF()}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{getDownloadButtonLabel()}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: MODELO COMERCIAL (SEGUINDO ESTRUTURA DO RECIBO DE REFERÊNCIA) */}
        {/* ========================================================================= */}
        {receiptMode === 'comercial' && (
          <div
            id="printable-commercial-receipt"
            className="p-6 sm:p-7 bg-white border border-slate-200 rounded-xl shadow-xs text-xs text-slate-800 space-y-5 print-a4"
          >
            {/* 1. CABEÇALHO */}
            <div className="pb-4 border-b border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                    {companySettings.name}
                  </h2>
                  {companySettings.email && (
                    <p className="text-xs text-slate-500">{companySettings.email}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'} no pedido
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-wide">
                  PEDIDO {sale.saleNumber}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-700">Data:</span>{' '}
                  {formatReceiptDate(sale.createdAt)}
                </p>
                {customerAddress && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-semibold text-slate-700">Destino:</span> {customerAddress}
                  </p>
                )}
              </div>
            </div>

            {/* 2. INFORMAÇÕES DOS ITENS */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                ITENS
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Produto / Especificação</th>
                      <th className="py-2.5 px-2 text-center w-14">Qtd</th>
                      <th className="py-2.5 px-3 text-right w-24">Valor Unit.</th>
                      <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.itemName}</p>
                          {/* Variações e especificações */}
                          <div className="space-y-0.5 text-[10px] text-slate-500 mt-0.5">
                            {item.configuration.variantName && (
                              <p>Variação: {item.configuration.variantName}</p>
                            )}
                            {item.configuration.calculatedAreaM2 && (
                              <p>
                                Medidas: {item.configuration.width}x{item.configuration.height}{' '}
                                {item.configuration.dimensionUnit || 'm'} (
                                {item.configuration.calculatedAreaM2}m²)
                              </p>
                            )}
                            {item.configuration.selectedOptions && (
                              <p>
                                Opções:{' '}
                                {Object.entries(item.configuration.selectedOptions)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' | ')}
                              </p>
                            )}
                            {item.configuration.notes && (
                              <p className="italic">Obs: {item.configuration.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(presentation?.presentedItems[idx]?.displayedUnitPrice ?? item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(presentation?.presentedItems[idx]?.displayedTotalPrice ?? item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. RESUMO FINANCEIRO & 4. CLIENTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
              {/* Informações do Cliente & Entrega */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1">
                    CLIENTE
                  </h4>
                  <p className="font-bold text-slate-900 text-xs">{sale.customerName}</p>
                  {sale.customerPhone && (
                    <p className="text-xs text-slate-600">Telefone: {sale.customerPhone}</p>
                  )}
                  {sale.customerDocument && (
                    <p className="text-xs text-slate-600">Documento: {sale.customerDocument}</p>
                  )}
                </div>

                {customerAddress && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1">
                      ENDEREÇO DE ENTREGA
                    </h4>
                    <p className="text-xs text-slate-600">{customerAddress}</p>
                  </div>
                )}
              </div>

              {/* Resumo Financeiro (Sem Impostos) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  RESUMO
                </h4>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Itens:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(presentation?.presentedSubtotal ?? sale.subtotal)}
                    </span>
                  </div>
                  {!presentation?.hideFreightLine && (presentation?.presentedFreight ?? saleFreight) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Frete:</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(presentation?.presentedFreight ?? saleFreight)}
                      </span>
                    </div>
                  )}
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(sale.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span className="text-base text-slate-950">{formatCurrency(sale.total)}</span>
                  </div>
                </div>

                {/* Pagamento */}
                <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                  <h5 className="font-bold text-[10px] uppercase text-slate-500">PAGAMENTO</h5>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Pago:</span>
                    <span>{formatCurrency(sale.paidAmount)}</span>
                  </div>
                  {sale.remainingAmount > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Saldo Restante:</span>
                      <span>{formatCurrency(sale.remainingAmount)}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    <span className="font-medium text-slate-500">Forma de pagamento:</span>{' '}
                    {sale.payments && sale.payments.length > 0
                      ? sale.payments.map((p) => p.method).join(', ')
                      : 'Pagamento no Balcão'}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. RODAPÉ / CONTATO */}
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <h4 className="font-bold text-[10px] uppercase text-slate-600 tracking-wider">
                CONTATO
              </h4>
              <p className="font-bold text-slate-800">{companySettings.name}</p>
              <p>
                {companySettings.address}
                {companySettings.city ? ` - ${companySettings.city}/${companySettings.state}` : ''}
              </p>
              <p>
                {companySettings.phone && `Tel: ${companySettings.phone}`}{' '}
                {companySettings.email && ` • E-mail: ${companySettings.email}`}
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: CUPOM TÉRMICO DE BALCÃO (80mm)                                */}
        {/* ========================================================================= */}
        {receiptMode === 'termico' && (
          <div
            id="printable-sale-receipt"
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs font-mono text-xs text-slate-800 space-y-3 max-w-md mx-auto print-80mm"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="font-bold text-sm text-slate-900 uppercase">
                {companySettings.name}
              </h2>
              {companySettings.document && (
                <p className="text-[10px] text-slate-500">CNPJ: {companySettings.document}</p>
              )}
              <p className="text-[10px] text-slate-500">
                {companySettings.address} - {companySettings.city}/{companySettings.state}
              </p>
              <p className="text-[10px] text-slate-500">Tel: {companySettings.phone}</p>
              <div className="mt-2 text-center">
                <span className="font-bold uppercase tracking-wider text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  COMPROVANTE NÃO FISCAL (80mm)
                </span>
              </div>
            </div>

            {/* Sale Info */}
            <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">PEDIDO:</span>
                <span className="font-bold">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span>{formatDateTime(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>ATENDENTE:</span>
                <span>{sale.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="font-bold truncate max-w-[180px]">{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span>CONTATO:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Itemized List */}
            <div className="border-b border-dashed border-slate-300 pb-2 space-y-2">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                <span>Item / Especificação</span>
                <span>Total</span>
              </div>
              {sale.items.map((si, i) => (
                <div key={i} className="text-[11px] space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="truncate max-w-[200px]">
                      {si.quantity}x {si.itemName}
                    </span>
                    <span>
                      {formatCurrency(
                        presentation?.presentedItems[i]?.displayedTotalPrice ?? si.totalPrice
                      )}
                    </span>
                  </div>
                  {si.configuration.variantName && (
                    <p className="text-[10px] text-slate-500">
                      Var: {si.configuration.variantName}
                    </p>
                  )}
                  {si.configuration.calculatedAreaM2 && (
                    <p className="text-[10px] text-slate-500">
                      Dimensões: {si.configuration.width}x{si.configuration.height}{' '}
                      {si.configuration.dimensionUnit} ({si.configuration.calculatedAreaM2}m²)
                    </p>
                  )}
                  {si.configuration.selectedOptions && (
                    <p className="text-[10px] text-slate-500">
                      Opções:{' '}
                      {Object.entries(si.configuration.selectedOptions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Totals & Payments (Sem Impostos) */}
            <div className="border-b border-dashed border-slate-300 pb-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(presentation?.presentedSubtotal ?? sale.subtotal)}</span>
              </div>
              {!presentation?.hideFreightLine && (presentation?.presentedFreight ?? saleFreight) > 0 && (
                <div className="flex justify-between">
                  <span>FRETE:</span>
                  <span>{formatCurrency(presentation?.presentedFreight ?? saleFreight)}</span>
                </div>
              )}
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>DESCONTO:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL DO PEDIDO:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700">
                <span>VALOR PAGO:</span>
                <span>{formatCurrency(sale.paidAmount)}</span>
              </div>
              {sale.remainingAmount > 0 && (
                <div className="flex justify-between font-bold text-amber-800">
                  <span>SALDO A RECEBER:</span>
                  <span>{formatCurrency(sale.remainingAmount)}</span>
                </div>
              )}
              {sale.payments.length > 0 && (
                <div className="text-[10px] text-slate-500 pt-1">
                  Forma(s):{' '}
                  {sale.payments.map((p) => `${p.method} (${formatCurrency(p.amount)})`).join(', ')}
                </div>
              )}
            </div>

            {/* Footer message */}
            <div className="text-center pt-2 text-[10px] text-slate-500">
              <p>{companySettings.receiptFooterMessage}</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 3: CUPOM TÉRMICO DE BALCÃO (58mm ESPECÍFICO)                    */}
        {/* ========================================================================= */}
        {receiptMode === 'termico_58mm' && (
          <div
            id="printable-sale-receipt-58mm"
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs font-mono text-[10px] leading-tight text-slate-900 space-y-2.5 max-w-[230px] mx-auto print-58mm"
          >
            {/* Header 58mm */}
            <div className="text-center border-b border-dashed border-slate-300 pb-2 space-y-0.5">
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">
                {companySettings.name}
              </h2>
              {companySettings.document && (
                <p className="text-[9px] text-slate-500">CNPJ: {companySettings.document}</p>
              )}
              {companySettings.address && (
                <p className="text-[8px] text-slate-500 leading-tight">
                  {companySettings.address}
                </p>
              )}
              {companySettings.phone && (
                <p className="text-[9px] text-slate-600">Tel: {companySettings.phone}</p>
              )}
              <div className="pt-1">
                <span className="inline-block font-bold uppercase text-[8.5px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                  COMPROVANTE NÃO FISCAL
                </span>
              </div>
            </div>

            {/* Sale Info 58mm */}
            <div className="border-b border-dashed border-slate-300 pb-1.5 space-y-0.5 text-[9.5px]">
              <div className="flex justify-between">
                <span className="font-bold">PEDIDO:</span>
                <span className="font-bold">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA:</span>
                <span>{new Date(sale.createdAt).toLocaleDateString('pt-BR')} {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>VEND:</span>
                <span className="truncate max-w-[120px]">{sale.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span>CLI:</span>
                <span className="font-bold truncate max-w-[120px]">{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span>TEL:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items List 58mm */}
            <div className="border-b border-dashed border-slate-300 pb-2 space-y-1.5 text-[9.5px]">
              <div className="flex justify-between font-bold text-[9px] uppercase text-slate-500 border-b border-slate-200 pb-0.5">
                <span>QTD ITEM</span>
                <span>TOTAL</span>
              </div>
              {sale.items.map((si, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900 leading-tight">
                    <span className="break-words max-w-[140px]">
                      {si.quantity}x {si.itemName}
                    </span>
                    <span className="shrink-0">
                      {formatCurrency(
                        presentation?.presentedItems[i]?.displayedTotalPrice ?? si.totalPrice
                      )}
                    </span>
                  </div>
                  {/* Especificações resumidas */}
                  {si.configuration.variantName && (
                    <p className="text-[8.5px] text-slate-500">Var: {si.configuration.variantName}</p>
                  )}
                  {si.configuration.calculatedAreaM2 && (
                    <p className="text-[8.5px] text-slate-500">
                      {si.configuration.width}x{si.configuration.height}m ({si.configuration.calculatedAreaM2}m²)
                    </p>
                  )}
                  {si.configuration.selectedOptions && (
                    <p className="text-[8.5px] text-slate-500">
                      {Object.values(si.configuration.selectedOptions).join(', ')}
                    </p>
                  )}
                  <p className="text-[8.5px] text-slate-400">
                    Unit:{' '}
                    {formatCurrency(
                      presentation?.presentedItems[i]?.displayedUnitPrice ?? si.unitPrice
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals & Payments 58mm */}
            <div className="border-b border-dashed border-slate-300 pb-1.5 space-y-0.5 text-[9.5px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(presentation?.presentedSubtotal ?? sale.subtotal)}</span>
              </div>
              {!presentation?.hideFreightLine && (presentation?.presentedFreight ?? saleFreight) > 0 && (
                <div className="flex justify-between">
                  <span>FRETE:</span>
                  <span>{formatCurrency(presentation?.presentedFreight ?? saleFreight)}</span>
                </div>
              )}
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>DESCONTO:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-black text-slate-950 pt-0.5 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 pt-0.5">
                <span>PAGO:</span>
                <span>{formatCurrency(sale.paidAmount)}</span>
              </div>
              {sale.remainingAmount > 0 && (
                <div className="flex justify-between font-bold text-amber-700">
                  <span>A RECEBER:</span>
                  <span>{formatCurrency(sale.remainingAmount)}</span>
                </div>
              )}
              {sale.payments.length > 0 && (
                <div className="text-[8.5px] text-slate-500 pt-0.5 leading-tight">
                  Pgt: {sale.payments.map((p) => `${p.method} (${formatCurrency(p.amount)})`).join(', ')}
                </div>
              )}
            </div>

            {/* Footer 58mm */}
            <div className="text-center pt-1 text-[8.5px] text-slate-500">
              <p>{companySettings.receiptFooterMessage || 'Obrigado pela preferência!'}</p>
            </div>
          </div>
        )}

        {/* Modal Action Buttons: Format Selection & Downloads */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer text-center"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            {sale.customerPhone && (
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* Quick format download buttons */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                id="btn-download-a4"
                onClick={() => handleDownloadPDF('a4')}
                disabled={isDownloading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  receiptMode === 'comercial'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Baixar Recibo em PDF formato A4"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Baixar A4</span>
              </button>

              <button
                type="button"
                id="btn-download-80mm"
                onClick={() => handleDownloadPDF('80mm')}
                disabled={isDownloading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  receiptMode === 'termico'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Baixar Cupom em PDF formato 80mm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Baixar 80mm</span>
              </button>

              <button
                type="button"
                id="btn-download-58mm"
                onClick={() => handleDownloadPDF('58mm')}
                disabled={isDownloading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  receiptMode === 'termico_58mm'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Baixar Cupom em PDF formato 58mm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Baixar 58mm</span>
              </button>

              <button
                type="button"
                id="btn-download-receipt-bottom"
                onClick={() => handleDownloadPDF()}
                disabled={isDownloading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{getDownloadButtonLabel()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

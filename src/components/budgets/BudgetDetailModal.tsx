import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { Budget, CompanySettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { downloadBudgetPDF } from '../../utils/pdfReceipt';
import { buildDetailedBudgetWhatsAppMessage, openWhatsApp } from '../../utils/whatsappMessages';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface BudgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  companySettings: CompanySettings;
  onConvertToSale?: (budget: Budget) => void;
  onUpdateStatus?: (budgetId: string, status: Budget['status']) => void;
  onEditBudget?: (budget: Budget) => void;
}

export const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({
  isOpen,
  onClose,
  budget,
  companySettings,
  onConvertToSale,
  onUpdateStatus,
  onEditBudget,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!budget) return null;

  const handleDownloadPDF = () => {
    try {
      setIsDownloading(true);
      downloadBudgetPDF(budget, companySettings);
    } catch (err) {
      console.error('Erro ao gerar PDF do orçamento:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendWhatsApp = () => {
    let phone = budget.customerPhone || '';
    if (!phone) {
      phone = prompt('Informe o número de WhatsApp do cliente (com DDD):', '') || '';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    const msg = buildDetailedBudgetWhatsAppMessage(budget, companySettings.name);
    openWhatsApp(cleanPhone, msg);
  };

  const getStatusBadge = (status: Budget['status']) => {
    switch (status) {
      case 'ABERTO':
        return <Badge variant="warning" size="sm">Em Aberto</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm">Aprovado</Badge>;
      case 'CONVERTIDO_EM_VENDA':
        return <Badge variant="primary" size="sm">Convertido em Venda</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm">Rejeitado</Badge>;
      case 'EXPIRADO':
        return <Badge variant="secondary" size="sm">Expirado</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  return (
    <Modal
      id="budget-detail-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Proposta Comercial #${budget.budgetNumber}`}
      subtitle={`Emitido em ${new Date(budget.createdAt).toLocaleDateString('pt-BR')} por ${budget.sellerName || 'Vendedor'}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Actions & Toolbar (no-print) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
            {getStatusBadge(budget.status)}
            {onUpdateStatus && budget.status === 'ABERTO' && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(budget.id, 'APROVADO')}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-md border border-emerald-200 transition-colors cursor-pointer"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(budget.id, 'REJEITADO')}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-md border border-rose-200 transition-colors cursor-pointer"
                >
                  Rejeitar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onEditBudget && budget.status === 'ABERTO' && (
              <button
                type="button"
                id="btn-edit-budget"
                onClick={() => {
                  onEditBudget(budget);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-slate-600" />
                <span>Editar Orçamento</span>
              </button>
            )}

            <button
              type="button"
              id="btn-download-pdf-budget"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Gerando...' : 'Baixar Orçamento em PDF'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO PRINCIPAL DE IMPRESSÃO E VISUALIZAÇÃO COMERCIAL                     */}
        {/* ========================================================================= */}
        <div
          id="printable-budget"
          className="p-6 sm:p-7 bg-white border border-slate-200 rounded-xl shadow-xs text-xs text-slate-800 space-y-5 print-a4"
        >
          {/* 1. CABEÇALHO DA EMPRESA */}
          <div className="pb-4 border-b border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                  {companySettings.name}
                </h2>
                {companySettings.document && (
                  <p className="text-xs text-slate-600">CNPJ: {companySettings.document}</p>
                )}
                <p className="text-xs text-slate-500">
                  {companySettings.address}
                  {companySettings.city ? ` - ${companySettings.city}/${companySettings.state || ''}` : ''}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                  {companySettings.phone && <span>Tel: {companySettings.phone}</span>}
                  {companySettings.email && <span>E-mail: {companySettings.email}</span>}
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold rounded-lg uppercase tracking-wider">
                  PROPOSTA COMERCIAL
                </span>
                <p className="text-sm font-black text-slate-900 tracking-wide">
                  ORÇAMENTO #{budget.budgetNumber}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs border-t border-slate-100">
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Data de Emissão:</span>{' '}
                {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Validade da Proposta:</span>{' '}
                <strong className="text-slate-900">
                  {new Date(budget.validUntil).toLocaleDateString('pt-BR')}
                </strong>
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Atendente / Vendedor:</span>{' '}
                {budget.sellerName || 'Vendedor'}
              </p>
            </div>
          </div>

          {/* 2. DADOS DO CLIENTE */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1 text-xs">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              DADOS DO CLIENTE / SOLICITANTE
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="font-bold text-slate-900 text-sm">{budget.customerName}</p>
                {budget.customerDocument && (
                  <p className="text-slate-600">CPF/CNPJ: {budget.customerDocument}</p>
                )}
              </div>
              <div>
                {budget.customerPhone && (
                  <p className="text-slate-600">Telefone / WhatsApp: {budget.customerPhone}</p>
                )}
                {budget.customerAddress && (
                  <p className="text-slate-600">Endereço: {budget.customerAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* 3. TABELA DE ITENS (CUSTO NUNCA É EXIBIDO AO CLIENTE) */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
              ITENS E ESPECIFICAÇÕES
            </h4>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item / Descrição Técnica</th>
                    <th className="py-2.5 px-2 text-center w-14">Qtd</th>
                    <th className="py-2.5 px-3 text-right w-24">Valor Unit.</th>
                    <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(budget.items || []).map((it, idx) => {
                    const isCustom = it.isCustom || it.item?.isCustom;
                    const itemName = it.itemName || it.item?.name || 'Item';
                    const itemType = it.itemType || it.item?.type || 'PRODUTO_FISICO';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{itemName}</span>
                            {isCustom ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Personalizado
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                {itemType === 'PRODUTO_GRAFICO'
                                  ? 'Gráfico'
                                  : itemType === 'PRODUTO_FISICO'
                                  ? 'Físico'
                                  : 'Serviço'}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                            {it.configuration?.notes && (
                              <p className="italic text-slate-600">{it.configuration.notes}</p>
                            )}
                            {it.configuration?.variantName && (
                              <p>Variação: {it.configuration.variantName}</p>
                            )}
                            {it.configuration?.calculatedAreaM2 && (
                              <p>
                                Medida: {it.configuration.width}x{it.configuration.height}
                                {it.configuration.dimensionUnit || 'm'} (
                                {it.configuration.calculatedAreaM2}m²)
                              </p>
                            )}
                            {it.configuration?.packageName && (
                              <p>Pacote: {it.configuration.packageName}</p>
                            )}
                            {it.configuration?.selectedOptions && (
                              <p>
                                Acabamentos:{' '}
                                {Object.entries(it.configuration.selectedOptions)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(it.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. CONDIÇÕES COMERCIAIS & RESUMO DE VALORES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            {/* Informações de Prazo e Pagamento */}
            <div className="space-y-2 text-xs">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                CONDIÇÕES DA PROPOSTA
              </h4>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px]">
                <p>
                  <span className="font-semibold text-slate-700">Forma de Pagamento:</span>{' '}
                  {budget.paymentConditions || 'À vista no PIX, Dinheiro ou Cartão'}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Prazo de Produção:</span>{' '}
                  {budget.productionLeadTime || '2 a 4 dias úteis após aprovação da arte'}
                </p>
                {budget.notes && (
                  <p className="italic text-slate-600 pt-1 border-t border-slate-200">
                    <span className="font-semibold not-italic text-slate-700">Observações:</span>{' '}
                    {budget.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                RESUMO FINANCEIRO
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(budget.subtotal)}
                  </span>
                </div>
                {budget.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Desconto Comercial:</span>
                    <span>-{formatCurrency(budget.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL DA PROPOSTA:</span>
                  <span className="text-base text-blue-700">{formatCurrency(budget.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TERMO DE ACEITE / ASSINATURA */}
          <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-4">
            <p className="text-[10px] text-center text-slate-400">
              Proposta válida até{' '}
              <strong>{new Date(budget.validUntil).toLocaleDateString('pt-BR')}</strong>. Os prazos
              de produção iniciam após a aprovação formal do layout e confirmação de pagamento.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center">
                <div className="border-t border-slate-300 pt-1">
                  <p className="font-bold text-slate-800">{companySettings.name}</p>
                  <p className="text-[10px]">Emissor / Atendimento</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-300 pt-1">
                  <p className="font-bold text-slate-800">{budget.customerName}</p>
                  <p className="text-[10px]">De acordo / Assinatura do Cliente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (no-print) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200 no-print">
          <div className="flex items-center gap-2">
            {budget.customerPhone && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Enviar no WhatsApp</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {budget.status !== 'CONVERTIDO_EM_VENDA' && onConvertToSale && (
              <button
                type="button"
                id="btn-convert-budget-sale"
                onClick={() => {
                  onConvertToSale(budget);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Converter em Venda</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

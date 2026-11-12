import { formatCurrency, formatWhatsAppLink } from './formatters';
import { Budget, CompanySettings, Item, Opportunity, ProductionOrder, Sale } from '../types';

/**
 * Centralized WhatsApp message templates and builders.
 * Preserves exact message texts, dynamic parameters, and link generation.
 * All WhatsApp messages in the application are gathered here.
 */

// --- 1. COMPROVANTE DE PEDIDO / VENDA (PDV / Recibo) ---

export interface ReceiptWhatsAppParams {
  customerName: string;
  companyName: string;
  saleNumber: string;
  formattedDate: string;
  totalFormatted: string;
  paidAmountFormatted: string;
  remainingAmountFormatted?: string;
}

export function buildReceiptWhatsAppMessage(params: ReceiptWhatsAppParams): string {
  return (
    `Olá, ${params.customerName}! Segue o comprovante do seu pedido:\n\n` +
    `*Pedido:* ${params.saleNumber}\n` +
    `*Data:* ${params.formattedDate}\n` +
    `*Total:* ${params.totalFormatted}\n` +
    `*Pago:* ${params.paidAmountFormatted}\n` +
    (params.remainingAmountFormatted ? `*Saldo a Pagar:* ${params.remainingAmountFormatted}\n` : '') +
    `\n Confira nosso catálogo Online: wwww.dumorro.com! ` +
    `\nAgradecemos a preferência!`
  );
}

// --- 2. ORÇAMENTOS (Budgets) ---

function formatBudgetItemSpecsForWhatsApp(item: any, index: number): string {
  const itemName = item?.itemName || item?.item?.name || 'Item';
  const qty = Number(item?.quantity) || 1;
  const unitPrice = Number(item?.unitPrice ?? item?.item?.salePrice ?? 0);
  const totalPrice = Number(item?.totalPrice ?? unitPrice * qty);
  const config = item?.configuration || {};

  let block = `${index + 1}. *${itemName}* (Qtd: ${qty})\n`;

  if (config.packageName) {
    block += `   • Pacote: ${config.packageName}\n`;
  }

  if (config.calculatedAreaM2) {
    const wUnit = config.widthUnit || config.dimensionUnit || 'm';
    const hUnit = config.heightUnit || config.dimensionUnit || 'm';
    if (config.width && config.height) {
      block += `   • Medida / M²: ${config.width}${wUnit} x ${config.height}${hUnit} (${config.calculatedAreaM2} m²)\n`;
    } else {
      block += `   • Área (M²): ${config.calculatedAreaM2} m²\n`;
    }
  } else if (config.width && config.height) {
    const unit = config.dimensionUnit || 'm';
    block += `   • Medida: ${config.width}${unit} x ${config.height}${unit}\n`;
  }

  if (config.variantName) {
    block += `   • Variação: ${config.variantName}\n`;
  }

  if (config.selectedOptions && Object.keys(config.selectedOptions).length > 0) {
    const opts = Object.entries(config.selectedOptions)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (opts) {
      block += `   • Acabamentos: ${opts}\n`;
    }
  }

  if (config.notes) {
    block += `   • Detalhes: ${config.notes}\n`;
  }

  block += `   • Valor por unidade: ${formatCurrency(unitPrice)}\n`;
  block += `   • Subtotal do item: *${formatCurrency(totalPrice)}*\n`;

  return block;
}

export function buildBudgetWhatsAppMessage(budget: Budget, companyName: string): string {
  let msg = `Olá *${budget.customerName || 'Cliente'}*!\n\nSegue a proposta *Orçamento #${budget.budgetNumber}*:\n`;
  msg += `*Emitido:* ${new Date(budget.createdAt).toLocaleDateString('pt-BR')}\n`;
  msg += `*Validade:* ${new Date(budget.validUntil).toLocaleDateString('pt-BR')}\n\n`;
  msg += `*ITENS DO ORÇAMENTO:*\n`;

  (budget.items || []).forEach((item, index) => {
    msg += `${formatBudgetItemSpecsForWhatsApp(item, index)}\n`;
  });

  if (budget.discount && budget.discount > 0) {
    msg += `Subtotal: ${formatCurrency(budget.subtotal)}\n`;
    msg += `Desconto: -${formatCurrency(budget.discount)}\n`;
  }

  msg += `*VALOR TOTAL: ${formatCurrency(budget.total)}*\n\nPodemos confirmar o seu pedido?`;
  return msg;
}

export function buildDetailedBudgetWhatsAppMessage(budget: Budget, companyName: string): string {
  let msg = `Olá *${budget.customerName || 'Cliente'}*!\n\n`;
  msg += `Segue a proposta detalhada *Orçamento #${budget.budgetNumber}*:\n\n`;
  msg += `*Data de Emissão:* ${new Date(budget.createdAt).toLocaleDateString('pt-BR')}\n`;
  msg += `*Validade da Proposta:* ${new Date(budget.validUntil).toLocaleDateString('pt-BR')}\n\n`;
  msg += `*ITENS DO ORÇAMENTO:*\n`;

  (budget.items || []).forEach((item, index) => {
    msg += `${formatBudgetItemSpecsForWhatsApp(item, index)}\n`;
  });

  if (budget.discount && budget.discount > 0) {
    msg += `Subtotal: ${formatCurrency(budget.subtotal)}\nDesconto: -${formatCurrency(budget.discount)}\n`;
  }
  msg += `*VALOR TOTAL: ${formatCurrency(budget.total)}*\n\n`;
  if (budget.paymentConditions) {
    msg += `*Condições:* ${budget.paymentConditions}\n`;
  }
  if (budget.productionLeadTime) {
    msg += `*Prazo de Produção:* ${budget.productionLeadTime}\n`;
  }
  if (budget.notes) {
    msg += `*Obs:* ${budget.notes}\n\n`;
  }
  msg += `Podemos dar andamento ao seu pedido? Ficamos no seu aguardo!`;
  return msg;
}

// --- 3. PRODUÇÃO GRÁFICA (Production Orders) ---

export function buildProductionOrderWhatsAppMessage(params: {
  customerName: string;
  companyName: string;
  orderRef: string;
  itemName: string;
  quantity: number;
  variantName?: string;
  statusLabel: string;
  statusText: string;
  leadTime?: string;
}): string {
  let msg = `Olá, *${params.customerName}*!\n\n`;
  msg += `Atualização sobre a produção:\n\n`;
  msg += `*Referência:* ${params.orderRef}\n`;
  msg += `*Item:* ${params.quantity}x ${params.itemName}\n`;
  if (params.variantName) {
    msg += `*Variação:* ${params.variantName}\n`;
  }
  msg += `*Status da Produção:* *${params.statusLabel}*\n\n`;
  msg += `Seu material ${params.statusText}\n`;
  if (params.leadTime) {
    msg += `*Previsão informada:* ${params.leadTime}\n`;
  }
  msg += `\nQualquer dúvida, estamos à disposição! `;
  msg += `\n Confira nosso catálogo Online: wwww.dumorro.com! `;
  return msg;
}

export function buildSaleProductionTrackingWhatsAppMessage(params: {
  customerName: string;
  companyName: string;
  saleNumber: string;
  orders: {
    quantity: number;
    itemName: string;
    statusLabel: string;
    leadTime?: string;
  }[];
}): string {
  let msg = `Olá, *${params.customerName}*!\n\n`;
  msg += `Atualização sobre a produção do seu pedido *#${params.saleNumber}*:\n\n`;

  params.orders.forEach((po, idx) => {
    msg += `*Item ${idx + 1}:* ${po.quantity}x ${po.itemName}\n`;
    msg += `*Status da Produção:* *${po.statusLabel}*\n`;
    if (po.leadTime) {
      msg += `*Previsão informada:* ${po.leadTime}\n`;
    }
    msg += `\n`;
  });

  msg += `Qualquer dúvida, estamos à disposição!`;
  msg += `\n Confira nosso catálogo Online: wwww.dumorro.com! `;
  return msg;
}

// --- 4. CATÁLOGO DIGITAL E ITENS ---

export function buildCatalogGeneralAttendanceMessage(companyName: string): string {
  return `Olá! Estava navegando no catálogo e gostaria de solicitar um atendimento!`;
}

export function buildCatalogItemInterestMessage(itemName: string): string {
  return `Olá! Tenho interesse no produto ${itemName}.`;
}

export interface CatalogQuoteRequestParams {
  itemName: string;
  sku: string;
  isGraphicOrPersonalized: boolean;
  pricingModel?: string;
  width?: string;
  height?: string;
  widthUnit?: string;
  heightUnit?: string;
  widthInMeters?: number;
  heightInMeters?: number;
  areaM2?: number;
  selectedPackage?: { name: string; quantity: number };
  selectedOptions?: Record<string, string>;
  selectedVariant?: { name: string };
  quantity: number;
  totalPrice: number;
}

export function buildCatalogItemQuoteMessage(params: CatalogQuoteRequestParams): string {
  let details = `Olá! Tenho interesse no produto *${params.itemName}* (SKU: ${params.sku}).\n\n`;
  details += `*Especificações Solicitadas:*\n`;

  if (params.isGraphicOrPersonalized) {
    if (params.pricingModel === 'POR_M2') {
      details += `Medidas: ${params.width}${params.widthUnit} x ${params.height}${params.heightUnit} (${params.widthInMeters}m x ${params.heightInMeters}m = ${params.areaM2}m²)\n`;
    } else if (params.pricingModel === 'POR_PACOTE' && params.selectedPackage) {
      details += `Pacote: ${params.selectedPackage.name} (${params.selectedPackage.quantity} un)\n`;
    }
    if (params.selectedOptions && Object.keys(params.selectedOptions).length > 0) {
      details += `Acabamentos: ${Object.entries(params.selectedOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}\n`;
    }
  } else if (!params.isGraphicOrPersonalized && params.selectedVariant) {
    details += `Variante: ${params.selectedVariant.name}\n`;
  }

  details += `Quantidade: ${params.quantity}\n`;
  details += `Valor Estimado: ${formatCurrency(params.totalPrice)}\n\nPodem me orientar sobre o envio da arte e prazo de entrega?`;
  return details;
}

export interface CartItemQuoteSummary {
  quantity: number;
  labelDisplay?: string;
  name: string;
  unitPrice: number;
  dimensions?: { width: string; height: string; unit: string };
  variantName?: string;
  packageName?: string;
}

export function buildCatalogCartQuoteMessage(cartItems: CartItemQuoteSummary[], totalGeneral: number): string {
  let message = `Olá! Gostaria de solicitar um orçamento para:\n\n`;

  cartItems.forEach((item) => {
    const itemSubtotal = formatCurrency(item.unitPrice * item.quantity);
    let itemLineTitle = item.labelDisplay || item.name;

    const extraDetails: string[] = [];
    if (item.dimensions) {
      extraDetails.push(
        `${item.dimensions.width}${item.dimensions.unit} x ${item.dimensions.height}${item.dimensions.unit}`
      );
    }
    if (item.variantName) {
      extraDetails.push(item.variantName);
    }
    if (item.packageName) {
      extraDetails.push(item.packageName);
    }

    if (extraDetails.length > 0 && !item.labelDisplay?.includes(extraDetails[0])) {
      itemLineTitle += ` (${extraDetails.join(', ')})`;
    }

    message += `${item.quantity}x ${itemLineTitle} — ${itemSubtotal}\n`;
  });

  message += `\nTotal: ${formatCurrency(totalGeneral)}`;
  return message;
}

// --- 5. PROSPECÇÃO & FORMULÁRIOS PÚBLICOS ---

export function buildApproachWhatsAppMessage(
  templateText: string,
  opportunity: Opportunity,
  sellerName?: string,
  companyName?: string,
  suggestedPackageName?: string
): string {
  const seller = sellerName || 'Equipe Comercial';
  const company = companyName || 'Nossa Gráfica';
  const oppName = opportunity.contactName || opportunity.name || 'Amigo(a)';
  const bizName = opportunity.name || 'seu negócio';
  const need = opportunity.needs && opportunity.needs.length > 0 ? opportunity.needs[0] : 'divulgação e impressos';
  const pkg = suggestedPackageName || 'Kit Promocional de Divulgação';

  let text = templateText;
  text = text.replace(/\[NOME\]/g, oppName);
  text = text.replace(/\[VENDEDOR\]/g, seller);
  text = text.replace(/\[EMPRESA\]/g, company);
  text = text.replace(/\[NOME_DO_NEGOCIO\]/g, bizName);
  text = text.replace(/\[NECESSIDADE\]/g, need);
  text = text.replace(/\[PACOTE_SUGERIDO\]/g, pkg);
  text = text.replace(/\[PRODUTO_SUGERIDO\]/g, pkg);

  return text;
}

export function buildPublicQuoteSubmittedMessage(params: {
  companyName: string;
  clientName: string;
  demand: string;
  clientPhone: string;
}): string {
  return `Olá! Acabei de enviar uma solicitação de orçamento pelo site da *${params.companyName}*.\nCliente: *${params.clientName}*\nDemanda: *${params.demand}*\nContato: *${params.clientPhone}*`;
}

export function buildSegmentLandingWhatsAppMessage(segmentDisplayName: string): string {
  return `Olá! Gostaria de um orçamento para ${segmentDisplayName}.`;
}

export function buildDirectWhatsAppContactMessage(): string {
  return 'Olá! Gostaria de solicitar um orçamento diretamente pelo WhatsApp.';
}

// --- 6. FUNÇÃO AUXILIAR DE DISPARO ---

export function openWhatsApp(phone: string, message?: string) {
  const link = formatWhatsAppLink(phone, message);
  if (link !== '#') {
    window.open(link, '_blank');
  }
}

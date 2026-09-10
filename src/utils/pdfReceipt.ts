import jsPDF from 'jspdf';
import { CompanySettings, ProductionOrder, Sale, CashRegisterSession, User } from '../types';
import { formatCurrency, formatDateTime } from './formatters';
import { getCustomerFacingPresentation } from './freightUtils';

export type ReceiptFormat = 'a4' | '80mm' | '58mm';

/**
 * Formata a data por extenso no padrão brasileiro
 * Exemplo: "19 de agosto de 2026, 09:31"
 */
export function formatReceiptDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const day = date.getDate();
    const months = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} de ${month} de ${year}, ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Formata a data abreviada (DD/MM/AAAA HH:mm)
 */
export function formatShortDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return isoString;
  }
}

// =========================================================================
// 1. GERADOR DE RECIBO DE PEDIDO / VENDA (A4, 80mm e 58mm)
// =========================================================================

export function downloadOrderReceiptPDF(
  sale: Sale,
  companySettings: CompanySettings,
  customerAddressOverride?: string,
  format: ReceiptFormat = 'a4'
): void {
  if (format === '80mm') {
    generateThermalReceipt80mm(sale, companySettings, customerAddressOverride);
  } else if (format === '58mm') {
    generateThermalReceipt58mm(sale, companySettings, customerAddressOverride);
  } else {
    generateA4Receipt(sale, companySettings, customerAddressOverride);
  }
}

/**
 * Modelo Comercial A4
 */
function generateA4Receipt(
  sale: Sale,
  companySettings: CompanySettings,
  customerAddressOverride?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm

  let currentY = margin;

  const drawDivider = (y: number, color = [226, 232, 240]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  };

  // 1. CABEÇALHO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(companySettings.name || 'Gráfica Digital Express', margin, currentY);
  currentY += 5;

  if (companySettings.email || companySettings.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    const topContact = [companySettings.phone, companySettings.email].filter(Boolean).join('  •  ');
    doc.text(topContact, margin, currentY);
    currentY += 5;
  }

  currentY += 2;
  drawDivider(currentY, [203, 213, 225]);
  currentY += 7;

  // Destaque do Pedido
  const totalItemCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`PEDIDO ${sale.saleNumber}`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const itemCountText = `${totalItemCount} item(ns) no pedido`;
  const itemCountWidth = doc.getTextWidth(itemCountText);
  doc.text(itemCountText, margin + contentWidth - itemCountWidth, currentY);
  currentY += 6;

  // Data e Horário
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Data: ${formatReceiptDate(sale.createdAt)}`, margin, currentY);
  currentY += 5;

  // Destino
  const deliveryAddress =
    customerAddressOverride ||
    (sale as any).customerAddress ||
    (sale as any).deliveryAddress;

  if (deliveryAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino: ${deliveryAddress}`, margin, currentY);
    currentY += 5;
  }

  currentY += 3;
  drawDivider(currentY);
  currentY += 7;

  // 2. TABELA DE ITENS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ITENS DO PEDIDO', margin, currentY);
  currentY += 5;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const colProdX = margin + 3;
  const colQtyX = margin + 105;
  const colUnitX = margin + 130;
  const colTotalX = margin + contentWidth - 3;

  doc.text('PRODUTO / ESPECIFICAÇÃO', colProdX, currentY + 4.8);
  doc.text('QTD', colQtyX, currentY + 4.8);
  doc.text('VALOR UNIT.', colUnitX, currentY + 4.8);
  const subtotalHeader = 'SUBTOTAL';
  doc.text(subtotalHeader, colTotalX - doc.getTextWidth(subtotalHeader), currentY + 4.8);

  currentY += 8;

  const rawFreight = (sale as any).freight || (sale as any).shippingCost || (sale as any).addition || 0;
  const presentation = getCustomerFacingPresentation({
    items: sale.items || [],
    subtotal: sale.subtotal,
    freight: rawFreight,
    discount: sale.discount,
    total: sale.total,
  });

  sale.items.forEach((item, index) => {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = margin;
    }

    const itemPresented = presentation.presentedItems[index];
    const displayedUnitPrice = itemPresented?.displayedUnitPrice ?? item.unitPrice;
    const displayedTotalPrice = itemPresented?.displayedTotalPrice ?? item.totalPrice;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    const maxNameWidth = 98;
    const splitName = doc.splitTextToSize(item.itemName, maxNameWidth);
    doc.text(splitName, colProdX, currentY + 4);

    let textHeight = splitName.length * 4.2;

    const specs: string[] = [];
    if (item.configuration.variantName) {
      specs.push(`Variação: ${item.configuration.variantName}`);
    }
    if (item.configuration.calculatedAreaM2) {
      specs.push(
        `Medidas: ${item.configuration.width}x${item.configuration.height} ${item.configuration.dimensionUnit || 'm'} (${item.configuration.calculatedAreaM2}m²)`
      );
    }
    if (item.configuration.selectedOptions) {
      const opts = Object.entries(item.configuration.selectedOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
      if (opts) specs.push(`Opções: ${opts}`);
    }
    if (item.configuration.notes) {
      specs.push(`Obs: ${item.configuration.notes}`);
    }

    if (specs.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      specs.forEach((spec) => {
        const splitSpec = doc.splitTextToSize(spec, maxNameWidth);
        doc.text(splitSpec, colProdX, currentY + 4 + textHeight);
        textHeight += splitSpec.length * 3.5;
      });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`${item.quantity}`, colQtyX, currentY + 4);

    doc.text(formatCurrency(displayedUnitPrice), colUnitX, currentY + 4);

    doc.setFont('helvetica', 'bold');
    const itemSubtotal = formatCurrency(displayedTotalPrice);
    doc.text(itemSubtotal, colTotalX - doc.getTextWidth(itemSubtotal), currentY + 4);

    const rowHeight = Math.max(textHeight + 3, 7);
    currentY += rowHeight;

    if (index < sale.items.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY, margin + contentWidth, currentY);
      currentY += 2;
    }
  });

  currentY += 4;
  drawDivider(currentY);
  currentY += 6;

  // 3. RESUMO FINANCEIRO & CLIENTE
  if (currentY > pageHeight - 85) {
    doc.addPage();
    currentY = margin;
  }

  const summaryStartX = margin + 95;
  const clientStartX = margin;
  const clientWidth = 85;

  const sectionTopY = currentY;

  // Esquerda: Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENTE', clientStartX, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(sale.customerName || 'Cliente Balcão / Não Identificado', clientStartX, currentY);
  currentY += 4;

  if (sale.customerPhone) {
    doc.text(`Telefone: ${sale.customerPhone}`, clientStartX, currentY);
    currentY += 4;
  }
  if (sale.customerDocument) {
    doc.text(`Documento: ${sale.customerDocument}`, clientStartX, currentY);
    currentY += 4;
  }

  if (deliveryAddress) {
    currentY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ENDEREÇO DE ENTREGA', clientStartX, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitAddr = doc.splitTextToSize(deliveryAddress, clientWidth);
    doc.text(splitAddr, clientStartX, currentY);
    currentY += splitAddr.length * 3.5;
  }

  const leftColumnEndY = currentY;

  // Direita: Resumo Financeiro
  currentY = sectionTopY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMO FINANCEIRO', summaryStartX, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Itens:', summaryStartX, currentY + 3);
  const itemsVal = formatCurrency(presentation.presentedSubtotal);
  doc.text(itemsVal, margin + contentWidth - doc.getTextWidth(itemsVal), currentY + 3);
  currentY += 5;

  if (!presentation.hideFreightLine && presentation.presentedFreight > 0) {
    doc.text('Frete:', summaryStartX, currentY + 3);
    const shippingVal = formatCurrency(presentation.presentedFreight);
    doc.text(shippingVal, margin + contentWidth - doc.getTextWidth(shippingVal), currentY + 3);
    currentY += 5;
  }

  if (sale.discount > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text('Desconto:', summaryStartX, currentY + 3);
    const discountVal = `-${formatCurrency(sale.discount)}`;
    doc.text(discountVal, margin + contentWidth - doc.getTextWidth(discountVal), currentY + 3);
    currentY += 5;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(summaryStartX, currentY + 1, margin + contentWidth, currentY + 1);
  currentY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', summaryStartX, currentY + 3);
  const totalVal = formatCurrency(sale.total);
  doc.text(totalVal, margin + contentWidth - doc.getTextWidth(totalVal), currentY + 3);
  currentY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PAGAMENTO', summaryStartX, currentY + 2);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Pago:', summaryStartX, currentY);
  const paidVal = formatCurrency(sale.paidAmount);
  doc.text(paidVal, margin + contentWidth - doc.getTextWidth(paidVal), currentY);
  currentY += 4.5;

  if (sale.remainingAmount > 0) {
    doc.setTextColor(180, 83, 9);
    doc.text('Saldo Restante:', summaryStartX, currentY);
    const remainingVal = formatCurrency(sale.remainingAmount);
    doc.text(remainingVal, margin + contentWidth - doc.getTextWidth(remainingVal), currentY);
    currentY += 4.5;
  }

  const paymentMethodsList =
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => p.method).join(', ')
      : 'Pagamento no Balcão';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Forma: ${paymentMethodsList}`, summaryStartX, currentY);
  currentY += 5;

  currentY = Math.max(leftColumnEndY, currentY) + 6;

  // 4. RODAPÉ
  const footerMinY = pageHeight - 30;
  currentY = Math.max(currentY, footerMinY);

  drawDivider(currentY, [203, 213, 225]);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONTATO / ESTABELECIMENTO', margin, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const contactLines: string[] = [];
  if (companySettings.name) contactLines.push(companySettings.name);
  if (companySettings.address) {
    contactLines.push(
      `${companySettings.address}${companySettings.city ? ` - ${companySettings.city}/${companySettings.state}` : ''}`
    );
  }
  const phoneEmail = [
    companySettings.phone ? `Tel: ${companySettings.phone}` : '',
    companySettings.email ? `E-mail: ${companySettings.email}` : '',
  ]
    .filter(Boolean)
    .join('  •  ');

  if (phoneEmail) contactLines.push(phoneEmail);

  contactLines.forEach((line) => {
    doc.text(line, margin, currentY);
    currentY += 3.8;
  });

  const sanitizedSaleNumber = sale.saleNumber.replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`recibo-pedido-${sanitizedSaleNumber}-A4.pdf`);
}

/**
 * Modelo Térmico 80mm
 */
function generateThermalReceipt80mm(
  sale: Sale,
  companySettings: CompanySettings,
  customerAddressOverride?: string
): void {
  const paperWidth = 80;
  const margin = 4;
  const contentWidth = paperWidth - margin * 2; // 72mm

  // Estima altura necessária para caber em uma única fita contínua sem quebras
  let estimatedHeight = 110;
  estimatedHeight += sale.items.length * 14;
  sale.items.forEach((item) => {
    if (item.configuration.variantName) estimatedHeight += 4;
    if (item.configuration.calculatedAreaM2) estimatedHeight += 4;
    if (item.configuration.notes) estimatedHeight += 4;
  });
  if (sale.discount > 0) estimatedHeight += 6;
  if (sale.remainingAmount > 0) estimatedHeight += 6;
  const deliveryAddress = customerAddressOverride || (sale as any).customerAddress;
  if (deliveryAddress) estimatedHeight += 12;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, Math.max(160, estimatedHeight)],
  });

  let currentY = 7;

  const drawDashedLine = (y: number) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const dashes = '-'.repeat(38);
    doc.text(dashes, paperWidth / 2, y, { align: 'center' });
  };

  // Cabeçalho da Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(companySettings.name || 'GRÁFICA DIGITAL', paperWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  if ((companySettings as any).cnpj || companySettings.document) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`CNPJ: ${(companySettings as any).cnpj || companySettings.document}`, paperWidth / 2, currentY, { align: 'center' });
    currentY += 3.5;
  }

  if (companySettings.address) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const splitAddr = doc.splitTextToSize(
      `${companySettings.address} ${companySettings.city ? `- ${companySettings.city}/${companySettings.state}` : ''}`,
      contentWidth
    );
    doc.text(splitAddr, paperWidth / 2, currentY, { align: 'center' });
    currentY += splitAddr.length * 3.2;
  }

  if (companySettings.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Tel/WhatsApp: ${companySettings.phone}`, paperWidth / 2, currentY, { align: 'center' });
    currentY += 3.5;
  }

  currentY += 1;
  drawDashedLine(currentY);
  currentY += 4;

  // Identificação do Documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('COMPROVANTE DE PEDIDO', paperWidth / 2, currentY, { align: 'center' });
  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('(NÃO É DOCUMENTO FISCAL)', paperWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  // Número e Data
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`PEDIDO: ${sale.saleNumber}`, margin, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Data: ${formatShortDate(sale.createdAt)}`, margin, currentY);
  currentY += 3.8;

  // Dados do Cliente
  doc.text(`Cliente: ${sale.customerName || 'Cliente Balcão'}`, margin, currentY);
  currentY += 3.8;

  if (sale.customerPhone) {
    doc.text(`Telefone: ${sale.customerPhone}`, margin, currentY);
    currentY += 3.8;
  }

  if (sale.customerDocument) {
    doc.text(`CPF/CNPJ: ${sale.customerDocument}`, margin, currentY);
    currentY += 3.8;
  }

  if (deliveryAddress) {
    const splitDelivery = doc.splitTextToSize(`Entrega: ${deliveryAddress}`, contentWidth);
    doc.text(splitDelivery, margin, currentY);
    currentY += splitDelivery.length * 3.5;
  }

  currentY += 1;
  drawDashedLine(currentY);
  currentY += 4;

  // Título Itens
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ITENS DO PEDIDO', margin, currentY);
  currentY += 4;

  // Cabeçalho da Lista
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('QTD  DESCRIÇÃO', margin, currentY);
  doc.text('TOTAL', paperWidth - margin, currentY, { align: 'right' });
  currentY += 3.5;

  const rawFreight80 = (sale as any).freight || (sale as any).shippingCost || (sale as any).addition || 0;
  const presentation = getCustomerFacingPresentation({
    items: sale.items || [],
    subtotal: sale.subtotal,
    freight: rawFreight80,
    discount: sale.discount,
    total: sale.total,
  });

  // Lista de Itens
  sale.items.forEach((item, index) => {
    const itemPresented = presentation.presentedItems[index];
    const displayedUnitPrice = itemPresented?.displayedUnitPrice ?? item.unitPrice;
    const displayedTotalPrice = itemPresented?.displayedTotalPrice ?? item.totalPrice;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const itemTitle = `${item.quantity}x ${item.itemName}`;
    const splitTitle = doc.splitTextToSize(itemTitle, contentWidth - 20);
    doc.text(splitTitle, margin, currentY);

    const itemTotalStr = formatCurrency(displayedTotalPrice);
    doc.text(itemTotalStr, paperWidth - margin, currentY, { align: 'right' });
    currentY += Math.max(splitTitle.length * 3.5, 3.5);

    // Preço Unitário e especificações
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`    Unit: ${formatCurrency(displayedUnitPrice)}`, margin, currentY);
    currentY += 3;

    if (item.configuration.variantName) {
      doc.text(`    Var: ${item.configuration.variantName}`, margin, currentY);
      currentY += 3;
    }
    if (item.configuration.calculatedAreaM2) {
      doc.text(
        `    Medidas: ${item.configuration.width}x${item.configuration.height} ${item.configuration.dimensionUnit || 'm'} (${item.configuration.calculatedAreaM2}m²)`,
        margin,
        currentY
      );
      currentY += 3;
    }
    if (item.configuration.notes) {
      const splitNotes = doc.splitTextToSize(`    Obs: ${item.configuration.notes}`, contentWidth);
      doc.text(splitNotes, margin, currentY);
      currentY += splitNotes.length * 3;
    }

    doc.setTextColor(0, 0, 0);
    currentY += 1.5;
  });

  drawDashedLine(currentY);
  currentY += 4;

  // Totais
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Subtotal:', margin, currentY);
  doc.text(formatCurrency(presentation.presentedSubtotal), paperWidth - margin, currentY, { align: 'right' });
  currentY += 3.8;

  if (!presentation.hideFreightLine && presentation.presentedFreight > 0) {
    doc.text('Frete:', margin, currentY);
    doc.text(formatCurrency(presentation.presentedFreight), paperWidth - margin, currentY, { align: 'right' });
    currentY += 3.8;
  }

  if (sale.discount > 0) {
    doc.text('Desconto:', margin, currentY);
    doc.text(`-${formatCurrency(sale.discount)}`, paperWidth - margin, currentY, { align: 'right' });
    currentY += 3.8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL A PAGAR:', margin, currentY);
  doc.text(formatCurrency(sale.total), paperWidth - margin, currentY, { align: 'right' });
  currentY += 5;

  drawDashedLine(currentY);
  currentY += 4;

  // Pagamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAGAMENTO', margin, currentY);
  currentY += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Valor Pago:', margin, currentY);
  doc.text(formatCurrency(sale.paidAmount), paperWidth - margin, currentY, { align: 'right' });
  currentY += 3.5;

  if (sale.remainingAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Saldo Restante:', margin, currentY);
    doc.text(formatCurrency(sale.remainingAmount), paperWidth - margin, currentY, { align: 'right' });
    currentY += 3.5;
  }

  const paymentMethodsList =
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => p.method).join(', ')
      : 'Dinheiro / Balcão';

  doc.setFont('helvetica', 'normal');
  doc.text(`Forma: ${paymentMethodsList}`, margin, currentY);
  currentY += 5;

  drawDashedLine(currentY);
  currentY += 4;

  // Rodapé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Agradecemos a sua preferência!', paperWidth / 2, currentY, { align: 'center' });
  currentY += 3.5;
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Guarde este comprovante para retirada do pedido.', paperWidth / 2, currentY, { align: 'center' });

  const sanitizedSaleNumber = sale.saleNumber.replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`recibo-pedido-${sanitizedSaleNumber}-80mm.pdf`);
}

/**
 * Modelo Térmico Compacto 58mm
 */
function generateThermalReceipt58mm(
  sale: Sale,
  companySettings: CompanySettings,
  customerAddressOverride?: string
): void {
  const paperWidth = 58;
  const margin = 3;
  const contentWidth = paperWidth - margin * 2; // 52mm

  let estimatedHeight = 115;
  estimatedHeight += sale.items.length * 13;
  sale.items.forEach((item) => {
    if (item.configuration.variantName) estimatedHeight += 3.5;
    if (item.configuration.calculatedAreaM2) estimatedHeight += 3.5;
    if (item.configuration.notes) estimatedHeight += 3.5;
  });
  if (sale.discount > 0) estimatedHeight += 5;
  if (sale.remainingAmount > 0) estimatedHeight += 5;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, Math.max(150, estimatedHeight)],
  });

  let currentY = 5;

  const drawDashedLine = (y: number) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const dashes = '-'.repeat(30);
    doc.text(dashes, paperWidth / 2, y, { align: 'center' });
  };

  // Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(companySettings.name || 'GRÁFICA EXPRESS', paperWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  if (companySettings.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Tel: ${companySettings.phone}`, paperWidth / 2, currentY, { align: 'center' });
    currentY += 3.2;
  }

  currentY += 0.5;
  drawDashedLine(currentY);
  currentY += 3.5;

  // Título e Pedido
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RECIBO DE VENDA', paperWidth / 2, currentY, { align: 'center' });
  currentY += 3.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`PEDIDO: ${sale.saleNumber}`, margin, currentY);
  currentY += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Data: ${formatShortDate(sale.createdAt)}`, margin, currentY);
  currentY += 3;

  doc.text(`Cliente: ${sale.customerName || 'Balcão'}`, margin, currentY);
  currentY += 3;

  if (sale.customerPhone) {
    doc.text(`Tel: ${sale.customerPhone}`, margin, currentY);
    currentY += 3;
  }

  currentY += 0.5;
  drawDashedLine(currentY);
  currentY += 3.5;

  // Itens
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('QTD  ITEM', margin, currentY);
  doc.text('TOTAL', paperWidth - margin, currentY, { align: 'right' });
  currentY += 3.2;

  const rawFreight58 = (sale as any).freight || (sale as any).shippingCost || (sale as any).addition || 0;
  const presentation = getCustomerFacingPresentation({
    items: sale.items || [],
    subtotal: sale.subtotal,
    freight: rawFreight58,
    discount: sale.discount,
    total: sale.total,
  });

  sale.items.forEach((item, index) => {
    const itemPresented = presentation.presentedItems[index];
    const displayedUnitPrice = itemPresented?.displayedUnitPrice ?? item.unitPrice;
    const displayedTotalPrice = itemPresented?.displayedTotalPrice ?? item.totalPrice;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const itemTitle = `${item.quantity}x ${item.itemName}`;
    const splitTitle = doc.splitTextToSize(itemTitle, contentWidth - 14);
    doc.text(splitTitle, margin, currentY);

    const itemTotalStr = formatCurrency(displayedTotalPrice);
    doc.text(itemTotalStr, paperWidth - margin, currentY, { align: 'right' });
    currentY += Math.max(splitTitle.length * 3.2, 3.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`  Unit: ${formatCurrency(displayedUnitPrice)}`, margin, currentY);
    currentY += 2.8;

    if (item.configuration.variantName) {
      doc.text(`  Var: ${item.configuration.variantName}`, margin, currentY);
      currentY += 2.8;
    }
    if (item.configuration.calculatedAreaM2) {
      doc.text(
        `  Tam: ${item.configuration.width}x${item.configuration.height} (${item.configuration.calculatedAreaM2}m²)`,
        margin,
        currentY
      );
      currentY += 2.8;
    }

    doc.setTextColor(0, 0, 0);
    currentY += 1;
  });

  drawDashedLine(currentY);
  currentY += 3.5;

  // Totais
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Subtotal:', margin, currentY);
  doc.text(formatCurrency(presentation.presentedSubtotal), paperWidth - margin, currentY, { align: 'right' });
  currentY += 3.2;

  if (!presentation.hideFreightLine && presentation.presentedFreight > 0) {
    doc.text('Frete:', margin, currentY);
    doc.text(formatCurrency(presentation.presentedFreight), paperWidth - margin, currentY, { align: 'right' });
    currentY += 3.2;
  }

  if (sale.discount > 0) {
    doc.text('Desconto:', margin, currentY);
    doc.text(`-${formatCurrency(sale.discount)}`, paperWidth - margin, currentY, { align: 'right' });
    currentY += 3.2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL:', margin, currentY);
  doc.text(formatCurrency(sale.total), paperWidth - margin, currentY, { align: 'right' });
  currentY += 4;

  drawDashedLine(currentY);
  currentY += 3.5;

  // Pagamento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Pago:', margin, currentY);
  doc.text(formatCurrency(sale.paidAmount), paperWidth - margin, currentY, { align: 'right' });
  currentY += 3;

  if (sale.remainingAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Restante:', margin, currentY);
    doc.text(formatCurrency(sale.remainingAmount), paperWidth - margin, currentY, { align: 'right' });
    currentY += 3;
  }

  const paymentMethodsList =
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => p.method).join(', ')
      : 'Balcão';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Forma: ${paymentMethodsList}`, margin, currentY);
  currentY += 4.5;

  drawDashedLine(currentY);
  currentY += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Obrigado pela preferência!', paperWidth / 2, currentY, { align: 'center' });

  const sanitizedSaleNumber = sale.saleNumber.replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`recibo-pedido-${sanitizedSaleNumber}-58mm.pdf`);
}

// =========================================================================
// 2. GERADOR DE ORÇAMENTO COMERCIAL EM PDF (A4)
// =========================================================================

export function downloadBudgetPDF(
  budget: {
    budgetNumber?: string;
    customerName?: string;
    customerPhone?: string;
    customerDocument?: string;
    customerAddress?: string;
    createdAt?: string;
    validUntil?: string;
    notes?: string;
    subtotal: number;
    discount?: number;
    total: number;
    items: Array<{
      item: { name: string; sku?: string };
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      configuration?: {
        variantName?: string;
        calculatedAreaM2?: number;
        width?: number;
        height?: number;
        dimensionUnit?: string;
        packageName?: string;
        selectedOptions?: Record<string, string>;
      };
    }>;
  },
  companySettings: CompanySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  const drawDivider = (y: number, color = [226, 232, 240]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  };

  // 1. CABEÇALHO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'Gráfica Digital', margin, currentY);
  currentY += 5;

  if (companySettings.phone || companySettings.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const info = [companySettings.phone, companySettings.email, companySettings.city ? `${companySettings.city}/${companySettings.state}` : '']
      .filter(Boolean)
      .join('  •  ');
    doc.text(info, margin, currentY);
    currentY += 5;
  }

  currentY += 2;
  drawDivider(currentY, [203, 213, 225]);
  currentY += 7;

  // Destaque Orçamento
  const num = budget.budgetNumber || 'ORÇAMENTO';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`PROPOSTA / ${num}`, margin, currentY);

  const totalItemCount = budget.items.reduce((acc, item) => acc + item.quantity, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const itemCountText = `${totalItemCount} item(ns) cotado(s)`;
  const itemCountWidth = doc.getTextWidth(itemCountText);
  doc.text(itemCountText, margin + contentWidth - itemCountWidth, currentY);
  currentY += 6;

  // Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const dateStr = budget.createdAt ? formatReceiptDate(budget.createdAt) : formatReceiptDate(new Date().toISOString());
  doc.text(`Data de emissão: ${dateStr}`, margin, currentY);

  if (budget.validUntil) {
    const validStr = `Válido até: ${new Date(budget.validUntil).toLocaleDateString('pt-BR')}`;
    doc.text(validStr, margin + contentWidth - doc.getTextWidth(validStr), currentY);
  }
  currentY += 7;

  // 2. DADOS DO CLIENTE (SE HOUVER)
  if (budget.customerName && budget.customerName !== 'Cliente Balcão') {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CLIENTE:', margin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.text(budget.customerName, margin + 22, currentY + 5.5);

    if (budget.customerPhone) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Tel/WhatsApp: ${budget.customerPhone}`, margin + 4, currentY + 10.5);
    }
    currentY += 18;
  }

  // 3. TABELA DE ITENS
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const colItem = margin + 4;
  const colQtd = margin + contentWidth - 55;
  const colUnit = margin + contentWidth - 32;
  const colTotal = margin + contentWidth - 4;

  doc.text('ITEM / DESCRIÇÃO', colItem, currentY + 4.8);
  doc.text('QTD', colQtd, currentY + 4.8, { align: 'center' });
  doc.text('UNITÁRIO', colUnit, currentY + 4.8, { align: 'right' });
  doc.text('TOTAL', colTotal, currentY + 4.8, { align: 'right' });

  currentY += 8.5;

  const budgetFreight = (budget as any).freight || (budget as any).shippingCost || (budget as any).addition || 0;
  const presentation = getCustomerFacingPresentation({
    items: budget.items || [],
    subtotal: budget.subtotal,
    freight: budgetFreight,
    discount: budget.discount || 0,
    total: budget.total,
  });

  budget.items.forEach((it, index) => {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = margin;
    }

    const itemPresented = presentation.presentedItems[index];
    const unitPrice = itemPresented?.displayedUnitPrice ?? it.unitPrice;
    const totalPrice = itemPresented?.displayedTotalPrice ?? it.totalPrice;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const itemName = (it as any).itemName || it.item?.name || 'Item';
    doc.text(itemName, colItem, currentY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(String(it.quantity), colQtd, currentY + 3.5, { align: 'center' });
    doc.text(unitPrice > 0 ? formatCurrency(unitPrice) : 'Sob Consulta', colUnit, currentY + 3.5, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(totalPrice > 0 ? formatCurrency(totalPrice) : 'Sob Consulta', colTotal, currentY + 3.5, { align: 'right' });

    currentY += 5;

    const details: string[] = [];
    if (it.configuration?.variantName) details.push(`Variante: ${it.configuration.variantName}`);
    if (it.configuration?.packageName) details.push(`Pacote: ${it.configuration.packageName}`);
    if (it.configuration?.calculatedAreaM2) {
      details.push(`Medidas: ${it.configuration.width}x${it.configuration.height}${it.configuration.dimensionUnit} (${it.configuration.calculatedAreaM2}m²)`);
    }
    if (it.configuration?.selectedOptions) {
      Object.entries(it.configuration.selectedOptions).forEach(([k, v]) => details.push(`${k}: ${v}`));
    }

    if (details.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`• ${details.join('  |  ')}`, colItem + 2, currentY + 2);
      currentY += 4.5;
    }

    drawDivider(currentY + 1, [241, 245, 249]);
    currentY += 3;
  });

  currentY += 4;

  // 4. RESUMO
  drawDivider(currentY, [203, 213, 225]);
  currentY += 5;

  const summaryStartX = margin + contentWidth - 75;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryStartX, currentY);
  doc.text(formatCurrency(presentation.presentedSubtotal), margin + contentWidth, currentY, { align: 'right' });
  currentY += 5;

  if (!presentation.hideFreightLine && presentation.presentedFreight > 0) {
    doc.text('Frete:', summaryStartX, currentY);
    doc.text(formatCurrency(presentation.presentedFreight), margin + contentWidth, currentY, { align: 'right' });
    currentY += 5;
  }

  if (budget.discount && budget.discount > 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('Desconto:', summaryStartX, currentY);
    doc.text(`-${formatCurrency(budget.discount)}`, margin + contentWidth, currentY, { align: 'right' });
    currentY += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ESTIMADO:', summaryStartX, currentY + 2);
  doc.text(formatCurrency(budget.total), margin + contentWidth, currentY + 2, { align: 'right' });
  currentY += 10;

  if (budget.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Observações: ${budget.notes}`, margin, currentY);
    currentY += 8;
  }

  // 5. RODAPÉ
  const footerMinY = pageHeight - 25;
  currentY = Math.max(currentY, footerMinY);

  drawDivider(currentY, [203, 213, 225]);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const footerMsg = `${companySettings.name} • ${companySettings.phone || ''} • ${companySettings.address || ''}`;
  doc.text(footerMsg, margin, currentY);

  const sanitized = (budget.budgetNumber || 'orcamento').replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`${sanitized}.pdf`);
}

// =========================================================================
// 3. GERADOR DE ORDEM DE PRODUÇÃO EM PDF (A4)
// =========================================================================

export function downloadProductionOrderPDF(
  order: ProductionOrder,
  companySettings: CompanySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  const drawDivider = (y: number, color = [203, 213, 225]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  };

  // Cabeçalho da Ordem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'GRÁFICA DIGITAL', margin, currentY);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('ORDEM DE PRODUÇÃO', margin + contentWidth, currentY, { align: 'right' });
  currentY += 6;

  drawDivider(currentY);
  currentY += 6;

  // Dados da Ordem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`OP: ${order.orderNumber}`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Venda Origem: ${order.saleNumber}`, margin + contentWidth, currentY, { align: 'right' });
  currentY += 6;

  doc.text(`Data de Emissão: ${formatReceiptDate(order.createdAt)}`, margin, currentY);
  if ((order as any).estimatedCompletionDate) {
    doc.text(`Previsão de Entrega: ${new Date((order as any).estimatedCompletionDate).toLocaleDateString('pt-BR')}`, margin + contentWidth, currentY, { align: 'right' });
  }
  currentY += 6;

  // Box do Cliente
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${order.customerName || 'Balcão'}`, margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status Atual: ${order.status}`, margin + 4, currentY + 10.5);
  if ((order as any).assignedTo) {
    doc.text(`Operador / Responsável: ${(order as any).assignedTo}`, margin + contentWidth - 4, currentY + 10.5, { align: 'right' });
  }
  currentY += 18;

  // Detalhes do Produto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('ESPECIFICAÇÕES TÉCNICAS DO PRODUTO', margin, currentY);
  currentY += 6;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${order.quantity}x ${order.itemName}`, margin + 4, currentY + 5.5);
  currentY += 12;

  // Lista de Acabamentos e Configurações
  const specs: Array<[string, string]> = [];
  if (order.configuration.variantName) specs.push(['Variação/Material', order.configuration.variantName]);
  if (order.configuration.calculatedAreaM2) {
    specs.push(['Dimensões', `${order.configuration.width}x${order.configuration.height} ${order.configuration.dimensionUnit || 'm'} (${order.configuration.calculatedAreaM2}m²)`]);
  }
  if (order.configuration.selectedOptions) {
    Object.entries(order.configuration.selectedOptions).forEach(([k, v]) => specs.push([k, v]));
  }
  if (order.configuration.notes) {
    specs.push(['Observações da Produção', order.configuration.notes]);
  }

  specs.forEach(([key, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${key}:`, margin + 4, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(val, contentWidth - 45);
    doc.text(splitVal, margin + 45, currentY);
    currentY += Math.max(splitVal.length * 4.5, 6);
  });

  currentY += 6;
  drawDivider(currentY);
  currentY += 8;

  // Campo de Assinatura / Conferência
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFERÊNCIA DA PRODUÇÃO E CONTROLE DE QUALIDADE', margin, currentY);
  currentY += 18;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + 70, currentY);
  doc.line(margin + contentWidth - 70, currentY, margin + contentWidth, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Assinatura do Operador', margin + 35, currentY, { align: 'center' });
  doc.text('Conferência Final / Entrega', margin + contentWidth - 35, currentY, { align: 'center' });

  const sanitized = order.orderNumber.replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`ordem-producao-${sanitized}.pdf`);
}

// =========================================================================
// 4. GERADOR DE COMPROVANTE DE FECHAMENTO DE CAIXA EM PDF (A4)
// =========================================================================

export function downloadCashSessionPDF(
  session: CashRegisterSession,
  companySettings: CompanySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  const drawDivider = (y: number) => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'Gráfica Digital', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('RELATÓRIO DE FECHAMENTO DE CAIXA', margin, currentY);
  currentY += 5;

  drawDivider(currentY);
  currentY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`CAIXA: ${session.registerNumber}`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Operador: ${session.openedByUserName || 'Operador'}`, margin + contentWidth, currentY, { align: 'right' });
  currentY += 6;

  doc.text(`Abertura: ${formatDateTime(session.openedAt)}`, margin, currentY);
  if (session.closedAt) {
    doc.text(`Fechamento: ${formatDateTime(session.closedAt)}`, margin + contentWidth, currentY, { align: 'right' });
  }
  currentY += 8;

  // Tabela Financeira
  const rows: Array<[string, number]> = [
    ['Fundo de Abertura (Dinheiro)', session.initialAmount || 0],
    ['Entradas em Dinheiro', session.cashSalesAmount || 0],
    ['Total Esperado em Caixa', session.expectedCashAmount || 0],
  ];

  if (session.byMethod && session.byMethod.length > 0) {
    session.byMethod.forEach((m) => {
      rows.push([`Vendas por Método: ${m.method} (${m.count}x)`, m.grossAmount]);
    });
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIÇÃO', margin + 4, currentY + 4.8);
  doc.text('VALOR', margin + contentWidth - 4, currentY + 4.8, { align: 'right' });
  currentY += 8;

  rows.forEach(([desc, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(desc, margin + 4, currentY);
    doc.text(formatCurrency(val), margin + contentWidth - 4, currentY, { align: 'right' });
    currentY += 5;
  });

  drawDivider(currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL BRUTO DE VENDAS:', margin + 4, currentY);
  doc.text(formatCurrency(session.totalGrossSales || 0), margin + contentWidth - 4, currentY, { align: 'right' });
  currentY += 6;

  if (session.countedCashAmount !== undefined) {
    doc.text('VALOR CONTADO (DINHEIRO):', margin + 4, currentY);
    doc.text(formatCurrency(session.countedCashAmount), margin + contentWidth - 4, currentY, { align: 'right' });
    currentY += 6;
  }

  if (session.cashDifference !== undefined && session.cashDifference !== 0) {
    const diffLabel = session.cashDifference > 0 ? 'SOBRA DE CAIXA:' : 'FALTA DE CAIXA:';
    doc.setTextColor(session.cashDifference > 0 ? 5 : 220, session.cashDifference > 0 ? 150 : 38, session.cashDifference > 0 ? 105 : 38);
    doc.text(diffLabel, margin + 4, currentY);
    doc.text(formatCurrency(session.cashDifference), margin + contentWidth - 4, currentY, { align: 'right' });
    currentY += 6;
  }

  const sanitized = session.registerNumber.replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`fechamento-caixa-${sanitized}.pdf`);
}

// =========================================================================
// 5. GERADOR DE EXTRATO DE COMISSÕES EM PDF (A4)
// =========================================================================

export function downloadCommissionStatementPDF(
  seller: User,
  periodLabel: string,
  sales: Sale[],
  totals: { totalSales: number; totalCommission: number; count: number } | any,
  companySettings: CompanySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  const drawDivider = (y: number) => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'Gráfica Digital', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('EXTRATO DE COMISSÕES DE VENDAS', margin, currentY);
  currentY += 5;

  drawDivider(currentY);
  currentY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Vendedor: ${seller.name}`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período: ${periodLabel}`, margin + contentWidth, currentY, { align: 'right' });
  currentY += 6;

  doc.text(`Emissão: ${formatReceiptDate(new Date().toISOString())}`, margin, currentY);
  currentY += 8;

  // Tabela de Vendas
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('PEDIDO', margin + 3, currentY + 4.8);
  doc.text('DATA', margin + 35, currentY + 4.8);
  doc.text('CLIENTE', margin + 65, currentY + 4.8);
  doc.text('VALOR VENDA', margin + contentWidth - 45, currentY + 4.8, { align: 'right' });
  doc.text('COMISSÃO', margin + contentWidth - 3, currentY + 4.8, { align: 'right' });
  currentY += 8;

  let totalSalesVal = 0;
  let totalCommissionsVal = 0;

  sales.forEach((s) => {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = margin;
    }

    const commRate = (seller as any).commissionRate ?? 5;
    const commVal = (s.total * commRate) / 100;
    totalSalesVal += s.total;
    totalCommissionsVal += commVal;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(s.saleNumber, margin + 3, currentY);
    doc.text(formatShortDate(s.createdAt), margin + 35, currentY);
    doc.text((s.customerName || 'Balcão').slice(0, 18), margin + 65, currentY);
    doc.text(formatCurrency(s.total), margin + contentWidth - 45, currentY, { align: 'right' });
    doc.text(formatCurrency(commVal), margin + contentWidth - 3, currentY, { align: 'right' });
    currentY += 4.5;
  });

  currentY += 2;
  drawDivider(currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL DE VENDAS:', margin + 3, currentY);
  doc.text(formatCurrency(totalSalesVal), margin + contentWidth - 45, currentY, { align: 'right' });
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text('TOTAL DE COMISSÕES A RECEBER:', margin + 3, currentY);
  doc.text(formatCurrency(totalCommissionsVal), margin + contentWidth - 3, currentY, { align: 'right' });

  const sanitized = seller.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`extrato-comissao-${sanitized}.pdf`);
}

// =========================================================================
// 6. GERADOR DE DOCUMENTO TEXTUAL / CONTRATO EM PDF (A4)
// =========================================================================

export function downloadCustomDocumentPDF(
  title: string,
  content: string,
  companySettings: CompanySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  // Cabeçalho institucional discreto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(companySettings.name || 'Gráfica Digital', margin, currentY);
  currentY += 4;

  if (companySettings.phone || companySettings.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text([companySettings.phone, companySettings.email].filter(Boolean).join(' • '), margin, currentY);
    currentY += 4;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 8;

  // Título do Documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Conteúdo formatado
  const paragraphs = content.split('\n');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  paragraphs.forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) {
      currentY += 4;
      return;
    }

    if (currentY > pageHeight - 25) {
      doc.addPage();
      currentY = margin;
    }

    if (trimmed.startsWith('# ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(trimmed.replace(/^# /, ''), margin, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else if (trimmed.startsWith('## ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.text(trimmed.replace(/^## /, ''), margin, currentY);
      currentY += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else {
      const splitText = doc.splitTextToSize(trimmed, contentWidth);
      doc.text(splitText, margin, currentY);
      currentY += splitText.length * 4.5 + 2;
    }
  });

  const sanitized = title.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
  doc.save(`${sanitized}.pdf`);
}

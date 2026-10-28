import * as XLSX from 'xlsx';
import { Customer, Budget, Sale, CartItem, SaleItem, PaymentStatus, SaleStatus, BudgetStatus } from '../types';

export type CsvEntityType = 'CUSTOMERS' | 'BUDGETS' | 'SALES';
export type ExistingAction = 'SKIP' | 'UPDATE';

export interface CsvValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: any;
}

export interface ValidatedCsvRow {
  rowNumber: number;
  status: 'NEW' | 'EXISTING' | 'ERROR';
  errors: { field: string; message: string; rawValue?: any }[];
  warnings: string[];
  entity: Customer | Budget | Sale;
  displaySummary: {
    primary: string;
    secondary: string;
    badge?: string;
    amount?: number;
  };
  matchReason?: string;
}

export interface CsvValidationResult {
  entityType: CsvEntityType;
  totalRows: number;
  newCount: number;
  existingCount: number;
  errorCount: number;
  rows: ValidatedCsvRow[];
  errorsList: CsvValidationError[];
}

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  let str = String(val).trim().replace('R$', '').trim();
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

export async function parseCsvOrExcelFile(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('A planilha está vazia.');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
    raw: false,
  });

  return jsonData.map((row, idx) => {
    const normalized: Record<string, any> = { _rowNumber: idx + 2 };
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeHeaderKey(k)] = typeof v === 'string' ? v.trim() : v;
      normalized[k] = v;
    }
    return normalized;
  });
}

export function validateCsvRows(
  entityType: CsvEntityType,
  rawRows: any[],
  existingData: {
    customers?: Customer[];
    budgets?: Budget[];
    sales?: Sale[];
  }
): CsvValidationResult {
  const validatedRows: ValidatedCsvRow[] = [];
  const errorsList: CsvValidationError[] = [];
  let newCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  const now = new Date().toISOString();

  rawRows.forEach((row, index) => {
    const rowNum = row._rowNumber || index + 2;
    const errors: { field: string; message: string; rawValue?: any }[] = [];
    const warnings: string[] = [];

    if (entityType === 'CUSTOMERS') {
      const name =
        row.nomerazaosocial ||
        row.nome ||
        row.name ||
        row.razaosocial ||
        row.razao ||
        row.cliente ||
        row.customername ||
        '';
      const phone =
        row.telefonewhatsapp ||
        row.telefone ||
        row.celular ||
        row.phone ||
        row.whatsapp ||
        row.contato ||
        row.tel ||
        '';
      const document =
        row.cpfcnpj ||
        row.cpf ||
        row.cnpj ||
        row.documento ||
        row.document ||
        '';
      const email = row.email || row.correio || row.mail || '';
      const address = row.endereco || row.logradouro || row.address || '';
      const city = row.cidade || row.city || '';
      const state = row.estadouf || row.estado || row.uf || row.state || '';
      const zipCode = row.cep || row.zipcode || row.codigopostal || '';
      const notes = row.observacoes || row.obs || row.notas || row.notes || '';
      const promoterName =
        row.promotorindicador ||
        row.promotor ||
        row.promoter ||
        row.indicadopor ||
        row.indicador ||
        '';
      const rawType = String(row.tipopfpj || row.tipo || '').toUpperCase();

      if (!name) {
        errors.push({ field: 'Nome', message: 'O nome do cliente é obrigatório.', rawValue: name });
      }

      if (!phone && !email && !document) {
        warnings.push('Nenhum contato (telefone, e-mail ou CPF/CNPJ) informado.');
      }

      // Check if existing
      const existingCustomers = existingData.customers || [];
      const matchDoc = document ? existingCustomers.find(c => c.document && c.document.replace(/\D/g, '') === document.replace(/\D/g, '')) : null;
      const matchPhone = phone ? existingCustomers.find(c => c.phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) : null;
      const matchName = existingCustomers.find(c => c.name && c.name.toLowerCase().trim() === name.toLowerCase().trim());

      const match = matchDoc || matchPhone || matchName;
      let status: 'NEW' | 'EXISTING' | 'ERROR' = 'NEW';
      let matchReason = '';

      if (errors.length > 0) {
        status = 'ERROR';
        errorCount++;
      } else if (match) {
        status = 'EXISTING';
        existingCount++;
        matchReason = matchDoc ? 'Documento já cadastrado' : matchPhone ? 'Telefone já cadastrado' : 'Nome idêntico';
      } else {
        status = 'NEW';
        newCount++;
      }

      const calculatedType = rawType.includes('PJ')
        ? 'PJ'
        : rawType.includes('PF')
        ? 'PF'
        : document && document.replace(/\D/g, '').length > 11
        ? 'PJ'
        : 'PF';

      const customer: Customer = {
        id: match ? match.id : `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        type: calculatedType,
        document: document || undefined,
        phone,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        notes: notes || undefined,
        promoterName: promoterName || undefined,
        createdAt: match ? match.createdAt : row.datacadastro || now,
      };

      if (errors.length > 0) {
        errors.forEach(e => errorsList.push({ rowNumber: rowNum, ...e }));
      }

      validatedRows.push({
        rowNumber: rowNum,
        status,
        errors,
        warnings,
        entity: customer,
        displaySummary: {
          primary: customer.name || '(Sem nome)',
          secondary: [customer.phone, customer.email, customer.document].filter(Boolean).join(' • ') || 'Sem contato adicional',
          badge: customer.type,
        },
        matchReason,
      });
    } else if (entityType === 'BUDGETS') {
      const budgetNumber =
        row.numeroorcamento ||
        row.numero ||
        row.numerorcamento ||
        row.budgetnumber ||
        row.orcamento ||
        `ORC-IMP-${rowNum}`;
      const customerName = row.cliente || row.customername || row.nomecliente || row.nome || '';
      const customerPhone = row.telefone || row.celular || row.phone || row.whatsapp || '';
      const customerEmail = row.email || row.correio || '';
      const sellerName = row.vendedor || row.sellername || 'Vendedor Padrão';
      const subtotal = parseNumber(row.subtotalr || row.subtotal || row.valor || row.total, 0);
      const discount = parseNumber(row.descontor || row.desconto || row.discount, 0);
      const freight = parseNumber(row.acrescimofreter || row.acrescimo || row.frete || row.freight, 0);
      const totalRaw = parseNumber(row.totalr || row.total || row.valortotal, subtotal - discount + freight);
      const total = totalRaw > 0 ? totalRaw : Math.max(0, subtotal - discount + freight);
      
      const rawStatus = String(row.status || '').toUpperCase();
      let statusField: BudgetStatus = 'ABERTO';
      if (rawStatus.includes('APROV')) statusField = 'APROVADO';
      else if (rawStatus.includes('REJEIT')) statusField = 'REJEITADO';
      else if (rawStatus.includes('EXPIR')) statusField = 'EXPIRADO';
      else if (rawStatus.includes('CONVERT') || rawStatus.includes('VENDA')) statusField = 'CONVERTIDO_EM_VENDA';

      const notes = row.observacoes || row.obs || row.condicoes || '';
      const itemName =
        row.itensdescricao ||
        row.item ||
        row.produto ||
        row.descricao ||
        'Item do Orçamento';
      const itemQty = Math.max(1, parseNumber(row.itensqtd || row.quantidade || row.qtd, 1));
      const itemUnitPrice = total / itemQty;

      if (!customerName) {
        errors.push({ field: 'Cliente', message: 'O nome do cliente é obrigatório.', rawValue: customerName });
      }
      if (total <= 0) {
        errors.push({ field: 'Total', message: 'O valor total deve ser maior que zero.', rawValue: total });
      }

      const existingBudgets = existingData.budgets || [];
      const match = existingBudgets.find(
        b => b.budgetNumber && budgetNumber && b.budgetNumber.toLowerCase().trim() === String(budgetNumber).toLowerCase().trim()
      );

      let status: 'NEW' | 'EXISTING' | 'ERROR' = 'NEW';
      let matchReason = '';

      if (errors.length > 0) {
        status = 'ERROR';
        errorCount++;
      } else if (match) {
        status = 'EXISTING';
        existingCount++;
        matchReason = `Orçamento #${match.budgetNumber} já existe`;
      } else {
        status = 'NEW';
        newCount++;
      }

      const cartItem: CartItem = {
        cartItemId: `ci-${Date.now()}-${rowNum}`,
        item: {
          id: `item-gen-${Date.now()}`,
          name: itemName,
          salePrice: itemUnitPrice,
          costPrice: itemUnitPrice * 0.5,
          marginReais: itemUnitPrice * 0.5,
          marginPercent: 50,
          type: 'PRODUTO',
          categoryId: 'geral',
          sku: `SKU-GEN-${rowNum}`,
          description: itemName,
          stock: 999,
          active: true,
          showInCatalog: false,
          featuredInCatalog: false,
          createdAt: now,
          updatedAt: now,
        },
        quantity: itemQty,
        unitPrice: itemUnitPrice,
        unitCost: itemUnitPrice * 0.5,
        totalPrice: total,
        totalCost: total * 0.5,
        configuration: {},
      };

      const budget: Budget = {
        id: match ? match.id : `orc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        budgetNumber: String(budgetNumber),
        sellerId: 'admin',
        sellerName,
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        items: [cartItem],
        subtotal: subtotal || total,
        discount,
        freight,
        total,
        status: statusField,
        notes: notes || undefined,
        validUntil: row.validade || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: match ? match.createdAt : row.datacriacao || now,
        updatedAt: now,
      };

      if (errors.length > 0) {
        errors.forEach(e => errorsList.push({ rowNumber: rowNum, ...e }));
      }

      validatedRows.push({
        rowNumber: rowNum,
        status,
        errors,
        warnings,
        entity: budget,
        displaySummary: {
          primary: `${budget.budgetNumber} - ${budget.customerName}`,
          secondary: `Vendedor: ${budget.sellerName} • Status: ${budget.status}`,
          badge: budget.status,
          amount: budget.total,
        },
        matchReason,
      });
    } else if (entityType === 'SALES') {
      const saleNumber =
        row.numerovenda ||
        row.numero ||
        row.salenumber ||
        row.venda ||
        `VND-IMP-${rowNum}`;
      const customerName =
        row.cliente ||
        row.customername ||
        row.nomecliente ||
        row.nome ||
        'Consumidor';
      const customerDoc = row.cpfcnpj || row.documento || row.cpf || row.cnpj || '';
      const customerPhone = row.telefone || row.celular || row.phone || '';
      const customerEmail = row.email || '';
      const sellerName = row.vendedor || row.sellername || 'Vendedor Padrão';
      const subtotal = parseNumber(row.subtotalr || row.subtotal || row.valor || row.total, 0);
      const discount = parseNumber(row.descontor || row.desconto || row.discount, 0);
      const freight = parseNumber(row.acrescimor || row.acrescimo || row.frete || row.freight, 0);
      const totalRaw = parseNumber(row.totalr || row.total || row.valortotal, subtotal - discount + freight);
      const total = totalRaw > 0 ? totalRaw : Math.max(0, subtotal - discount + freight);
      const paidRaw = parseNumber(row.valorpagor || row.valorpago || row.paidamount || row.pago, total);
      const paidAmount = Math.min(total, Math.max(0, paidRaw));
      const remainingAmount = parseNumber(row.saldoabertor || row.saldoaberto || row.saldo, Math.max(0, total - paidAmount));

      const rawPaymentStatus = String(row.statuspagamento || row.paymentstatus || '').toUpperCase();
      let paymentStatus: PaymentStatus = 'PAGO';
      if (rawPaymentStatus.includes('PEND') || rawPaymentStatus.includes('ABERT')) {
        paymentStatus = 'PENDENTE';
      } else if (rawPaymentStatus.includes('PARC')) {
        paymentStatus = 'PARCIALMENTE_PAGO';
      } else if (rawPaymentStatus.includes('PRAZO') || rawPaymentStatus.includes('A_PRAZO')) {
        paymentStatus = 'A_PRAZO';
      } else if (remainingAmount > 0) {
        paymentStatus = paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE';
      }

      const rawSaleStatus = String(row.statusvenda || row.status || row.salestatus || '').toUpperCase();
      let saleStatus: SaleStatus = 'CONCLUIDA';
      if (rawSaleStatus.includes('CANC')) saleStatus = 'CANCELADA';
      else if (rawSaleStatus.includes('EDIT')) saleStatus = 'EDITADA';
      else if (rawSaleStatus.includes('EXCLU')) saleStatus = 'EXCLUIDA';

      const paymentMethod = row.formapagamento || row.metodopagamento || row.paymentmethod || 'Outro';
      const itemName =
        row.itensdescricao ||
        row.item ||
        row.produto ||
        row.descricao ||
        'Produto / Serviço';
      const itemQty = Math.max(1, parseNumber(row.itensqtd || row.quantidade || row.qtd, 1));
      const itemUnitPrice = total / itemQty;

      if (!customerName) {
        errors.push({ field: 'Cliente', message: 'O nome do cliente é obrigatório.', rawValue: customerName });
      }
      if (total <= 0) {
        errors.push({ field: 'Total', message: 'O valor da venda deve ser maior que zero.', rawValue: total });
      }

      const existingSales = existingData.sales || [];
      const match = existingSales.find(
        s => s.saleNumber && saleNumber && s.saleNumber.toLowerCase().trim() === String(saleNumber).toLowerCase().trim()
      );

      let status: 'NEW' | 'EXISTING' | 'ERROR' = 'NEW';
      let matchReason = '';

      if (errors.length > 0) {
        status = 'ERROR';
        errorCount++;
      } else if (match) {
        status = 'EXISTING';
        existingCount++;
        matchReason = `Venda #${match.saleNumber} já cadastrada`;
      } else {
        status = 'NEW';
        newCount++;
      }

      const saleItem: SaleItem = {
        id: `si-${Date.now()}-${rowNum}`,
        itemId: `item-gen-${Date.now()}`,
        itemName,
        itemType: 'PRODUTO',
        sku: `SKU-GEN-${rowNum}`,
        quantity: itemQty,
        unitPrice: itemUnitPrice,
        unitCost: itemUnitPrice * 0.5,
        totalPrice: total,
        totalCost: total * 0.5,
        configuration: {},
      };

      const sale: Sale = {
        id: match ? match.id : `sale-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        saleNumber: String(saleNumber),
        sellerId: 'admin',
        sellerName,
        customerName,
        customerDocument: customerDoc || undefined,
        customerPhone: customerPhone || undefined,
        items: [saleItem],
        subtotal: subtotal || total,
        discount,
        addition: freight,
        total,
        totalCost: total * 0.5,
        grossProfit: total * 0.5,
        grossMarginPercent: 50,
        paymentStatus,
        paymentMethod,
        payments: paidAmount > 0 ? [
          {
            id: `pay-${Date.now()}`,
            amount: paidAmount,
            method: paymentMethod,
            date: now,
          }
        ] : [],
        paidAmount,
        remainingAmount,
        dueDate: remainingAmount > 0 ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: saleStatus,
        createdAt: match ? match.createdAt : row.datahora || now,
      };

      if (errors.length > 0) {
        errors.forEach(e => errorsList.push({ rowNumber: rowNum, ...e }));
      }

      validatedRows.push({
        rowNumber: rowNum,
        status,
        errors,
        warnings,
        entity: sale,
        displaySummary: {
          primary: `${sale.saleNumber} - ${sale.customerName}`,
          secondary: `Vendedor: ${sale.sellerName} • Pagamento: ${sale.paymentStatus}`,
          badge: sale.paymentStatus,
          amount: sale.total,
        },
        matchReason,
      });
    }
  });

  return {
    entityType,
    totalRows: rawRows.length,
    newCount,
    existingCount,
    errorCount,
    rows: validatedRows,
    errorsList,
  };
}

export function generateCsvTemplate(entityType: CsvEntityType): string {
  if (entityType === 'CUSTOMERS') {
    return (
      'Nome / Razão Social;Tipo (PF / PJ);CPF / CNPJ;Telefone / WhatsApp;E-mail;Endereço;Cidade;Estado / UF;CEP;Observações;Promotor / Indicador\n' +
      'Ana Silva;PF;12345678901;11999998888;ana.silva@email.com;Av Paulista, 1000;São Paulo;SP;01310-100;Cliente VIP;Carlos Vendas\n' +
      'Gráfica Alfa Ltda;PJ;12345678000199;1133334444;contato@alfa.com.br;Rua do Comércio, 50;São Paulo;SP;01000-000;Faturamento quinzenal;'
    );
  }
  if (entityType === 'BUDGETS') {
    return (
      'Número Orçamento;Cliente;Telefone;Vendedor;Itens Descrição;Itens Qtd;Subtotal (R$);Desconto (R$);Acréscimo / Frete (R$);Total (R$);Status;Observações\n' +
      'ORC-2026-0001;João Santos;11988887777;Vendedor Carlos;Panfletos 4x4 1000un;1;250,00;10,00;0,00;240,00;ABERTO;Validade 15 dias\n' +
      'ORC-2026-0002;Mariana Lima;21977776666;Vendedor Carlos;Cartão de Visita Couchê;2;120,00;0,00;15,00;135,00;APROVADO;Aguardando arte'
    );
  }
  // SALES
  return (
    'Número Venda;Data / Hora;Cliente;CPF/CNPJ;Telefone;Vendedor;Forma Pagamento;Itens Descrição;Itens Qtd;Subtotal (R$);Desconto (R$);Acréscimo (R$);Total (R$);Valor Pago (R$);Status Pagamento;Status Venda\n' +
    'VND-2026-0001;2026-01-10 14:30:00;Lucas Pereira;12345678901;11966665555;Vendedor Carlos;PIX;Banner 1x1m Lona;1;150,00;0,00;0,00;150,00;150,00;PAGO;CONCLUIDA\n' +
    'VND-2026-0002;2026-01-11 10:15:00;Boutique Bella;12345678000199;11955554444;Vendedor Carlos;Cartão de Crédito;Etiquetas Adesivas;5;500,00;50,00;0,00;450,00;200,00;PARCIALMENTE_PAGO;CONCLUIDA'
  );
}

export function downloadCsvTemplate(entityType: CsvEntityType): void {
  const content = generateCsvTemplate(entityType);
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modelo_importacao_${entityType.toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadXlsxTemplate(entityType: CsvEntityType): void {
  const csvContent = generateCsvTemplate(entityType);
  const rows = csvContent.split('\n').filter(r => r.trim()).map(r => r.split(';'));
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
  XLSX.writeFile(workbook, `modelo_importacao_${entityType.toLowerCase()}.xlsx`);
}

export function downloadImportErrorsCsv(entityType: CsvEntityType, errors: CsvValidationError[]): void {
  let csv = 'Linha;Campo;Erro;ValorInformado\n';
  errors.forEach(err => {
    csv += `"${err.rowNumber}";"${err.field}";"${(err.message || '').replace(/"/g, '""')}";"${(String(err.rawValue || '')).replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inconsistencias_importacao_${entityType.toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

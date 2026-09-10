import * as XLSX from 'xlsx';
import { Category, GraphicPricingModel, Item, ItemType, ProductionType } from '../types';

export interface RawImportRow {
  rowNumber: number;
  name?: string;
  sku?: string;
  barcode?: string;
  type?: string;
  category?: string;
  costPrice?: string | number;
  supplierFreight?: string | number;
  salePrice?: string | number;
  stock?: string | number;
  minStock?: string | number;
  description?: string;
  brand?: string;
  supplier?: string;
  active?: string | boolean;
  showInCatalog?: string | boolean;
  productionType?: string;
  leadTime?: string;
  [key: string]: any;
}

export interface ImportErrorDetail {
  field: string;
  message: string;
  rawValue?: any;
}

export type ImportRowStatus = 'NEW' | 'EXISTING' | 'ERROR';

export interface ValidatedImportItem {
  rowNumber: number;
  status: ImportRowStatus;
  errors: ImportErrorDetail[];
  warnings: string[];
  
  // Normalized item data
  name: string;
  sku: string;
  barcode: string;
  type: ItemType;
  categoryName: string;
  categoryId?: string;
  isNewCategory?: boolean;
  
  costPrice: number;
  supplierCost: number;
  supplierFreight: number;
  salePrice: number;
  marginReais: number;
  marginPercent: number;
  
  stock: number;
  minStock: number;
  description: string;
  brand: string;
  supplier: string;
  active: boolean;
  showInCatalog: boolean;
  featuredInCatalog: boolean;
  productionType?: ProductionType;
  pricingModel?: GraphicPricingModel;
  leadTime?: string;

  // Matching reference if already exists
  existingItem?: Item;
  matchReason?: 'SKU' | 'BARCODE' | 'NAME';
}

export interface ImportValidationResult {
  totalRows: number;
  newItemsCount: number;
  existingItemsCount: number;
  errorItemsCount: number;
  items: ValidatedImportItem[];
  errorsList: {
    rowNumber: number;
    sku: string;
    name: string;
    field: string;
    message: string;
    rawValue: any;
  }[];
}

export type ExistingItemsAction = 'SKIP' | 'UPDATE' | 'KEEP_CURRENT';

/**
 * Normaliza strings para busca e comparação de cabeçalhos (remove acentos, pontuação, parênteses e converte para minúsculas)
 */
function normalizeHeader(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[_\-\.\(\)\/\\]/g, ' ') // substitui pontuação e parênteses por espaço
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza strings para busca e comparação geral
 */
function normalizeText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).trim().toLowerCase();
}

/**
 * Converte valor em formato de moeda ou número para float numérico
 */
export function parseImportNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : Number(value.toFixed(2));
  }
  
  let str = String(value).trim();
  if (!str) return 0;

  // Remove símbolos de moeda e espaços
  str = str.replace(/R\$/gi, '').replace(/\s/g, '');

  // Trata formato pt-BR (ex: 1.250,50 ou 25,00) vs formato US (1250.50)
  if (str.includes(',') && str.includes('.')) {
    // Se a vírgula vier depois do ponto -> padrão 1.250,50
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão 1,250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Converte valor para boolean (Sim/Não, True/False, 1/0)
 */
function parseImportBoolean(value: any, defaultValue = true): boolean {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  
  const norm = normalizeText(value);
  if (['sim', 's', 'true', '1', 'ativo', 'ativa', 'yes', 'y', 'si'].includes(norm)) {
    return true;
  }
  if (['nao', 'não', 'n', 'false', '0', 'inativo', 'inativa', 'no'].includes(norm)) {
    return false;
  }
  return defaultValue;
}

/**
 * Normaliza o tipo de item (PRODUTO_FISICO, PRODUTO_GRAFICO, SERVICO)
 */
function parseItemType(value: any): ItemType {
  const norm = normalizeText(value);
  if (!norm) return 'PRODUTO_FISICO';

  if (norm.includes('graf') || norm.includes('gráfico') || norm.includes('grafico') || norm.includes('banner') || norm.includes('impress')) {
    return 'PRODUTO_GRAFICO';
  }
  if (norm.includes('serv') || norm.includes('serviço') || norm.includes('servico') || norm.includes('digital') || norm.includes('arte')) {
    return 'SERVICO';
  }
  return 'PRODUTO_FISICO';
}

/**
 * Normaliza tipo de produção para itens gráficos
 */
function parseProductionType(value: any): ProductionType {
  const norm = normalizeText(value);
  if (norm.includes('terceir') || norm.includes('fornecedor') || norm.includes('extern')) {
    return 'PRODUCAO_TERCEIRIZADA';
  }
  return 'PRODUCAO_PROPRIA';
}

/**
 * Mapeia cabeçalhos da planilha para campos estruturados
 */
function mapHeaderToField(header: string): string | null {
  const h = normalizeHeader(header);

  if (['nome', 'nome do produto', 'nome produto', 'produto', 'item', 'titulo', 'descricao curta'].includes(h) || h === 'produto' || h === 'nome') {
    return 'name';
  }
  if (['sku', 'codigo', 'codigo do produto', 'codigo interno', 'ref', 'referencia'].includes(h) || h === 'sku' || h === 'codigo' || h === 'ref') {
    return 'sku';
  }
  if (['codigo de barras', 'codigo barras', 'barcode', 'ean', 'ean13', 'gtin', 'upc'].includes(h) || h.includes('codigo de barras') || h.includes('barcode') || h.includes('ean')) {
    return 'barcode';
  }
  if (['tipo', 'tipo de item', 'tipo do item', 'tipo produto', 'tipo de produto', 'natureza', 'categoria tipo'].includes(h)) {
    return 'type';
  }
  if (['categoria', 'departamento', 'grupo', 'secao', 'seção'].includes(h)) {
    return 'category';
  }

  // Cost Price robust matching
  if (
    (h.includes('custo') || h.includes('cost')) &&
    !h.includes('venda') &&
    !h.includes('sale')
  ) {
    return 'costPrice';
  }

  if (['frete', 'frete fornecedor', 'frete custo'].includes(h) || h.includes('frete')) {
    return 'supplierFreight';
  }

  // Sale Price robust matching
  if (
    h.includes('venda') ||
    h.includes('sale') ||
    h === 'preco' ||
    h === 'preço' ||
    h === 'valor' ||
    h === 'valor de venda' ||
    h === 'preco unitario' ||
    h === 'preco venda' ||
    ((h.includes('preco') || h.includes('valor')) && !h.includes('custo') && !h.includes('cost'))
  ) {
    return 'salePrice';
  }

  if (['estoque', 'estoque inicial', 'quantidade', 'qtd', 'saldo', 'saldo estoque', 'qtd estoque', 'estoque atual'].includes(h) || h.includes('estoque') || h === 'qtd' || h === 'quantidade') {
    return 'stock';
  }
  if (['estoque minimo', 'min estoque', 'minimo', 'alerta estoque', 'estoque min'].includes(h) || h.includes('minimo') || h.includes('min estoque')) {
    return 'minStock';
  }
  if (['descricao', 'detalhes', 'observacao', 'observacoes', 'obs'].includes(h) || h.includes('descricao') || h.includes('observacao')) {
    return 'description';
  }
  if (['marca', 'fabricante'].includes(h)) {
    return 'brand';
  }
  if (['fornecedor'].includes(h)) {
    return 'supplier';
  }
  if (['ativo', 'status', 'habilitado'].includes(h)) {
    return 'active';
  }
  if (['exibir no catalogo', 'mostrar no catalogo', 'vitrine', 'catalogo'].includes(h) || h.includes('catalogo') || h.includes('vitrine')) {
    return 'showInCatalog';
  }
  if (['tipo de producao', 'producao'].includes(h) || h.includes('producao')) {
    return 'productionType';
  }
  if (['prazo', 'prazo de entrega', 'tempo de producao'].includes(h) || h.includes('prazo') || h.includes('tempo de producao')) {
    return 'leadTime';
  }

  return null;
}

/**
 * Lê arquivo Excel ou CSV e converte em linhas estruturadas
 */
export async function parseImportFile(file: File): Promise<RawImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          raw: false,
          codepage: 65001, // UTF-8
        });

        // Pega a primeira aba
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          throw new Error('A planilha selecionada está vazia ou não pôde ser lida.');
        }

        // Converte em matriz de linhas
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (!rawJson || rawJson.length < 2) {
          throw new Error('O arquivo não contém registros válidos (deve conter linha de cabeçalho e pelo menos 1 linha de dados).');
        }

        // Identifica linha de cabeçalho (primeira linha com texto útil)
        let headerRowIndex = 0;
        let headers: string[] = [];

        for (let r = 0; r < Math.min(rawJson.length, 5); r++) {
          const row = rawJson[r];
          if (row && row.some((cell: any) => String(cell || '').trim().length > 0)) {
            headers = row.map((cell: any) => String(cell || '').trim());
            headerRowIndex = r;
            break;
          }
        }

        if (headers.length === 0) {
          throw new Error('Cabeçalho da planilha não encontrado.');
        }

        // Mapeia colunas
        const fieldMap: { [colIndex: number]: string } = {};
        headers.forEach((h, idx) => {
          const field = mapHeaderToField(h);
          if (field) {
            fieldMap[idx] = field;
          }
        });

        const rows: RawImportRow[] = [];

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const rowData = rawJson[r];
          if (!rowData || !rowData.some((cell: any) => String(cell || '').trim().length > 0)) {
            continue; // Ignora linhas totalmente vazias
          }

          const rawRow: RawImportRow = {
            rowNumber: r + 1, // 1-indexed para o usuário
          };

          rowData.forEach((val: any, colIdx: number) => {
            const field = fieldMap[colIdx];
            if (field) {
              rawRow[field] = typeof val === 'string' ? val.trim() : val;
            }
          });

          // Se a linha tem pelo menos algum dado
          rows.push(rawRow);
        }

        resolve(rows);
      } catch (err: any) {
        reject(new Error(err.message || 'Erro ao processar o arquivo selecionado. Verifique se o formato é válido (.xlsx, .xls ou .csv).'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo selecionado.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Valida as linhas importadas contra o cadastro existente e regras de negócio
 */
export function validateImportedRows(
  rawRows: RawImportRow[],
  existingItems: Item[],
  existingCategories: Category[]
): ImportValidationResult {
  const items: ValidatedImportItem[] = [];
  const errorsList: ImportValidationResult['errorsList'] = [];

  // Mapeamentos para detecção de duplicidades rápidas
  const existingBySku = new Map<string, Item>();
  const existingByBarcode = new Map<string, Item>();
  const existingByName = new Map<string, Item>();

  existingItems.forEach((item) => {
    if (item.sku) existingBySku.set(String(item.sku).toLowerCase().trim(), item);
    if (item.barcode) existingByBarcode.set(String(item.barcode).toLowerCase().trim(), item);
    if (item.name) existingByName.set(String(item.name).toLowerCase().trim(), item);
  });

  const categoryMapByName = new Map<string, Category>();
  existingCategories.forEach((cat) => {
    if (cat.name) categoryMapByName.set(String(cat.name).toLowerCase().trim(), cat);
  });

  // Rastreamento de duplicidades no próprio arquivo
  const seenSkusInFile = new Map<string, number>();
  const seenBarcodesInFile = new Map<string, number>();

  rawRows.forEach((row) => {
    const rowNumber = row.rowNumber;
    const errors: ImportErrorDetail[] = [];
    const warnings: string[] = [];

    // 1. Validação de Nome (Opcional)
    const rawName = String(row.name || '').trim();

    // 2. Validação de SKU / Código
    const rawSku = String(row.sku || '').trim();
    if (rawSku) {
      const skuLower = rawSku.toLowerCase();
      if (seenSkusInFile.has(skuLower)) {
        errors.push({
          field: 'Código / SKU',
          message: `Código SKU "${rawSku}" duplicado na própria planilha (já informado na linha ${seenSkusInFile.get(skuLower)}).`,
          rawValue: rawSku,
        });
      } else {
        seenSkusInFile.set(skuLower, rowNumber);
      }
    }

    // 3. Validação de Código de Barras
    const rawBarcode = String(row.barcode || '').trim();
    if (rawBarcode) {
      const barcodeLower = rawBarcode.toLowerCase();
      if (seenBarcodesInFile.has(barcodeLower)) {
        errors.push({
          field: 'Código de Barras',
          message: `Código de barras "${rawBarcode}" duplicado na própria planilha (já informado na linha ${seenBarcodesInFile.get(barcodeLower)}).`,
          rawValue: rawBarcode,
        });
      } else {
        seenBarcodesInFile.set(barcodeLower, rowNumber);
      }
    }

    // 4. Validação de Preço de Venda (Opcional)
    let salePrice = 0;
    if (row.salePrice !== undefined && row.salePrice !== null && String(row.salePrice).trim() !== '') {
      const parsed = parseImportNumber(row.salePrice);
      if (!isNaN(parsed)) {
        salePrice = parsed;
      }
    }

    // 5. Validação de Preço de Custo (Opcional)
    let costPrice = 0;
    if (row.costPrice !== undefined && row.costPrice !== null && String(row.costPrice).trim() !== '') {
      const parsed = parseImportNumber(row.costPrice);
      if (!isNaN(parsed)) {
        costPrice = parsed;
      }
    }

    const supplierFreight = parseImportNumber(row.supplierFreight || 0);
    const supplierCost = costPrice > 0 ? Number(Math.max(0, costPrice - supplierFreight).toFixed(2)) : 0;

    // 6. Validação de Estoque (Opcional)
    let stock = 0;
    if (row.stock !== undefined && row.stock !== null && String(row.stock).trim() !== '') {
      const parsed = parseImportNumber(row.stock);
      if (!isNaN(parsed)) {
        stock = parsed;
      }
    }

    let minStock = 0;
    if (row.minStock !== undefined && row.minStock !== null && String(row.minStock).trim() !== '') {
      const parsed = parseImportNumber(row.minStock);
      if (!isNaN(parsed)) {
        minStock = parsed;
      }
    }

    // 7. Tipo e Categoria (Opcional)
    const type = parseItemType(row.type);
    const categoryName = String(row.category || '').trim();
    const foundCat = categoryName ? categoryMapByName.get(categoryName.toLowerCase()) : undefined;
    const isNewCategory = !foundCat && categoryName !== '';
    const categoryId = foundCat ? foundCat.id : '';

    if (isNewCategory) {
      warnings.push(`A categoria "${categoryName}" não existe e será criada automaticamente no catálogo.`);
    }

    // 8. Cálculo de Margens
    const marginReais = Number((salePrice - costPrice).toFixed(2));
    const marginPercent = salePrice > 0 ? Number(((marginReais / salePrice) * 100).toFixed(2)) : 0;

    if (costPrice > salePrice && salePrice > 0) {
      warnings.push(`Atenção: O preço de custo (R$ ${costPrice.toFixed(2)}) é superior ao preço de venda (R$ ${salePrice.toFixed(2)}), gerando margem negativa.`);
    }

    // 9. Status, Descrição e flags adicionais
    const active = parseImportBoolean(row.active, true);
    const showInCatalog = parseImportBoolean(row.showInCatalog, true);
    const description = String(row.description || '').trim();
    const brand = String(row.brand || '').trim();
    const supplier = String(row.supplier || '').trim();
    const productionType = type === 'PRODUTO_GRAFICO' ? parseProductionType(row.productionType) : undefined;
    const leadTime = type === 'PRODUTO_GRAFICO' ? String(row.leadTime || '2 a 3 dias úteis').trim() : undefined;

    // 10. Verificação de Correspondência com Produto Existente no Sistema
    let existingItem: Item | undefined;
    let matchReason: 'SKU' | 'BARCODE' | 'NAME' | undefined;

    if (rawSku && existingBySku.has(rawSku.toLowerCase())) {
      existingItem = existingBySku.get(rawSku.toLowerCase());
      matchReason = 'SKU';
    } else if (rawBarcode && existingByBarcode.has(rawBarcode.toLowerCase())) {
      existingItem = existingByBarcode.get(rawBarcode.toLowerCase());
      matchReason = 'BARCODE';
    } else if (rawName && existingByName.has(rawName.toLowerCase())) {
      existingItem = existingByName.get(rawName.toLowerCase());
      matchReason = 'NAME';
    }

    // Define o Status da Linha
    let status: ImportRowStatus = 'NEW';
    if (errors.length > 0) {
      status = 'ERROR';
      errors.forEach((err) => {
        errorsList.push({
          rowNumber,
          sku: rawSku || 'N/A',
          name: rawName || 'N/A',
          field: err.field,
          message: err.message,
          rawValue: err.rawValue,
        });
      });
    } else if (existingItem) {
      status = 'EXISTING';
    }

    items.push({
      rowNumber,
      status,
      errors,
      warnings,
      name: rawName,
      sku: rawSku,
      barcode: rawBarcode,
      type,
      categoryName,
      categoryId,
      isNewCategory,
      costPrice,
      supplierCost,
      supplierFreight,
      salePrice,
      marginReais,
      marginPercent,
      stock,
      minStock,
      description,
      brand,
      supplier,
      active,
      showInCatalog,
      featuredInCatalog: false,
      productionType,
      pricingModel: type === 'PRODUTO_GRAFICO' ? 'POR_UNIDADE' : undefined,
      leadTime,
      existingItem,
      matchReason,
    });
  });

  const newItemsCount = items.filter((i) => i.status === 'NEW').length;
  const existingItemsCount = items.filter((i) => i.status === 'EXISTING').length;
  const errorItemsCount = items.filter((i) => i.status === 'ERROR').length;

  return {
    totalRows: items.length,
    newItemsCount,
    existingItemsCount,
    errorItemsCount,
    items,
    errorsList,
  };
}

/**
 * Baixa arquivo no navegador
 */
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Gera e baixa modelo de importação em Excel (.xlsx)
 */
export function generateProductImportTemplateXLSX(categories: Category[] = []): void {
  const categoryNames = categories.length > 0
    ? categories.map((c) => c.name).join(', ')
    : 'Gráficos, Impressos, Brindes, Papelaria, Comunicação Visual, Serviços';

  // Exemplos práticos cobrindo Físico, Gráfico e Serviço
  const sampleData = [
    {
      'Nome do Produto': 'Caneca de Porcelana Branca 325ml',
      'Código / SKU': 'FIS-00010',
      'Código de Barras': '7891234567890',
      'Tipo (Físico / Gráfico / Serviço)': 'Físico',
      'Categoria': 'Brindes',
      'Preço de Custo (R$)': 12.50,
      'Preço de Venda (R$)': 35.00,
      'Estoque': 50,
      'Estoque Mínimo': 10,
      'Descrição': 'Caneca cerâmica resinada premium pronta para sublimação',
      'Marca': 'MugPremium',
      'Fornecedor': 'Distribuidora Central',
      'Ativo (Sim/Não)': 'Sim',
      'Exibir no Catálogo (Sim/Não)': 'Sim',
    },
    {
      'Nome do Produto': 'Cartão de Visita 4x4 Verniz Localizado 250g',
      'Código / SKU': 'GRF-00020',
      'Código de Barras': '',
      'Tipo (Físico / Gráfico / Serviço)': 'Gráfico',
      'Categoria': 'Impressos',
      'Preço de Custo (R$)': 45.00,
      'Preço de Venda (R$)': 110.00,
      'Estoque': 0,
      'Estoque Mínimo': 0,
      'Descrição': 'Cartões impressos em papel Couchê 250g com laminação fosca e verniz localizado',
      'Marca': 'Gráfica Digital',
      'Fornecedor': 'Parceiro Gráfico',
      'Ativo (Sim/Não)': 'Sim',
      'Exibir no Catálogo (Sim/Não)': 'Sim',
    },
    {
      'Nome do Produto': 'Banner em Lona 440g c/ Bastão e Cordão (m²)',
      'Código / SKU': 'GRF-00030',
      'Código de Barras': '',
      'Tipo (Físico / Gráfico / Serviço)': 'Gráfico',
      'Categoria': 'Comunicação Visual',
      'Preço de Custo (R$)': 28.00,
      'Preço de Venda (R$)': 75.00,
      'Estoque': 0,
      'Estoque Mínimo': 0,
      'Descrição': 'Banner impresso em alta definição em lona 440g com acabamento em madeira e cordão',
      'Marca': '',
      'Fornecedor': '',
      'Ativo (Sim/Não)': 'Sim',
      'Exibir no Catálogo (Sim/Não)': 'Sim',
    },
    {
      'Nome do Produto': 'Camiseta Poliéster Branca Tamanho M',
      'Código / SKU': 'FIS-00040',
      'Código de Barras': '7899876543210',
      'Tipo (Físico / Gráfico / Serviço)': 'Físico',
      'Categoria': 'Vestuário',
      'Preço de Custo (R$)': 14.90,
      'Preço de Venda (R$)': 39.90,
      'Estoque': 30,
      'Estoque Mínimo': 5,
      'Descrição': 'Camiseta unissex 100% poliéster toque dry-fit especial para sublimação',
      'Marca': 'DryTextil',
      'Fornecedor': 'Têxtil Brasil',
      'Ativo (Sim/Não)': 'Sim',
      'Exibir no Catálogo (Sim/Não)': 'Sim',
    },
    {
      'Nome do Produto': 'Criação e Vetorização de Logotipo / Arte',
      'Código / SKU': 'SRV-00050',
      'Código de Barras': '',
      'Tipo (Físico / Gráfico / Serviço)': 'Serviço',
      'Categoria': 'Serviços',
      'Preço de Custo (R$)': 0.00,
      'Preço de Venda (R$)': 80.00,
      'Estoque': 0,
      'Estoque Mínimo': 0,
      'Descrição': 'Serviço digital de design gráfico, diagramação e vetorização profissional',
      'Marca': '',
      'Fornecedor': '',
      'Ativo (Sim/Não)': 'Sim',
      'Exibir no Catálogo (Sim/Não)': 'Sim',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Ajusta largura das colunas
  ws['!cols'] = [
    { wch: 38 }, // Nome
    { wch: 16 }, // SKU
    { wch: 18 }, // Código de barras
    { wch: 24 }, // Tipo
    { wch: 22 }, // Categoria
    { wch: 18 }, // Preço Custo
    { wch: 18 }, // Preço Venda
    { wch: 12 }, // Estoque
    { wch: 14 }, // Estoque Mínimo
    { wch: 45 }, // Descrição
    { wch: 18 }, // Marca
    { wch: 20 }, // Fornecedor
    { wch: 14 }, // Ativo
    { wch: 24 }, // Exibir Catálogo
  ];

  // Cria aba de instruções
  const instructionsData = [
    { 'Campo': 'Nome do Produto', 'Obrigatório?': 'SIM', 'Formato': 'Texto', 'Observações': 'Nome completo e claro do item comercial.' },
    { 'Campo': 'Código / SKU', 'Obrigatório?': 'NÃO', 'Formato': 'Texto ou Código', 'Observações': 'Código interno. Se deixar em branco, o sistema gerará automaticamente.' },
    { 'Campo': 'Código de Barras', 'Obrigatório?': 'NÃO', 'Formato': 'EAN-13 / Numérico', 'Observações': 'Código de barras para bipar no leitor do PDV.' },
    { 'Campo': 'Tipo', 'Obrigatório?': 'NÃO', 'Formato': 'Físico, Gráfico ou Serviço', 'Observações': 'Se não informado, o padrão adotado será "Físico".' },
    { 'Campo': 'Categoria', 'Obrigatório?': 'NÃO', 'Formato': 'Nome da Categoria', 'Observações': `Ex: ${categoryNames}. Se não existir, será criada automaticamente.` },
    { 'Campo': 'Preço de Custo (R$)', 'Obrigatório?': 'NÃO', 'Formato': 'Número (ex: 15,50)', 'Observações': 'Custo de compra ou fornecedor. Padrão: 0,00.' },
    { 'Campo': 'Preço de Venda (R$)', 'Obrigatório?': 'SIM', 'Formato': 'Número > 0 (ex: 35,00)', 'Observações': 'Preço final de tabela praticado nas vendas e PDV.' },
    { 'Campo': 'Estoque', 'Obrigatório?': 'NÃO', 'Formato': 'Número >= 0', 'Observações': 'Saldo inicial em estoque para produtos físicos. Padrão: 0.' },
    { 'Campo': 'Estoque Mínimo', 'Obrigatório?': 'NÃO', 'Formato': 'Número >= 0', 'Observações': 'Ponto de reposição para alerta de estoque baixo. Padrão: 5.' },
    { 'Campo': 'Descrição', 'Obrigatório?': 'NÃO', 'Formato': 'Texto longo', 'Observações': 'Especificações técnicas, dimensões ou detalhes do item.' },
    { 'Campo': 'Marca', 'Obrigatório?': 'NÃO', 'Formato': 'Texto', 'Observações': 'Marca ou fabricante.' },
    { 'Campo': 'Fornecedor', 'Obrigatório?': 'NÃO', 'Formato': 'Texto', 'Observações': 'Fornecedor habitual.' },
    { 'Campo': 'Ativo', 'Obrigatório?': 'NÃO', 'Formato': 'Sim / Não', 'Observações': 'Padrão: Sim.' },
    { 'Campo': 'Exibir no Catálogo', 'Obrigatório?': 'NÃO', 'Formato': 'Sim / Não', 'Observações': 'Se deve aparecer na vitrine pública. Padrão: Sim.' },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 65 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções e Regras');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `modelo_importacao_produtos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Gera e baixa modelo de importação em CSV (.csv com delimitador ;)
 */
export function generateProductImportTemplateCSV(): void {
  const headers = [
    'Nome do Produto',
    'Código / SKU',
    'Código de Barras',
    'Tipo (Físico / Gráfico / Serviço)',
    'Categoria',
    'Preço de Custo (R$)',
    'Preço de Venda (R$)',
    'Estoque',
    'Estoque Mínimo',
    'Descrição',
    'Marca',
    'Fornecedor',
    'Ativo (Sim/Não)',
    'Exibir no Catálogo (Sim/Não)',
  ];

  const rows = [
    [
      '"Caneca de Porcelana Branca 325ml"',
      '"FIS-00010"',
      '"7891234567890"',
      '"Físico"',
      '"Brindes"',
      '12,50',
      '35,00',
      '50',
      '10',
      '"Caneca cerâmica resinada premium para sublimação"',
      '"MugPremium"',
      '"Distribuidora Central"',
      '"Sim"',
      '"Sim"',
    ],
    [
      '"Cartão de Visita 4x4 Verniz Localizado 250g"',
      '"GRF-00020"',
      '""',
      '"Gráfico"',
      '"Impressos"',
      '45,00',
      '110,00',
      '0',
      '0',
      '"Cartões impressos em papel Couchê 250g"',
      '"Gráfica Digital"',
      '"Parceiro Gráfico"',
      '"Sim"',
      '"Sim"',
    ],
    [
      '"Banner em Lona 440g c/ Bastão e Cordão (m²)"',
      '"GRF-00030"',
      '""',
      '"Gráfico"',
      '"Comunicação Visual"',
      '28,00',
      '75,00',
      '0',
      '0',
      '"Banner impresso em alta definição com acabamento"',
      '""',
      '""',
      '"Sim"',
      '"Sim"',
    ],
    [
      '"Camiseta Poliéster Branca Tamanho M"',
      '"FIS-00040"',
      '"7899876543210"',
      '"Físico"',
      '"Vestuário"',
      '14,90',
      '39,90',
      '30',
      '5',
      '"Camiseta 100% poliéster toque suave dry-fit"',
      '"DryTextil"',
      '"Têxtil Brasil"',
      '"Sim"',
      '"Sim"',
    ],
    [
      '"Criação e Vetorização de Logotipo / Arte"',
      '"SRV-00050"',
      '""',
      '"Serviço"',
      '"Serviços"',
      '0,00',
      '80,00',
      '0',
      '0',
      '"Serviço digital de design gráfico e diagramação"',
      '""',
      '""',
      '"Sim"',
      '"Sim"',
    ],
  ];

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `modelo_importacao_produtos_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Gera e baixa relatório de erros de importação em CSV
 */
export function exportImportErrorsCSV(errorsList: ImportValidationResult['errorsList']): void {
  const headers = ['Linha', 'Código / SKU', 'Nome do Produto', 'Campo com Problema', 'Motivo do Erro', 'Valor Informado'];
  
  const rows = errorsList.map((err) => [
    err.rowNumber,
    `"${String(err.sku || '').replace(/"/g, '""')}"`,
    `"${String(err.name || '').replace(/"/g, '""')}"`,
    `"${String(err.field || '').replace(/"/g, '""')}"`,
    `"${String(err.message || '').replace(/"/g, '""')}"`,
    `"${String(err.rawValue ?? '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `relatorio_erros_importacao_${new Date().toISOString().split('T')[0]}.csv`);
}

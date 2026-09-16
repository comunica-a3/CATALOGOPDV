export type ItemType = 'PRODUTO_GRAFICO' | 'PRODUTO_FISICO' | 'SERVICO' | string;

export interface ProductSeparation {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isSystem?: boolean;
  sortOrder?: number;
  behavior?: 'GRAFICO' | 'FISICO' | 'SERVICO';
  createdAt?: string;
  updatedAt?: string;
}

export type GraphicPricingModel = 'POR_UNIDADE' | 'POR_PACOTE' | 'POR_M2';

export type ProductionType = 'PRODUCAO_PROPRIA' | 'PRODUCAO_TERCEIRIZADA';

export type ProductionStatus = 
  | 'AGUARDANDO_PRODUCAO'
  | 'EM_PRODUCAO'
  | 'PRONTO'
  | 'ENTREGUE'
  | 'REFAZER'
  | 'CANCELADO';

export type SaleStatus = 'CONCLUIDA' | 'CANCELADA' | 'EDITADA' | 'EXCLUIDA';

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE_INVENTARIO';

export type PaymentStatus = 'PAGO' | 'PARCIALMENTE_PAGO' | 'PENDENTE' | 'A_PRAZO' | 'CANCELADO';

export type ReceivableStatus = 'PENDENTE' | 'PARCIALMENTE_PAGO' | 'PAGO' | 'A_PRAZO' | 'ATRASADO';

export type UserRole = 'ADMINISTRADOR' | 'COLABORADOR' | 'VENDEDOR' | 'VENDEDOR_EXTERNO' | 'PROMOTOR';

export type InventoryMovementType = 'ENTRADA' | 'VENDA' | 'AJUSTE' | 'DEVOLUCAO';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  username?: string;
  active?: boolean;
  isTestUser?: boolean;
}

export interface UserCredentials {
  userId: string;
  passwordHash: string;
  salt: string;
  isDefaultPassword?: boolean;
  updatedAt?: string;
}

export interface AdminAuthData {
  username: string;
  passwordHash: string;
  salt: string;
  isDefaultPassword: boolean;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  type?: 'PF' | 'PJ';
  document?: string; // CPF or CNPJ
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  promoterId?: string;
  promoterName?: string;
  isTestCustomer?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  itemType?: ItemType;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Physical product variant (e.g., color, size)
export interface ItemVariant {
  id: string;
  name: string;
  sku: string;
  supplierCost?: number;
  supplierFreight?: number;
  costPrice: number;
  salePrice: number;
  stock: number;
}

// Graphic product option group (e.g. Material, Finish, Print type)
export interface ItemOption {
  id: string;
  name: string; // e.g. "Material", "Acabamento"
  values: {
    id: string;
    label: string; // e.g. "Lona 440g", "Ilhós nas 4 pontas"
    additionalCost?: number;
    additionalPrice?: number;
  }[];
}

// Pricing tier for graphic products per unit (Faixas de quantidade)
export interface ItemPriceRule {
  id: string;
  minQuantity: number;
  maxQuantity?: number;
  unitCost: number;
  unitSalePrice: number;
}

// Predefined package pricing for graphic products
export interface ItemPackage {
  id: string;
  name: string; // e.g., "Pacote 100 un", "Pacote 500 un"
  quantity: number;
  supplierCost?: number; // Custo cobrado pelo fornecedor terceirizado
  supplierFreight?: number; // Frete padrão cobrado pelo fornecedor
  costPrice: number; // Custo total (supplierCost + supplierFreight)
  salePrice: number; // Preço final de venda da tabela
}

// Pricing per m2 for banners, stickers, tarps, etc.
export interface ItemAreaPricing {
  costPerM2: number;
  salePricePerM2: number;
  technicalMinArea?: number; // Mínimo Técnico em m² (menor tamanho físico permitido para produção)
  minAreaM2?: number; // Mantido para compatibilidade retroativa
  minSalePrice?: number; // Preço Mínimo de Venda (R$) independente e opcional
}

// Service dynamic input field (e.g. CPF, Titular, Conta, Contratante)
export interface ServiceField {
  id: string;
  label: string;
  placeholder?: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // for select
}

// Unified Item model
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  categoryId: string;
  sku: string;
  barcode?: string;
  description: string;
  imageUrl?: string;
  imageSource?: 'upload' | 'url' | 'google_drive';
  imageOriginalUrl?: string;
  googleMediaId?: string;
  googleDriveFileId?: string;
  googleDriveFileName?: string;
  googleDriveMimeType?: string;
  googleDriveThumbnailUrl?: string;
  googleDriveAccount?: string;
  imageMetadata?: {
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    fetchedAt?: string;
    fileName?: string;
    fileId?: string;
    accountEmail?: string;
    [key: string]: any;
  };
  
  // Base financial figures (all items must have cost + sale + margin)
  supplierCost?: number; // Custo cobrado pelo fornecedor terceirizado (preço de venda / 2)
  supplierFreight?: number; // Frete padrão cobrado pelo fornecedor (R$ 20,00)
  costPrice: number; // Custo total = supplierCost + supplierFreight
  salePrice: number; // Preço final de venda oficial da tabela
  marginReais: number; // Lucro bruto em R$ (salePrice - costPrice)
  marginPercent: number; // Margem bruta % ((marginReais / salePrice) * 100)

  active: boolean;
  showInCatalog: boolean;
  featuredInCatalog: boolean;
  niche?: string; // Nicho do produto (e.g. 'grafica-e-personalizados', 'produtos-eletronicos', 'servicos-digitais')

  // Physical Product Fields
  brand?: string;
  supplier?: string;
  stock?: number;
  minStock?: number;
  variants?: ItemVariant[];

  // Graphic Product Fields
  pricingModel?: GraphicPricingModel;
  productionType?: ProductionType;
  leadTime?: string; // Prazo de entrega (e.g. "2 a 3 dias úteis")
  requiresFile?: boolean;
  options?: ItemOption[];
  priceRules?: ItemPriceRule[]; // For POR_UNIDADE
  packages?: ItemPackage[]; // For POR_PACOTE
  areaPricing?: ItemAreaPricing; // For POR_M2

  // Service Fields
  estimatedTime?: string; // e.g. "15 minutos", "24h"
  serviceFields?: ServiceField[];
  serviceUrl?: string; // URL do serviço para abertura do portal/site correspondente
  url?: string; // Alias direto para URL do serviço

  // Custom Item identifier (for non-catalog on-demand items)
  isCustom?: boolean;
  isTestItem?: boolean;

  createdAt: string;
  updatedAt: string;
}

// Cart item configuration
export interface CartItemConfiguration {
  variantId?: string;
  variantName?: string;
  selectedOptions?: Record<string, string>; // optionName: optionValue
  additionalPrice?: number;
  
  // For M2 graphic items
  width?: number;
  height?: number;
  dimensionUnit?: 'm' | 'cm';
  widthUnit?: 'm' | 'cm';
  heightUnit?: 'm' | 'cm';
  calculatedAreaM2?: number;

  // For Package graphic items
  packageId?: string;
  packageName?: string;

  // For Services
  serviceData?: Record<string, string>;

  // Customer remarks or artwork instructions
  notes?: string;
}

export interface CartItem {
  cartItemId: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
  configuration: CartItemConfiguration;
  isCustom?: boolean;
}

// Shopping cart item in Public Catalog (Vitrine)
export interface VitrineCartItem {
  id: string;
  itemId: string;
  name: string;
  sku?: string;
  imageUrl?: string;
  type: ItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  labelDisplay?: string;
  dimensions?: {
    width: number;
    height: number;
    unit: 'm' | 'cm';
    areaM2?: number;
  };
  variantName?: string;
  packageName?: string;
  selectedOptions?: Record<string, string>;
  notes?: string;
}

export type AccountType = 'CAIXA' | 'PIX' | 'CARTAO' | 'OUTRO';

export interface ReceivingAccount {
  id: string;
  type: AccountType;
  name: string; // e.g. "Caixa — Caixa físico", "Pix — João", "Cartão — João"
  receiverName: string; // e.g. "Caixa físico", "João", "Maria", "Empresa"
  initialBalance?: number; // Saldo inicial disponível da conta (R$)
  creditFeePercent?: number; // e.g. 3.50 for 3.5%
  debitFeePercent?: number; // e.g. 1.50 for 1.5%
  active: boolean;
  isDefault?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type FinancialMovementType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export interface FinancialTransfer {
  id: string; // e.g. "trf-1725280000000-abc"
  transferNumber: string; // e.g. "TRF-001", "TRF-002"
  type: 'TRANSFERENCIA'; // Tipo de movimentação (não categoria)
  fromAccountId: string; // Conta de origem (debitada)
  fromAccountName: string;
  toAccountId: string; // Conta de destino (creditada)
  toAccountName: string;
  amount: number; // Valor transferido (R$)
  date: string; // YYYY-MM-DD
  observation?: string; // Observação opcional
  userId?: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountBalanceAdjustment {
  id: string; // e.g. "adj-1725280000000-abc"
  adjustmentNumber: string; // e.g. "AJU-001"
  type: 'AJUSTE_ADMINISTRATIVO_SALDO';
  accountId: string;
  accountName: string;
  previousBalance: number;
  newBalance: number;
  adjustedAmount: number; // newBalance - previousBalance (positivo ou negativo)
  reason: string; // Observação ou motivo administrativo
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface FinancialMovement {
  id: string;
  transferId?: string;
  transferNumber?: string;
  type: FinancialMovementType;
  direction: 'SAIDA' | 'ENTRADA';
  accountId: string;
  accountName: string;
  counterpartAccountId?: string;
  counterpartAccountName?: string;
  amount: number; // Positivo (ou negativo conforme contexto)
  date: string;
  observation?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  method: string; // 'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência', 'Prazo'
  amount: number; // Valor Bruto (Gross Amount)
  date: string;
  notes?: string;

  // Financial Account & Fee Breakdown
  accountId?: string;
  accountName?: string; // e.g. "Pix — João", "Cartão — João", "Caixa — Caixa físico"
  accountType?: AccountType;
  cardType?: 'CREDITO' | 'DEBITO';
  feePercent?: number; // e.g. 3.5
  feeAmount?: number; // Custo da taxa do cartão / Custo da loja (R$)
  netAmount?: number; // Valor líquido destinado à conta (R$)
  cashRegisterId?: string; // Sessão de caixa aberta vinculada
}

export interface AccountFinancialSummary {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  count: number;
}

export interface MethodFinancialSummary {
  method: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  count: number;
}

export interface CashRegisterSession {
  id: string;
  registerNumber: string; // e.g. "CX-2026-0001"
  status: 'ABERTO' | 'FECHADO';
  openedAt: string;
  closedAt?: string;
  openedByUserId: string;
  openedByUserName: string;
  closedByUserId?: string;
  closedByUserName?: string;

  // Physical cash balance checking
  initialAmount: number; // Fundo de caixa / saldo inicial em dinheiro
  cashSalesAmount: number; // Entradas em dinheiro durante a sessão
  cashExpensesAmount?: number; // Saídas/despesas em dinheiro durante a sessão
  expectedCashAmount: number; // initialAmount + cashSalesAmount - cashExpensesAmount
  countedCashAmount?: number; // Valor contado no fechamento
  cashDifference?: number; // countedCashAmount - expectedCashAmount

  // Total volume during session
  totalSalesCount: number;
  totalGrossSales: number;
  totalCardFees: number;
  totalNetSales: number;

  // Breakdowns
  byMethod: MethodFinancialSummary[];
  byAccount: AccountFinancialSummary[];

  notes?: string;
  closingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  itemId: string;
  itemName: string;
  itemType: ItemType;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
  commissionRate?: number; // e.g., 50 for 50%, 30 for 30%
  commissionAmount?: number;
  configuration: CartItemConfiguration;
}

export interface SaleEditHistoryEntry {
  id: string;
  saleId: string;
  editedAt: string;
  editedBy: string;
  editedByName: string;
  reason: string;
  previousTotal: number;
  newTotal: number;
  previousItemsCount: number;
  newItemsCount: number;
  previousPaidAmount: number;
  newPaidAmount: number;
  summary: string;
  previousDataJson?: string;
}

export interface Sale {
  id: string;
  saleNumber: string; // e.g. "VND-2026-0001"
  sellerId: string;
  sellerName: string;
  promoterId?: string; // ID do Promotor vinculado (se a venda veio de indicação/orçamento)
  promoterName?: string; // Nome do Promotor
  isPromoterSale?: boolean; // Se a venda teve participação de Promotor
  promoterCommissionPercent?: number; // % deduzido da comissão do vendedor (ex: 20%)
  promoterCommissionAmount?: number; // Valor R$ repassado ao promotor
  sellerCommissionAmount?: number; // Valor R$ líquido recebido pelo vendedor
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  items: SaleItem[];
  subtotal: number;
  freight?: number; // Frete cobrado (ex: produto terceirizado)
  shippingCost?: number; // Alias para comprovantes/relatórios
  addition?: number; // Acréscimo/frete para banco de dados
  discount: number; // in R$
  total: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  
  // Commercial Commission fields
  commissionRate?: number; // average or standard (e.g. 50%)
  commissionAmount?: number; // total commission pool or seller commission (R$)
  companyAmount?: number; // company share (R$)

  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  isTestSale?: boolean;
  payments: PaymentRecord[];
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;

  status: SaleStatus;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  deletionReason?: string;
  editHistory?: SaleEditHistoryEntry[];
  notes?: string;
  annotations?: SaleAnnotation[];
  createdAt: string;
  updatedAt?: string;
}

export interface SaleAnnotation {
  id: string;
  saleId: string;
  text: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface ProductionOrderFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL or external URL
  uploadedAt: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string; // e.g. "PRD-2026-0001"
  saleId: string;
  saleNumber: string;
  saleItemId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  configuration: CartItemConfiguration;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  sellerId?: string;
  sellerName?: string;
  promoterId?: string;
  promoterName?: string;
  productionType: ProductionType;
  leadTime?: string;
  status: ProductionStatus;
  files: ProductionOrderFile[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  variantId?: string;
  variantName?: string;
  type: InventoryMovementType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  userId: string;
  userName: string;
  reason: string;
  saleNumber?: string;
  date: string;
}

export interface Receivable {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: ReceivableStatus;
  payments: PaymentRecord[];
  createdAt: string;
}

export interface ItemTypeCommissionRates {
  PRODUTO_GRAFICO: number; // Porcentagem para Produto Gráfico (0 a 100)
  PRODUTO_FISICO: number;  // Porcentagem para Produto Físico (0 a 100)
  SERVICO: number;         // Porcentagem para Serviço Digital (0 a 100)
}

export interface CompanySettings {
  name: string;
  tradingName: string;
  document: string; // CNPJ
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  logoUrl?: string;
  logoDriveFileId?: string; // ID do arquivo da logo no Google Drive (zero armazenamento local)
  logoDriveFileName?: string; // Nome original do arquivo da logo no Google Drive
  logoDriveThumbnailUrl?: string; // URL da miniatura no Google Drive
  logoDriveAccount?: string; // Conta Google associada
  receiptFooterMessage: string;
  paymentMethods: string[];
  defaultSupplierFreight?: number; // Frete padrão de fornecedor terceirizado (R$ 20,00)
  commissionRates?: ItemTypeCommissionRates; // Porcentagens de comissão por tipo de item
  promoterCommissionPercent?: number; // Porcentagem global destinada ao Promotor (retirada da comissão do Vendedor)
  catalogSubtitle?: string; // Frase de destaque / slogan exibida no catálogo digital
  catalogHeaderType?: 'NAME' | 'LOGO'; // Exibição do Header do Catálogo: Nome da Marca ou Logo Personalizada
  prospectingTexts?: {
    mainTitle?: string;
    mainSubtitle?: string;
    funilTitle?: string;
    funilDesc?: string;
  };
}

// --- PRODUCT NICHE CARDS (Vitrine Pública) ---
export interface ProductNicheCard {
  id: string; // Identificador único (slug)
  title: string; // Título principal do nicho (e.g. 'Gráfica e Personalizados')
  description: string; // Descrição de apoio do nicho
  ctaText: string; // Texto da chamada para ação (e.g. 'Ver produtos', 'Ver serviços')
  imageUrl: string; // URL da imagem em destaque do card
  badge: string; // Etiqueta superior do card (e.g. 'Gráfica & Impressos')
  order?: number; // Ordem de exibição na grade
  active?: boolean; // Se está visível na vitrine pública
  itemTypeMatch?: 'PRODUTO_GRAFICO' | 'PRODUTO_FISICO' | 'SERVICO' | 'ALL' | string;
  categoryMatchKeywords?: string[]; // Palavras-chave para associar produtos automaticamente
  customKeywords?: string[]; // Termos de busca adicionais
  createdAt?: string;
  updatedAt?: string;
}

// --- ONLINE EXTERNAL SERVICES ("Serviços Online") ---
export type OnlineServiceCategory =
  | 'Governo'
  | 'Documentos'
  | 'Serviços Públicos'
  | 'Consultas'
  | 'Agendamentos'
  | 'Outros';

export interface OnlineService {
  id: string;
  name: string;
  category: OnlineServiceCategory | string;
  description?: string;
  url: string;
  price?: number; // Preço de venda opcional para cobrança no PDV/orçamento (R$)
  cost?: number; // Custo opcional
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- DOCUMENT GENERATION ("Geração de Documentos") ---
export type DocumentCategory =
  | 'Currículos'
  | 'Contratos'
  | 'Declarações'
  | 'Procurações'
  | 'Requerimentos'
  | 'Cartas'
  | 'Recibos'
  | 'Outros';

export type DocumentFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'email'
  | 'phone';

export type DocumentSystemMapping =
  | 'name'
  | 'document'
  | 'phone'
  | 'email'
  | 'address'
  | 'city'
  | 'state'
  | 'company_name'
  | 'company_document'
  | 'company_phone'
  | 'company_address'
  | 'current_date';

export interface DocumentField {
  id: string;
  label: string;
  type: DocumentFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  options?: string[]; // for select
  helpText?: string;
  customerFieldMapping?: DocumentSystemMapping;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: DocumentCategory | string;
  description: string;
  defaultPrice: number; // Preço sugerido do serviço (ex: R$ 30,00)
  fields: DocumentField[];
  templateBody: string; // Texto com tags {{campo_id}}
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateTitle: string;
  category: string;
  title: string; // Ex: "Currículo - João da Silva"
  content: string; // Texto formatado final editável
  formData: Record<string, string>;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  sellerId: string;
  sellerName: string;
  priceCharged?: number;
  saleId?: string;
  saleNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type BudgetStatus = 'ABERTO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO' | 'CONVERTIDO_EM_VENDA';

export interface Budget {
  id: string;
  budgetNumber: string; // e.g. "ORC-2026-0001"
  sellerId: string;
  sellerName: string;
  promoterId?: string; // Promotor que cadastrou ou indicou a proposta
  promoterName?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  freight?: number;
  shippingCost?: number;
  addition?: number;
  discount: number;
  total: number;
  totalCost?: number;
  validUntil: string;
  status: BudgetStatus;
  notes?: string;
  paymentConditions?: string;
  productionLeadTime?: string;
  convertedSaleId?: string;
  convertedSaleNumber?: string;
  opportunityId?: string; // Vinculação com a oportunidade de prospecção
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// --- MÓDULO DE CAPTAÇÃO E PROSPECÇÃO ATIVA ---
// ==========================================

export type OpportunityStage =
  | 'IDENTIFICADO'   // 🔴 Identificado (Possível cliente encontrado)
  | 'A_CONTATAR'     // 🟠 A Contatar (Pronto para receber primeira abordagem)
  | 'CONTATADO'      // 🟡 Contatado (Já recebeu abordagem)
  | 'INTERESSADO'    // 🔵 Interessado (Demonstrou interesse)
  | 'ORCAMENTO'      // 🟣 Orçamento (Solicitou ou recebeu proposta/orçamento)
  | 'CONVERTIDO'     // 🟢 Convertido (Realizou primeira compra)
  | 'NAO_CONVERTEU';  // ⚫ Não Converteu (Negociação encerrada sem venda)

export type OpportunityOrigin =
  | 'PESQUISA_PROPRIA'
  | 'PROSPECCAO_PRESENCIAL'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'ATENDIMENTO_PRESENCIAL'
  | 'EVENTO'
  | 'FORMULARIO_PUBLICO'
  | 'VENDEDOR_EXTERNO'
  | 'OUTRO';

export type OpportunityActivityType =
  | 'WHATSAPP'
  | 'LIGACAO'
  | 'ATENDIMENTO_PRESENCIAL'
  | 'VISITA'
  | 'REUNIAO'
  | 'ORCAMENTO'
  | 'RETORNO'
  | 'OBSERVACAO'
  | 'MUDANCA_ETAPA'
  | 'CONVERSAO';

export interface OpportunityActivity {
  id: string;
  opportunityId: string;
  type: OpportunityActivityType;
  description: string;
  userId: string;
  userName: string;
  date: string; // ISO string
  createdAt: string;
}

export type OpportunityNextActionType =
  | 'WHATSAPP'
  | 'LIGACAO'
  | 'VISITA'
  | 'REUNIAO'
  | 'ENVIAR_ORCAMENTO'
  | 'RETOMAR_NEGOCIACAO'
  | 'OUTRO';

export interface OpportunityNextAction {
  type: OpportunityNextActionType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  responsibleId?: string;
  responsibleName?: string;
  note?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface Opportunity {
  id: string;
  opportunityNumber?: string; // e.g. "OPP-001"
  name: string; // Nome da pessoa ou negócio (ex: "Salão Bella Vista", "Padaria Central")
  contactName?: string; // Nome do responsável/contato
  segment: string; // Ex: "Salão de Beleza", "Restaurante", "Comércio", "Escola", "Evento", "Autônomo"
  neighborhood?: string; // Bairro ou região
  city?: string;
  phone: string;
  whatsapp?: string;
  instagram?: string;
  needs: string[]; // Lista de necessidades identificadas
  needsDescription?: string; // Descrição livre da necessidade
  origin: OpportunityOrigin;
  originDetails?: string;
  stage: OpportunityStage;
  assignedUserId?: string; // Responsável comercial / Vendedor / Promotor
  assignedUserName?: string;
  notes?: string;
  suggestedProductIds?: string[];
  suggestedPackageIds?: string[];
  nextAction?: OpportunityNextAction;
  
  // Rastreabilidade de Captação Pública & Formulários
  sourceFormId?: string;
  sourceFormTitle?: string;
  sourcePageId?: string;
  sourcePageTitle?: string;
  formResponses?: Record<string, any>;

  // Conversão
  convertedCustomerId?: string;
  convertedBudgetId?: string;
  convertedSaleId?: string;
  selectedTemplateId?: string;
  customApproachMessage?: string;
  convertedAt?: string;

  // Encerramento
  lostReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ApproachMessageTemplate {
  id: string;
  title: string;
  category?: string; // ex: "Primeiro Contato", "Retorno", "Oferta de Pacote", "Pós-Orçamento"
  targetStage?: OpportunityStage | 'ALL';
  templateText: string; // Variáveis: [NOME], [VENDEDOR], [NECESSIDADE], [NOME_DO_NEGOCIO], [PRODUTO_SUGERIDO], [PACOTE_SUGERIDO], [EMPRESA]
  isDefault?: boolean;
  active: boolean;
  createdAt: string;
}

export interface ProductPackageItem {
  itemId: string;
  itemName: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ProductPackage {
  id: string;
  name: string; // Ex: "Kit Novo Negócio", "Kit Restaurante & Lanchonete", "Kit Salão de Beleza"
  description: string;
  targetSegment?: string;
  items: ProductPackageItem[];
  originalTotal: number;
  packagePrice: number;
  discountPercent?: number;
  active: boolean;
  featuredInPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentSuggestionRule {
  id: string;
  segment: string; // Ex: "Salão de Beleza", "Restaurante", "Evento", "Comércio"
  need: string; // Ex: "Melhorar a divulgação", "Material gráfico", "Novo negócio"
  recommendedProductIds: string[]; // IDs de itens do catálogo
  recommendedPackageIds: string[]; // IDs de pacotes
  notes?: string;
}

export interface ComplementaryProductRule {
  id: string;
  baseItemId: string;
  baseItemName: string;
  suggestedItemIds: string[];
  notes?: string;
}

export type CaptureFormFieldType =
  | 'name'
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date';

export interface CaptureFormField {
  id: string;
  name: string; // identificador/chave interna
  label: string; // Título exibido no formulário
  type: CaptureFormFieldType;
  required: boolean;
  order: number;
  placeholder?: string;
  options?: string[]; // Opções para tipo select e multiselect
  defaultValue?: string;
}

export interface CaptureFormConfig {
  id: string;
  slug?: string;
  internalName: string; // Nome interno do formulário
  title: string; // Título exibido
  description?: string; // Descrição
  fields: CaptureFormField[];
  submitButtonText?: string; // Texto do botão (ex: "Enviar Solicitação de Orçamento")
  successMessage?: string; // Mensagem após envio
  active: boolean; // Status ativo/inativo
  isDefault?: boolean; // Se é modelo padrão do sistema
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicSegmentPage {
  id: string;
  slug: string; // Ex: "saloes", "restaurantes", "eventos", "empreendedores", "comercio", "escolas"
  segment: string;
  segmentName?: string;
  title: string;
  headline: string;
  subheadline?: string;
  description: string;
  imageUrl?: string;
  badgeText?: string;
  heroBadge?: string;
  benefits?: string[];
  suggestedProductIds: string[];
  suggestedPackageIds: string[];
  featuredPackageIds?: string[];
  formId?: string; // Formulário utilizado (CaptureFormConfig id)
  ctaButtonText?: string; // Botão/CTA personalizado
  successMessage?: string; // Mensagem de sucesso personalizada
  active: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseNature = 'OPERACIONAL' | 'RETIRADA_PESSOAL' | 'NAO_OPERACIONAL';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string; // 'Pessoal' | 'Materiais/Produção' | 'Despesas Fixas' | 'Manutenção' | 'Transporte' | 'Serviços' | 'Administrativo' | 'Outros' | string
  observation?: string;
  paymentMethod: string; // 'Dinheiro' | 'Cartão' | 'PIX' | 'Boleto' | 'Transferência' | string
  accountId?: string; // Conta de origem do recurso (ex: Caixa, Pix, Banco)
  accountName?: string; // Nome da conta de origem
  nature?: ExpenseNature; // 'OPERACIONAL' (DRE) | 'RETIRADA_PESSOAL' (Sócios / Não entra em DRE) | 'NAO_OPERACIONAL'
  type?: 'DESPESA_OPERACIONAL' | 'RETIRADA_PESSOAL' | 'NAO_OPERACIONAL';
  userId?: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
}




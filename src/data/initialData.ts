import {
  CashRegisterSession,
  Category,
  CompanySettings,
  Customer,
  InventoryMovement,
  Item,
  ItemTypeCommissionRates,
  ProductionOrder,
  ProductSeparation,
  Receivable,
  ReceivingAccount,
  Sale,
  User,
} from '../types';
import { IMPORTED_ITEMS, OFFICIAL_CATEGORIES } from './importedProducts';

export const DEFAULT_COMMISSION_RATES: ItemTypeCommissionRates = {
  PRODUTO_GRAFICO: 10,
  PRODUTO_FISICO: 5,
  SERVICO: 15,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Administrador',
    username: 'admin',
    role: 'ADMINISTRADOR',
    email: 'admin@digitalexpress.com.br',
  },
];

export const INITIAL_RECEIVING_ACCOUNTS: ReceivingAccount[] = [
  {
    id: 'acc-caixa-1',
    type: 'CAIXA',
    name: 'Caixa — Caixa físico',
    receiverName: 'Caixa físico',
    initialBalance: 0,
    active: true,
    isDefault: true,
    notes: 'Gaveta / caixa físico da loja',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc-pix-empresa',
    type: 'PIX',
    name: 'Pix — Empresa',
    receiverName: 'Empresa',
    initialBalance: 0,
    active: true,
    isDefault: true,
    notes: 'Chave Pix CNPJ da empresa',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc-cartao-empresa',
    type: 'CARTAO',
    name: 'Cartão — Empresa',
    receiverName: 'Empresa',
    initialBalance: 0,
    creditFeePercent: 3.5,
    debitFeePercent: 1.5,
    active: true,
    isDefault: true,
    notes: 'Maquininha principal da loja (Crédito 3,50% / Débito 1,50%)',
    createdAt: '2026-08-01T08:00:00Z',
  },
];

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  name: 'Gráfica Rápida e Digital Express',
  tradingName: 'Digital Express Impressões e Serviços',
  document: '12.345.678/0001-90',
  phone: '(11) 3456-7890',
  whatsapp: '11987654321',
  email: 'contato@digitalexpress.com.br',
  address: 'Rua do Comércio, 450 - Centro Comercial',
  city: 'São Paulo',
  state: 'SP',
  logoUrl: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150&auto=format&fit=crop&q=80',
  receiptFooterMessage: 'Agradecemos a preferência! Orçamentos e pedidos via WhatsApp (11) 98765-4321.',
  paymentMethods: [
    'PIX',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Dinheiro',
    'Boleto Bancário',
    'Prazo / Crediário',
    'Transferência Bancária',
  ],
  defaultSupplierFreight: 20.0,
  commissionRates: { ...DEFAULT_COMMISSION_RATES },
  promoterCommissionPercent: 20,
  catalogSubtitle: 'Sua rotina, mais simples.',
};

export const INITIAL_PRODUCT_SEPARATIONS: ProductSeparation[] = [
  {
    id: 'PRODUTO_GRAFICO',
    name: 'Gráficos',
    description: 'Materiais gráficos e impressos',
    icon: 'Layers',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'PRODUTO_FISICO',
    name: 'Físicos',
    description: 'Produtos físicos e itens de estoque',
    icon: 'Package',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'SERVICO',
    name: 'Serviços',
    description: 'Serviços digitais e atendimento',
    icon: 'Globe',
    isSystem: true,
    sortOrder: 3,
  },
];

export const INITIAL_CATEGORIES: Category[] = OFFICIAL_CATEGORIES;

export const INITIAL_ITEMS: Item[] = IMPORTED_ITEMS;

// All transaction collections are clean/empty for real production use
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [];
export const INITIAL_INVENTORY_MOVEMENTS: InventoryMovement[] = [];
export const INITIAL_RECEIVABLES: Receivable[] = [];
export const INITIAL_CASH_REGISTER_SESSIONS: CashRegisterSession[] = [];

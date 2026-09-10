import { Item, ItemType, ItemTypeCommissionRates, Sale, SaleItem, User } from '../types';

export const DEFAULT_COMMISSION_RATES: ItemTypeCommissionRates = {
  PRODUTO_GRAFICO: 10,
  PRODUTO_FISICO: 5,
  SERVICO: 15,
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  PRODUTO_GRAFICO: 'Produto Gráfico',
  PRODUTO_FISICO: 'Produto Físico',
  SERVICO: 'Serviço Digital',
};

export function getItemTypeLabel(type?: ItemType | string): string {
  if (!type) return 'Produto Gráfico';
  return ITEM_TYPE_LABELS[type as ItemType] || type;
}

/**
 * Determina a taxa de comissão para um item específico baseado no seu Tipo de Item
 * Se o item já tiver commissionRate gravado (snapshot), prioriza o valor gravado.
 */
export function getItemCommissionRate(
  item: {
    itemType?: ItemType;
    categoryId?: string;
    itemId?: string;
    itemName?: string;
    sku?: string;
    commissionRate?: number;
  },
  configuredRates?: ItemTypeCommissionRates
): number {
  if (item.commissionRate !== undefined && !isNaN(item.commissionRate)) {
    return item.commissionRate;
  }

  const type = item.itemType || 'PRODUTO_GRAFICO';
  if (configuredRates && configuredRates[type] !== undefined) {
    return Math.max(0, Math.min(100, Number(configuredRates[type])));
  }

  return DEFAULT_COMMISSION_RATES[type] ?? 10;
}

/**
 * Calcula a comissão detalhada de uma venda e seus itens.
 * Preserva integralmente os snapshots históricos (taxas e valores já gravados em vendas passadas).
 * Se a venda teve origem em um Promotor, a comissão do promotor é retirada da fatia do Vendedor,
 * preservando integralmente o lucro e a receita líquida da Empresa.
 */
export function calculateSaleCommission(
  sale: Sale,
  fallbackRates?: ItemTypeCommissionRates,
  fallbackPromoterPercent = 20
): {
  commissionAmount: number; // Total commission pool (Vendedor + Promotor)
  sellerCommissionAmount: number; // Valor líquido destinado ao Vendedor
  promoterCommissionAmount: number; // Valor líquido destinado ao Promotor
  companyAmount: number;
  averageRatePercent: number;
  isPromoterSale: boolean;
  promoterId?: string;
  promoterName?: string;
  promoterCommissionPercent: number;
  itemsCommission: {
    itemId: string;
    itemName: string;
    itemType: ItemType;
    rate: number;
    commission: number;
    netTotal: number;
  }[];
} {
  // Vendas canceladas não geram comissão comercial
  if (sale.status === 'CANCELADA' || sale.paymentStatus === 'CANCELADO') {
    return {
      commissionAmount: 0,
      sellerCommissionAmount: 0,
      promoterCommissionAmount: 0,
      companyAmount: 0,
      averageRatePercent: 0,
      isPromoterSale: Boolean(sale.promoterId),
      promoterId: sale.promoterId,
      promoterName: sale.promoterName,
      promoterCommissionPercent: sale.promoterCommissionPercent ?? fallbackPromoterPercent,
      itemsCommission: [],
    };
  }

  const finalTotal = Math.max(0, sale.total);
  const subtotal = Math.max(0.01, sale.subtotal || finalTotal);
  const discountFactor = finalTotal / subtotal;

  let totalCalculatedCommission = 0;
  const itemsCommission = (sale.items || []).map((item) => {
    // 1. Prioriza a taxa gravada no snapshot do item
    const rate =
      item.commissionRate !== undefined && !isNaN(item.commissionRate)
        ? item.commissionRate
      : getItemCommissionRate(item, fallbackRates);

    const netTotal = Number((item.totalPrice * discountFactor).toFixed(2));
    
    // 2. Prioriza o valor de comissão gravado no snapshot do item
    const commission =
      item.commissionAmount !== undefined && !isNaN(item.commissionAmount)
        ? item.commissionAmount
        : Number(((netTotal * rate) / 100).toFixed(2));

    totalCalculatedCommission += commission;

    return {
      itemId: item.id || item.itemId,
      itemName: item.itemName,
      itemType: item.itemType || 'PRODUTO_GRAFICO',
      rate,
      commission,
      netTotal,
    };
  });

  // Preserva snapshot do valor total da comissão da venda se existir
  const totalCommissionPool =
    sale.commissionAmount !== undefined && !isNaN(sale.commissionAmount)
      ? Number(sale.commissionAmount.toFixed(2))
      : Number(totalCalculatedCommission.toFixed(2));

  // Divisão com Promotor (se houver Promotor vinculado)
  const isPromoterSale = Boolean(sale.promoterId);
  const promoterRate = sale.promoterCommissionPercent ?? fallbackPromoterPercent;

  let promoterCommissionAmount = 0;
  let sellerCommissionAmount = totalCommissionPool;

  if (isPromoterSale) {
    if (sale.promoterCommissionAmount !== undefined && !isNaN(sale.promoterCommissionAmount)) {
      promoterCommissionAmount = Number(sale.promoterCommissionAmount.toFixed(2));
      sellerCommissionAmount =
        sale.sellerCommissionAmount !== undefined && !isNaN(sale.sellerCommissionAmount)
          ? Number(sale.sellerCommissionAmount.toFixed(2))
          : Number(Math.max(0, totalCommissionPool - promoterCommissionAmount).toFixed(2));
    } else {
      promoterCommissionAmount = Number(((totalCommissionPool * promoterRate) / 100).toFixed(2));
      sellerCommissionAmount = Number(Math.max(0, totalCommissionPool - promoterCommissionAmount).toFixed(2));
    }
  }

  const companyAmount =
    sale.companyAmount !== undefined && !isNaN(sale.companyAmount)
      ? Number(sale.companyAmount.toFixed(2))
      : Number(Math.max(0, finalTotal - totalCommissionPool).toFixed(2));

  const averageRatePercent =
    finalTotal > 0
      ? Number(((totalCommissionPool / finalTotal) * 100).toFixed(2))
      : (sale.commissionRate ?? 0);

  return {
    commissionAmount: totalCommissionPool,
    sellerCommissionAmount,
    promoterCommissionAmount,
    companyAmount,
    averageRatePercent,
    isPromoterSale,
    promoterId: sale.promoterId,
    promoterName: sale.promoterName,
    promoterCommissionPercent: promoterRate,
    itemsCommission,
  };
}

export type CommissionPeriodFilter =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'mes_atual'
  | 'mes_anterior'
  | 'personalizado';

/**
 * Filtra vendas por período
 */
export function filterSalesByPeriod(
  sales: Sale[],
  period: CommissionPeriodFilter,
  customStartDate?: string,
  customEndDate?: string
): Sale[] {
  const now = new Date();

  return sales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);

    switch (period) {
      case 'hoje': {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return saleDate >= startOfToday && saleDate <= endOfToday;
      }
      case 'ontem': {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        return saleDate >= startOfYesterday && saleDate <= endOfYesterday;
      }
      case 'ultimos_7_dias': {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= sevenDaysAgo && saleDate <= now;
      }
      case 'ultimos_30_dias': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= thirtyDaysAgo && saleDate <= now;
      }
      case 'mes_atual': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return saleDate >= startOfMonth && saleDate <= endOfMonth;
      }
      case 'mes_anterior': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
      }
      case 'personalizado': {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(0);
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date();
        return saleDate >= start && saleDate <= end;
      }
      default:
        return true;
    }
  });
}

export interface SellerCommissionSummary {
  sellerId: string;
  sellerName: string;
  salesCount: number;
  totalSold: number;
  companyShare: number;
  sellerCommission: number; // Valor líquido que o vendedor recebe (já deduzida a parcela do promotor se houver)
  totalCommissionPool: number; // Total de comissão gerado
  promoterDeductions: number; // Total repassado para promotores
  averageCommissionPercent: number;
  sales: Sale[];
}

export interface PromoterCommissionSummary {
  promoterId: string;
  promoterName: string;
  salesCount: number;
  totalSold: number;
  promoterCommission: number; // Valor total repassado ao promotor
  sellerCommission: number; // Valor que ficou com o vendedor
  averagePromoterPercent: number;
  sales: Sale[];
}

/**
 * Agrupa e calcula as comissões consolidadas por vendedor
 */
export function aggregateCommissionsBySeller(
  sales: Sale[],
  users: User[]
): {
  summaries: SellerCommissionSummary[];
  totalSoldAll: number;
  totalCompanyAll: number;
  totalCommissionAll: number;
  totalSalesCount: number;
  topSellerByVolume: SellerCommissionSummary | null;
  topSellerByCommission: SellerCommissionSummary | null;
} {
  // Ignora vendas canceladas nos cálculos consolidados
  const activeSales = sales.filter(
    (s) => s.status !== 'CANCELADA' && s.paymentStatus !== 'CANCELADO'
  );

  const sellerMap = new Map<string, SellerCommissionSummary>();

  // Inicializa todos os vendedores conhecidos (Vendedores e Colaboradores)
  users
    .filter((u) => u.role !== 'PROMOTOR')
    .forEach((u) => {
      sellerMap.set(u.id, {
        sellerId: u.id,
        sellerName: u.name,
        salesCount: 0,
        totalSold: 0,
        companyShare: 0,
        sellerCommission: 0,
        totalCommissionPool: 0,
        promoterDeductions: 0,
        averageCommissionPercent: 50,
        sales: [],
      });
    });

  // Agrega as vendas
  activeSales.forEach((sale) => {
    const sId = sale.sellerId || 'sem-vendedor';
    let current = sellerMap.get(sId);
    if (!current) {
      current = {
        sellerId: sId,
        sellerName: sale.sellerName || 'Vendedor Não Identificado',
        salesCount: 0,
        totalSold: 0,
        companyShare: 0,
        sellerCommission: 0,
        totalCommissionPool: 0,
        promoterDeductions: 0,
        averageCommissionPercent: 50,
        sales: [],
      };
      sellerMap.set(sId, current);
    }

    const { commissionAmount, sellerCommissionAmount, promoterCommissionAmount, companyAmount } =
      calculateSaleCommission(sale);

    current.salesCount += 1;
    current.totalSold = Number((current.totalSold + sale.total).toFixed(2));
    current.sellerCommission = Number((current.sellerCommission + sellerCommissionAmount).toFixed(2));
    current.totalCommissionPool = Number((current.totalCommissionPool + commissionAmount).toFixed(2));
    current.promoterDeductions = Number((current.promoterDeductions + promoterCommissionAmount).toFixed(2));
    current.companyShare = Number((current.companyShare + companyAmount).toFixed(2));
    current.sales.push(sale);
  });

  const summaries = Array.from(sellerMap.values()).map((item) => {
    const avg = item.totalSold > 0 ? Number(((item.sellerCommission / item.totalSold) * 100).toFixed(2)) : 50;
    return {
      ...item,
      averageCommissionPercent: avg,
      sales: item.sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  });

  // Ordena por maior total vendido
  summaries.sort((a, b) => b.totalSold - a.totalSold);

  const totalSoldAll = Number(summaries.reduce((acc, s) => acc + s.totalSold, 0).toFixed(2));
  const totalCompanyAll = Number(summaries.reduce((acc, s) => acc + s.companyShare, 0).toFixed(2));
  const totalCommissionAll = Number(summaries.reduce((acc, s) => acc + s.sellerCommission, 0).toFixed(2));
  const totalSalesCount = summaries.reduce((acc, s) => acc + s.salesCount, 0);

  const sellersWithSales = summaries.filter((s) => s.salesCount > 0);
  const topSellerByVolume = sellersWithSales.length > 0 ? sellersWithSales[0] : null;
  const topSellerByCommission =
    sellersWithSales.length > 0
      ? [...sellersWithSales].sort((a, b) => b.sellerCommission - a.sellerCommission)[0]
      : null;

  return {
    summaries,
    totalSoldAll,
    totalCompanyAll,
    totalCommissionAll,
    totalSalesCount,
    topSellerByVolume,
    topSellerByCommission,
  };
}

/**
 * Agrupa e calcula as comissões consolidadas por promotor
 */
export function aggregateCommissionsByPromoter(
  sales: Sale[],
  users: User[]
): {
  summaries: PromoterCommissionSummary[];
  totalSoldAll: number;
  totalPromoterCommissionAll: number;
  totalSalesCount: number;
  topPromoterByVolume: PromoterCommissionSummary | null;
  topPromoterByCommission: PromoterCommissionSummary | null;
} {
  const activeSales = sales.filter(
    (s) => s.status !== 'CANCELADA' && s.paymentStatus !== 'CANCELADO'
  );

  const promoterMap = new Map<string, PromoterCommissionSummary>();

  // Inicializa todos os promotores cadastrados
  users
    .filter((u) => u.role === 'PROMOTOR')
    .forEach((u) => {
      promoterMap.set(u.id, {
        promoterId: u.id,
        promoterName: u.name,
        salesCount: 0,
        totalSold: 0,
        promoterCommission: 0,
        sellerCommission: 0,
        averagePromoterPercent: 20,
        sales: [],
      });
    });

  // Agrega as vendas com promotor
  activeSales.forEach((sale) => {
    if (!sale.promoterId) return;

    const pId = sale.promoterId;
    let current = promoterMap.get(pId);
    if (!current) {
      current = {
        promoterId: pId,
        promoterName: sale.promoterName || 'Promotor Não Identificado',
        salesCount: 0,
        totalSold: 0,
        promoterCommission: 0,
        sellerCommission: 0,
        averagePromoterPercent: 20,
        sales: [],
      };
      promoterMap.set(pId, current);
    }

    const { promoterCommissionAmount, sellerCommissionAmount } = calculateSaleCommission(sale);

    current.salesCount += 1;
    current.totalSold = Number((current.totalSold + sale.total).toFixed(2));
    current.promoterCommission = Number((current.promoterCommission + promoterCommissionAmount).toFixed(2));
    current.sellerCommission = Number((current.sellerCommission + sellerCommissionAmount).toFixed(2));
    current.sales.push(sale);
  });

  const summaries = Array.from(promoterMap.values()).map((item) => {
    const totalCommPool = item.promoterCommission + item.sellerCommission;
    const avg = totalCommPool > 0 ? Number(((item.promoterCommission / totalCommPool) * 100).toFixed(2)) : 20;
    return {
      ...item,
      averagePromoterPercent: avg,
      sales: item.sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  });

  summaries.sort((a, b) => b.totalSold - a.totalSold);

  const totalSoldAll = Number(summaries.reduce((acc, s) => acc + s.totalSold, 0).toFixed(2));
  const totalPromoterCommissionAll = Number(summaries.reduce((acc, s) => acc + s.promoterCommission, 0).toFixed(2));
  const totalSalesCount = summaries.reduce((acc, s) => acc + s.salesCount, 0);

  const promotersWithSales = summaries.filter((s) => s.salesCount > 0);
  const topPromoterByVolume = promotersWithSales.length > 0 ? promotersWithSales[0] : null;
  const topPromoterByCommission =
    promotersWithSales.length > 0
      ? [...promotersWithSales].sort((a, b) => b.promoterCommission - a.promoterCommission)[0]
      : null;

  return {
    summaries,
    totalSoldAll,
    totalPromoterCommissionAll,
    totalSalesCount,
    topPromoterByVolume,
    topPromoterByCommission,
  };
}

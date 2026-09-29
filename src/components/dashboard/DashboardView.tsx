import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Package,
  Percent,
  PieChart as PieChartIcon,
  Printer,
  Receipt,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Category, CompanySettings, Customer, Item, ProductionOrder, Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export type DashboardPeriod =
  | 'hoje'
  | 'ontem'
  | '7dias'
  | '30dias'
  | 'mes'
  | 'mes_anterior'
  | 'ano'
  | 'custom';

interface DashboardViewProps {
  sales: Sale[];
  items?: Item[];
  categories?: Category[];
  productionOrders?: ProductionOrder[];
  companySettings?: CompanySettings;
  onNavigateToSales?: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToFinance?: () => void;
  onNavigateToBudgets?: () => void;
}

const PAYMENT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];
const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  items: propItems,
  categories: propCategories,
  productionOrders: propProductionOrders,
  companySettings: propCompanySettings,
  onNavigateToSales,
  onNavigateToPOS,
  onNavigateToProduction,
  onNavigateToInventory,
  onNavigateToFinance,
  onNavigateToBudgets,
}) => {
  const { currentUser, isAdmin, isSeller } = useAuth();

  // Fallback defaults for safety
  const companySettings = useMemo(() => {
    return propCompanySettings || StorageService.getCompanySettings();
  }, [propCompanySettings]);

  const items = useMemo(() => {
    return propItems || StorageService.getItems();
  }, [propItems]);

  const categories = useMemo(() => {
    return propCategories || StorageService.getCategories();
  }, [propCategories]);

  const productionOrders = useMemo(() => {
    return propProductionOrders || StorageService.getProductionOrders();
  }, [propProductionOrders]);

  // Period and Filter States
  const [period, setPeriod] = useState<DashboardPeriod>('30dias');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState('ALL');
  const [rankingMode, setRankingMode] = useState<'qty' | 'revenue'>('qty');

  // Calculate Date Ranges
  const { startDate, endDate, prevStartDate, prevEndDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let prevStart = new Date();
    let prevEnd = new Date();
    let label = 'Últimos 30 dias';

    switch (period) {
      case 'hoje': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        label = 'Hoje';
        prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      }
      case 'ontem': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        label = 'Ontem';
        prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
        break;
      }
      case '7dias': {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        label = 'Últimos 7 dias';
        prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start.getTime() - 1);
        break;
      }
      case '30dias': {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        label = 'Últimos 30 dias';
        prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start.getTime() - 1);
        break;
      }
      case 'mes': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        label = 'Este Mês';
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'mes_anterior': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'Mês Anterior';
        prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'ano': {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        label = `Ano de ${now.getFullYear()}`;
        prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        if (customStartDate) {
          start = new Date(`${customStartDate}T00:00:00`);
        } else {
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        if (customEndDate) {
          end = new Date(`${customEndDate}T23:59:59`);
        }
        label = `Período: ${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`;
        const duration = end.getTime() - start.getTime();
        prevStart = new Date(start.getTime() - duration);
        prevEnd = new Date(start.getTime() - 1);
        break;
      }
    }

    return { startDate: start, endDate: end, prevStartDate: prevStart, prevEndDate: prevEnd, periodLabel: label };
  }, [period, customStartDate, customEndDate]);

  // List of Unique Sellers
  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      if (s.sellerId && s.sellerName) {
        map.set(s.sellerId, s.sellerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  // Filter Sales for Current Period and Previous Period
  const { currentPeriodSales, previousPeriodSales, canceledSalesInPeriod } = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const prevStartMs = prevStartDate.getTime();
    const prevEndMs = prevEndDate.getTime();

    const curr: Sale[] = [];
    const prev: Sale[] = [];
    const canceled: Sale[] = [];

    sales.forEach((s) => {
      // Check seller filter
      if (selectedSellerFilter !== 'ALL' && s.sellerId !== selectedSellerFilter) {
        return;
      }

      const sTime = new Date(s.createdAt).getTime();

      // Current Period
      if (sTime >= startMs && sTime <= endMs) {
        if (s.paymentStatus === 'CANCELADO' || s.status === 'CANCELADA' || s.status === 'EXCLUIDA' || s.isDeleted) {
          canceled.push(s);
        } else {
          curr.push(s);
        }
      }

      // Previous Period
      if (sTime >= prevStartMs && sTime <= prevEndMs) {
        if (s.paymentStatus !== 'CANCELADO' && s.status !== 'CANCELADA' && s.status !== 'EXCLUIDA' && !s.isDeleted) {
          prev.push(s);
        }
      }
    });

    return {
      currentPeriodSales: curr,
      previousPeriodSales: prev,
      canceledSalesInPeriod: canceled,
    };
  }, [sales, startDate, endDate, prevStartDate, prevEndDate, selectedSellerFilter]);

  // Metric Computations
  const metrics = useMemo(() => {
    // Current period metrics
    const totalRevenue = currentPeriodSales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = currentPeriodSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const totalCardFees = currentPeriodSales.reduce((acc, s) => {
      return (
        acc +
        (s.payments || []).reduce((pAcc, p) => {
          let fee = p.feeAmount || 0;
          if (!fee && p.feePercent && p.feePercent > 0) {
            fee = Number((((p.amount || 0) * p.feePercent) / 100).toFixed(2));
          }
          return pAcc + fee;
        }, 0)
      );
    }, 0);
    const grossProfit = totalRevenue - totalCost - totalCardFees;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const salesCount = currentPeriodSales.length;
    const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
    const totalDiscounts = currentPeriodSales.reduce((acc, s) => acc + (s.discount || 0), 0);
    const totalPaid = currentPeriodSales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
    const totalReceivable = currentPeriodSales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

    // Canceled metrics
    const canceledCount = canceledSalesInPeriod.length;
    const canceledValue = canceledSalesInPeriod.reduce((acc, s) => acc + s.total, 0);

    // Previous period metrics for comparison
    const prevRevenue = previousPeriodSales.reduce((acc, s) => acc + s.total, 0);
    const prevSalesCount = previousPeriodSales.length;
    const prevAverageTicket = prevSalesCount > 0 ? prevRevenue / prevSalesCount : 0;

    // Growth rates
    const revenueGrowth =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    const salesCountGrowth =
      prevSalesCount > 0
        ? ((salesCount - prevSalesCount) / prevSalesCount) * 100
        : salesCount > 0
        ? 100
        : 0;
    const ticketGrowth =
      prevAverageTicket > 0
        ? ((averageTicket - prevAverageTicket) / prevAverageTicket) * 100
        : averageTicket > 0
        ? 100
        : 0;

    // Days in period
    const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = totalRevenue / diffDays;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      salesCount,
      averageTicket,
      totalDiscounts,
      totalPaid,
      totalReceivable,
      canceledCount,
      canceledValue,
      revenueGrowth,
      salesCountGrowth,
      ticketGrowth,
      prevRevenue,
      prevSalesCount,
      dailyAverage,
    };
  }, [currentPeriodSales, previousPeriodSales, canceledSalesInPeriod, startDate, endDate]);

  // Daily/Timeline Sales Chart Data
  const timelineChartData = useMemo(() => {
    const map = new Map<string, { date: string; displayDate: string; faturamento: number; vendas: number; lucro: number }>();

    // Sort current sales chronologically
    const sorted = [...currentPeriodSales].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((sale) => {
      const d = new Date(sale.createdAt);
      const key = d.toISOString().split('T')[0];
      const display = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (!map.has(key)) {
        map.set(key, {
          date: key,
          displayDate: display,
          faturamento: 0,
          vendas: 0,
          lucro: 0,
        });
      }

      const entry = map.get(key)!;
      entry.faturamento += sale.total;
      entry.vendas += 1;
      const saleCardFees = (sale.payments || []).reduce((pAcc, p) => {
        let fee = p.feeAmount || 0;
        if (!fee && p.feePercent && p.feePercent > 0) {
          fee = Number((((p.amount || 0) * p.feePercent) / 100).toFixed(2));
        }
        return pAcc + fee;
      }, 0);
      entry.lucro += sale.total - (sale.totalCost || 0) - saleCardFees;
    });

    return Array.from(map.values());
  }, [currentPeriodSales]);

  // Day of the Week Distribution (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
  const dayOfWeekData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const revenues = [0, 0, 0, 0, 0, 0, 0];

    currentPeriodSales.forEach((s) => {
      const day = new Date(s.createdAt).getDay();
      counts[day] += 1;
      revenues[day] += s.total;
    });

    return [
      { name: 'Seg', vendas: counts[1], faturamento: revenues[1] },
      { name: 'Ter', vendas: counts[2], faturamento: revenues[2] },
      { name: 'Qua', vendas: counts[3], faturamento: revenues[3] },
      { name: 'Qui', vendas: counts[4], faturamento: revenues[4] },
      { name: 'Sex', vendas: counts[5], faturamento: revenues[5] },
      { name: 'Sáb', vendas: counts[6], faturamento: revenues[6] },
      { name: 'Dom', vendas: counts[0], faturamento: revenues[0] },
    ];
  }, [currentPeriodSales]);

  // Payment Methods Breakdown
  const paymentMethodsData = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number }>();

    currentPeriodSales.forEach((sale) => {
      if (sale.payments && sale.payments.length > 0) {
        sale.payments.forEach((p) => {
          const method = p.method || 'Outro';
          if (!map.has(method)) {
            map.set(method, { name: method, amount: 0, count: 0 });
          }
          const entry = map.get(method)!;
          entry.amount += p.amount;
          entry.count += 1;
        });
      } else {
        const method = sale.paymentMethod || 'A Prazo / Outro';
        if (!map.has(method)) {
          map.set(method, { name: method, amount: 0, count: 0 });
        }
        const entry = map.get(method)!;
        entry.amount += sale.total;
        entry.count += 1;
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    const totalPayments = list.reduce((acc, it) => acc + it.amount, 0);

    return list.map((it, idx) => ({
      ...it,
      percent: totalPayments > 0 ? (it.amount / totalPayments) * 100 : 0,
      color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
    }));
  }, [currentPeriodSales]);

  // Sales by Category Breakdown
  const categoriesData = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; qty: number }>();

    // Map item category
    const itemCatMap = new Map<string, string>();
    items.forEach((it) => {
      if (it.categoryId) {
        const cat = categories.find((c) => c.id === it.categoryId);
        if (cat) itemCatMap.set(it.id, cat.name);
      }
    });

    currentPeriodSales.forEach((sale) => {
      sale.items.forEach((it) => {
        let catName = it.categoryName || (it.itemId ? itemCatMap.get(it.itemId) : '') || '';
        if (!catName) {
          if (it.itemType === 'PRODUTO_GRAFICO') catName = 'Gráfica e Impressão';
          else if (it.itemType === 'PRODUTO_FISICO') catName = 'Produtos Físicos';
          else if (it.itemType === 'SERVICO_ONLINE') catName = 'Serviços Online';
          else catName = 'Geral';
        }

        if (!map.has(catName)) {
          map.set(catName, { name: catName, amount: 0, qty: 0 });
        }
        const entry = map.get(catName)!;
        entry.amount += it.totalPrice;
        entry.qty += it.quantity;
      });
    });

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    const total = list.reduce((acc, it) => acc + it.amount, 0);

    return list.map((it, idx) => ({
      ...it,
      percent: total > 0 ? (it.amount / total) * 100 : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [currentPeriodSales, items, categories]);

  // Top Selling Items (by Quantity and by Revenue)
  const { topSellingByQty, topSellingByRevenue } = useMemo(() => {
    const map = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        itemType: string;
        totalQty: number;
        totalRevenue: number;
        totalCost: number;
        ordersCount: number;
      }
    >();

    currentPeriodSales.forEach((sale) => {
      sale.items.forEach((it) => {
        const key = it.itemId || it.itemName;
        if (!map.has(key)) {
          map.set(key, {
            itemId: it.itemId,
            itemName: it.itemName,
            itemType: it.itemType || 'PRODUTO_FISICO',
            totalQty: 0,
            totalRevenue: 0,
            totalCost: 0,
            ordersCount: 0,
          });
        }
        const entry = map.get(key)!;
        entry.totalQty += it.quantity;
        entry.totalRevenue += it.totalPrice;
        entry.totalCost += it.totalCost || 0;
        entry.ordersCount += 1;
      });
    });

    const allItems = Array.from(map.values());
    const byQty = [...allItems].sort((a, b) => b.totalQty - a.totalQty).slice(0, 8);
    const byRev = [...allItems].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 8);

    return { topSellingByQty: byQty, topSellingByRevenue: byRev };
  }, [currentPeriodSales]);

  // Top Customers (who buy the most)
  const topCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone?: string;
        document?: string;
        totalSpent: number;
        ordersCount: number;
        lastOrderDate: string;
      }
    >();

    currentPeriodSales.forEach((sale) => {
      const key = sale.customerId || sale.customerName || 'Cliente Balcão';
      if (!map.has(key)) {
        map.set(key, {
          id: sale.customerId || '',
          name: sale.customerName || 'Cliente Balcão',
          phone: sale.customerPhone,
          document: sale.customerDocument,
          totalSpent: 0,
          ordersCount: 0,
          lastOrderDate: sale.createdAt,
        });
      }
      const entry = map.get(key)!;
      entry.totalSpent += sale.total;
      entry.ordersCount += 1;
      if (new Date(sale.createdAt).getTime() > new Date(entry.lastOrderDate).getTime()) {
        entry.lastOrderDate = sale.createdAt;
      }
    });

    return Array.from(map.values())
      .filter((c) => c.name !== 'Cliente Balcão')
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8);
  }, [currentPeriodSales]);

  // Team Performance Breakdown
  const teamPerformance = useMemo(() => {
    const map = new Map<string, { id: string; name: string; salesCount: number; totalRevenue: number }>();

    currentPeriodSales.forEach((sale) => {
      const sId = sale.sellerId || 'geral';
      const sName = sale.sellerName || 'Atendimento Geral';
      if (!map.has(sId)) {
        map.set(sId, { id: sId, name: sName, salesCount: 0, totalRevenue: 0 });
      }
      const entry = map.get(sId)!;
      entry.salesCount += 1;
      entry.totalRevenue += sale.total;
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [currentPeriodSales]);

  // Production Orders Stats
  const productionStats = useMemo(() => {
    const pending = productionOrders.filter((o) => o.status === 'PENDENTE').length;
    const inProduction = productionOrders.filter((o) => o.status === 'EM_PRODUCAO').length;
    const completed = productionOrders.filter((o) => o.status === 'CONCLUIDO').length;
    const delivered = productionOrders.filter((o) => o.status === 'ENTREGUE').length;
    const total = productionOrders.length;
    return { pending, inProduction, completed, delivered, total };
  }, [productionOrders]);

  // Inventory Alerts Stats
  const inventoryStats = useMemo(() => {
    const physicalItems = items.filter((it) => it.type === 'PRODUTO_FISICO');
    const lowStock = physicalItems.filter((it) => (it.currentStock || 0) > 0 && (it.currentStock || 0) <= (it.minStock || 5));
    const outOfStock = physicalItems.filter((it) => (it.currentStock || 0) <= 0);
    const totalInventoryValue = physicalItems.reduce((acc, it) => acc + (it.currentStock || 0) * (it.costPrice || 0), 0);
    return {
      totalPhysical: physicalItems.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      totalInventoryValue,
      lowStockItems: lowStock.slice(0, 5),
    };
  }, [items]);

  // Recent 6 Sales in Period
  const recentSales = useMemo(() => {
    return [...currentPeriodSales]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [currentPeriodSales]);

  // Handle Export to CSV
  const handleExportDashboardCSV = () => {
    const rows = [
      ['RELATÓRIO EXECUTIVO DE VENDAS - DASHBOARD GERENCIAL'],
      ['Empresa', companySettings.name || 'Remix Comunicação'],
      ['Período', periodLabel],
      ['Data de Geração', new Date().toLocaleString('pt-BR')],
      [],
      ['INDICADORES PRINCIPAIS'],
      ['Faturamento Total (R$)', metrics.totalRevenue.toFixed(2)],
      ['Quantidade de Vendas', metrics.salesCount.toString()],
      ['Ticket Médio (R$)', metrics.averageTicket.toFixed(2)],
      ['Lucro Bruto Estimado (R$)', metrics.grossProfit.toFixed(2)],
      ['Margem de Lucro (%)', metrics.profitMargin.toFixed(1) + '%'],
      ['Descontos Concedidos (R$)', metrics.totalDiscounts.toFixed(2)],
      ['Saldo a Receber / Pendente (R$)', metrics.totalReceivable.toFixed(2)],
      ['Média Diária de Vendas (R$)', metrics.dailyAverage.toFixed(2)],
      ['Vendas Canceladas (Qtd)', metrics.canceledCount.toString()],
      ['Vendas Canceladas (R$)', metrics.canceledValue.toFixed(2)],
      [],
      ['FORMAS DE PAGAMENTO'],
      ['Forma de Pagamento', 'Valor Total (R$)', 'Quantidade', 'Participação (%)'],
      ...paymentMethodsData.map((p) => [
        p.name,
        p.amount.toFixed(2),
        p.count.toString(),
        p.percent.toFixed(1) + '%',
      ]),
      [],
      ['VENDAS POR CATEGORIA'],
      ['Categoria', 'Faturamento (R$)', 'Qtd Itens', 'Participação (%)'],
      ...categoriesData.map((c) => [
        c.name,
        c.amount.toFixed(2),
        c.qty.toString(),
        c.percent.toFixed(1) + '%',
      ]),
      [],
      ['PRODUTOS MAIS VENDIDOS'],
      ['Item / Produto', 'Tipo', 'Qtd Vendida', 'Faturamento (R$)'],
      ...topSellingByQty.map((item) => [
        item.itemName,
        item.itemType,
        item.totalQty.toString(),
        item.totalRevenue.toFixed(2),
      ]),
      [],
      ['PRINCIPAIS CLIENTES'],
      ['Cliente', 'Telefone', 'Total Gasto (R$)', 'Qtd Pedidos', 'Última Compra'],
      ...topCustomers.map((c) => [
        c.name,
        c.phone || '',
        c.totalSpent.toFixed(2),
        c.ordersCount.toString(),
        new Date(c.lastOrderDate).toLocaleDateString('pt-BR'),
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dashboard_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-sales-dashboard" className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Dashboard Gerencial de Vendas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indicadores de faturamento, vendas, ticket médio, produtos, estoque e produção em tempo real.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToPOS && (
            <button
              type="button"
              id="btn-new-sale-pos"
              onClick={onNavigateToPOS}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-100" />
              <span>Novo Pedido (PDV)</span>
            </button>
          )}

          <button
            type="button"
            id="btn-export-dashboard-csv"
            onClick={handleExportDashboardCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Exportar Dados da Dashboard em CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          {onNavigateToSales && (
            <button
              type="button"
              onClick={onNavigateToSales}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Ver Vendas</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: '30dias', label: 'Últimos 30 dias' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'mes_anterior', label: 'Mês Anterior' },
              { id: 'ano', label: 'Este Ano' },
              { id: 'custom', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                id={`btn-period-${p.id}`}
                onClick={() => setPeriod(p.id as DashboardPeriod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Seller / Attendant Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
              Vendedor:
            </label>
            <select
              value={selectedSellerFilter}
              onChange={(e) => setSelectedSellerFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Todos os Vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {period === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600">Intervalo de Datas:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-400 italic">
              (Exibindo vendas e indicadores dentro deste período)
            </span>
          </div>
        )}
      </div>

      {/* Printable / Report Container */}
      <div id="printable-sales-dashboard" className="space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block pb-4 border-b border-slate-300">
          <h2 className="text-xl font-bold uppercase">{companySettings.name || 'Remix Comunicação'}</h2>
          <p className="text-xs text-slate-600">Relatório Executivo de Vendas e Faturamento • {periodLabel}</p>
          <p className="text-[10px] text-slate-500">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {/* 1. TOP CARDS / KEY FINANCIAL METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Faturamento */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Faturamento Total</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(metrics.totalRevenue)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {metrics.revenueGrowth >= 0 ? (
                  <span className="flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{metrics.revenueGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-rose-600">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {metrics.revenueGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-[11px] text-slate-400">vs. período anterior</span>
              </div>
            </div>
          </div>

          {/* Card: Quantidade de Vendas */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Total de Vendas</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">{metrics.salesCount}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {metrics.salesCountGrowth >= 0 ? (
                  <span className="flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{metrics.salesCountGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-rose-600">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {metrics.salesCountGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-[11px] text-slate-400">pedidos emitidos</span>
              </div>
            </div>
          </div>

          {/* Card: Ticket Médio */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Ticket Médio</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(metrics.averageTicket)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {metrics.ticketGrowth >= 0 ? (
                  <span className="flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{metrics.ticketGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-rose-600">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {metrics.ticketGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-[11px] text-slate-400">médio por pedido</span>
              </div>
            </div>
          </div>

          {/* Card: Lucro Bruto & Margem */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Lucro Bruto Estimado</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-indigo-700">{formatCurrency(metrics.grossProfit)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-bold text-indigo-600">
                  {metrics.profitMargin.toFixed(1)}% de margem
                </span>
                <span className="text-[11px] text-slate-400">(faturamento - custos)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SECONDARY CARDS (Descontos, Cancelamentos, A Receber, Média Diária) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Descontos Concedidos */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase">Descontos Concedidos</span>
              <p className="text-lg font-extrabold text-amber-900 mt-0.5">
                {formatCurrency(metrics.totalDiscounts)}
              </p>
            </div>
            <div className="text-right text-[11px] text-amber-700 font-semibold">
              <span>Impacto: </span>
              <strong>
                {metrics.totalRevenue > 0
                  ? ((metrics.totalDiscounts / (metrics.totalRevenue + metrics.totalDiscounts)) * 100).toFixed(1)
                  : 0}
                %
              </strong>
            </div>
          </div>

          {/* Saldo a Receber / Pendente */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase">Saldo a Receber (A Prazo)</span>
              <p className="text-lg font-extrabold text-blue-900 mt-0.5">
                {formatCurrency(metrics.totalReceivable)}
              </p>
            </div>
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>

          {/* Média Diária */}
          <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-teal-800 uppercase">Média Diária</span>
              <p className="text-lg font-extrabold text-teal-900 mt-0.5">
                {formatCurrency(metrics.dailyAverage)}
              </p>
            </div>
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>

          {/* Vendas Canceladas */}
          <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase">Cancelamentos no Período</span>
              <p className="text-lg font-extrabold text-rose-900 mt-0.5">
                {metrics.canceledCount} ({formatCurrency(metrics.canceledValue)})
              </p>
            </div>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        {/* 3. CHARTS SECTION: Evolução das Vendas + Formas de Pagamento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales & Revenue Timeline Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Evolução do Faturamento e Lucro Diário
                </h4>
                <p className="text-xs text-slate-500">Histórico de faturamento e margem bruta registrada no período</p>
              </div>
            </div>

            {timelineChartData.length > 0 ? (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        if (name === 'faturamento') return [formatCurrency(Number(value)), 'Faturamento'];
                        if (name === 'lucro') return [formatCurrency(Number(value)), 'Lucro Bruto'];
                        if (name === 'vendas') return [`${value} vendas`, 'Qtd de Vendas'];
                        return [value, name];
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorFaturamento)"
                      name="faturamento"
                    />
                    <Area
                      type="monotone"
                      dataKey="lucro"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLucro)"
                      name="lucro"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhuma venda registrada no período selecionado.
              </div>
            )}
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Formas de Pagamento
              </h4>
              <p className="text-xs text-slate-500">Distribuição percentual e receita por modalidade</p>
            </div>

            {paymentMethodsData.length > 0 ? (
              <div className="space-y-4">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val))}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {paymentMethodsData.map((item) => (
                    <div key={item.name} className="pt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                        <span className="text-[10px] text-slate-400 block">{item.percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Sem recebimentos registrados no período.
              </div>
            )}
          </div>
        </div>

        {/* 4. SECOND ROW OF CHARTS: Vendas por Categoria & Vendas por Dia da Semana */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categorias / Mix de Produtos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Vendas por Categoria e Mix de Produtos
              </h4>
              <p className="text-xs text-slate-500">Participação de cada grupo de produtos no faturamento</p>
            </div>

            {categoriesData.length > 0 ? (
              <div className="space-y-3">
                {categoriesData.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">{cat.name}</span>
                      <span className="text-slate-900 font-bold">
                        {formatCurrency(cat.amount)} ({cat.percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhuma categoria registrada no período.
              </div>
            )}
          </div>

          {/* Dia da Semana (Fluxo Semanal) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Distribuição de Vendas por Dia da Semana
              </h4>
              <p className="text-xs text-slate-500">Volume de pedidos e faturamento por dia útil e final de semana</p>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => {
                      if (name === 'faturamento') return [formatCurrency(Number(val)), 'Faturamento'];
                      return [`${val} pedidos`, 'Vendas'];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="faturamento" fill="#0d9488" radius={[4, 4, 0, 0]} name="faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 5. OPERATIONAL PANELS: Produção Gráfica e Alertas de Estoque */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status da Produção Gráfica */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Status da Produção Gráfica
                </h4>
                <p className="text-xs text-slate-500">Ordens de produção gráfica em andamento e prazos</p>
              </div>

              {onNavigateToProduction && (
                <button
                  type="button"
                  onClick={onNavigateToProduction}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Produção</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-amber-900 block">{productionStats.pending}</span>
                <span className="text-[10px] font-bold uppercase text-amber-700">Fila Pendente</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-blue-900 block">{productionStats.inProduction}</span>
                <span className="text-[10px] font-bold uppercase text-blue-700">Em Produção</span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-indigo-900 block">{productionStats.completed}</span>
                <span className="text-[10px] font-bold uppercase text-indigo-700">Concluído</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-emerald-900 block">{productionStats.delivered}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-700">Entregues</span>
              </div>
            </div>
          </div>

          {/* Alertas de Estoque */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-600" />
                  Saúde e Alertas de Estoque
                </h4>
                <p className="text-xs text-slate-500">Itens físicos necessitando reposição ou com estoque crítico</p>
              </div>

              {onNavigateToInventory && (
                <button
                  type="button"
                  onClick={onNavigateToInventory}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver Estoque</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-rose-900 block">{inventoryStats.outOfStockCount}</span>
                <span className="text-[10px] font-bold uppercase text-rose-700">Esgotados (0 un)</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <span className="text-xl font-extrabold text-amber-900 block">{inventoryStats.lowStockCount}</span>
                <span className="text-[10px] font-bold uppercase text-amber-700">Estoque Baixo</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-sm font-extrabold text-slate-900 block mt-1">
                  {formatCurrency(inventoryStats.totalInventoryValue)}
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-600">Valor Investido</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. RANKINGS & TOP PERFORMERS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Items (Produtos Mais Vendidos) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Itens e Produtos Mais Vendidos
                </h4>
                <p className="text-xs text-slate-500">Ranking dos produtos líderes no período selecionado</p>
              </div>

              {/* Mode toggle: By Qty vs By Revenue */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setRankingMode('qty')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    rankingMode === 'qty' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Por Qtd
                </button>
                <button
                  type="button"
                  onClick={() => setRankingMode('revenue')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    rankingMode === 'revenue' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Por Receita
                </button>
              </div>
            </div>

            {(rankingMode === 'qty' ? topSellingByQty : topSellingByRevenue).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item / Produto</th>
                      <th className="py-2.5 px-2 text-center">Tipo</th>
                      <th className="py-2.5 px-2 text-right">Qtd Vendida</th>
                      <th className="py-2.5 px-3 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(rankingMode === 'qty' ? topSellingByQty : topSellingByRevenue).map((item, idx) => (
                      <tr key={item.itemId || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[200px]">
                          <span className="text-slate-400 font-mono text-[10px] mr-1.5">#{idx + 1}</span>
                          {item.itemName}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {item.itemType === 'PRODUTO_GRAFICO'
                              ? 'Gráfico'
                              : item.itemType === 'PRODUTO_FISICO'
                              ? 'Físico'
                              : 'Serviço'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-blue-700">
                          {item.totalQty} un
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhum item vendido no período selecionado.
              </div>
            )}
          </div>

          {/* Top Customers (Principais Clientes) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  Principais Clientes (Maior Faturamento)
                </h4>
                <p className="text-xs text-slate-500">Clientes com maior volume acumulado de compras</p>
              </div>
            </div>

            {topCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-2 text-center">Pedidos</th>
                      <th className="py-2.5 px-2 text-center">Última Compra</th>
                      <th className="py-2.5 px-3 text-right">Total Gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topCustomers.map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <span className="text-slate-400 font-mono text-[10px] mr-1.5">#{idx + 1}</span>
                          {c.name}
                          {c.phone && <span className="text-[10px] text-slate-400 block">{c.phone}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                          {c.ordersCount}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500 text-[11px]">
                          {new Date(c.lastOrderDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                          {formatCurrency(c.totalSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhum cliente identificado no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* 7. VENDEDORES / ATENDENTES PERFORMANCE & ÚLTIMAS VENDAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Desempenho da Equipe de Vendas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Desempenho da Equipe e Vendedores
            </h4>
            <p className="text-xs text-slate-500">Participação de cada atendente e vendedor no faturamento</p>

            {teamPerformance.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {teamPerformance.map((seller) => (
                  <div key={seller.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-xs font-bold text-slate-900 block truncate">{seller.name}</span>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">{seller.salesCount} vendas</span>
                      <span className="font-bold text-blue-700">{formatCurrency(seller.totalRevenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhuma venda associada no período.
              </div>
            )}
          </div>

          {/* Últimas Vendas do Período */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Últimos Pedidos Registrados
                </h4>
                <p className="text-xs text-slate-500">Transações mais recentes no período</p>
              </div>

              {onNavigateToSales && (
                <button
                  type="button"
                  onClick={onNavigateToSales}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {recentSales.length > 0 ? (
              <div className="space-y-2">
                {recentSales.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{s.customerName || 'Cliente Balcão'}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                        {s.items?.map((it) => it.itemName).join(', ') || 'Pedido sem itens'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block">{formatCurrency(s.total)}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                          s.paymentStatus === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.paymentStatus === 'PENDENTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.paymentStatus || 'Concluído'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                Nenhum pedido no período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

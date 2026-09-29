import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Percent,
  Printer,
  Receipt,
  Search,
  Shield,
  TrendingUp,
  UserCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings, Sale, User } from '../../types';
import {
  CommissionPeriodFilter,
  aggregateCommissionsBySeller,
  calculateSaleCommission,
  filterSalesByPeriod,
} from '../../utils/commissions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { POSReceiptModal } from '../pos/POSReceiptModal';
import { CommissionStatementModal } from './CommissionStatementModal';
import { downloadOrderReceiptPDF } from '../../utils/pdfReceipt';
import { StorageService } from '../../services/storage';

interface CommissionsViewProps {
  sales: Sale[];
  companySettings: CompanySettings;
  onNavigateToPOS?: () => void;
  onNavigateToSettings?: () => void;
}

export const CommissionsView: React.FC<CommissionsViewProps> = ({
  sales,
  companySettings,
  onNavigateToPOS,
  onNavigateToSettings,
}) => {
  const { currentUser, users, isAdmin } = useAuth();

  // Filters
  const [period, setPeriod] = useState<CommissionPeriodFilter>('mes_atual');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Selected Seller Filter: If Vendedor, locked to current user id. If Admin, 'TODOS' or specific seller
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    isAdmin ? 'TODOS' : currentUser.id
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Seller for Drill-down / Detailed Statement modal
  const [drillDownSellerId, setDrillDownSellerId] = useState<string | null>(
    !isAdmin ? currentUser.id : null
  );
  const [statementSeller, setStatementSeller] = useState<User | null>(null);

  // Receipt Modal
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // 1. Filter sales by Period
  const periodFilteredSales = useMemo(() => {
    return filterSalesByPeriod(sales, period, customStartDate, customEndDate);
  }, [sales, period, customStartDate, customEndDate]);

  // 2. Aggregate stats by Seller (Using all period filtered sales)
  const aggregation = useMemo(() => {
    return aggregateCommissionsBySeller(periodFilteredSales, users);
  }, [periodFilteredSales, users]);

  // 3. Filter sales based on Seller selection and Search
  const displaySales = useMemo(() => {
    const effectiveSellerId = !isAdmin ? currentUser.id : selectedSellerId;

    return periodFilteredSales.filter((sale) => {
      // Exclude canceled sales from commission view by default
      if (sale.status === 'CANCELADA' || sale.paymentStatus === 'CANCELADO') {
        return false;
      }

      const matchSeller =
        effectiveSellerId === 'TODOS' || sale.sellerId === effectiveSellerId;

      const q = (searchTerm || '').toLowerCase();
      const matchSearch =
        String(sale.saleNumber || '').toLowerCase().includes(q) ||
        String(sale.customerName || '').toLowerCase().includes(q) ||
        String(sale.sellerName || '').toLowerCase().includes(q) ||
        Boolean(sale.notes && String(sale.notes).toLowerCase().includes(q));

      return matchSeller && matchSearch;
    });
  }, [periodFilteredSales, isAdmin, currentUser.id, selectedSellerId, searchTerm]);

  // Filtered seller summaries for Admin table
  const filteredSummaries = useMemo(() => {
    if (!isAdmin) {
      return aggregation.summaries.filter((s) => s.sellerId === currentUser.id);
    }
    if (selectedSellerId === 'TODOS') {
      return aggregation.summaries;
    }
    return aggregation.summaries.filter((s) => s.sellerId === selectedSellerId);
  }, [aggregation.summaries, isAdmin, currentUser.id, selectedSellerId]);

  // Vendedor specific metrics
  const sellerSpecificMetrics = useMemo(() => {
    const summary = aggregation.summaries.find(
      (s) => s.sellerId === (!isAdmin ? currentUser.id : selectedSellerId)
    );
    return (
      summary || {
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        salesCount: 0,
        totalSold: 0,
        companyShare: 0,
        sellerCommission: 0,
        averageCommissionPercent: 50,
        sales: [],
      }
    );
  }, [aggregation.summaries, isAdmin, currentUser, selectedSellerId]);

  const activeDrillDownSummary = useMemo(() => {
    if (!drillDownSellerId) return null;
    return aggregation.summaries.find((s) => s.sellerId === drillDownSellerId) || null;
  }, [aggregation.summaries, drillDownSellerId]);

  const handleOpenStatement = (sellerId: string) => {
    const user = users.find((u) => u.id === sellerId) || {
      id: sellerId,
      name: 'Vendedor',
      email: '',
      role: 'VENDEDOR',
    };
    setStatementSeller(user);
  };

  const getPeriodLabel = (p: CommissionPeriodFilter) => {
    switch (p) {
      case 'hoje':
        return 'Hoje';
      case 'ontem':
        return 'Ontem';
      case 'ultimos_7_dias':
        return 'Últimos 7 dias';
      case 'ultimos_30_dias':
        return 'Últimos 30 dias';
      case 'mes_atual':
        return 'Mês Atual';
      case 'mes_anterior':
        return 'Mês Anterior';
      case 'personalizado':
        return 'Período Personalizado';
      default:
        return p;
    }
  };

  return (
    <div id="commissions-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Percent className="w-6 h-6 text-emerald-600" />
              <span>Gestão e Relatório de Comissões</span>
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Taxas Ativas: Gráfico ({companySettings.commissionRates?.PRODUTO_GRAFICO ?? 10}%) • Físico ({companySettings.commissionRates?.PRODUTO_FISICO ?? 5}%) • Digital ({companySettings.commissionRates?.SERVICO ?? 15}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo automatizado por tipo de item sobre o valor final faturado de cada pedido.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && onNavigateToSettings && (
            <button
              type="button"
              id="btn-configure-commission-rates"
              onClick={onNavigateToSettings}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
              title="Configurar porcentagens de comissão por tipo de item"
            >
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Configurar Porcentagens</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              id="btn-open-all-statement"
              onClick={() => {
                const targetId = selectedSellerId !== 'TODOS' ? selectedSellerId : users[0]?.id;
                if (targetId) handleOpenStatement(targetId);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Extrato para Pagamento</span>
            </button>
          )}

          {!isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenStatement(currentUser.id)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Meu Extrato</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Notice if Vendedor */}
      {!isAdmin && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Você está conectado como <strong>{currentUser.name}</strong>. Exibindo exclusivamente o seu histórico e suas comissões a receber.
            </span>
          </div>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 uppercase">
            Acesso Restrito ao Vendedor
          </span>
        </div>
      )}

      {/* Admin Executive Dashboard Summary Cards */}
      {isAdmin && selectedSellerId === 'TODOS' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sold in Period */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Faturado</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(aggregation.totalSoldAll)}
            </p>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {aggregation.totalSalesCount} venda(s) ativas no período
            </span>
          </div>

          {/* Card 2: Total Sellers Commission */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Comissões a Pagar</span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(aggregation.totalCommissionAll)}
            </p>
            <span className="text-[10px] text-emerald-700/80 font-semibold block">
              {aggregation.totalSoldAll > 0
                ? `${((aggregation.totalCommissionAll / aggregation.totalSoldAll) * 100).toFixed(1)}% do faturamento total`
                : '50% média prevista'}
            </span>
          </div>

          {/* Card 3: Total Company Share */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Parte da Empresa</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(aggregation.totalCompanyAll)}
            </p>
            <span className="text-[10px] text-slate-400 font-semibold block">
              Saldo retido para a empresa
            </span>
          </div>

          {/* Card 4: Top Seller */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Top Vendedor</span>
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">
              {aggregation.topSellerByVolume?.sellerName || 'Nenhum no período'}
            </p>
            <span className="text-xs font-bold text-emerald-600 block">
              {aggregation.topSellerByVolume
                ? `${formatCurrency(aggregation.topSellerByVolume.totalSold)} (${formatCurrency(
                    aggregation.topSellerByVolume.sellerCommission
                  )} comissão)`
                : 'Sem vendas'}
            </span>
          </div>
        </div>
      ) : (
        /* Single Seller Focus Cards */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Vendas Realizadas</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(sellerSpecificMetrics.totalSold)}
            </p>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {sellerSpecificMetrics.salesCount} pedido(s) faturados
            </span>
          </div>

          <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Sua Comissão Total</span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(sellerSpecificMetrics.sellerCommission)}
            </p>
            <span className="text-[10px] text-emerald-700/80 font-semibold block">
              Taxa efetiva: {sellerSpecificMetrics.averageCommissionPercent.toFixed(1)}%
            </span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Parte da Empresa</span>
              <TrendingUp className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(sellerSpecificMetrics.companyShare)}
            </p>
            <span className="text-[10px] text-slate-400 font-semibold block">
              Repasse operacional
            </span>
          </div>
        </div>
      )}

      {/* Filter Toolbar: Period Buttons, Custom Date, and Seller Selector */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          {/* Period Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Período:
            </span>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: 'ultimos_7_dias', label: '7 Dias' },
              { id: 'ultimos_30_dias', label: '30 Dias' },
              { id: 'mes_atual', label: 'Mês Atual' },
              { id: 'mes_anterior', label: 'Mês Anterior' },
              { id: 'personalizado', label: 'Personalizado' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`filter-period-${tab.id}`}
                onClick={() => setPeriod(tab.id as CommissionPeriodFilter)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  period === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Seller Filter (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Vendedor:
              </span>
              <select
                id="select-filter-seller"
                value={selectedSellerId}
                onChange={(e) => {
                  setSelectedSellerId(e.target.value);
                  setDrillDownSellerId(e.target.value === 'TODOS' ? null : e.target.value);
                }}
                className="px-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-bold focus:border-blue-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Vendedores ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Custom Date Pickers if 'personalizado' */}
        {period === 'personalizado' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-600">Intervalo de Datas:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: CONSOLIDATED SELLERS SUMMARY TABLE (ADMIN ONLY) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Resumo Consolidado por Vendedor ({getPeriodLabel(period)})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Clique em &quot;Ver Detalhes&quot; para abrir o extrato individual
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-3 text-center">Vendas Concluídas</th>
                  <th className="py-3 px-3">Total Faturado</th>
                  <th className="py-3 px-3">Parte da Empresa (50%)</th>
                  <th className="py-3 px-3">Comissão do Vendedor</th>
                  <th className="py-3 px-3 text-center">Taxa Média</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSummaries.length > 0 ? (
                  filteredSummaries.map((sum) => {
                    const userObj = users.find((u) => u.id === sum.sellerId);
                    const isSelected = drillDownSellerId === sum.sellerId;

                    return (
                      <tr
                        key={sum.sellerId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                userObj?.avatarUrl ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={sum.sellerName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{sum.sellerName}</p>
                              <span className="text-[10px] text-slate-400">
                                ID: {sum.sellerId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {sum.salesCount}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900">
                          {formatCurrency(sum.totalSold)}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-700">
                          {formatCurrency(sum.companyShare)}
                        </td>

                        <td className="py-3 px-3 font-bold text-emerald-600">
                          {formatCurrency(sum.sellerCommission)}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
                            {sum.averageCommissionPercent.toFixed(1)}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDrillDownSellerId(
                                  drillDownSellerId === sum.sellerId ? null : sum.sellerId
                                );
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isSelected ? 'Ocultar Vendas' : 'Ver Vendas'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenStatement(sum.sellerId)}
                              title="Extrato de Pagamento"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhum vendedor encontrado.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Consolidated Footer Totals (57.6) */}
              {filteredSummaries.length > 0 && (
                <tfoot className="bg-slate-100/70 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                  <tr>
                    <td className="py-3.5 px-4 uppercase text-[11px] text-slate-600">
                      Total Consolidado
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {filteredSummaries.reduce((a, b) => a + b.salesCount, 0)}
                    </td>
                    <td className="py-3.5 px-3 text-blue-700">
                      {formatCurrency(filteredSummaries.reduce((a, b) => a + b.totalSold, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-slate-800">
                      {formatCurrency(filteredSummaries.reduce((a, b) => a + b.companyShare, 0))}
                    </td>
                    <td className="py-3.5 px-3 text-emerald-700">
                      {formatCurrency(
                        filteredSummaries.reduce((a, b) => a + b.sellerCommission, 0)
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-500 font-mono">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-normal text-[11px]">
                      {filteredSummaries.length} vendedor(es)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: DETAILED SALES DRILL-DOWN TABLE (57.7) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {drillDownSellerId && activeDrillDownSummary
                ? `Vendas Detalhadas: ${activeDrillDownSummary.sellerName} (${activeDrillDownSummary.salesCount} vendas)`
                : !isAdmin
                ? `Minhas Vendas e Comissões (${displaySales.length} vendas)`
                : `Detalhamento de Todas as Vendas (${displaySales.length} vendas)`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search in Detailed table */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, pedido..."
                className="pl-7 pr-3 py-1 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {drillDownSellerId && isAdmin && (
              <button
                type="button"
                onClick={() => setDrillDownSellerId(null)}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Pedido e Data</th>
                <th className="py-3 px-3">Cliente</th>
                {isAdmin && <th className="py-3 px-3">Vendedor</th>}
                <th className="py-3 px-3">Itens do Pedido</th>
                <th className="py-3 px-3">Total da Venda</th>
                <th className="py-3 px-3">Status Pagamento</th>
                <th className="py-3 px-3">Comissão Calculada</th>
                <th className="py-3 px-3">Parte da Empresa</th>
                <th className="py-3 px-4 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displaySales.length > 0 ? (
                displaySales.map((sale) => {
                  const comm = calculateSaleCommission(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {sale.saleNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                          {formatDateTime(sale.createdAt)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 break-words whitespace-normal leading-snug">{sale.customerName}</p>
                        {sale.customerPhone && (
                          <span className="text-[10px] text-slate-400 block">
                            {sale.customerPhone}
                          </span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-3 font-semibold text-slate-700 break-words whitespace-normal">
                          {sale.sellerName}
                        </td>
                      )}

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {(sale.items || []).map((i, idx) => {
                            const isAcc =
                              i.commissionRate === 30 ||
                              i.itemType === 'PRODUTO_FISICO' ||
                              Boolean(i.sku && i.sku.startsWith('FIS-'));
                            const itemName = i.itemName || (i as any)?.name || 'Item';
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-[11px] text-slate-700 flex-wrap"
                              >
                                <span className="font-medium break-words whitespace-normal leading-tight">
                                  {i.quantity}x {itemName}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1 rounded shrink-0 ${
                                    isAcc
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                  title={
                                    isAcc
                                      ? 'Acessórios/Eletrônicos (30% de comissão)'
                                      : 'Padrão (50% de comissão)'
                                  }
                                >
                                  {isAcc ? '30%' : '50%'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(sale.total)}
                      </td>

                      <td className="py-3 px-3">
                        {sale.paymentStatus === 'PAGO' ? (
                          <Badge variant="success" size="sm">
                            Pago
                          </Badge>
                        ) : sale.paymentStatus === 'PARCIALMENTE_PAGO' ? (
                          <Badge variant="warning" size="sm">
                            Parcial
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            Pendente
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-600">
                        {formatCurrency(comm.commissionAmount)}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-700">
                        {formatCurrency(comm.companyAmount)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cust = sale.customerId ? StorageService.getCustomerById(sale.customerId) : undefined;
                              downloadOrderReceiptPDF(sale, companySettings, cust?.address);
                            }}
                            title="Baixar Recibo em PDF (sem impostos)"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptSale(sale)}
                            title="Visualizar Recibo / Cupom da Venda"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 9 : 8}
                    className="py-12 text-center text-slate-400"
                  >
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer for detailed sales */}
            {displaySales.length > 0 && (
              <tfoot className="bg-slate-100/70 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                <tr>
                  <td className="py-3.5 px-4 uppercase text-[11px] text-slate-600">
                    Total ({displaySales.length} vendas)
                  </td>
                  <td className="py-3.5 px-3" colSpan={isAdmin ? 3 : 2}></td>
                  <td className="py-3.5 px-3 text-blue-700">
                    {formatCurrency(displaySales.reduce((a, b) => a + b.total, 0))}
                  </td>
                  <td className="py-3.5 px-3"></td>
                  <td className="py-3.5 px-3 text-emerald-700">
                    {formatCurrency(
                      displaySales.reduce(
                        (a, b) => a + calculateSaleCommission(b).commissionAmount,
                        0
                      )
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-800">
                    {formatCurrency(
                      displaySales.reduce(
                        (a, b) => a + calculateSaleCommission(b).companyAmount,
                        0
                      )
                    )}
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Statement Modal for Print / Payment Settlement */}
      {statementSeller && (
        <CommissionStatementModal
          isOpen={!!statementSeller}
          onClose={() => setStatementSeller(null)}
          seller={statementSeller}
          period={period}
          periodLabel={getPeriodLabel(period)}
          sales={periodFilteredSales.filter(
            (s) =>
              s.sellerId === statementSeller.id &&
              s.status !== 'CANCELADA' &&
              s.paymentStatus !== 'CANCELADO'
          )}
          companySettings={companySettings}
        />
      )}

      {/* POS Receipt Modal */}
      {selectedReceiptSale && (
        <POSReceiptModal
          isOpen={!!selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
          sale={selectedReceiptSale}
          companySettings={companySettings}
        />
      )}
    </div>
  );
};

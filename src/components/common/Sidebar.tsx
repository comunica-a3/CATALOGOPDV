import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Flame,
  Globe,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingProdCount?: number;
  pendingProductionCount?: number;
  lowStockCount?: number;
  pendingReceivablesCount?: number;
  prospectingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingProdCount = 0,
  pendingProductionCount = 0,
  lowStockCount = 0,
  pendingReceivablesCount = 0,
  prospectingCount = 0,
}) => {
  const { isAdmin, isCollaborator, isSeller, isPromotor, canViewFinancialReports, canManageStock } = useAuth();
  const actualProdCount = pendingProdCount || pendingProductionCount;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Vendas',
      description: 'Indicadores e faturamento',
      icon: TrendingUp,
      color: 'text-blue-700',
      allowed: !isPromotor && (isAdmin || canViewFinancialReports),
    },
    {
      id: 'prospecting',
      label: 'Captação Ativa',
      description: 'Prospecção e funil de vendas',
      icon: Target,
      color: 'text-rose-600',
      badge: prospectingCount > 0 ? prospectingCount : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      allowed: true,
    },
    {
      id: 'budgets',
      label: 'Orçamentos',
      description: isPromotor ? 'Criar e acompanhar propostas' : 'Propostas e conversão',
      icon: FileText,
      color: 'text-sky-600',
    },
    {
      id: 'customers',
      label: 'Clientes',
      description: isPromotor ? 'Meus clientes e cadastros' : 'Cadastro PF/PJ e contatos',
      icon: Users,
      color: 'text-teal-600',
    },
    {
      id: 'items',
      label: 'Itens e Produtos',
      description: 'Gráficos, físicos e serviços',
      icon: Boxes,
      color: 'text-indigo-600',
    },
    {
      id: 'documents',
      label: 'Documentos e Modelos',
      description: 'Currículos, contratos e certidões',
      icon: FileEdit,
      color: 'text-violet-600',
      allowed: !isPromotor,
    },
    {
      id: 'production',
      label: 'Produção Gráfica',
      description: 'Ordens, prazos e arquivos',
      icon: ClipboardList,
      color: 'text-amber-600',
      badge: actualProdCount > 0 ? actualProdCount : undefined,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      allowed: true,
    },
    {
      id: 'inventory',
      label: 'Estoque',
      description: 'Produtos físicos e posições',
      icon: Package,
      color: 'text-emerald-600',
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      allowed: !isPromotor && (canManageStock || isAdmin || isCollaborator),
    },
    {
      id: 'sales',
      label: isPromotor ? 'Minhas Vendas' : 'Faturamento e Vendas',
      description: isPromotor ? 'Vendas dos meus orçamentos' : 'Consultas e baixas financeiras',
      icon: FileSpreadsheet,
      color: 'text-purple-600',
      badge: pendingReceivablesCount > 0 && !isPromotor ? pendingReceivablesCount : undefined,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'finance',
      label: 'Financeiro e Caixa',
      description: 'Caixa, contas e taxas de cartão',
      icon: DollarSign,
      color: 'text-emerald-600',
      allowed: !isPromotor && (canViewFinancialReports || isAdmin),
    },
    {
      id: 'commissions',
      label: isPromotor ? 'Minhas Comissões' : 'Comissões e Relatórios',
      description: isPromotor ? 'Ganhos por indicação' : 'Repasses e demonstrativos',
      icon: Percent,
      color: 'text-blue-600',
      allowed: true,
    },
    {
      id: 'settings',
      label: 'Configurações',
      description: 'Empresa, pagamentos e categorias',
      icon: Settings,
      color: 'text-slate-600',
      allowed: isAdmin,
    },
  ];

  return (
    <aside
      id="main-app-sidebar"
      className="w-64 shrink-0 bg-white border border-slate-200 p-3 hidden lg:flex flex-col justify-between rounded-xl shadow-xs select-none"
    >
      <div className="space-y-1">
        {/* Header with Title */}
        <div className="px-2.5 py-1.5 mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Menu Principal
          </p>
        </div>

        {navItems.map((item) => {
          if (item.allowed === false) {
            return null;
          }

          const isActive = currentView === item.id || (item.id === 'pdv' && currentView === 'pos');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-1.5 rounded-md shrink-0 transition-colors ${
                    isActive ? 'bg-blue-100/70 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-blue-700' : item.color}`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs truncate">{item.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};



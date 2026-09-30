import {
  Boxes,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingProdCount?: number;
  prospectingCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onNavigate,
  pendingProdCount = 0,
  prospectingCount = 0,
}) => {
  const { isAdmin, isCollaborator, isSeller, isPromotor, canViewFinancialReports, canManageStock } = useAuth();

  const navItems = [
    ...(!isPromotor && (canViewFinancialReports || isAdmin)
      ? [{ id: 'dashboard', label: 'Dashboard', icon: TrendingUp }]
      : []),
    { id: 'prospecting', label: 'Captação', icon: Target, badge: prospectingCount },
    ...(!isPromotor ? [{ id: 'pdv_facil', label: 'PDV Fácil', icon: Zap }] : []),
    ...(!isPromotor ? [{ id: 'pdv', label: 'PDV', icon: ShoppingBag }] : []),
    { id: 'budgets', label: 'Orçamentos', icon: FileText },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'items', label: 'Itens', icon: Boxes },
    ...(!isPromotor ? [{ id: 'documents', label: 'Docs', icon: FileEdit }] : []),
    ...(!isPromotor && (!isSeller || isAdmin || isCollaborator)
      ? [{ id: 'production', label: 'Produção', icon: ClipboardList, badge: pendingProdCount }]
      : []),
    ...(!isPromotor && (canManageStock || isAdmin || isCollaborator)
      ? [{ id: 'inventory', label: 'Estoque', icon: Package }]
      : []),
    { id: 'sales', label: isPromotor ? 'Minhas Vendas' : 'Vendas', icon: CreditCard },
    ...(!isPromotor && (canViewFinancialReports || isAdmin)
      ? [{ id: 'finance', label: 'Caixa', icon: DollarSign }]
      : []),
    { id: 'commissions', label: isPromotor ? 'Minhas Comissões' : 'Comissão', icon: Percent },
    { id: 'catalog', label: 'Catálogo', icon: Store },
    ...(isAdmin ? [{ id: 'settings', label: 'Ajustes', icon: Settings }] : []),
  ];

  return (
    <nav
      id="mobile-navigation-bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg flex items-center justify-around overflow-x-auto select-none"
    >
      {navItems.map((item) => {
        const isActive = currentView === item.id || (item.id === 'pdv' && currentView === 'pos');
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            id={`mobile-nav-${item.id}`}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-lg text-[10px] font-semibold min-w-[52px] transition-colors cursor-pointer ${
              isActive
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500"></span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

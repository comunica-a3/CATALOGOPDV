import React, { useCallback, useEffect, useState } from 'react';
import { AdminLoginView } from './components/auth/AdminLoginView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { BudgetsView } from './components/budgets/BudgetsView';
import { PublicCatalogView } from './components/catalog/PublicCatalogView';
import { CommissionsView } from './components/commissions/CommissionsView';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { Sidebar } from './components/common/Sidebar';
import { CustomersView } from './components/customers/CustomersView';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentsView } from './components/documents/DocumentsView';
import { FinanceView } from './components/finance/FinanceView';
import { InventoryView } from './components/inventory/InventoryView';
import { ItemList } from './components/items/ItemList';
import { POSFacil } from './components/pos/POSFacil';
import { POSView } from './components/pos/POSView';
import { ProductionView } from './components/production/ProductionView';
import { ProspectingView } from './components/prospecting/ProspectingView';
import { PublicQuoteFormView } from './components/prospecting/PublicQuoteFormView';
import { PublicSegmentLandingView } from './components/prospecting/PublicSegmentLandingView';
import { SalesView } from './components/sales/SalesView';
import { SettingsTab, SettingsView } from './components/settings/SettingsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storage';
import { initRealtimeSync } from './services/realtimeSync';
import {
  Category,
  CompanySettings,
  Customer,
  InventoryMovement,
  Item,
  Opportunity,
  ProductionOrder,
  Sale,
} from './types';

type AppView =
  | 'login'
  | 'catalog'
  | 'public_quote'
  | 'public_segment'
  | 'dashboard'
  | 'prospecting'
  | 'pdv'
  | 'pdv_facil'
  | 'pdv-facil'
  | 'budgets'
  | 'customers'
  | 'items'
  | 'documents'
  | 'production'
  | 'inventory'
  | 'sales'
  | 'finance'
  | 'commissions'
  | 'settings'
  | 'logout';

function MainApp() {
  const { isAuthenticated, mustChangePassword, logout, isAdmin, isSeller, canViewFinancialReports, canManageStock } = useAuth();
  
  // URL search params check
  const [selectedSegmentSlug, setSelectedSegmentSlug] = useState<string>('todos');

  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('view');
      if (v === 'orcamento' || v === 'quote') return 'public_quote';
      if (v === 'solucoes' || v === 'segmento') return 'public_segment';
    }
    return isAuthenticated ? 'pdv' : 'catalog';
  });

  const [settingsTab, setSettingsTab] = useState<SettingsTab>('usuarios');
  const isPdvView = currentView === 'pdv' || currentView === 'pos' || currentView === 'pdv_facil' || currentView === 'pdv-facil';

  // Manual visibility override for current session/view
  const [sidebarVisibilityOverride, setSidebarVisibilityOverride] = useState<boolean | null>(null);

  // Stored preference for general views (default to true)
  const [userPrefersSidebarVisible, setUserPrefersSidebarVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdv_sidebar_visible');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return true;
  });

  const showSidebar =
    sidebarVisibilityOverride !== null
      ? sidebarVisibilityOverride
      : isPdvView
      ? false
      : userPrefersSidebarVisible;

  const toggleSidebar = () => {
    const nextState = !showSidebar;
    setSidebarVisibilityOverride(nextState);
    if (!isPdvView && typeof window !== 'undefined') {
      localStorage.setItem('pdv_sidebar_visible', String(nextState));
      setUserPrefersSidebarVisible(nextState);
    }
  };

  useEffect(() => {
    setSidebarVisibilityOverride(null);
  }, [currentView]);

  // Application Data States loaded from StorageService
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(
    StorageService.getCompanySettings()
  );

  // Sync state from storage
  const loadAllData = useCallback(() => {
    setItems(StorageService.getItems());
    setCategories(StorageService.getCategories());
    setSales(StorageService.getSales());
    setProductionOrders(StorageService.getProductionOrders());
    setInventoryMovements(StorageService.getInventoryMovements());
    setOpportunities(StorageService.getOpportunities());
    setCompanySettings(StorageService.getCompanySettings());
  }, []);

  useEffect(() => {
    loadAllData();
    // Initial sync from central SQLite database server
    StorageService.syncWithServer().then(() => {
      loadAllData();
    });

    // Real-time synchronization (SSE + BroadcastChannel across simultaneous devices)
    const cleanupRealtime = initRealtimeSync(() => {
      loadAllData();
    });

    const handleDataEvent = () => {
      loadAllData();
    };

    window.addEventListener('storage', handleDataEvent);
    window.addEventListener('catalog-updated', handleDataEvent);
    window.addEventListener('items-updated', handleDataEvent);
    window.addEventListener('catalog-niches-updated', handleDataEvent);
    window.addEventListener('categories-updated', handleDataEvent);
    window.addEventListener('production-updated', handleDataEvent);
    window.addEventListener('storage-sync-completed', handleDataEvent);

    // Keep data fresh when window gets focus
    const handleFocus = () => {
      StorageService.syncWithServer().then(() => {
        loadAllData();
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      cleanupRealtime();
      window.removeEventListener('storage', handleDataEvent);
      window.removeEventListener('catalog-updated', handleDataEvent);
      window.removeEventListener('items-updated', handleDataEvent);
      window.removeEventListener('catalog-niches-updated', handleDataEvent);
      window.removeEventListener('categories-updated', handleDataEvent);
      window.removeEventListener('production-updated', handleDataEvent);
      window.removeEventListener('storage-sync-completed', handleDataEvent);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadAllData]);

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('view');
      const seg = urlParams.get('seg');
      if (seg) setSelectedSegmentSlug(seg);
      if (v === 'orcamento' || v === 'quote') {
        setCurrentView('public_quote');
      } else if (v === 'solucoes' || v === 'segmento') {
        setCurrentView('public_segment');
      }
    }
  }, []);

  // Handle navigation requests including logout and authentication checks
  const handleNavigate = (view: string) => {
    if (view === 'logout') {
      logout();
      setCurrentView('catalog');
      return;
    }

    if (!isAuthenticated) {
      if (view === 'catalog' || view === 'public_quote' || view === 'public_segment') {
        setCurrentView(view as AppView);
      } else {
        setCurrentView('login');
      }
      return;
    }

    if (view === 'settings' && !isAdmin) {
      setCurrentView('pdv');
      return;
    }

    if (view === 'finance' && !canViewFinancialReports && !isAdmin) {
      setCurrentView('pdv');
      return;
    }

    if (view === 'inventory' && !canManageStock && !isAdmin) {
      setCurrentView('pdv');
      return;
    }

    setCurrentView(view as AppView);
  };

  // Production, Stock and Prospecting Badges
  const pendingProdCount = productionOrders.filter(
    (o) => o.status === 'AGUARDANDO_PRODUCAO' || o.status === 'EM_PRODUCAO'
  ).length;

  const lowStockCount = items.filter(
    (i) => i.type === 'PRODUTO_FISICO' && (i.stock || 0) <= (i.minStock || 5)
  ).length;

  const prospectingActionCount = opportunities.filter((o) => {
    if (o.stage === 'CONVERTIDO' || o.stage === 'NAO_CONVERTEU') return false;
    const now = new Date();
    const last = new Date(o.updatedAt);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 3 || (o.nextAction && !o.nextAction.completed);
  }).length;

  // --- PUBLIC PAGES (AVAILABLE TO EVERYONE) ---
  if (currentView === 'public_quote') {
    return (
      <PublicQuoteFormView
        companySettings={companySettings}
        onBackToCatalog={() => setCurrentView('catalog')}
      />
    );
  }

  if (currentView === 'public_segment') {
    return (
      <PublicSegmentLandingView
        segmentSlug={selectedSegmentSlug}
        companySettings={companySettings}
        onBackToCatalog={() => setCurrentView('catalog')}
        onRequestQuote={() => setCurrentView('public_quote')}
      />
    );
  }

  // --- UNHEALTHY / UNAUTHENTICATED FLOWS ---
  if (!isAuthenticated) {
    if (currentView === 'login') {
      return (
        <AdminLoginView
          companySettings={companySettings}
          onLoginSuccess={(mustChange) => {
            if (!mustChange) {
              setCurrentView('pdv');
            }
          }}
          onBackToCatalog={() => setCurrentView('catalog')}
        />
      );
    }

    // Default to Public Showcase (Vitrine) for unauthenticated visitors
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        <PublicCatalogView
          items={items}
          categories={categories}
          companySettings={companySettings}
          onOpenManagement={() => setCurrentView('login')}
          isStandalone={true}
        />
      </div>
    );
  }

  // --- AUTHENTICATED FLOW ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Forced Password Change Modal for First-Time Setup */}
      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSuccess={() => {
            setCurrentView('pdv');
          }}
          onLogout={() => {
            logout();
            setCurrentView('catalog');
          }}
        />
      )}

      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        companySettings={companySettings}
        pendingProdCount={pendingProdCount}
        showSidebar={showSidebar}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex-1 flex w-full px-2.5 sm:px-4 lg:px-6 py-3 sm:py-5 gap-4 lg:gap-6 relative min-h-0">
        {/* Persistent Sidebar for Desktop */}
        {showSidebar && (
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            pendingProdCount={pendingProdCount}
            lowStockCount={lowStockCount}
            prospectingCount={prospectingActionCount}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-20 md:pb-6">
          {currentView === 'dashboard' && (
            <DashboardView
              sales={sales}
              items={items}
              categories={categories}
              productionOrders={productionOrders}
              companySettings={companySettings}
              onNavigateToPOS={() => setCurrentView('pdv_facil')}
              onNavigateToSales={() => setCurrentView('sales')}
              onNavigateToProduction={() => setCurrentView('production')}
              onNavigateToInventory={() => setCurrentView('inventory')}
              onNavigateToFinance={() => setCurrentView('finance')}
              onNavigateToBudgets={() => setCurrentView('budgets')}
            />
          )}

          {currentView === 'prospecting' && (
            <ProspectingView
              companySettings={companySettings}
              onCreateBudgetForOpp={(opp) => {
                // Navega para orçamentos
                setCurrentView('budgets');
              }}
              onOpenPublicLanding={(slug) => {
                setSelectedSegmentSlug(slug);
                setCurrentView('public_segment');
              }}
              onOpenPublicQuoteForm={() => {
                setCurrentView('public_quote');
              }}
            />
          )}

          {(currentView === 'pdv_facil' || currentView === 'pdv-facil') && (
            <POSFacil
              categories={categories}
              items={items}
              companySettings={companySettings}
              onSaleCreated={loadAllData}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'pdv' && (
            <POSView
              categories={categories}
              items={items}
              companySettings={companySettings}
              onSaleCreated={loadAllData}
            />
          )}

          {currentView === 'budgets' && (
            <BudgetsView
              companySettings={companySettings}
              onNavigateToPDV={() => setCurrentView('pdv_facil')}
              onSaleCreated={loadAllData}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView />
          )}

          {currentView === 'items' && (
            <ItemList
              categories={categories}
              items={items}
              onItemsChange={loadAllData}
            />
          )}

          {currentView === 'documents' && (
            <DocumentsView
              onNavigateToPOS={() => setCurrentView('pdv_facil')}
            />
          )}

          {currentView === 'catalog' && (
            <PublicCatalogView
              items={items}
              categories={categories}
              companySettings={companySettings}
              onOpenManagement={() => setCurrentView('pdv_facil')}
              isStandalone={false}
            />
          )}

          {currentView === 'production' && (
            <ProductionView
              orders={productionOrders}
              onOrdersChange={loadAllData}
              companySettings={companySettings}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              items={items}
              movements={inventoryMovements}
              onDataChange={loadAllData}
            />
          )}

          {currentView === 'sales' && (
            <SalesView
              sales={sales}
              companySettings={companySettings}
              onSalesChange={loadAllData}
              onNavigateToCommissions={() => setCurrentView('commissions')}
            />
          )}

          {currentView === 'finance' && (
            <FinanceView
              sales={sales}
              companySettings={companySettings}
              onDataChange={loadAllData}
            />
          )}

          {currentView === 'commissions' && (
            <CommissionsView
              sales={sales}
              companySettings={companySettings}
              onNavigateToPOS={() => setCurrentView('pdv')}
              onNavigateToSettings={() => {
                setSettingsTab('comissoes');
                setCurrentView('settings');
              }}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              key={settingsTab}
              companySettings={companySettings}
              categories={categories}
              initialTab={settingsTab}
              onSettingsSaved={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        pendingProdCount={pendingProdCount}
        prospectingCount={prospectingActionCount}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}


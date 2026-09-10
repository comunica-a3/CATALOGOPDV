import {
  INITIAL_CATEGORIES,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY_MOVEMENTS,
  INITIAL_ITEMS,
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_RECEIVABLES,
  INITIAL_RECEIVING_ACCOUNTS,
  INITIAL_SALES,
  INITIAL_USERS,
} from '../data/initialData';
import {
  INITIAL_DOCUMENT_TEMPLATES,
  INITIAL_ONLINE_SERVICES,
} from '../data/initialServicesAndDocuments';
import {
  INITIAL_APPROACH_TEMPLATES,
  INITIAL_CAPTURE_FORMS,
  INITIAL_COMPLEMENTARY_RULES,
  INITIAL_OPPORTUNITIES,
  INITIAL_PACKAGES,
  INITIAL_PUBLIC_SEGMENT_PAGES,
  INITIAL_SEGMENT_SUGGESTIONS,
} from '../data/initialProspectingData';
import { INITIAL_CATALOG_NICHES } from '../data/initialCatalogNiches';
import {
  AccountFinancialSummary,
  AccountType,
  AdminAuthData,
  ApproachMessageTemplate,
  Budget,
  BudgetStatus,
  CaptureFormConfig,
  CaptureFormField,
  CartItem,
  CashRegisterSession,
  Category,
  CompanySettings,
  ComplementaryProductRule,
  Customer,
  DocumentField,
  DocumentTemplate,
  Expense,
  GeneratedDocument,
  InventoryMovement,
  Item,
  ItemType,
  MethodFinancialSummary,
  OnlineService,
  Opportunity,
  OpportunityActivity,
  OpportunityActivityType,
  OpportunityNextAction,
  OpportunityOrigin,
  OpportunityStage,
  PaymentRecord,
  PaymentStatus,
  ProductPackage,
  ProductionOrder,
  ProductionOrderFile,
  ProductionStatus,
  ProductNicheCard,
  PublicSegmentPage,
  Receivable,
  ReceivableStatus,
  ReceivingAccount,
  FinancialTransfer,
  FinancialMovement,
  AccountBalanceAdjustment,
  Sale,
  SaleItem,
  SaleEditHistoryEntry,
  SaleStatus,
  SegmentSuggestionRule,
  User,
  UserCredentials,
  UserRole,
} from '../types';
import { ExistingItemsAction, ValidatedImportItem } from '../utils/productImport';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
} from '../utils/security';
import { api } from './api';
import { formatPhone, normalizePhone } from '../utils/formatters';

const STORAGE_KEYS = {
  SETTINGS: 'pdv_company_settings',
  USERS: 'pdv_users',
  CATEGORIES: 'pdv_categories',
  CUSTOMERS: 'pdv_customers',
  ITEMS: 'pdv_items',
  SALES: 'pdv_sales',
  BUDGETS: 'pdv_budgets',
  PRODUCTION: 'pdv_production_orders',
  INVENTORY_MOVEMENTS: 'pdv_inventory_movements',
  RECEIVABLES: 'pdv_receivables',
  RECEIVING_ACCOUNTS: 'pdv_receiving_accounts',
  ACCOUNT_BALANCE_ADJUSTMENTS: 'pdv_account_balance_adjustments',
  FINANCIAL_TRANSFERS: 'pdv_financial_transfers',
  CASH_REGISTER_SESSIONS: 'pdv_cash_register_sessions',
  ONLINE_SERVICES: 'pdv_online_services',
  DOCUMENT_TEMPLATES: 'pdv_document_templates',
  GLOBAL_DOCUMENT_FIELDS: 'pdv_global_document_fields',
  GENERATED_DOCUMENTS: 'pdv_generated_documents',
  OPPORTUNITIES: 'pdv_opportunities',
  OPPORTUNITY_ACTIVITIES: 'pdv_opportunity_activities',
  PACKAGES: 'pdv_packages',
  APPROACH_TEMPLATES: 'pdv_approach_templates',
  SEGMENT_SUGGESTIONS: 'pdv_segment_suggestions',
  COMPLEMENTARY_RULES: 'pdv_complementary_rules',
  PUBLIC_SEGMENT_PAGES: 'pdv_public_segment_pages',
  CAPTURE_FORMS: 'pdv_capture_forms',
  CURRENT_USER_ID: 'pdv_current_user_id',
  AUTH: 'pdv_admin_auth',
  SESSION: 'pdv_admin_session',
  CREDENTIALS: 'pdv_user_credentials',
  EXPENSES: 'pdv_expenses',
  SALE_ANNOTATIONS: 'pdv_sale_annotations',
  DISMISSED_STOCK_WARNINGS: 'pdv_dismissed_stock_warnings',
  CATALOG_NICHES: 'pdv_catalog_niches',
};

const IMPORT_VERSION_KEY = 'pdv_table_import_v3';

function checkAndRunInitialImport(): void {
  try {
    const isImported = localStorage.getItem(IMPORT_VERSION_KEY);
    if (!isImported) {
      // Initialize items ONLY if not already existing in local storage
      const existingItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!existingItems) {
        const cleanedItems = INITIAL_ITEMS.map((item) => ({
          ...item,
          imageUrl: item.imageUrl && !item.imageUrl.includes('unsplash.com') ? item.imageUrl : '',
        }));
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(cleanedItems));
      }

      const existingCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!existingCategories) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SALES)) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTION)) localStorage.setItem(STORAGE_KEYS.PRODUCTION, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS)) localStorage.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.RECEIVABLES)) localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.CASH_REGISTER_SESSIONS)) localStorage.setItem(STORAGE_KEYS.CASH_REGISTER_SESSIONS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      
      const currentSettings = getItemFromStorage<CompanySettings>(STORAGE_KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
      if (!currentSettings.defaultSupplierFreight) {
        currentSettings.defaultSupplierFreight = 20.0;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(currentSettings));
      }

      localStorage.setItem(IMPORT_VERSION_KEY, 'true');
    } else {
      // Migration: clean any unsplash images from current items if still lingering
      const currentItemsRaw = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (currentItemsRaw) {
        try {
          const currentItems: Item[] = JSON.parse(currentItemsRaw);
          let modified = false;
          const updatedItems = currentItems.map((item) => {
            if (item.imageUrl && item.imageUrl.includes('unsplash.com')) {
              modified = true;
              return { ...item, imageUrl: '' };
            }
            return item;
          });
          if (modified) {
            localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(updatedItems));
          }
        } catch {
          // ignore
        }
      }

      // Migration: ensure budgets storage key exists
      if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) {
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));
      }

      // Migration: clean up any legacy demo opportunities and their activities
      const rawOpps = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
      if (rawOpps) {
        try {
          const opps: Opportunity[] = JSON.parse(rawOpps);
          const demoIds = ['opp-1', 'opp-2', 'opp-3', 'opp-4'];
          const cleanOpps = opps.filter((o) => !demoIds.includes(o.id) && !o.id.startsWith('opp-demo'));
          if (cleanOpps.length !== opps.length) {
            localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(cleanOpps));
          }
        } catch {
          // ignore
        }
      }

      const rawActs = localStorage.getItem(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES);
      if (rawActs) {
        try {
          const acts: OpportunityActivity[] = JSON.parse(rawActs);
          const demoIds = ['opp-1', 'opp-2', 'opp-3', 'opp-4'];
          const cleanActs = acts.filter((a) => !demoIds.includes(a.opportunityId) && !a.opportunityId.startsWith('opp-demo'));
          if (cleanActs.length !== acts.length) {
            localStorage.setItem(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, JSON.stringify(cleanActs));
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error('Error during initial product import migration:', err);
  }
}

checkAndRunInitialImport();

function getItemFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItemToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

function notifyRealtime(event: string, data?: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('pdv_catalog_realtime_sync');
        bc.postMessage({ type: event, data });
        bc.close();
      }
    } catch {}
  }
  api.notifySync(event, data).catch(() => {});
}

export function downloadBlobFile(content: string, filename: string, mimeType: string): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading file:', err);
  }
}

export class StorageService {
  // Settings
  static getSettings(): CompanySettings {
    const settings = getItemFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
    if (!settings.commissionRates) {
      settings.commissionRates = {
        PRODUTO_GRAFICO: 10,
        PRODUTO_FISICO: 5,
        SERVICO: 15,
      };
    }
    if (settings.promoterCommissionPercent === undefined) {
      settings.promoterCommissionPercent = 20;
    }
    if (!settings.catalogSubtitle) {
      settings.catalogSubtitle = 'Sua rotina, mais simples.';
    }
    return settings;
  }

  static getCompanySettings(): CompanySettings {
    return this.getSettings();
  }

  static getDeletedItemIds(): Set<string> {
    try {
      const raw = localStorage.getItem('pdv_deleted_item_ids');
      if (!raw) return new Set();
      const parsed: { [id: string]: number } = JSON.parse(raw);
      const now = Date.now();
      const valid = new Set<string>();
      const updated: { [id: string]: number } = {};
      for (const [id, ts] of Object.entries(parsed)) {
        if (now - ts < 30 * 24 * 60 * 60 * 1000) {
          valid.add(id);
          updated[id] = ts;
        }
      }
      return valid;
    } catch {
      return new Set();
    }
  }

  static markItemAsDeleted(id: string): void {
    try {
      const raw = localStorage.getItem('pdv_deleted_item_ids');
      const parsed: { [id: string]: number } = raw ? JSON.parse(raw) : {};
      parsed[id] = Date.now();
      localStorage.setItem('pdv_deleted_item_ids', JSON.stringify(parsed));
    } catch {}
  }

  static unmarkItemAsDeleted(id: string): void {
    try {
      const raw = localStorage.getItem('pdv_deleted_item_ids');
      if (!raw) return;
      const parsed: { [id: string]: number } = JSON.parse(raw);
      delete parsed[id];
      localStorage.setItem('pdv_deleted_item_ids', JSON.stringify(parsed));
    } catch {}
  }

  static async syncWithServer(): Promise<void> {
    try {
      const [
        settingsRes,
        usersRes,
        customersRes,
        itemsRes,
        categoriesRes,
        salesRes,
        budgetsRes,
        oppsRes,
        templatesRes,
        activitiesRes,
        accountsRes,
        transfersRes,
        cashSessionsRes,
        adjustmentsRes,
        saleAnnotationsRes,
        nichesRes,
        productionRes,
      ] = await Promise.allSettled([
        api.getSettings(),
        api.getUsers(),
        api.getCustomers(),
        api.getItems(),
        api.getCategories(),
        api.getSales(),
        api.getBudgets(),
        api.getOpportunities(),
        api.getApproachTemplates(),
        api.getOpportunityActivities(),
        api.getReceivingAccounts(),
        api.getFinancialTransfers(),
        api.getCashRegisterSessions(),
        api.getAccountAdjustments(),
        api.getAllSaleAnnotations(),
        api.getCatalogNiches(),
        api.getProductionOrders(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setItemToStorage(STORAGE_KEYS.SETTINGS, settingsRes.value);
      }
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) && usersRes.value.length > 0) {
        setItemToStorage(STORAGE_KEYS.USERS, usersRes.value);
      }
      if (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value)) {
        const localCustomers = this.getCustomers();
        const remoteCustomers = customersRes.value;
        const custMap = new Map<string, Customer>();
        for (const lc of localCustomers) custMap.set(lc.id, lc);
        for (const rc of remoteCustomers) {
          const lc = custMap.get(rc.id);
          if (lc) {
            const lTime = new Date((lc as any).updatedAt || (lc as any).createdAt || 0).getTime();
            const rTime = new Date((rc as any).updatedAt || (rc as any).createdAt || 0).getTime();
            if (lTime > rTime) {
              custMap.set(lc.id, lc);
            } else {
              custMap.set(rc.id, rc);
            }
          } else {
            custMap.set(rc.id, rc);
          }
        }
        const mergedCustomers = Array.from(custMap.values());
        if (mergedCustomers.length > 0 || localCustomers.length === 0) {
          setItemToStorage(STORAGE_KEYS.CUSTOMERS, mergedCustomers);
        }
      }

      // Robust Items Sync with Server Database Authority & Image Protection
      if (itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value)) {
        const localItems = this.getItems();
        const deletedIds = this.getDeletedItemIds();
        const remoteItems = itemsRes.value;
        const localMap = new Map<string, Item>(localItems.map((i) => [i.id, i]));
        const mergedMap = new Map<string, Item>();
        const itemsToPushToRemote: Item[] = [];

        // 1. Process remote items from the server database (authoritative source)
        for (const remoteItem of remoteItems) {
          if (deletedIds.has(remoteItem.id)) {
            // Already deleted locally, ensure deletion propagated to server
            api.deleteItem(remoteItem.id).catch(() => {});
            continue;
          }

          const localMatch = localMap.get(remoteItem.id);
          const localHasImage = !!(localMatch?.imageUrl && localMatch.imageUrl.trim() !== '');
          const remoteHasImage = !!(remoteItem.imageUrl && remoteItem.imageUrl.trim() !== '');

          // If local item has custom image not yet uploaded to server, preserve it
          if (localMatch && localHasImage && !remoteHasImage) {
            const mergedWithImage: Item = {
              ...remoteItem,
              imageUrl: localMatch.imageUrl,
              updatedAt: new Date().toISOString(),
            };
            mergedMap.set(mergedWithImage.id, mergedWithImage);
            itemsToPushToRemote.push(mergedWithImage);
          } else {
            // Remote item from server is authoritative for showInCatalog, prices, stock, etc.
            mergedMap.set(remoteItem.id, remoteItem);
          }
        }

        // 2. Check for any locally created items not yet on remote database
        for (const localItem of localItems) {
          if (!deletedIds.has(localItem.id) && !remoteItems.some((r: any) => r.id === localItem.id)) {
            itemsToPushToRemote.push(localItem);
            mergedMap.set(localItem.id, localItem);
          }
        }

        const finalItems = Array.from(mergedMap.values());
        if (finalItems.length > 0 || localItems.length === 0) {
          setItemToStorage(STORAGE_KEYS.ITEMS, finalItems);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('items-updated'));
            window.dispatchEvent(new CustomEvent('catalog-updated'));
          }
        }

        // Push pending local updates to server and store server-assigned URLs
        if (itemsToPushToRemote.length > 0) {
          api.saveItemsBatch(itemsToPushToRemote)
            .then((res: any) => {
              if (res && res.items && Array.isArray(res.items)) {
                const currentItems = this.getItems();
                const itemMap = new Map(currentItems.map((i) => [i.id, i]));
                for (const updated of res.items) {
                  itemMap.set(updated.id, updated);
                }
                setItemToStorage(STORAGE_KEYS.ITEMS, Array.from(itemMap.values()));
              }
            })
            .catch((e) => console.debug('Sync push items batch notice:', e));
        }
      }

      // Robust Categories Sync (Server Authority)
      if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) {
        const remoteCategories = categoriesRes.value;
        if (remoteCategories.length > 0) {
          setItemToStorage(STORAGE_KEYS.CATEGORIES, remoteCategories);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('categories-updated'));
            window.dispatchEvent(new CustomEvent('catalog-updated'));
          }
        } else {
          const localCategories = this.getCategories();
          if (localCategories.length > 0) {
            api.saveCategoriesBatch(localCategories).catch(() => {});
          }
        }
      }

      if (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value)) {
        const localSales = this.getSales();
        const mergedSales = salesRes.value.map((remoteSale: any) => {
          const localMatch = localSales.find((ls) => ls.id === remoteSale.id);
          const saleNumber =
            (localMatch?.saleNumber && !String(localMatch.saleNumber).includes('NaN'))
              ? localMatch.saleNumber
              : (remoteSale.saleNumber && !String(remoteSale.saleNumber).includes('NaN'))
              ? String(remoteSale.saleNumber)
              : (remoteSale.id || '');

          if (
            remoteSale.status === 'EXCLUIDA' ||
            remoteSale.isDeleted ||
            localMatch?.status === 'EXCLUIDA' ||
            localMatch?.isDeleted
          ) {
            return {
              ...(localMatch || remoteSale),
              ...remoteSale,
              saleNumber,
              status: 'EXCLUIDA' as SaleStatus,
              isDeleted: true,
              deletedAt: remoteSale.deletedAt || localMatch?.deletedAt,
              deletedBy: remoteSale.deletedBy || localMatch?.deletedBy,
              deletedByName: remoteSale.deletedByName || localMatch?.deletedByName,
              deletionReason: remoteSale.deletionReason || localMatch?.deletionReason,
              editHistory: remoteSale.editHistory || localMatch?.editHistory || [],
              paymentStatus: 'CANCELADO' as PaymentStatus,
              notes: localMatch?.notes || remoteSale.notes,
            };
          }

          if (
            remoteSale.status === 'CANCELADA' ||
            remoteSale.paymentStatus === 'CANCELADO' ||
            localMatch?.status === 'CANCELADA' ||
            localMatch?.paymentStatus === 'CANCELADO'
          ) {
            return {
              ...(localMatch || remoteSale),
              ...remoteSale,
              saleNumber,
              status: 'CANCELADA' as SaleStatus,
              paymentStatus: 'CANCELADO' as PaymentStatus,
              editHistory: remoteSale.editHistory || localMatch?.editHistory || [],
              notes: localMatch?.notes || remoteSale.notes,
            };
          }

          if (!localMatch) {
            return {
              ...remoteSale,
              saleNumber,
              status: (remoteSale.status || 'CONCLUIDA') as SaleStatus,
            };
          }

          // Compare version timestamps and financial status
          const localTime = new Date(localMatch.updatedAt || localMatch.createdAt || 0).getTime();
          const remoteTime = new Date(remoteSale.updatedAt || remoteSale.createdAt || 0).getTime();
          const localPaid = Number(localMatch.paidAmount || 0);
          const remotePaid = Number(remoteSale.paidAmount || 0);
          const localPaymentsCount = Array.isArray(localMatch.payments) ? localMatch.payments.length : 0;
          const remotePaymentsCount = Array.isArray(remoteSale.payments) ? remoteSale.payments.length : 0;

          // Local has authoritative payment if:
          // 1. Local is marked PAGO with 0 remaining, OR
          // 2. Local has higher paidAmount or more payment records, OR
          // 3. Local updatedAt is newer than remote
          const localHasNewerPayment =
            (localMatch.paymentStatus === 'PAGO' && localMatch.remainingAmount <= 0) ||
            localPaid > remotePaid ||
            localPaymentsCount > remotePaymentsCount ||
            localTime > remoteTime;

          if (localHasNewerPayment) {
            // Local state has the latest payment/update. Proactively sync it to backend.
            api.saveSale(localMatch).catch(() => {});
            return {
              ...remoteSale,
              ...localMatch,
              saleNumber,
              paidAmount: localMatch.paidAmount,
              remainingAmount: localMatch.remainingAmount,
              paymentStatus: localMatch.paymentStatus,
              paymentMethod: localMatch.paymentMethod || remoteSale.paymentMethod,
              payments: localMatch.payments || [],
              updatedAt: localMatch.updatedAt || new Date().toISOString(),
              status: (localMatch.status || remoteSale.status || 'CONCLUIDA') as SaleStatus,
            };
          }

          // Remote has newer or equal state
          const remainingAmount = Number(remoteSale.remainingAmount !== undefined ? remoteSale.remainingAmount : Math.max(0, remoteSale.total - remotePaid));
          let paymentStatus: PaymentStatus = remoteSale.paymentStatus as PaymentStatus;
          if (remainingAmount <= 0) {
            paymentStatus = 'PAGO';
          } else if (remotePaid > 0) {
            paymentStatus = 'PARCIALMENTE_PAGO';
          } else if (remoteSale.paymentStatus === 'A_PRAZO' || localMatch.paymentStatus === 'A_PRAZO') {
            paymentStatus = 'A_PRAZO';
          } else {
            paymentStatus = (remoteSale.paymentStatus || 'PENDENTE') as PaymentStatus;
          }

          return {
            ...localMatch,
            ...remoteSale,
            saleNumber,
            paidAmount: remotePaid,
            remainingAmount,
            paymentStatus,
            paymentMethod: remoteSale.paymentMethod || localMatch.paymentMethod,
            payments: Array.isArray(remoteSale.payments) && remoteSale.payments.length > 0 ? remoteSale.payments : localMatch.payments || [],
            status: (remoteSale.status || 'CONCLUIDA') as SaleStatus,
          };
        });

        // Preserve and sync any local sales not yet returned by the server
        const remoteIds = new Set(salesRes.value.map((rs: any) => rs.id));
        const unsyncedLocal = localSales.filter((ls) => !remoteIds.has(ls.id));
        for (const unsynced of unsyncedLocal) {
          api.saveSale(unsynced).catch(() => {});
        }

        const finalSales = [...mergedSales, ...unsyncedLocal];
        setItemToStorage(STORAGE_KEYS.SALES, finalSales);
      }
      if (budgetsRes.status === 'fulfilled' && Array.isArray(budgetsRes.value)) {
        setItemToStorage(STORAGE_KEYS.BUDGETS, budgetsRes.value);
      }
      if (oppsRes.status === 'fulfilled' && Array.isArray(oppsRes.value)) {
        const demoIds = ['opp-1', 'opp-2', 'opp-3', 'opp-4'];
        const cleanRemote = oppsRes.value.filter((o: any) => !demoIds.includes(o.id) && !o.id?.startsWith('opp-demo'));
        const localOpps = this.getOpportunities().filter((o) => !demoIds.includes(o.id) && !o.id?.startsWith('opp-demo'));
        const remoteIds = new Set(cleanRemote.map((o: any) => o.id));
        const unsyncedLocal = localOpps.filter((lo) => !remoteIds.has(lo.id));
        for (const unsynced of unsyncedLocal) {
          api.saveOpportunity(unsynced).catch(() => {});
        }
        const finalOpps = [...cleanRemote, ...unsyncedLocal];
        setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, finalOpps);
      }

      // Sincronização e persistência de Modelos de Abordagem no Servidor (Compartilhado em rede)
      if (templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value)) {
        const remoteTemplates = templatesRes.value;
        const localTemplates = getItemFromStorage<ApproachMessageTemplate[]>(
          STORAGE_KEYS.APPROACH_TEMPLATES,
          INITIAL_APPROACH_TEMPLATES
        );
        if (remoteTemplates.length > 0) {
          const remoteIds = new Set(remoteTemplates.map((t: any) => t.id));
          const missingOnServer = localTemplates.filter((t) => !remoteIds.has(t.id));
          for (const tpl of missingOnServer) {
            api.saveApproachTemplate(tpl).catch(() => {});
          }
          const merged = [...remoteTemplates, ...missingOnServer];
          setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, merged);
        } else if (localTemplates.length > 0) {
          for (const tpl of localTemplates) {
            api.saveApproachTemplate(tpl).catch(() => {});
          }
        }
      }

      // Sincronização e persistência de Ações Executadas / Atividades no Servidor (Compartilhado em rede)
      if (activitiesRes.status === 'fulfilled' && Array.isArray(activitiesRes.value)) {
        const remoteActivities = activitiesRes.value;
        const localActivities = getItemFromStorage<OpportunityActivity[]>(
          STORAGE_KEYS.OPPORTUNITY_ACTIVITIES,
          []
        );
        const demoIds = ['opp-1', 'opp-2', 'opp-3', 'opp-4'];
        const cleanRemote = remoteActivities.filter((a: any) => !demoIds.includes(a.opportunityId) && !a.opportunityId?.startsWith('opp-demo'));
        const cleanLocal = localActivities.filter((a) => !demoIds.includes(a.opportunityId) && !a.opportunityId?.startsWith('opp-demo'));

        if (cleanRemote.length > 0) {
          const remoteIds = new Set(cleanRemote.map((a: any) => a.id));
          const missingOnServer = cleanLocal.filter((a) => !remoteIds.has(a.id));
          for (const act of missingOnServer) {
            api.saveOpportunityActivity(act).catch(() => {});
          }
          const merged = [...cleanRemote, ...missingOnServer].sort(
            (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
          );
          setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, merged);
        } else if (cleanLocal.length > 0) {
          for (const act of cleanLocal) {
            api.saveOpportunityActivity(act).catch(() => {});
          }
          setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, cleanLocal);
        }
      }

      // 1. Sincronização e persistência de Contas no Servidor (Servidor como Fonte da Verdade)
      if (accountsRes.status === 'fulfilled' && Array.isArray(accountsRes.value)) {
        const remoteAccounts = accountsRes.value;
        const localAccounts = this.getReceivingAccounts();
        if (remoteAccounts.length > 0) {
          // Servidor possui contas: é a fonte da verdade
          // Se existirem contas criadas localmente que ainda não foram enviadas, enviamos ao servidor
          const remoteIds = new Set(remoteAccounts.map((a: any) => a.id));
          const missingOnServer = localAccounts.filter((a) => !remoteIds.has(a.id));
          for (const acc of missingOnServer) {
            api.saveReceivingAccount(acc).catch(() => {});
          }
          setItemToStorage(STORAGE_KEYS.RECEIVING_ACCOUNTS, [...remoteAccounts, ...missingOnServer]);
        } else if (localAccounts.length > 0) {
          // Se o servidor estiver vazio (primeira migração), envia as contas existentes ao servidor
          for (const acc of localAccounts) {
            api.saveReceivingAccount(acc).catch(() => {});
          }
        }
      }

      // 2. Sincronização e persistência de Transferências Financeiras no Servidor
      if (transfersRes.status === 'fulfilled' && Array.isArray(transfersRes.value)) {
        const remoteTransfers = transfersRes.value;
        const localTransfers = this.getFinancialTransfers();
        if (remoteTransfers.length > 0) {
          const remoteIds = new Set(remoteTransfers.map((t: any) => t.id));
          const missingOnServer = localTransfers.filter((t) => !remoteIds.has(t.id));
          for (const trf of missingOnServer) {
            api.saveFinancialTransfer(trf).catch(() => {});
          }
          const merged = [...remoteTransfers, ...missingOnServer].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setItemToStorage(STORAGE_KEYS.FINANCIAL_TRANSFERS, merged);
        } else if (localTransfers.length > 0) {
          for (const trf of localTransfers) {
            api.saveFinancialTransfer(trf).catch(() => {});
          }
        }
      }

      // 3. Sincronização e persistência de Sessões de Caixa no Servidor (Caixa vinculado ao Vendedor)
      if (cashSessionsRes.status === 'fulfilled' && Array.isArray(cashSessionsRes.value)) {
        const remoteSessions = cashSessionsRes.value;
        const localSessions = this.getCashRegisterSessions();
        if (remoteSessions.length > 0) {
          const remoteIds = new Set(remoteSessions.map((s: any) => s.id));
          const missingOnServer = localSessions.filter((s) => !remoteIds.has(s.id));
          for (const sess of missingOnServer) {
            api.saveCashRegisterSession(sess).catch(() => {});
          }
          const merged = [...remoteSessions, ...missingOnServer].sort(
            (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
          );
          setItemToStorage(STORAGE_KEYS.CASH_REGISTER_SESSIONS, merged);
        } else if (localSessions.length > 0) {
          for (const sess of localSessions) {
            api.saveCashRegisterSession(sess).catch(() => {});
          }
        }
      }

      // 4. Sincronização de Ajustes de Saldo de Contas
      if (adjustmentsRes.status === 'fulfilled' && Array.isArray(adjustmentsRes.value)) {
        const remoteAdjs = adjustmentsRes.value;
        const localAdjs = this.getAccountBalanceAdjustments();
        if (remoteAdjs.length > 0) {
          const remoteIds = new Set(remoteAdjs.map((a: any) => a.id));
          const missingOnServer = localAdjs.filter((a) => !remoteIds.has(a.id));
          for (const adj of missingOnServer) {
            api.saveAccountAdjustment(adj).catch(() => {});
          }
          const merged = [...remoteAdjs, ...missingOnServer].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setItemToStorage(STORAGE_KEYS.ACCOUNT_BALANCE_ADJUSTMENTS, merged);
        } else if (localAdjs.length > 0) {
          for (const adj of localAdjs) {
            api.saveAccountAdjustment(adj).catch(() => {});
          }
        }
      }

      // 5. Sincronização de Anotações em Vendas
      if (saleAnnotationsRes.status === 'fulfilled' && Array.isArray(saleAnnotationsRes.value)) {
        setItemToStorage(STORAGE_KEYS.SALE_ANNOTATIONS, saleAnnotationsRes.value);
      }

      // 6. Sincronização de Nichos do Catálogo (Compartilhado entre todos os dispositivos)
      if (nichesRes.status === 'fulfilled' && Array.isArray(nichesRes.value)) {
        const remoteNiches = nichesRes.value;
        if (remoteNiches.length > 0) {
          const finalNiches = [...remoteNiches].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
          setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, finalNiches);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
            window.dispatchEvent(new CustomEvent('catalog-updated'));
          }
        } else {
          // If server database is completely empty, populate it with local niches
          const localNiches = this.getCatalogNiches();
          if (localNiches.length > 0) {
            api.saveCatalogNichesBatch(localNiches).catch((e) => console.debug('Sync push niches batch notice:', e));
          }
        }
      }

      // 7. Sincronização de Ordens de Produção Gráfica (Compartilhado entre todos os dispositivos em tempo real)
      if (productionRes.status === 'fulfilled' && Array.isArray(productionRes.value)) {
        const localOrders = this.getProductionOrders();
        const remoteOrders = productionRes.value as ProductionOrder[];
        const orderMap = new Map<string, ProductionOrder>();
        const ordersToPush: ProductionOrder[] = [];

        // Inserir ordens locais no mapa
        for (const lo of localOrders) {
          orderMap.set(lo.id, lo);
        }

        // Mesclar ordens remotas do servidor
        for (const ro of remoteOrders) {
          const lo = orderMap.get(ro.id);
          if (lo) {
            const lTime = new Date(lo.updatedAt || lo.createdAt || 0).getTime();
            const rTime = new Date(ro.updatedAt || ro.createdAt || 0).getTime();
            if (lTime > rTime) {
              orderMap.set(lo.id, lo);
              ordersToPush.push(lo);
            } else {
              orderMap.set(ro.id, ro);
            }
          } else {
            orderMap.set(ro.id, ro);
          }
        }

        // Identificar ordens criadas localmente offline que o servidor ainda não tem
        for (const lo of localOrders) {
          if (!remoteOrders.some((ro) => ro.id === lo.id)) {
            ordersToPush.push(lo);
            orderMap.set(lo.id, lo);
          }
        }

        const finalOrders = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setItemToStorage(STORAGE_KEYS.PRODUCTION, finalOrders);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('production-updated'));
        }

        if (ordersToPush.length > 0) {
          api.saveProductionOrdersBatch(ordersToPush).catch((e) => console.debug('Sync push production orders notice:', e));
        }
      }
    } catch (err) {
      console.warn('StorageService syncWithServer notice:', err);
    }
  }

  static saveSettings(settings: CompanySettings): void {
    setItemToStorage(STORAGE_KEYS.SETTINGS, settings);
    api.saveSettings(settings).catch((e) => console.debug('Background saveSettings sync notice:', e));
  }

  static saveCompanySettings(settings: CompanySettings): void {
    this.saveSettings(settings);
  }

  // --- PROMOTER COMMISSION CONFIGURATION ---
  static getPromoterCommissionPercent(): number {
    const settings = this.getSettings();
    return Math.max(0, Math.min(100, Number(settings.promoterCommissionPercent ?? 20)));
  }

  static savePromoterCommissionPercent(percent: number, user?: User): void {
    const currentUser = user || this.getCurrentUser();
    if (currentUser.role !== 'ADMINISTRADOR') {
      throw new Error('Apenas o perfil Administrador possui autorização para alterar o percentual de comissão do Promotor.');
    }

    const val = Number(percent);
    if (isNaN(val) || val < 0 || val > 100) {
      throw new Error('A porcentagem do Promotor deve ser um valor numérico entre 0% e 100%.');
    }

    const settings = this.getSettings();
    settings.promoterCommissionPercent = Number(val.toFixed(2));
    this.saveSettings(settings);
  }

  // --- ITEM TYPE COMMISSION RATES ---
  static getCommissionRates(): import('../types').ItemTypeCommissionRates {
    const settings = this.getSettings();
    const rates = settings.commissionRates || {
      PRODUTO_GRAFICO: 10,
      PRODUTO_FISICO: 5,
      SERVICO: 15,
    };

    return {
      PRODUTO_GRAFICO: Math.max(0, Math.min(100, Number(rates.PRODUTO_GRAFICO ?? 10))),
      PRODUTO_FISICO: Math.max(0, Math.min(100, Number(rates.PRODUTO_FISICO ?? 5))),
      SERVICO: Math.max(0, Math.min(100, Number(rates.SERVICO ?? 15))),
    };
  }

  static saveCommissionRates(rates: import('../types').ItemTypeCommissionRates, user?: User): void {
    const currentUser = user || this.getCurrentUser();
    if (currentUser.role !== 'ADMINISTRADOR') {
      throw new Error('Apenas o perfil Administrador possui autorização para alterar as taxas de comissão.');
    }

    const pg = Number(rates.PRODUTO_GRAFICO);
    const pf = Number(rates.PRODUTO_FISICO);
    const srv = Number(rates.SERVICO);

    if (isNaN(pg) || isNaN(pf) || isNaN(srv)) {
      throw new Error('Todas as porcentagens de comissão devem ser valores numéricos válidos.');
    }

    if (pg < 0 || pg > 100 || pf < 0 || pf > 100 || srv < 0 || srv > 100) {
      throw new Error('As porcentagens de comissão devem estar estritamente entre 0% e 100%.');
    }

    const validatedRates: import('../types').ItemTypeCommissionRates = {
      PRODUTO_GRAFICO: Number(pg.toFixed(2)),
      PRODUTO_FISICO: Number(pf.toFixed(2)),
      SERVICO: Number(srv.toFixed(2)),
    };

    const settings = this.getSettings();
    settings.commissionRates = validatedRates;
    this.saveSettings(settings);
  }

  // --- MULTI-USER AUTHENTICATION & SECURITY ---
  static getAdminAuthData(): AdminAuthData {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) {
      const initialAuth: AdminAuthData = {
        username: 'admin',
        passwordHash: '',
        salt: '',
        isDefaultPassword: false,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(initialAuth));
      return initialAuth;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        username: 'admin',
        passwordHash: '',
        salt: '',
        isDefaultPassword: false,
      };
    }
  }

  static saveAdminAuthData(data: AdminAuthData): void {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(data));
  }

  static getAllCredentials(): Record<string, UserCredentials> {
    const raw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static saveAllCredentials(creds: Record<string, UserCredentials>): void {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
  }

  static getUserCredentials(userId: string): UserCredentials | undefined {
    const all = this.getAllCredentials();
    return all[userId];
  }

  static async setUserPassword(userId: string, newPassword: string, isDefault = false): Promise<void> {
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      throw new Error('A senha deve possuir no mínimo 4 caracteres.');
    }

    const users = this.getUsers();
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      throw new Error('Usuário não encontrado.');
    }

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(trimmed, salt);

    if (targetUser.role === 'ADMINISTRADOR') {
      const authData = this.getAdminAuthData();
      this.saveAdminAuthData({
        ...authData,
        passwordHash,
        salt,
        isDefaultPassword: isDefault,
        updatedAt: new Date().toISOString(),
      });
    }

    const all = this.getAllCredentials();
    all[userId] = {
      userId,
      passwordHash,
      salt,
      isDefaultPassword: isDefault,
      updatedAt: new Date().toISOString(),
    };
    this.saveAllCredentials(all);

    // Also sync to backend API if available
    try {
      await api.changePassword({ newPassword: trimmed, targetUserId: userId });
    } catch (e) {
      console.warn('Backend password sync error (fallback active):', e);
    }
  }

  static async validateUserPassword(
    userId: string,
    password: string
  ): Promise<{ valid: boolean; mustChangePassword: boolean }> {
    const trimmed = password.trim();
    const users = this.getUsers();
    const targetUser = users.find((u) => u.id === userId);

    if (!targetUser) {
      return { valid: false, mustChangePassword: false };
    }

    // Try backend API validation first for security and centralized authorization
    try {
      const response = await api.login({ userId: targetUser.id, password: trimmed });
      if (response.success) {
        return {
          valid: true,
          mustChangePassword: !!response.mustChangePassword,
        };
      }
    } catch (apiErr: any) {
      // If server unreachable or error, fallback to local hashed credentials
      console.warn('Backend login fallback to local crypto:', apiErr?.message);
    }

    // Local crypto verification fallback
    if (targetUser.role === 'ADMINISTRADOR') {
      const authData = this.getAdminAuthData();
      if (authData.passwordHash && authData.salt) {
        const isCryptoValid = await verifyPassword(trimmed, authData.passwordHash, authData.salt);
        return {
          valid: isCryptoValid,
          mustChangePassword: !!authData.isDefaultPassword,
        };
      }
    }

    const allCreds = this.getAllCredentials();
    const cred = allCreds[userId];
    if (cred && cred.passwordHash && cred.salt) {
      const isCryptoValid = await verifyPassword(trimmed, cred.passwordHash, cred.salt);
      return {
        valid: isCryptoValid,
        mustChangePassword: !!cred.isDefaultPassword,
      };
    }

    return { valid: false, mustChangePassword: false };
  }

  static async validateAdminPassword(password: string): Promise<{ valid: boolean; mustChangePassword: boolean }> {
    const admin = this.getAdmin();
    return this.validateUserPassword(admin.id, password);
  }

  static async setAdminPassword(newPassword: string): Promise<void> {
    const admin = this.getAdmin();
    return this.setUserPassword(admin.id, newPassword, false);
  }

  static isDefaultPassword(): boolean {
    const authData = this.getAdminAuthData();
    return !!authData.isDefaultPassword;
  }

  static getAdminSession(): { isAuthenticated: boolean; user?: User; mustChangePassword: boolean } {
    return this.getSession();
  }

  static getSession(): { isAuthenticated: boolean; user?: User; mustChangePassword: boolean } {
    try {
      const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.SESSION) || localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!sessionRaw) {
        return { isAuthenticated: false, mustChangePassword: false };
      }
      const session = JSON.parse(sessionRaw);
      if (session && session.isAuthenticated && session.userId) {
        const users = this.getUsers();
        const user = users.find((u) => u.id === session.userId);
        if (user) {
          const isDefault = user.role === 'ADMINISTRADOR' ? this.isDefaultPassword() : false;
          return {
            isAuthenticated: true,
            user,
            mustChangePassword: !!session.mustChangePassword || isDefault,
          };
        }
      }
    } catch (e) {
      console.error('Error reading session', e);
    }
    return { isAuthenticated: false, mustChangePassword: false };
  }

  static setAdminSession(user: User, mustChangePassword: boolean): void {
    this.setSession(user, mustChangePassword);
  }

  static setSession(user: User, mustChangePassword: boolean): void {
    const sessionObj = {
      isAuthenticated: true,
      userId: user.id,
      role: user.role,
      timestamp: Date.now(),
      mustChangePassword,
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionObj));
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionObj));
  }

  static clearAdminSession(): void {
    this.clearSession();
  }

  static clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  // Users & Sellers
  static getUsers(): User[] {
    return getItemFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  static isTestUserActive(): boolean {
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser?.isTestUser) {
        return true;
      }
      const session = this.getSession();
      if (session?.user?.isTestUser) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static getSellers(): User[] {
    return this.getUsers().filter((u) => u.role === 'VENDEDOR' || u.role === 'VENDEDOR_EXTERNO');
  }

  static getSalesOperators(): User[] {
    return this.getUsers().filter(
      (u) =>
        u.active !== false &&
        (u.role === 'ADMINISTRADOR' ||
          u.role === 'COLABORADOR' ||
          u.role === 'VENDEDOR' ||
          u.role === 'VENDEDOR_EXTERNO')
    );
  }

  static getCollaborators(): User[] {
    return this.getUsers().filter((u) => u.role === 'COLABORADOR');
  }

  static getPromoters(): User[] {
    return this.getUsers().filter((u) => u.role === 'PROMOTOR');
  }

  static getAdmins(): User[] {
    return this.getUsers().filter((u) => u.role === 'ADMINISTRADOR');
  }

  static getAdmin(): User {
    const users = this.getUsers();
    return users.find((u) => u.role === 'ADMINISTRADOR') || users[0];
  }

  static getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const user = users.find((u) => u.id === currentId);
    return user || users[0];
  }

  static setCurrentUser(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  static saveUsers(users: User[]): void {
    setItemToStorage(STORAGE_KEYS.USERS, users);
  }

  static saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    setItemToStorage(STORAGE_KEYS.USERS, users);
    return user;
  }

  static updateAdminName(name: string): User {
    const users = this.getUsers();
    let adminIndex = users.findIndex((u) => u.role === 'ADMINISTRADOR');
    const trimmedName = name.trim();
    if (adminIndex >= 0) {
      users[adminIndex].name = trimmedName;
    } else if (users.length > 0) {
      users[0].name = trimmedName;
      adminIndex = 0;
    }
    setItemToStorage(STORAGE_KEYS.USERS, users);
    return users[adminIndex >= 0 ? adminIndex : 0];
  }

  static addUser(params: {
    name: string;
    role: UserRole;
    initialPassword?: string;
    email?: string;
    phone?: string;
    username?: string;
    isTestUser?: boolean;
  }): User {
    const users = this.getUsers();
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error('O nome do usuário é obrigatório');
    }

    const prefix =
      params.role === 'ADMINISTRADOR'
        ? 'admin'
        : params.role === 'COLABORADOR'
        ? 'colab'
        : params.role === 'PROMOTOR'
        ? 'promotor'
        : 'vendedor';
    const newUser: User = {
      id: `usr-${prefix}-${Date.now()}`,
      name: trimmedName,
      role: params.role,
      email: params.email?.trim() || undefined,
      phone: params.phone?.trim() || undefined,
      username: params.username?.trim() || undefined,
      isTestUser: Boolean(params.isTestUser),
    };
    users.push(newUser);
    setItemToStorage(STORAGE_KEYS.USERS, users);

    const initialPwd = params.initialPassword?.trim() || '1234';
    this.setUserPassword(newUser.id, initialPwd, initialPwd === '1234').catch((e) =>
      console.error('Error setting initial user password', e)
    );
    return newUser;
  }

  static updateUser(id: string, updates: Partial<User>, newPassword?: string): User | undefined {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index >= 0) {
      users[index] = {
        ...users[index],
        ...updates,
        name: updates.name ? updates.name.trim() : users[index].name,
        isTestUser: updates.isTestUser !== undefined ? Boolean(updates.isTestUser) : users[index].isTestUser,
      };
      setItemToStorage(STORAGE_KEYS.USERS, users);

      if (newPassword && newPassword.trim().length >= 4) {
        this.setUserPassword(id, newPassword.trim(), false).catch((e) =>
          console.error('Error updating user password', e)
        );
      }
      return users[index];
    }
    return undefined;
  }

  static deleteUser(id: string): void {
    const users = this.getUsers().filter((u) => u.id !== id);
    setItemToStorage(STORAGE_KEYS.USERS, users);
    
    // Clean credentials
    const allCreds = this.getAllCredentials();
    if (allCreds[id]) {
      delete allCreds[id];
      this.saveAllCredentials(allCreds);
    }

    // Se o usuário atual excluído estiver ativo, troca para o primeiro restante
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentId === id && users.length > 0) {
      this.setCurrentUser(users[0].id);
    }
  }

  static addSeller(name: string, initialPassword = '1234', email?: string, phone?: string): User {
    return this.addUser({ name, role: 'VENDEDOR', initialPassword, email, phone });
  }

  static updateSeller(id: string, name: string, newPassword?: string): User | undefined {
    return this.updateUser(id, { name }, newPassword);
  }

  static deleteSeller(id: string): void {
    this.deleteUser(id);
  }

  // Categories
  static getCategories(): Category[] {
    const cats = getItemFromStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    let changed = false;
    const normalized = cats.map((c) => {
      if (c.id === 'cat-servicos' && c.name !== 'Serviços') {
        changed = true;
        return { ...c, name: 'Serviços', slug: 'servicos' };
      }
      return c;
    });
    if (changed) {
      setItemToStorage(STORAGE_KEYS.CATEGORIES, normalized);
    }
    return normalized;
  }

  static async saveCategory(category: Category): Promise<Category> {
    if (!category.name || !category.name.trim()) {
      throw new Error('O nome da categoria é obrigatório.');
    }

    const now = new Date().toISOString();
    const catToSend: Category = {
      ...category,
      name: category.name.trim(),
      slug: category.slug || category.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      createdAt: category.createdAt || now,
      updatedAt: now,
    };

    // 1. Envia para a API do backend e aguarda confirmação de gravação no banco
    let serverCat: Category;
    try {
      serverCat = await api.saveCategory(catToSend);
    } catch (err: any) {
      console.error('Falha ao persistir categoria no servidor:', err);
      throw new Error(err.message || 'Falha ao gravar a categoria no banco de dados do servidor.');
    }

    // 2. Com a confirmação autoritativa do servidor, atualiza o cache local
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === serverCat.id);
    if (index >= 0) {
      categories[index] = serverCat;
    } else {
      categories.push(serverCat);
    }
    setItemToStorage(STORAGE_KEYS.CATEGORIES, categories);

    return serverCat;
  }

  static async deleteCategory(id: string, transferToCategoryId?: string): Promise<void> {
    // 1. Envia para o servidor e aguarda confirmação de exclusão
    try {
      await api.deleteCategory(id);
    } catch (err: any) {
      console.error('Falha ao excluir categoria no servidor:', err);
      throw new Error(err.message || 'Falha ao excluir a categoria no servidor.');
    }

    // 2. Atualiza estado local
    const categories = this.getCategories().filter((c) => c.id !== id);
    setItemToStorage(STORAGE_KEYS.CATEGORIES, categories);

    // Ensure products associated with this category are NOT deleted.
    // They are transferred to the specified target category or left uncategorized.
    const items = this.getItems();
    let itemsModified = false;
    const updatedItems = items.map((item) => {
      if (item.categoryId === id) {
        itemsModified = true;
        return {
          ...item,
          categoryId: transferToCategoryId && transferToCategoryId !== id ? transferToCategoryId : '',
        };
      }
      return item;
    });

    if (itemsModified) {
      setItemToStorage(STORAGE_KEYS.ITEMS, updatedItems);
      const modifiedOnly = updatedItems.filter((i) => i.categoryId === (transferToCategoryId || ''));
      if (modifiedOnly.length > 0) {
        api.saveItemsBatch(modifiedOnly).catch(() => {});
      }
    }
  }

  // Customers
  static getCustomers(): Customer[] {
    return getItemFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  static findCustomerByPhone(phone: string): Customer | undefined {
    const clean = normalizePhone(phone);
    if (!clean) return undefined;
    return this.getCustomers().find((c) => normalizePhone(c.phone) === clean);
  }

  static checkDuplicateCustomerPhone(phone: string, excludeCustomerId?: string): Customer | undefined {
    const clean = normalizePhone(phone);
    if (!clean) return undefined;
    return this.getCustomers().find((c) => {
      if (excludeCustomerId && c.id === excludeCustomerId) return false;
      return normalizePhone(c.phone) === clean;
    });
  }

  static saveCustomer(customer: Customer): Customer {
    const cleanPhone = normalizePhone(customer.phone);
    if (!cleanPhone) {
      throw new Error('O Telefone é obrigatório para o cadastro do cliente.');
    }
    if (!customer.name || !customer.name.trim()) {
      throw new Error('O Nome do cliente é obrigatório.');
    }

    // Unicidade garantida por telefone normalizado
    const duplicate = this.checkDuplicateCustomerPhone(customer.phone, customer.id);
    if (duplicate) {
      throw new Error(
        `Já existe um cliente cadastrado com o telefone ${formatPhone(customer.phone)}: "${duplicate.name}".`
      );
    }

    const customers = this.getCustomers();
    const formattedCustomer: Customer = {
      ...customer,
      name: customer.name.trim(),
      phone: formatPhone(customer.phone),
    };

    // If active user is test employee, do not persist to database or localStorage
    if (this.isTestUserActive()) {
      formattedCustomer.isTestCustomer = true;
      return formattedCustomer;
    }

    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      customers[index] = formattedCustomer;
    } else {
      customers.push(formattedCustomer);
    }
    setItemToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    api.saveCustomer(formattedCustomer).catch((e) => console.debug('Background saveCustomer sync notice:', e));
    return formattedCustomer;
  }

  static deleteCustomer(id: string): void {
    if (this.isTestUserActive()) return;
    const customers = this.getCustomers().filter((c) => c.id !== id);
    setItemToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    api.deleteCustomer(id).catch((e) => console.debug('Background deleteCustomer sync notice:', e));
  }

  // Items
  static getItems(): Item[] {
    const items = getItemFromStorage(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
    const onlineServices = this.getOnlineServices();
    const existingIds = new Set(items.map((i) => i.id));
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    let hasChanges = false;

    // Normalize any previous cat-servicos-digitais to cat-servicos
    const updatedItems = items.map((it) => {
      if (it.categoryId === 'cat-servicos-digitais') {
        hasChanges = true;
        return { ...it, categoryId: 'cat-servicos' };
      }
      return it;
    });

    // Ensure all real online services are classified under the existing category 'cat-servicos' (Serviços)
    for (const svc of onlineServices) {
      const itemId = `prod-srv-${svc.id.replace('srv-', '')}`;
      const existingItem = updatedItems.find(
        (it) => it.id === itemId || it.id === svc.id || it.name.toLowerCase().trim() === svc.name.toLowerCase().trim()
      );

      if (existingItem) {
        if (!existingItem.serviceUrl && !existingItem.url && svc.url) {
          existingItem.serviceUrl = svc.url;
          existingItem.url = svc.url;
          hasChanges = true;
        }
      } else if (!existingIds.has(itemId) && !existingIds.has(svc.id) && !existingNames.has(svc.name.toLowerCase().trim())) {
        const costPrice = svc.cost || 0;
        const salePrice = svc.price || 15.0;
        const marginReais = Number((salePrice - costPrice).toFixed(2));
        const marginPercent = salePrice > 0 ? Number(((marginReais / salePrice) * 100).toFixed(2)) : 0;
        const onlineItem: Item = {
          id: itemId,
          name: svc.name,
          type: 'SERVICO',
          categoryId: 'cat-servicos',
          sku: `SRV-${svc.id.replace('srv-', '').toUpperCase()}`,
          description: svc.description || 'Serviço online prestado no balcão',
          supplierCost: costPrice,
          supplierFreight: 0,
          costPrice,
          salePrice,
          marginReais,
          marginPercent,
          stock: 999,
          minStock: 0,
          pricingModel: 'POR_UNIDADE',
          productionType: 'PRODUCAO_PROPRIA',
          serviceUrl: svc.url,
          url: svc.url,
          active: svc.active !== false,
          showInCatalog: true,
          featuredInCatalog: false,
          createdAt: svc.createdAt,
          updatedAt: svc.updatedAt,
        };
        updatedItems.push(onlineItem);
        existingIds.add(itemId);
        existingNames.add(svc.name.toLowerCase().trim());
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setItemToStorage(STORAGE_KEYS.ITEMS, updatedItems);
    }
    return updatedItems;
  }

  static getItemById(id: string): Item | undefined {
    return this.getItems().find((i) => i.id === id);
  }

  static generateNextSku(type: ItemType): string {
    const items = this.getItems();
    let prefix = 'GRF-';
    if (type === 'PRODUTO_FISICO') prefix = 'FIS-';
    if (type === 'SERVICO') prefix = 'SRV-';

    const matchingSkus = items
      .map((i) => i.sku)
      .filter((sku) => sku && sku.startsWith(prefix));

    let maxNum = 0;
    matchingSkus.forEach((sku) => {
      const parts = sku.split('-');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  static async saveItem(item: Item): Promise<Item> {
    if (!item.name || !item.name.trim()) {
      throw new Error('O nome do item é obrigatório.');
    }
    if (!item.sku || !item.sku.trim()) {
      throw new Error('O SKU do item é obrigatório.');
    }

    // Recompute margins
    const cost = item.costPrice || 0;
    const sale = item.salePrice || 0;
    const marginReais = item.marginReais !== undefined ? item.marginReais : Number((sale - cost).toFixed(2));
    const marginPercent = item.marginPercent !== undefined ? item.marginPercent : (sale > 0 ? Number(((marginReais / sale) * 100).toFixed(2)) : 0);
    const now = new Date().toISOString();

    const itemToSend: Item = {
      ...item,
      name: item.name.trim(),
      sku: item.sku.trim().toUpperCase(),
      marginReais,
      marginPercent,
      createdAt: item.createdAt || now,
      updatedAt: now,
    };

    // If active user is test employee, do not persist to database or localStorage
    if (this.isTestUserActive()) {
      itemToSend.isTestItem = true;
      return itemToSend;
    }

    // 1. Envia para o backend e aguarda gravação no banco de dados do servidor
    let serverItem: Item;
    try {
      serverItem = await api.saveItem(itemToSend);
    } catch (err: any) {
      console.error('Falha ao persistir item no servidor:', err);
      throw new Error(err.message || 'Falha ao gravar o produto no banco de dados do servidor.');
    }

    // 2. Com a confirmação autoritativa do servidor, atualiza o cache local
    this.unmarkItemAsDeleted(serverItem.id);

    const items = this.getItems();
    const index = items.findIndex((i) => i.id === serverItem.id);
    if (index >= 0) {
      items[index] = serverItem;
    } else {
      items.unshift(serverItem);
    }
    setItemToStorage(STORAGE_KEYS.ITEMS, items);

    // If saving a service that has a URL, keep corresponding online service synchronized
    if (serverItem.type === 'SERVICO' && (serverItem.serviceUrl !== undefined || serverItem.url !== undefined)) {
      try {
        const newUrl = serverItem.serviceUrl || serverItem.url || '';
        const onlineServices = this.getOnlineServices();
        let svcChanged = false;
        const updatedServices = onlineServices.map((s) => {
          const srvId = `prod-srv-${s.id.replace('srv-', '')}`;
          if (s.id === serverItem.id || srvId === serverItem.id || s.name.toLowerCase().trim() === serverItem.name.toLowerCase().trim()) {
            svcChanged = true;
            return { ...s, url: newUrl, updatedAt: new Date().toISOString() };
          }
          return s;
        });
        if (svcChanged) {
          this.saveOnlineServices(updatedServices);
        }
      } catch (err) {
        console.warn('Notice syncing online service from item:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('items-updated', { detail: serverItem }));
      window.dispatchEvent(new CustomEvent('catalog-updated', { detail: serverItem }));
    }

    return serverItem;
  }

  static async duplicateItem(itemId: string): Promise<Item> {
    const original = this.getItemById(itemId);
    if (!original) {
      throw new Error('Item não encontrado para duplicação');
    }

    const newSku = this.generateNextSku(original.type);
    const now = new Date().toISOString();
    const newId = `item-${Date.now()}`;

    // Deep clone options, variants, packages, price rules with new ids
    const clonedVariants = original.variants?.map((v, i) => ({
      ...v,
      id: `var-${Date.now()}-${i}`,
      sku: `${newSku}-${String(i + 1).padStart(2, '0')}`,
    }));

    const clonedOptions = original.options?.map((opt, i) => ({
      ...opt,
      id: `opt-${Date.now()}-${i}`,
      values: opt.values.map((val, vi) => ({
        ...val,
        id: `val-${Date.now()}-${i}-${vi}`,
      })),
    }));

    const clonedPackages = original.packages?.map((pkg, i) => ({
      ...pkg,
      id: `pkg-${Date.now()}-${i}`,
    }));

    const clonedPriceRules = original.priceRules?.map((pr, i) => ({
      ...pr,
      id: `pr-${Date.now()}-${i}`,
    }));

    const clonedServiceFields = original.serviceFields?.map((sf, i) => ({
      ...sf,
      id: `sf-${Date.now()}-${i}`,
    }));

    const duplicatedItem: Item = {
      ...original,
      id: newId,
      name: `${original.name} - Cópia`,
      sku: newSku,
      barcode: '', // Clear barcode so user can define or leave empty
      variants: clonedVariants,
      options: clonedOptions,
      packages: clonedPackages,
      priceRules: clonedPriceRules,
      serviceFields: clonedServiceFields,
      createdAt: now,
      updatedAt: now,
    };

    return await this.saveItem(duplicatedItem);
  }

  static async deleteItem(id: string): Promise<void> {
    if (this.isTestUserActive()) return;
    // 1. Envia para o servidor e aguarda confirmação de exclusão
    try {
      await api.deleteItem(id);
    } catch (err: any) {
      console.error('Falha ao excluir item no servidor:', err);
      throw new Error(err.message || 'Falha ao excluir o produto no servidor.');
    }

    // 2. Atualiza estado local
    const items = this.getItems().filter((i) => i.id !== id);
    setItemToStorage(STORAGE_KEYS.ITEMS, items);
    this.markItemAsDeleted(id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('items-updated', { detail: { id, deleted: true } }));
      window.dispatchEvent(new CustomEvent('catalog-updated', { detail: { id, deleted: true } }));
    }
  }

  static async toggleItemActive(id: string): Promise<Item | undefined> {
    const item = this.getItemById(id);
    if (!item) return undefined;
    item.active = !item.active;
    return await this.saveItem(item);
  }

  static async toggleItemCatalog(id: string): Promise<Item | undefined> {
    const item = this.getItemById(id);
    if (!item) return undefined;
    item.showInCatalog = !item.showInCatalog;
    return await this.saveItem(item);
  }

  static async importProductsBatch(params: {
    validatedItems: ValidatedImportItem[];
    existingItemsAction: ExistingItemsAction;
    currentUser: User;
  }): Promise<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    createdCategoriesCount: number;
    createdItems: Item[];
    updatedItems: Item[];
  }> {
    const { validatedItems, existingItemsAction, currentUser } = params;
    const items = this.getItems();
    const categories = this.getCategories();
    const movements = this.getInventoryMovements();
    const now = new Date().toISOString();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let createdCategoriesCount = 0;
    const createdItems: Item[] = [];
    const updatedItemsList: Item[] = [];

    // 1. Mapeamento de categorias existentes (case-insensitive)
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.name) categoryMap.set(cat.name.toLowerCase().trim(), cat);
    });

    // 2. Mapeamento de SKUs e códigos de barra em uso
    const usedSkus = new Set<string>(items.map((i) => (i.sku || '').toLowerCase().trim()).filter(Boolean));

    // Contador de SKUs para geração automática rápida
    const skuCounters: { [prefix: string]: number } = {
      'GRF-': 0,
      'FIS-': 0,
      'SRV-': 0,
    };

    items.forEach((item) => {
      ['GRF-', 'FIS-', 'SRV-'].forEach((prefix) => {
        if (item.sku && item.sku.startsWith(prefix)) {
          const num = parseInt(item.sku.replace(prefix, ''), 10);
          if (!isNaN(num) && num > (skuCounters[prefix] || 0)) {
            skuCounters[prefix] = num;
          }
        }
      });
    });

    const getNextBatchSku = (type: ItemType): string => {
      let prefix = 'GRF-';
      if (type === 'PRODUTO_FISICO') prefix = 'FIS-';
      if (type === 'SERVICO') prefix = 'SRV-';

      let nextNum = (skuCounters[prefix] || 0) + 1;
      let candidate = `${prefix}${String(nextNum).padStart(5, '0')}`;
      while (usedSkus.has(candidate.toLowerCase())) {
        nextNum++;
        candidate = `${prefix}${String(nextNum).padStart(5, '0')}`;
      }
      skuCounters[prefix] = nextNum;
      usedSkus.add(candidate.toLowerCase());
      return candidate;
    };

    // 3. Processa criação de novas categorias se necessário
    validatedItems.forEach((vItem) => {
      if (vItem.status !== 'ERROR' && vItem.categoryName) {
        const catKey = vItem.categoryName.toLowerCase().trim();
        if (!categoryMap.has(catKey)) {
          const slug = catKey
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

          const newCat: Category = {
            id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: vItem.categoryName.trim(),
            slug: slug || `cat-${Date.now()}`,
            itemType: vItem.type,
          };
          categories.push(newCat);
          categoryMap.set(catKey, newCat);
          createdCategoriesCount++;
        }
        // Atribui o categoryId correto
        vItem.categoryId = categoryMap.get(catKey)?.id || '';
      }
    });

    // 4. Processa os itens validados
    validatedItems.forEach((vItem, idx) => {
      if (vItem.status === 'ERROR') {
        errorCount++;
        return;
      }

      if (vItem.status === 'EXISTING') {
        if (existingItemsAction === 'SKIP' || existingItemsAction === 'KEEP_CURRENT') {
          skippedCount++;
          return;
        }

        if (existingItemsAction === 'UPDATE' && vItem.existingItem) {
          const itemIdx = items.findIndex((i) => i.id === vItem.existingItem!.id);
          if (itemIdx >= 0) {
            const currentItem = items[itemIdx];
            const oldStock = currentItem.stock || 0;
            const newStock = vItem.stock !== undefined ? vItem.stock : oldStock;

            // Recalcula margens
            const cost = vItem.costPrice > 0 ? vItem.costPrice : currentItem.costPrice;
            const sale = vItem.salePrice > 0 ? vItem.salePrice : currentItem.salePrice;
            const marginReais = Number((sale - cost).toFixed(2));
            const marginPercent = sale > 0 ? Number(((marginReais / sale) * 100).toFixed(2)) : 0;

            const updated: Item = {
              ...currentItem,
              name: vItem.name || currentItem.name,
              barcode: vItem.barcode || currentItem.barcode,
              categoryId: vItem.categoryId || currentItem.categoryId,
              description: vItem.description || currentItem.description,
              brand: vItem.brand || currentItem.brand,
              supplier: vItem.supplier || currentItem.supplier,
              costPrice: cost,
              supplierCost: vItem.supplierCost || currentItem.supplierCost,
              supplierFreight: vItem.supplierFreight || currentItem.supplierFreight,
              salePrice: sale,
              marginReais,
              marginPercent,
              stock: newStock,
              minStock: vItem.minStock !== undefined ? vItem.minStock : currentItem.minStock,
              active: vItem.active !== undefined ? vItem.active : currentItem.active,
              showInCatalog: vItem.showInCatalog !== undefined ? vItem.showInCatalog : currentItem.showInCatalog,
              updatedAt: now,
            };

            items[itemIdx] = updated;
            updatedItemsList.push(updated);
            updatedCount++;

            // Se o estoque foi alterado e o produto é físico, registra movimentação
            if (currentItem.type === 'PRODUTO_FISICO' && newStock !== oldStock) {
              const diff = newStock - oldStock;
              movements.unshift({
                id: `mov-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                itemId: updated.id,
                itemName: updated.name,
                sku: updated.sku,
                type: 'AJUSTE',
                quantity: diff,
                previousStock: oldStock,
                newStock,
                userId: currentUser.id,
                userName: currentUser.name,
                reason: 'Atualização via Importação em Massa de Produtos',
                date: now,
              });
            }
          }
          return;
        }
      }

      // NOVO PRODUTO
      if (vItem.status === 'NEW') {
        let finalSku = vItem.sku ? vItem.sku.trim() : '';
        if (!finalSku || usedSkus.has(finalSku.toLowerCase())) {
          finalSku = getNextBatchSku(vItem.type);
        } else {
          usedSkus.add(finalSku.toLowerCase());
        }

        const newItemId = `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
        const finalBarcode = vItem.barcode?.trim() || undefined;

        const newItem: Item = {
          id: newItemId,
          name: vItem.name.trim(),
          type: vItem.type,
          categoryId: vItem.categoryId || '',
          sku: finalSku,
          barcode: finalBarcode,
          description: vItem.description || '',
          imageUrl: '',
          supplierCost: vItem.supplierCost,
          supplierFreight: vItem.supplierFreight,
          costPrice: vItem.costPrice,
          salePrice: vItem.salePrice,
          marginReais: vItem.marginReais,
          marginPercent: vItem.marginPercent,
          stock: vItem.type === 'PRODUTO_FISICO' ? (vItem.stock || 0) : 0,
          minStock: vItem.type === 'PRODUTO_FISICO' ? (vItem.minStock || 5) : 0,
          brand: vItem.brand || undefined,
          supplier: vItem.supplier || undefined,
          active: vItem.active !== undefined ? vItem.active : true,
          showInCatalog: vItem.showInCatalog !== undefined ? vItem.showInCatalog : true,
          featuredInCatalog: false,
          productionType: vItem.productionType,
          pricingModel: vItem.pricingModel,
          leadTime: vItem.leadTime,
          createdAt: now,
          updatedAt: now,
        };

        items.unshift(newItem);
        createdItems.push(newItem);
        createdCount++;

        // Movimentação de estoque para produtos físicos com saldo inicial > 0
        if (newItem.type === 'PRODUTO_FISICO' && (newItem.stock || 0) > 0) {
          movements.unshift({
            id: `mov-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            itemId: newItem.id,
            itemName: newItem.name,
            sku: newItem.sku,
            type: 'ENTRADA',
            quantity: newItem.stock || 0,
            previousStock: 0,
            newStock: newItem.stock || 0,
            userId: currentUser.id,
            userName: currentUser.name,
            reason: 'Saldo Inicial — Importação em Massa de Produtos',
            date: now,
          });
        }
      }
    });

    // Salva tudo no Storage local
    setItemToStorage(STORAGE_KEYS.ITEMS, items);
    setItemToStorage(STORAGE_KEYS.CATEGORIES, categories);
    setItemToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);

    // Sincroniza imediatamente com o banco de dados oficial do servidor
    try {
      await Promise.all([
        api.saveCategoriesBatch(categories),
        api.saveItemsBatch(items),
        movements.length > 0 ? api.saveInventoryMovementsBatch(movements) : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn('Sync batch notice during import:', e);
    }

    return {
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      createdCategoriesCount,
      createdItems,
      updatedItems: updatedItemsList,
    };
  }

  // Sales & POS Checkout
  static getSales(): Sale[] {
    const rawSales = getItemFromStorage(STORAGE_KEYS.SALES, INITIAL_SALES);
    const accounts = this.getReceivingAccounts();
    const defaultCardAccount =
      accounts.find((a) => a.active && a.type === 'CARTAO' && a.isDefault) ||
      accounts.find((a) => a.active && a.type === 'CARTAO') ||
      accounts.find((a) => a.type === 'CARTAO');

    let anySaleChanged = false;
    const enrichedSales = rawSales.map((sale) => {
      if (!sale.payments || !sale.payments.length) return sale;
      let hasChange = false;
      const updatedPayments = sale.payments.map((p) => {
        const pMethod = String(p.method || '');
        const isCredit =
          p.cardType === 'CREDITO' ||
          pMethod.toLowerCase().includes('crédito') ||
          pMethod.toLowerCase().includes('credito');
        const isDebit =
          p.cardType === 'DEBITO' ||
          pMethod.toLowerCase().includes('débito') ||
          pMethod.toLowerCase().includes('debito');
        const isCard = isCredit || isDebit || pMethod.toLowerCase().includes('cart');

        if (isCard && (!p.feeAmount || p.feeAmount === 0 || !p.feePercent || p.netAmount === undefined)) {
          const acc =
            (p.accountId ? accounts.find((a) => a.id === p.accountId) : undefined) ||
            defaultCardAccount;
          let feeRate = p.feePercent || 0;
          if (feeRate === 0 && acc) {
            feeRate = isCredit ? (acc.creditFeePercent ?? 3.5) : (acc.debitFeePercent ?? 1.5);
          } else if (feeRate === 0) {
            feeRate = isCredit ? 3.5 : 1.5;
          }
          const gross = Number((p.amount || 0).toFixed(2));
          const feeAmt = feeRate > 0 ? Number(((gross * feeRate) / 100).toFixed(2)) : 0;
          const netAmt = Number((gross - feeAmt).toFixed(2));
          hasChange = true;
          return {
            ...p,
            accountId: p.accountId || acc?.id || 'acc-cartao-empresa',
            accountName: p.accountName || acc?.name || 'Cartão — Empresa',
            accountType: 'CARTAO' as AccountType,
            cardType: isCredit ? ('CREDITO' as const) : ('DEBITO' as const),
            feePercent: feeRate,
            feeAmount: feeAmt,
            netAmount: netAmt,
          };
        }
        return p;
      });

      if (hasChange) {
        anySaleChanged = true;
        return { ...sale, payments: updatedPayments };
      }
      return sale;
    });

    if (anySaleChanged) {
      setItemToStorage(STORAGE_KEYS.SALES, enrichedSales);
    }

    return enrichedSales;
  }

  static getSaleById(id: string): Sale | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  static createSale(params: {
    seller: User;
    customer?: Customer;
    cartItems: CartItem[];
    freight?: number;
    discount: number;
    payments: PaymentRecord[];
    paymentStatus: PaymentStatus;
    dueDate?: string;
    notes?: string;
    promoterId?: string;
    promoterName?: string;
  }): { sale: Sale; productionOrdersCreated: ProductionOrder[] } {
    const {
      seller,
      customer,
      cartItems,
      freight: paramFreight,
      discount,
      payments,
      paymentStatus,
      dueDate,
      notes,
      promoterId: paramPromoterId,
      promoterName: paramPromoterName,
    } = params;

    if (!cartItems.length) {
      throw new Error('O carrinho está vazio');
    }

    // Determine promoter info: if explicitly provided or from customer/seller
    let finalPromoterId = paramPromoterId;
    let finalPromoterName = paramPromoterName;

    if (!finalPromoterId && customer?.promoterId) {
      finalPromoterId = customer.promoterId;
      finalPromoterName = customer.promoterName;
    }

    if (!finalPromoterId && seller.role === 'PROMOTOR') {
      finalPromoterId = seller.id;
      finalPromoterName = seller.name;
    }

    const isTestMode = Boolean(
      seller?.isTestUser ||
      this.isTestUserActive()
    );

    const isPromoterSale = Boolean(finalPromoterId);

    const sales = this.getSales();
    const existingNumbers = sales.map((s) => {
      const match = String(s.saleNumber || '').match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxSaleNum = Math.max(0, ...existingNumbers, sales.length);
    const nextSaleNumber = `VND-${new Date().getFullYear()}-${String(maxSaleNum + 1).padStart(4, '0')}`;
    const saleId = `sale-${Date.now()}`;
    const now = new Date().toISOString();

    let subtotal = 0;
    let totalCost = 0;

    const saleItems = cartItems.map((cartItem, idx) => {
      subtotal += cartItem.totalPrice;
      totalCost += cartItem.totalCost;

      return {
        id: `si-${Date.now()}-${idx}`,
        itemId: cartItem.item.id,
        itemName: cartItem.item.name,
        itemType: cartItem.item.type,
        sku: cartItem.item.sku,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        unitCost: cartItem.unitCost,
        totalPrice: cartItem.totalPrice,
        totalCost: cartItem.totalCost,
        configuration: cartItem.configuration,
      };
    });

    const hasThirdParty = cartItems.some(
      (ci) =>
        ci.item?.productionType === 'PRODUCAO_TERCEIRIZADA' ||
        (ci.item as any)?.production_type === 'PRODUCAO_TERCEIRIZADA' ||
        (Number(ci.item?.supplierFreight) > 0)
    );
    const companySettings = this.getCompanySettings();
    const adminFreight =
      companySettings?.defaultSupplierFreight !== undefined
        ? Number(companySettings.defaultSupplierFreight)
        : 20.0;
    const finalFreight =
      paramFreight !== undefined
        ? Number(paramFreight)
        : hasThirdParty && adminFreight > 0
        ? adminFreight
        : 0;

    const total = Math.max(0, Number((subtotal + finalFreight - discount).toFixed(2)));

    // Enrich payments with account details, card fees, and active cash register
    const activeRegister = this.getCurrentCashRegister();
    const accounts = this.getReceivingAccounts();

    const enrichedPayments: PaymentRecord[] = payments.map((p) => {
      let account = p.accountId ? accounts.find((a) => a.id === p.accountId) : undefined;
      const pMethod = String(p.method || '');
      const isCredit =
        p.cardType === 'CREDITO' ||
        pMethod.toLowerCase().includes('crédito') ||
        pMethod.toLowerCase().includes('credito');
      const isDebit =
        p.cardType === 'DEBITO' ||
        pMethod.toLowerCase().includes('débito') ||
        pMethod.toLowerCase().includes('debito');
      const isCard = isCredit || isDebit || pMethod.toLowerCase().includes('cart');

      if (isCard && (!account || account.type !== 'CARTAO')) {
        const cardAcc =
          accounts.find((a) => a.active && a.type === 'CARTAO' && a.isDefault) ||
          accounts.find((a) => a.active && a.type === 'CARTAO') ||
          accounts.find((a) => a.type === 'CARTAO');
        if (cardAcc) account = cardAcc;
      }

      let feePercent = p.feePercent ?? 0;
      if (feePercent === 0 && (account || isCard)) {
        if (isCredit) {
          feePercent = account?.creditFeePercent !== undefined ? account.creditFeePercent : 3.5;
        } else if (isDebit) {
          feePercent = account?.debitFeePercent !== undefined ? account.debitFeePercent : 1.5;
        } else if (isCard) {
          feePercent = account?.creditFeePercent !== undefined ? account.creditFeePercent : 3.5;
        }
      }

      const grossAmount = Number(p.amount.toFixed(2));
      const feeAmount =
        p.feeAmount !== undefined && p.feeAmount > 0
          ? p.feeAmount
          : feePercent > 0
          ? Number(((grossAmount * feePercent) / 100).toFixed(2))
          : 0;
      const netAmount =
        p.netAmount !== undefined ? p.netAmount : Number((grossAmount - feeAmount).toFixed(2));

      return {
        ...p,
        amount: grossAmount,
        accountId: p.accountId || account?.id,
        accountName: p.accountName || account?.name,
        accountType: p.accountType || account?.type || (isCard ? 'CARTAO' : 'CAIXA'),
        cardType: p.cardType || (isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined),
        feePercent,
        feeAmount,
        netAmount,
        cashRegisterId: p.cashRegisterId || (activeRegister ? activeRegister.id : undefined),
      };
    });

    const paidAmount = enrichedPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingAmount = Math.max(0, Number((total - paidAmount).toFixed(2)));

    // 1. Incluir frete do fornecedor no cálculo interno do custo do produto terceirizado
    let finalTotalCost = totalCost;
    if (hasThirdParty && finalFreight > 0) {
      const alreadyHasFreightInItems = cartItems.some((ci) => {
        const itemFreight = Number(ci.item?.supplierFreight) || 0;
        return itemFreight > 0 && ci.unitCost >= (Number(ci.item?.supplierCost) || 0) + itemFreight;
      });
      if (!alreadyHasFreightInItems) {
        finalTotalCost = Number((finalTotalCost + finalFreight).toFixed(2));
      }
    }

    const grossProfit = Number((total - finalTotalCost).toFixed(2));
    const grossMarginPercent = total > 0 ? Number(((grossProfit / total) * 100).toFixed(2)) : 0;

    // Calculate seller commission and company share based on configured ItemType rates
    const commissionRates = this.getCommissionRates();
    const promoterRatePercent = this.getPromoterCommissionPercent();
    const subtotalSafe = Math.max(0.01, subtotal);
    const discountRatio = total / subtotalSafe;
    let totalCommission = 0;

    const enrichedSaleItems = saleItems.map((si) => {
      // Obter percentual de comissão correspondente ao Tipo de Item configurado pelo Administrador
      const configuredRate = commissionRates[si.itemType] ?? 0;
      const rate = Math.max(0, Math.min(100, Number(configuredRate)));
      
      const netItemTotal = Number((si.totalPrice * discountRatio).toFixed(2));
      const itemComm = Number(((netItemTotal * rate) / 100).toFixed(2));
      totalCommission += itemComm;

      return {
        ...si,
        commissionRate: rate,
        commissionAmount: itemComm,
      };
    });

    const finalCommissionPool = paymentStatus === 'CANCELADO' ? 0 : Number(totalCommission.toFixed(2));
    const finalCompanyAmount = paymentStatus === 'CANCELADO' ? 0 : Number(Math.max(0, total - finalCommissionPool).toFixed(2));
    const avgCommissionRate = total > 0 ? Number(((finalCommissionPool / total) * 100).toFixed(2)) : 0;

    // Split between Seller and Promoter: Promoter gets % of the Seller's commission pool
    let promoterCommissionAmount = 0;
    let sellerCommissionAmount = finalCommissionPool;

    if (isPromoterSale && finalCommissionPool > 0) {
      promoterCommissionAmount = Number(((finalCommissionPool * promoterRatePercent) / 100).toFixed(2));
      sellerCommissionAmount = Number(Math.max(0, finalCommissionPool - promoterCommissionAmount).toFixed(2));
    }

    const newSale: Sale = {
      id: saleId,
      saleNumber: nextSaleNumber,
      sellerId: seller.id,
      sellerName: seller.name,
      promoterId: finalPromoterId || undefined,
      promoterName: finalPromoterName || undefined,
      isPromoterSale,
      promoterCommissionPercent: isPromoterSale ? promoterRatePercent : undefined,
      promoterCommissionAmount: isPromoterSale ? promoterCommissionAmount : 0,
      sellerCommissionAmount,
      customerId: customer?.id,
      customerName: customer?.name || 'Cliente Balcão / Não Identificado',
      customerPhone: customer?.phone,
      customerDocument: customer?.document,
      items: enrichedSaleItems,
      subtotal: Number(subtotal.toFixed(2)),
      freight: finalFreight,
      shippingCost: finalFreight,
      addition: finalFreight,
      discount: Number(discount.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalCost: Number(finalTotalCost.toFixed(2)),
      grossProfit,
      grossMarginPercent,
      commissionRate: avgCommissionRate,
      commissionAmount: finalCommissionPool,
      companyAmount: finalCompanyAmount,
      paymentStatus,
      paymentMethod:
        enrichedPayments.length > 0
          ? enrichedPayments.map((p) => p.method).join(', ')
          : paymentStatus === 'A_PRAZO'
          ? 'A Prazo'
          : 'Pendente',
      isTestSale: isTestMode,
      payments: enrichedPayments,
      paidAmount: Number(paidAmount.toFixed(2)),
      remainingAmount,
      dueDate,
      status: 'CONCLUIDA',
      notes,
      createdAt: now,
      updatedAt: now,
    };

    if (isTestMode) {
      // Simulação para Usuário de Testes: não debita estoque, não cria ordem de produção, não lança a receber, não salva venda e não envia para o backend.
      return { sale: newSale, productionOrdersCreated: [] };
    }

    // 1. Stock reduction for physical items & inventory movements
    cartItems.forEach((ci) => {
      if (ci.item.type === 'PRODUTO_FISICO') {
        this.reduceItemStock({
          itemId: ci.item.id,
          variantId: ci.configuration.variantId,
          quantity: ci.quantity,
          saleNumber: nextSaleNumber,
          user: seller,
        });
      }
    });

    // 2. Automatically generate Production Orders for Graphic items
    const productionOrdersCreated: ProductionOrder[] = [];
    const allProdOrders = this.getProductionOrders();

    saleItems.forEach((si, idx) => {
      if (si.itemType === 'PRODUTO_GRAFICO') {
        const itemObj = this.getItemById(si.itemId);
        const orderNumber = `PRD-${new Date().getFullYear()}-${String(allProdOrders.length + productionOrdersCreated.length + 1).padStart(4, '0')}`;
        
        const prodOrder: ProductionOrder = {
          id: `prd-${Date.now()}-${idx}`,
          orderNumber,
          saleId: newSale.id,
          saleNumber: newSale.saleNumber,
          saleItemId: si.id,
          itemId: si.itemId,
          itemName: si.itemName,
          quantity: si.quantity,
          configuration: si.configuration,
          customerId: customer?.id,
          customerName: customer?.name || 'Cliente Balcão',
          customerPhone: customer?.phone,
          sellerId: seller.id,
          sellerName: seller.name,
          promoterId: finalPromoterId || undefined,
          promoterName: finalPromoterName || undefined,
          productionType: itemObj?.productionType || 'PRODUCAO_PROPRIA',
          leadTime: itemObj?.leadTime || '2 a 3 dias úteis',
          status: 'AGUARDANDO_PRODUCAO',
          files: [],
          notes: si.configuration.notes || `Produção gerada pela venda ${newSale.saleNumber}`,
          createdAt: now,
          updatedAt: now,
        };

        productionOrdersCreated.push(prodOrder);
      }
    });

    if (productionOrdersCreated.length > 0) {
      allProdOrders.unshift(...productionOrdersCreated);
      setItemToStorage(STORAGE_KEYS.PRODUCTION, allProdOrders);
      api.saveProductionOrdersBatch(productionOrdersCreated).catch((e) => console.debug('Notice saving production orders batch to server:', e));
      notifyRealtime('production-updated', { count: productionOrdersCreated.length });
    }

    // 3. Register Accounts Receivable if pending, a prazo, or partially paid
    if (remainingAmount > 0 || paymentStatus === 'PENDENTE' || paymentStatus === 'PARCIALMENTE_PAGO' || paymentStatus === 'A_PRAZO') {
      const receivables = this.getReceivables();
      const receivableStatus: ReceivableStatus =
        remainingAmount <= 0
          ? 'PAGO'
          : paymentStatus === 'A_PRAZO'
          ? 'A_PRAZO'
          : paidAmount > 0
          ? 'PARCIALMENTE_PAGO'
          : 'PENDENTE';

      const newReceivable: Receivable = {
        id: `rec-${Date.now()}`,
        saleId: newSale.id,
        saleNumber: newSale.saleNumber,
        customerId: customer?.id,
        customerName: customer?.name || 'Cliente Balcão',
        customerPhone: customer?.phone,
        totalAmount: newSale.total,
        paidAmount: newSale.paidAmount,
        remainingAmount: newSale.remainingAmount,
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: receivableStatus,
        payments: [...enrichedPayments],
        createdAt: now,
      };
      receivables.unshift(newReceivable);
      setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);
    }

    // 4. Save Sale
    sales.unshift(newSale);
    setItemToStorage(STORAGE_KEYS.SALES, sales);
    api.saveSale(newSale).catch((e) => console.debug('Background saveSale sync notice:', e));

    return { sale: newSale, productionOrdersCreated };
  }

  static cancelSale(saleId: string, user?: User): Sale {
    const currentUser = user || this.getCurrentUser();
    if (this.isTestUserActive() || currentUser?.isTestUser) {
      const sales = this.getSales();
      const s = sales.find((x) => x.id === saleId);
      if (s) return { ...s, status: 'CANCELADA', paymentStatus: 'CANCELADO' };
      throw new Error('Venda não encontrada');
    }
    if (currentUser?.role && currentUser.role !== 'ADMINISTRADOR') {
      throw new Error('Apenas Administradores podem cancelar vendas concluídas.');
    }

    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === saleId);
    if (saleIndex < 0) {
      throw new Error('Venda não encontrada');
    }

    const sale = sales[saleIndex];
    if (sale.status === 'CANCELADA' || sale.paymentStatus === 'CANCELADO') {
      throw new Error('Esta venda já foi cancelada anteriormente.');
    }

    // 1. Revert inventory
    if (Array.isArray(sale.items)) {
      sale.items.forEach((si) => {
        const itemObj = (si as any).item;
        if (si.itemType === 'PRODUTO_FISICO' || itemObj?.type === 'PRODUTO_FISICO') {
          this.restoreItemStock({
            itemId: si.itemId || itemObj?.id,
            variantId: si.configuration?.variantId,
            quantity: si.quantity,
            saleNumber: sale.saleNumber,
            user: currentUser || this.getCurrentUser(),
          });
        }
      });
    }

    // 2. Cancel associated production orders
    const prodOrders = this.getProductionOrders();
    const updatedProdOrders = prodOrders.map((po) => {
      if (po.saleId === saleId) {
        return {
          ...po,
          status: 'CANCELADO' as ProductionStatus,
          updatedAt: new Date().toISOString(),
          notes: `${po.notes ? po.notes + ' | ' : ''}Cancelado devido ao cancelamento da venda ${sale.saleNumber}.`,
        };
      }
      return po;
    });
    setItemToStorage(STORAGE_KEYS.PRODUCTION, updatedProdOrders);
    const affectedOrders = updatedProdOrders.filter((po) => po.saleId === saleId);
    if (affectedOrders.length > 0) {
      api.saveProductionOrdersBatch(affectedOrders).catch((e) => console.debug('Notice syncing cancelled production orders:', e));
      notifyRealtime('production-updated', { saleId, cancelled: true });
    }

    // 3. Update receivables
    const receivables = this.getReceivables().filter((r) => r.saleId !== saleId);
    setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);

    // 4. Mark sale as CANCELADA
    sale.status = 'CANCELADA';
    sale.paymentStatus = 'CANCELADO';
    sale.updatedAt = new Date().toISOString();
    const userName = currentUser?.name || 'Administrador';
    sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}Cancelada por ${userName} em ${new Date().toLocaleString('pt-BR')}.`;
    sales[saleIndex] = sale;
    setItemToStorage(STORAGE_KEYS.SALES, sales);
    api.cancelSale(saleId).catch((e) => console.debug('Background cancelSale sync notice:', e));
    return sale;
  }

  static softDeleteSale(params: {
    saleId: string;
    reason: string;
    user?: User;
  }): Sale {
    const currentUser = params.user || this.getCurrentUser();
    if (this.isTestUserActive() || currentUser?.isTestUser) {
      const sales = this.getSales();
      const s = sales.find((x) => x.id === params.saleId);
      if (s) return { ...s, status: 'EXCLUIDA', isDeleted: true, paymentStatus: 'CANCELADO' };
      throw new Error('Venda não encontrada');
    }

    if (currentUser?.role && currentUser.role !== 'ADMINISTRADOR') {
      throw new Error('Apenas Administradores têm permissão para excluir vendas finalizadas.');
    }
    if (!params.reason?.trim()) {
      throw new Error('É obrigatório informar o motivo da exclusão da venda.');
    }

    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === params.saleId);
    if (saleIndex < 0) {
      throw new Error('Venda não encontrada no sistema.');
    }

    const sale = sales[saleIndex];
    if (sale.status === 'EXCLUIDA' || sale.isDeleted) {
      throw new Error('Esta venda já foi excluída anteriormente.');
    }

    const now = new Date().toISOString();
    const userName = currentUser?.name || 'Administrador';
    const reason = params.reason.trim();

    // 1. Reverter estoque dos produtos físicos com motivo auditável
    if (Array.isArray(sale.items)) {
      sale.items.forEach((si) => {
        const itemObj = (si as any).item;
        if (si.itemType === 'PRODUTO_FISICO' || itemObj?.type === 'PRODUTO_FISICO') {
          this.restoreItemStock({
            itemId: si.itemId || itemObj?.id,
            variantId: si.configuration?.variantId,
            quantity: si.quantity,
            saleNumber: sale.saleNumber,
            user: currentUser,
            reason: `Devolução por exclusão da venda ${sale.saleNumber} - Motivo: ${reason}`,
          });
        }
      });
    }

    // 2. Cancelar ordens de produção associadas
    const prodOrders = this.getProductionOrders();
    const updatedProdOrders = prodOrders.map((po) => {
      if (po.saleId === params.saleId) {
        return {
          ...po,
          status: 'CANCELADO' as ProductionStatus,
          updatedAt: now,
          notes: `${po.notes ? po.notes + ' | ' : ''}Cancelado devido à exclusão da venda ${sale.saleNumber}. Motivo: ${reason}`,
        };
      }
      return po;
    });
    setItemToStorage(STORAGE_KEYS.PRODUCTION, updatedProdOrders);
    const affectedOrders = updatedProdOrders.filter((po) => po.saleId === params.saleId);
    if (affectedOrders.length > 0) {
      api.saveProductionOrdersBatch(affectedOrders).catch((e) => console.debug('Notice syncing cancelled production orders:', e));
      notifyRealtime('production-updated', { saleId: params.saleId, cancelled: true });
    }

    // 3. Cancelar contas a receber vinculadas
    const receivables = this.getReceivables().filter((r) => r.saleId !== params.saleId);
    setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);

    // 4. Atualizar venda com soft delete
    sale.status = 'EXCLUIDA';
    sale.isDeleted = true;
    sale.deletedAt = now;
    sale.deletedBy = currentUser.id;
    sale.deletedByName = userName;
    sale.deletionReason = reason;
    sale.paymentStatus = 'CANCELADO';
    sale.updatedAt = now;
    sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}Excluída por ${userName} em ${new Date().toLocaleString('pt-BR')}. Motivo: ${reason}`;

    sales[saleIndex] = sale;
    setItemToStorage(STORAGE_KEYS.SALES, sales);

    api.softDeleteSale(sale.id, reason, { id: currentUser.id, name: userName }).catch((e) =>
      console.debug('Background softDeleteSale sync notice:', e)
    );

    return sale;
  }

  static editCompletedSale(params: {
    saleId: string;
    reason: string;
    user?: User;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerDocument?: string;
    sellerId?: string;
    sellerName?: string;
    items: SaleItem[];
    discount?: number;
    addition?: number;
    payments?: PaymentRecord[];
    dueDate?: string;
    notes?: string;
  }): Sale {
    const currentUser = params.user || this.getCurrentUser();
    if (this.isTestUserActive() || currentUser?.isTestUser) {
      const sales = this.getSales();
      const s = sales.find((x) => x.id === params.saleId);
      if (s) return { ...s, ...params, status: 'EDITADA', updatedAt: new Date().toISOString() };
      throw new Error('Venda não encontrada');
    }

    if (currentUser?.role && currentUser.role !== 'ADMINISTRADOR' && currentUser.role !== 'COLABORADOR') {
      throw new Error('Você não possui permissão para editar vendas finalizadas.');
    }
    if (!params.reason?.trim()) {
      throw new Error('É obrigatório informar o motivo da alteração da venda.');
    }
    if (!params.items || params.items.length === 0) {
      throw new Error('A venda deve conter pelo menos um item.');
    }

    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === params.saleId);
    if (saleIndex < 0) {
      throw new Error('Venda não encontrada no sistema.');
    }

    const sale = sales[saleIndex];
    if (sale.status === 'CANCELADA' || sale.status === 'EXCLUIDA' || sale.isDeleted) {
      throw new Error('Não é possível editar uma venda cancelada ou excluída.');
    }

    const now = new Date().toISOString();
    const userName = currentUser?.name || 'Usuário';
    const reason = params.reason.trim();

    // Snapshot dos dados anteriores para histórico e auditoria
    const previousTotal = Number(sale.total) || 0;
    const previousPaidAmount = Number(sale.paidAmount) || 0;
    const previousItemsCount = sale.items?.length || 0;
    const previousItems = [...(sale.items || [])];
    const previousDataJson = JSON.stringify(sale);

    // 1. Reverter estoque dos itens originais da venda
    previousItems.forEach((si) => {
      const itemObj = (si as any).item;
      if (si.itemType === 'PRODUTO_FISICO' || itemObj?.type === 'PRODUTO_FISICO') {
        this.restoreItemStock({
          itemId: si.itemId || itemObj?.id,
          variantId: si.configuration?.variantId,
          quantity: si.quantity,
          saleNumber: sale.saleNumber,
          user: currentUser,
          reason: `Estorno para edição da venda ${sale.saleNumber} - Motivo: ${reason}`,
        });
      }
    });

    // 2. Dar baixa no estoque com base nos novos itens da venda
    params.items.forEach((si) => {
      const itemObj = (si as any).item;
      if (si.itemType === 'PRODUTO_FISICO' || itemObj?.type === 'PRODUTO_FISICO') {
        this.reduceItemStock({
          itemId: si.itemId || itemObj?.id,
          variantId: si.configuration?.variantId,
          quantity: si.quantity,
          saleNumber: sale.saleNumber,
          user: currentUser,
          reason: `Saída por venda editada ${sale.saleNumber} - Motivo: ${reason}`,
        });
      }
    });

    // 3. Recalcular valores financeiros
    const subtotal = params.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const discount = params.discount !== undefined ? Number(params.discount) : (Number(sale.discount) || 0);
    const addition = params.addition !== undefined ? Number(params.addition) : (Number(sale.addition || sale.freight) || 0);
    const total = Math.max(0, Number((subtotal + addition - discount).toFixed(2)));

    // Custos e lucros
    const totalCost = params.items.reduce((sum, item) => {
      const unitCost = Number(item.unitCost || (item.totalCost && item.quantity ? item.totalCost / item.quantity : 0));
      return sum + unitCost * item.quantity;
    }, 0);
    const grossProfit = Math.max(0, total - totalCost);
    const grossMarginPercent = total > 0 ? (grossProfit / total) * 100 : 0;

    // Gerenciar pagamentos
    const payments = params.payments || sale.payments || [];
    const accounts = this.getReceivingAccounts();
    const activeSession = this.getCurrentCashRegister();

    const enrichedPayments: PaymentRecord[] = payments.map((p) => {
      let accId = p.accountId;
      let accName = p.accountName;
      let accType = p.accountType;
      if (!accId && accounts.length > 0) {
        if (p.method === 'DINHEIRO') {
          const cashAcc = accounts.find((a) => a.type === 'CAIXA' && a.active);
          if (cashAcc) {
            accId = cashAcc.id;
            accName = cashAcc.name;
            accType = cashAcc.type;
          }
        } else if (p.method === 'PIX') {
          const pixAcc = accounts.find((a) => a.type === 'PIX' && a.active) || accounts[0];
          if (pixAcc) {
            accId = pixAcc.id;
            accName = pixAcc.name;
            accType = pixAcc.type;
          }
        }
      }
      return {
        ...p,
        accountId: accId,
        accountName: accName,
        accountType: accType,
        cashRegisterId: p.cashRegisterId || (p.method === 'DINHEIRO' && activeSession ? activeSession.id : undefined),
      };
    });

    const paidAmount = enrichedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remainingAmount = Math.max(0, Number((total - paidAmount).toFixed(2)));

    let paymentStatus: PaymentStatus = sale.paymentStatus;
    if (sale.paymentStatus === 'A_PRAZO') {
      paymentStatus = remainingAmount <= 0 ? 'PAGO' : 'A_PRAZO';
    } else {
      paymentStatus = remainingAmount <= 0 ? 'PAGO' : paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE';
    }

    // 4. Sincronizar contas a receber
    const receivables = this.getReceivables();
    const recIndex = receivables.findIndex((r) => r.saleId === sale.id);
    if (remainingAmount > 0 || paymentStatus === 'PENDENTE' || paymentStatus === 'PARCIALMENTE_PAGO' || paymentStatus === 'A_PRAZO') {
      const recStatus: ReceivableStatus =
        remainingAmount <= 0
          ? 'PAGO'
          : paymentStatus === 'A_PRAZO'
          ? 'A_PRAZO'
          : paidAmount > 0
          ? 'PARCIALMENTE_PAGO'
          : 'PENDENTE';

      if (recIndex >= 0) {
        receivables[recIndex] = {
          ...receivables[recIndex],
          customerName: params.customerName || sale.customerName,
          customerPhone: params.customerPhone || sale.customerPhone,
          totalAmount: total,
          paidAmount,
          remainingAmount,
          dueDate: params.dueDate || receivables[recIndex].dueDate,
          status: recStatus,
          payments: enrichedPayments,
        };
      } else {
        receivables.unshift({
          id: `rec-${Date.now()}`,
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          customerId: params.customerId || sale.customerId,
          customerName: params.customerName || sale.customerName,
          customerPhone: params.customerPhone || sale.customerPhone,
          totalAmount: total,
          paidAmount,
          remainingAmount,
          dueDate: params.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          status: recStatus,
          payments: enrichedPayments,
          createdAt: sale.createdAt,
        });
      }
      setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);
    } else if (recIndex >= 0) {
      receivables[recIndex] = {
        ...receivables[recIndex],
        totalAmount: total,
        paidAmount: total,
        remainingAmount: 0,
        status: 'PAGO',
        payments: enrichedPayments,
      };
      setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);
    }

    // 5. Atualizar ordens de produção para itens gráficos
    const prodOrders = this.getProductionOrders();
    const existingOrdersForSale = prodOrders.filter((po) => po.saleId === sale.id);
    if (existingOrdersForSale.length > 0) {
      prodOrders.forEach((po) => {
        if (po.saleId === sale.id && po.status !== 'ENTREGUE' && po.status !== 'CANCELADO') {
          po.status = 'CANCELADO' as ProductionStatus;
          po.updatedAt = now;
          po.notes = `${po.notes ? po.notes + ' | ' : ''}Cancelada por edição da venda ${sale.saleNumber}.`;
        }
      });
    }

    params.items.forEach((si) => {
      if (si.itemType === 'PRODUTO_GRAFICO') {
        const itemObj = this.getItemById(si.itemId);
        prodOrders.unshift({
          id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          orderNumber: `PRD-${new Date().getFullYear()}-${String(prodOrders.length + 1).padStart(4, '0')}`,
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          saleItemId: si.id,
          itemId: si.itemId,
          itemName: si.itemName,
          quantity: si.quantity,
          configuration: si.configuration,
          customerId: params.customerId || sale.customerId,
          customerName: params.customerName || sale.customerName,
          customerPhone: params.customerPhone || sale.customerPhone,
          sellerId: params.sellerId || sale.sellerId,
          sellerName: params.sellerName || sale.sellerName,
          productionType: itemObj?.productionType || 'PRODUCAO_PROPRIA',
          leadTime: itemObj?.leadTime || '2 a 3 dias úteis',
          status: 'AGUARDANDO_PRODUCAO',
          files: [],
          notes: si.configuration?.notes || `Produção gerada pela edição da venda ${sale.saleNumber}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    setItemToStorage(STORAGE_KEYS.PRODUCTION, prodOrders);
    const affectedOrders = prodOrders.filter((po) => po.saleId === sale.id);
    if (affectedOrders.length > 0) {
      api.saveProductionOrdersBatch(affectedOrders).catch((e) => console.debug('Notice syncing updated production orders:', e));
      notifyRealtime('production-updated', { saleId: sale.id });
    }

    // 6. Criar entrada de histórico de edição
    const editEntry: SaleEditHistoryEntry = {
      id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      saleId: sale.id,
      editedAt: now,
      editedBy: currentUser.id,
      editedByName: userName,
      reason,
      previousTotal,
      newTotal: total,
      previousItemsCount,
      newItemsCount: params.items.length,
      previousPaidAmount,
      newPaidAmount: paidAmount,
      summary: `Venda alterada de R$ ${previousTotal.toFixed(2)} para R$ ${total.toFixed(2)}. Itens: ${previousItemsCount} → ${params.items.length}.`,
      previousDataJson,
    };

    // 7. Atualizar dados da venda
    sale.customerId = params.customerId !== undefined ? params.customerId : sale.customerId;
    sale.customerName = params.customerName || sale.customerName;
    sale.customerPhone = params.customerPhone !== undefined ? params.customerPhone : sale.customerPhone;
    sale.customerDocument = params.customerDocument !== undefined ? params.customerDocument : sale.customerDocument;
    sale.sellerId = params.sellerId || sale.sellerId;
    sale.sellerName = params.sellerName || sale.sellerName;
    sale.items = params.items;
    sale.subtotal = subtotal;
    sale.discount = discount;
    sale.addition = addition;
    sale.freight = addition;
    sale.total = total;
    sale.totalCost = totalCost;
    sale.grossProfit = grossProfit;
    sale.grossMarginPercent = grossMarginPercent;
    sale.payments = enrichedPayments;
    sale.paidAmount = paidAmount;
    sale.remainingAmount = remainingAmount;
    sale.paymentStatus = paymentStatus;
    sale.dueDate = params.dueDate || sale.dueDate;
    sale.status = 'EDITADA';
    sale.notes = params.notes !== undefined ? params.notes : sale.notes;
    sale.updatedAt = now;
    sale.editHistory = [editEntry, ...(sale.editHistory || [])];

    sales[saleIndex] = sale;
    setItemToStorage(STORAGE_KEYS.SALES, sales);

    api.updateCompletedSale(sale.id, {
      ...sale,
      reason,
      userId: currentUser.id,
      userName,
    }).catch((e) => console.debug('Background updateCompletedSale sync notice:', e));

    return sale;
  }

  // Inventory logic
  static getInventoryMovements(): InventoryMovement[] {
    return getItemFromStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, INITIAL_INVENTORY_MOVEMENTS);
  }

  private static reduceItemStock(params: {
    itemId: string;
    variantId?: string;
    quantity: number;
    saleNumber: string;
    user: User;
    reason?: string;
  }): void {
    const { itemId, variantId, quantity, saleNumber, user, reason } = params;
    if (this.isTestUserActive() || user?.isTestUser) return;
    const item = this.getItemById(itemId);
    if (!item || item.type !== 'PRODUTO_FISICO') return;

    const movements = this.getInventoryMovements();
    const now = new Date().toISOString();

    if (variantId && item.variants) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (variant) {
        const prevStock = variant.stock;
        const newStock = Math.max(0, prevStock - quantity);
        variant.stock = newStock;
        item.stock = item.variants.reduce((acc, v) => acc + v.stock, 0);

        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: item.id,
          itemName: item.name,
          sku: variant.sku || item.sku,
          variantId: variant.id,
          variantName: variant.name,
          type: 'VENDA',
          quantity: -quantity,
          previousStock: prevStock,
          newStock,
          userId: user.id,
          userName: user.name,
          reason: reason || `Venda ${saleNumber}`,
          saleNumber,
          date: now,
        });
      }
    } else {
      const prevStock = item.stock || 0;
      const newStock = Math.max(0, prevStock - quantity);
      item.stock = newStock;

      movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type: 'VENDA',
        quantity: -quantity,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || `Venda ${saleNumber}`,
        saleNumber,
        date: now,
      });
    }

    this.saveItem(item);
    setItemToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
  }

  private static restoreItemStock(params: {
    itemId: string;
    variantId?: string;
    quantity: number;
    saleNumber: string;
    user: User;
    reason?: string;
  }): void {
    const { itemId, variantId, quantity, saleNumber, user, reason } = params;
    if (this.isTestUserActive() || user?.isTestUser) return;
    const item = this.getItemById(itemId);
    if (!item || item.type !== 'PRODUTO_FISICO') return;

    const movements = this.getInventoryMovements();
    const now = new Date().toISOString();

    if (variantId && item.variants) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (variant) {
        const prevStock = variant.stock;
        const newStock = prevStock + quantity;
        variant.stock = newStock;
        item.stock = item.variants.reduce((acc, v) => acc + v.stock, 0);

        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: item.id,
          itemName: item.name,
          sku: variant.sku || item.sku,
          variantId: variant.id,
          variantName: variant.name,
          type: 'DEVOLUCAO',
          quantity,
          previousStock: prevStock,
          newStock,
          userId: user.id,
          userName: user.name,
          reason: reason || `Cancelamento da Venda ${saleNumber}`,
          saleNumber,
          date: now,
        });
      }
    } else {
      const prevStock = item.stock || 0;
      const newStock = prevStock + quantity;
      item.stock = newStock;

      movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type: 'DEVOLUCAO',
        quantity,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || `Cancelamento da Venda ${saleNumber}`,
        saleNumber,
        date: now,
      });
    }

    this.saveItem(item);
    setItemToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
  }

  static adjustStock(params: {
    itemId: string;
    variantId?: string;
    newStock: number;
    reason: string;
    user: User;
  }): void {
    if (params.user.role !== 'ADMINISTRADOR') {
      throw new Error('Apenas Administradores podem realizar ajustes administrativos de estoque.');
    }

    const { itemId, variantId, newStock, reason, user } = params;
    if (this.isTestUserActive() || user?.isTestUser) return;
    const item = this.getItemById(itemId);
    if (!item) throw new Error('Item não encontrado');

    const movements = this.getInventoryMovements();
    const now = new Date().toISOString();

    if (variantId && item.variants) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error('Variante não encontrada');

      const prevStock = variant.stock;
      const diff = newStock - prevStock;
      variant.stock = newStock;
      item.stock = item.variants.reduce((acc, v) => acc + v.stock, 0);

      movements.unshift({
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: variant.sku || item.sku,
        variantId: variant.id,
        variantName: variant.name,
        type: 'AJUSTE',
        quantity: diff,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || 'Ajuste manual de inventário',
        date: now,
      });
    } else {
      const prevStock = item.stock || 0;
      const diff = newStock - prevStock;
      item.stock = newStock;

      movements.unshift({
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type: 'AJUSTE',
        quantity: diff,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || 'Ajuste manual de inventário',
        date: now,
      });
    }

    this.saveItem(item);
    setItemToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
  }

  static addStockEntry(params: {
    itemId: string;
    variantId?: string;
    quantityToAdd: number;
    reason: string;
    user: User;
  }): void {
    const { itemId, variantId, quantityToAdd, reason, user } = params;
    if (this.isTestUserActive() || user?.isTestUser) return;
    const item = this.getItemById(itemId);
    if (!item) throw new Error('Item não encontrado');

    const movements = this.getInventoryMovements();
    const now = new Date().toISOString();

    if (variantId && item.variants) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error('Variante não encontrada');

      const prevStock = variant.stock;
      const newStock = prevStock + quantityToAdd;
      variant.stock = newStock;
      item.stock = item.variants.reduce((acc, v) => acc + v.stock, 0);

      movements.unshift({
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: variant.sku || item.sku,
        variantId: variant.id,
        variantName: variant.name,
        type: 'ENTRADA',
        quantity: quantityToAdd,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || 'Entrada de mercadoria / reposição',
        date: now,
      });
    } else {
      const prevStock = item.stock || 0;
      const newStock = prevStock + quantityToAdd;
      item.stock = newStock;

      movements.unshift({
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type: 'ENTRADA',
        quantity: quantityToAdd,
        previousStock: prevStock,
        newStock,
        userId: user.id,
        userName: user.name,
        reason: reason || 'Entrada de mercadoria / reposição',
        date: now,
      });
    }

    this.saveItem(item);
    setItemToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
  }

  // Production Orders (Sincronizado em tempo real entre todos os dispositivos)
  static getProductionOrders(): ProductionOrder[] {
    return getItemFromStorage(STORAGE_KEYS.PRODUCTION, INITIAL_PRODUCTION_ORDERS);
  }

  static getProductionOrderById(id: string): ProductionOrder | undefined {
    return this.getProductionOrders().find((po) => po.id === id);
  }

  static updateProductionOrderStatus(
    orderId: string,
    status: ProductionStatus
  ): ProductionOrder {
    const orders = this.getProductionOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index < 0) throw new Error('Ordem de produção não encontrada');

    const order = { ...orders[index] };
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (status === 'ENTREGUE' || status === 'PRONTO') {
      order.completedAt = new Date().toISOString();
    }
    orders[index] = order;
    setItemToStorage(STORAGE_KEYS.PRODUCTION, orders);

    api.saveProductionOrder(order).catch((e) => console.debug('Notice saving production order to server:', e));
    notifyRealtime('production-updated', { id: orderId, status });

    return order;
  }

  static addProductionOrderFile(
    orderId: string,
    file: ProductionOrderFile
  ): ProductionOrder {
    const orders = this.getProductionOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index < 0) throw new Error('Ordem de produção não encontrada');

    const order = { ...orders[index] };
    order.files = [...order.files, file];
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    setItemToStorage(STORAGE_KEYS.PRODUCTION, orders);

    api.saveProductionOrder(order).catch((e) => console.debug('Notice saving production order file to server:', e));
    notifyRealtime('production-updated', { id: orderId, fileAdded: file.id });

    return order;
  }

  static removeProductionOrderFile(
    orderId: string,
    fileId: string
  ): ProductionOrder {
    const orders = this.getProductionOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index < 0) throw new Error('Ordem de produção não encontrada');

    const order = { ...orders[index] };
    order.files = order.files.filter((f) => f.id !== fileId);
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    setItemToStorage(STORAGE_KEYS.PRODUCTION, orders);

    api.saveProductionOrder(order).catch((e) => console.debug('Notice removing production order file on server:', e));
    notifyRealtime('production-updated', { id: orderId, fileRemoved: fileId });

    return order;
  }

  static updateProductionOrderNotes(
    orderId: string,
    notes: string
  ): ProductionOrder {
    const orders = this.getProductionOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index < 0) throw new Error('Ordem de produção não encontrada');

    const order = { ...orders[index] };
    order.notes = notes;
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    setItemToStorage(STORAGE_KEYS.PRODUCTION, orders);

    api.saveProductionOrder(order).catch((e) => console.debug('Notice saving production order notes to server:', e));
    notifyRealtime('production-updated', { id: orderId, notesUpdated: true });

    return order;
  }

  static saveProductionOrder(order: ProductionOrder): ProductionOrder {
    const orders = this.getProductionOrders();
    const index = orders.findIndex((o) => o.id === order.id);
    const updatedOrder = {
      ...order,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      orders[index] = updatedOrder;
    } else {
      orders.unshift(updatedOrder);
    }
    setItemToStorage(STORAGE_KEYS.PRODUCTION, orders);

    api.saveProductionOrder(updatedOrder).catch((e) => console.debug('Notice saving production order to server:', e));
    notifyRealtime('production-updated', { id: order.id });

    return updatedOrder;
  }

  static deleteProductionOrder(id: string): boolean {
    const orders = this.getProductionOrders();
    const filtered = orders.filter((o) => o.id !== id);
    setItemToStorage(STORAGE_KEYS.PRODUCTION, filtered);

    api.deleteProductionOrder(id).catch((e) => console.debug('Notice deleting production order on server:', e));
    notifyRealtime('production-updated', { id, deleted: true });

    return true;
  }

  // Receivables
  static getReceivables(): Receivable[] {
    return getItemFromStorage(STORAGE_KEYS.RECEIVABLES, INITIAL_RECEIVABLES);
  }

  static registerReceivablePayment(params: {
    receivableId: string;
    amount: number;
    method: string;
    notes?: string;
  }): Receivable {
    const { receivableId, amount, method, notes } = params;
    const receivables = this.getReceivables();
    const index = receivables.findIndex((r) => r.id === receivableId);
    if (index < 0) throw new Error('Conta a receber não encontrada');

    const rec = receivables[index];
    const newPaid = Number((rec.paidAmount + amount).toFixed(2));
    const newRemaining = Math.max(0, Number((rec.totalAmount - newPaid).toFixed(2)));
    const now = new Date().toISOString();

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      method,
      amount,
      date: now,
      notes,
    };

    rec.paidAmount = newPaid;
    rec.remainingAmount = newRemaining;
    rec.payments.push(paymentRecord);
    rec.status = newRemaining <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO';

    receivables[index] = rec;
    setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);

    // Sync payment into associated Sale
    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === rec.saleId);
    if (saleIndex >= 0) {
      const sale = sales[saleIndex];
      sale.paidAmount = newPaid;
      sale.remainingAmount = newRemaining;
      sale.payments.push(paymentRecord);
      sale.paymentStatus = newRemaining <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO';
      sale.updatedAt = now;
      sales[saleIndex] = sale;
      setItemToStorage(STORAGE_KEYS.SALES, sales);
      api.saveSale(sale).catch((e) => console.debug('Background saveSale payment sync notice:', e));
    }

    return rec;
  }

  static deleteSale(saleId: string): void {
    if (this.isTestUserActive()) return;
    const sales = this.getSales().filter((s) => s.id !== saleId);
    setItemToStorage(STORAGE_KEYS.SALES, sales);

    const receivables = this.getReceivables().filter((r) => r.saleId !== saleId);
    setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);

    api.deleteSale(saleId).catch((e) => console.debug('Background deleteSale sync notice:', e));
  }

  static recordSalePayment(
    saleId: string,
    payment: {
      method: string;
      amount: number;
      accountId?: string;
      accountName?: string;
      accountType?: AccountType;
      cardType?: 'CREDITO' | 'DEBITO';
      feePercent?: number;
      feeAmount?: number;
      netAmount?: number;
      notes?: string;
    }
  ): Sale {
    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === saleId);
    if (saleIndex < 0) throw new Error('Venda não encontrada');

    const sale = sales[saleIndex];
    const newPaid = Number((sale.paidAmount + payment.amount).toFixed(2));
    const newRemaining = Math.max(0, Number((sale.total - newPaid).toFixed(2)));
    const now = new Date().toISOString();

    const activeRegister = this.getCurrentCashRegister();
    const accounts = this.getReceivingAccounts();
    let account = payment.accountId ? accounts.find((a) => a.id === payment.accountId) : undefined;
    const payMethod = String(payment.method || '');
    const isCredit =
      payment.cardType === 'CREDITO' ||
      payMethod.toLowerCase().includes('crédito') ||
      payMethod.toLowerCase().includes('credito');
    const isDebit =
      payment.cardType === 'DEBITO' ||
      payMethod.toLowerCase().includes('débito') ||
      payMethod.toLowerCase().includes('debito');
    const isCard = isCredit || isDebit || payMethod.toLowerCase().includes('cart');

    if (isCard && (!account || account.type !== 'CARTAO')) {
      const cardAcc =
        accounts.find((a) => a.active && a.type === 'CARTAO' && a.isDefault) ||
        accounts.find((a) => a.active && a.type === 'CARTAO') ||
        accounts.find((a) => a.type === 'CARTAO');
      if (cardAcc) account = cardAcc;
    }

    let feePercent = payment.feePercent ?? 0;
    if (feePercent === 0 && (account || isCard)) {
      if (isCredit) {
        feePercent = account?.creditFeePercent !== undefined ? account.creditFeePercent : 3.5;
      } else if (isDebit) {
        feePercent = account?.debitFeePercent !== undefined ? account.debitFeePercent : 1.5;
      } else if (isCard) {
        feePercent = account?.creditFeePercent !== undefined ? account.creditFeePercent : 3.5;
      }
    }

    const grossAmount = Number(payment.amount.toFixed(2));
    const feeAmount =
      payment.feeAmount !== undefined && payment.feeAmount > 0
        ? payment.feeAmount
        : feePercent > 0
        ? Number(((grossAmount * feePercent) / 100).toFixed(2))
        : 0;
    const netAmount =
      payment.netAmount !== undefined ? payment.netAmount : Number((grossAmount - feeAmount).toFixed(2));

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      method: payment.method,
      amount: grossAmount,
      date: now,
      accountId: payment.accountId || account?.id,
      accountName: payment.accountName || account?.name,
      accountType: payment.accountType || account?.type || (isCard ? 'CARTAO' : 'CAIXA'),
      cardType: payment.cardType || (isCredit ? 'CREDITO' : isDebit ? 'DEBITO' : undefined),
      feePercent,
      feeAmount,
      netAmount,
      cashRegisterId: activeRegister ? activeRegister.id : undefined,
      notes: payment.notes,
    };

    if (this.isTestUserActive()) {
      return {
        ...sale,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        payments: [...sale.payments, paymentRecord],
        paymentStatus: newRemaining <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO',
        updatedAt: now,
      };
    }

    sale.paidAmount = newPaid;
    sale.remainingAmount = newRemaining;
    sale.payments.push(paymentRecord);
    sale.paymentStatus = newRemaining <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO';
    sale.updatedAt = now;

    sales[saleIndex] = sale;
    setItemToStorage(STORAGE_KEYS.SALES, sales);
    api.saveSale(sale).catch((e) => console.debug('Background saveSale payment sync notice:', e));

    // Sync into receivables
    const receivables = this.getReceivables();
    const recIndex = receivables.findIndex((r) => r.saleId === saleId);
    if (recIndex >= 0) {
      const rec = receivables[recIndex];
      rec.paidAmount = newPaid;
      rec.remainingAmount = newRemaining;
      rec.payments.push(paymentRecord);
      rec.status = newRemaining <= 0 ? 'PAGO' : 'PARCIALMENTE_PAGO';
      receivables[recIndex] = rec;
      setItemToStorage(STORAGE_KEYS.RECEIVABLES, receivables);
    }

    return sale;
  }

  static createInventoryMovement(params: {
    itemId: string;
    variantId?: string;
    type: 'ENTRADA' | 'SAIDA' | 'AJUSTE_INVENTARIO';
    quantity: number;
    unitCost?: number;
    reason: string;
    documentRef?: string;
    createdByName: string;
  }): void {
    const user = this.getCurrentUser();
    if (this.isTestUserActive() || user?.isTestUser) return;
    if (params.type === 'ENTRADA') {
      this.addStockEntry({
        itemId: params.itemId,
        variantId: params.variantId,
        quantityToAdd: params.quantity,
        reason: `${params.reason}${params.documentRef ? ` (Doc: ${params.documentRef})` : ''}`,
        user,
      });
      if (params.unitCost && params.unitCost > 0) {
        const item = this.getItemById(params.itemId);
        if (item) {
          item.costPrice = params.unitCost;
          this.saveItem(item);
        }
      }
    } else if (params.type === 'SAIDA') {
      this.reduceItemStock({
        itemId: params.itemId,
        variantId: params.variantId,
        quantity: params.quantity,
        saleNumber: params.documentRef || 'BAIXA_MANUAL',
        user,
      });
    } else {
      this.adjustStock({
        itemId: params.itemId,
        variantId: params.variantId,
        newStock: params.quantity,
        reason: `${params.reason}${params.documentRef ? ` (Doc: ${params.documentRef})` : ''}`,
        user,
      });
    }
  }

  // --- FINANCIAL & RECEIVING ACCOUNTS ---
  static getReceivingAccounts(): ReceivingAccount[] {
    return getItemFromStorage(STORAGE_KEYS.RECEIVING_ACCOUNTS, INITIAL_RECEIVING_ACCOUNTS);
  }

  static getReceivingAccountById(id: string): ReceivingAccount | undefined {
    return this.getReceivingAccounts().find((a) => a.id === id);
  }

  static saveReceivingAccount(account: ReceivingAccount): ReceivingAccount {
    const accounts = this.getReceivingAccounts();
    const index = accounts.findIndex((a) => a.id === account.id);
    const updatedAccount: ReceivingAccount = {
      ...account,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      accounts[index] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }
    setItemToStorage(STORAGE_KEYS.RECEIVING_ACCOUNTS, accounts);
    api.saveReceivingAccount(updatedAccount).catch((e) => console.debug('Background saveReceivingAccount sync notice:', e));
    return updatedAccount;
  }

  static deleteReceivingAccount(id: string): void {
    const accounts = this.getReceivingAccounts().filter((a) => a.id !== id);
    setItemToStorage(STORAGE_KEYS.RECEIVING_ACCOUNTS, accounts);
    api.deleteReceivingAccount(id).catch((e) => console.debug('Background deleteReceivingAccount sync notice:', e));
  }

  // --- ACCOUNT BALANCES & TRANSFERS ENTRE CONTAS ---
  static getFinancialTransfers(): FinancialTransfer[] {
    return getItemFromStorage<FinancialTransfer[]>(STORAGE_KEYS.FINANCIAL_TRANSFERS, []);
  }

  static getAccountBalance(accountId: string): number {
    const accounts = this.getReceivingAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return 0;

    let balance = Number(account.initialBalance || 0);

    // 1. Somar recebimentos líquidos de vendas concluídas direcionados a esta conta
    const sales = this.getSales();
    sales.forEach((sale) => {
      if (sale.status === 'CANCELADA' || sale.status === 'EXCLUIDA' || sale.isDeleted || sale.paymentStatus === 'CANCELADO') return;
      sale.payments?.forEach((p) => {
        const pMethod = String(p.method || '');
        const isCredit =
          p.cardType === 'CREDITO' ||
          pMethod.toLowerCase().includes('crédito') ||
          pMethod.toLowerCase().includes('credito');
        const isDebit =
          p.cardType === 'DEBITO' ||
          pMethod.toLowerCase().includes('débito') ||
          pMethod.toLowerCase().includes('debito');
        const isCard = isCredit || isDebit || pMethod.toLowerCase().includes('cart');

        let fee = p.feeAmount || 0;
        if (!fee && p.feePercent && p.feePercent > 0) {
          fee = Number((((p.amount || 0) * p.feePercent) / 100).toFixed(2));
        } else if (!fee && isCard) {
          const feeRate = isCredit ? (account.creditFeePercent ?? 3.5) : (account.debitFeePercent ?? 1.5);
          fee = Number((((p.amount || 0) * feeRate) / 100).toFixed(2));
        }
        const net = p.netAmount !== undefined ? p.netAmount : Number(((p.amount || 0) - fee).toFixed(2));

        if (p.accountId === accountId) {
          balance += Number(net || 0);
        } else if (!p.accountId) {
          if (account.type === 'CAIXA' && (p.method === 'Dinheiro' || pMethod.toLowerCase().includes('dinheiro'))) {
            balance += Number(p.amount || 0);
          } else if (account.type === 'PIX' && (p.method === 'PIX' || pMethod.toLowerCase().includes('pix'))) {
            balance += Number(p.amount || 0);
          } else if (account.type === 'CARTAO' && isCard) {
            balance += Number(net || 0);
          }
        }
      });
    });

    // 2. Transferências internas: Debitar saídas da origem, creditar entradas no destino
    const transfers = this.getFinancialTransfers();
    transfers.forEach((t) => {
      if (t.fromAccountId === accountId) {
        balance -= Number(t.amount || 0);
      }
      if (t.toAccountId === accountId) {
        balance += Number(t.amount || 0);
      }
    });

    // 3. Ajustes Administrativos de Saldo (exclusivo para correção de saldo real da conta, não altera receitas, despesas, custos ou vendas)
    const adjustments = this.getAccountBalanceAdjustments(accountId);
    adjustments.forEach((adj) => {
      balance += Number(adj.adjustedAmount || 0);
    });

    // 4. Saídas financeiras, custos, despesas operacionais e retiradas vinculadas a esta conta de origem
    const expenses = this.getExpenses();
    expenses.forEach((exp) => {
      const expAmount = Number(exp.amount || 0);
      if (exp.accountId === accountId) {
        balance -= expAmount;
      } else if (!exp.accountId) {
        // Compatibilidade com saídas legadas antes da seleção de conta de origem
        const pMethod = String(exp.paymentMethod || '').toLowerCase();
        if (account.type === 'CAIXA' && pMethod.includes('dinheiro')) {
          balance -= expAmount;
        } else if (account.type === 'PIX' && pMethod.includes('pix')) {
          balance -= expAmount;
        }
      }
    });

    return Number(balance.toFixed(2));
  }

  static getAccountBalanceAdjustments(accountId?: string): AccountBalanceAdjustment[] {
    const list = getItemFromStorage<AccountBalanceAdjustment[]>(
      STORAGE_KEYS.ACCOUNT_BALANCE_ADJUSTMENTS,
      []
    );
    if (!accountId || accountId === 'ALL') {
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return list
      .filter((adj) => adj.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static saveAccountBalanceAdjustment(
    data: Omit<AccountBalanceAdjustment, 'id' | 'adjustmentNumber' | 'createdAt' | 'type'> & {
      id?: string;
      adjustmentNumber?: string;
    }
  ): AccountBalanceAdjustment {
    const list = getItemFromStorage<AccountBalanceAdjustment[]>(
      STORAGE_KEYS.ACCOUNT_BALANCE_ADJUSTMENTS,
      []
    );
    const now = new Date().toISOString();
    const id = data.id || `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nextNum = list.length + 1;
    const adjustmentNumber =
      data.adjustmentNumber || `AJU-${String(nextNum).padStart(3, '0')}`;

    const newAdjustment: AccountBalanceAdjustment = {
      id,
      adjustmentNumber,
      type: 'AJUSTE_ADMINISTRATIVO_SALDO',
      accountId: data.accountId,
      accountName: data.accountName,
      previousBalance: Number(Number(data.previousBalance).toFixed(2)),
      newBalance: Number(Number(data.newBalance).toFixed(2)),
      adjustedAmount: Number(Number(data.adjustedAmount).toFixed(2)),
      reason: (data.reason || '').trim(),
      userId: data.userId,
      userName: data.userName,
      createdAt: now,
    };

    list.unshift(newAdjustment);
    setItemToStorage(STORAGE_KEYS.ACCOUNT_BALANCE_ADJUSTMENTS, list);
    return newAdjustment;
  }

  static getAllAccountBalances(): Record<string, number> {
    const accounts = this.getReceivingAccounts();
    const balances: Record<string, number> = {};
    accounts.forEach((acc) => {
      balances[acc.id] = this.getAccountBalance(acc.id);
    });
    return balances;
  }

  static getFinancialTransferMovements(transferId?: string): FinancialMovement[] {
    const transfers = this.getFinancialTransfers();
    const filtered = transferId ? transfers.filter((t) => t.id === transferId) : transfers;
    const movements: FinancialMovement[] = [];

    filtered.forEach((t) => {
      // Saída da conta de origem (Débito)
      movements.push({
        id: `${t.id}-out`,
        transferId: t.id,
        transferNumber: t.transferNumber,
        type: 'TRANSFERENCIA',
        direction: 'SAIDA',
        accountId: t.fromAccountId,
        accountName: t.fromAccountName,
        counterpartAccountId: t.toAccountId,
        counterpartAccountName: t.toAccountName,
        amount: -t.amount,
        date: t.date,
        observation: t.observation,
        createdAt: t.createdAt,
      });

      // Entrada na conta de destino (Crédito)
      movements.push({
        id: `${t.id}-in`,
        transferId: t.id,
        transferNumber: t.transferNumber,
        type: 'TRANSFERENCIA',
        direction: 'ENTRADA',
        accountId: t.toAccountId,
        accountName: t.toAccountName,
        counterpartAccountId: t.fromAccountId,
        counterpartAccountName: t.fromAccountName,
        amount: t.amount,
        date: t.date,
        observation: t.observation,
        createdAt: t.createdAt,
      });
    });

    return movements;
  }

  static saveFinancialTransfer(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    observation?: string;
    user?: User;
  }): FinancialTransfer {
    const accounts = this.getReceivingAccounts();
    const fromAccount = accounts.find((a) => a.id === params.fromAccountId);
    const toAccount = accounts.find((a) => a.id === params.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Conta de origem e conta de destino devem ser informadas.');
    }

    if (params.fromAccountId === params.toAccountId) {
      throw new Error('A conta de origem e a conta de destino devem ser diferentes.');
    }

    const amount = Number(Number(params.amount).toFixed(2));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('O valor da transferência deve ser maior que zero.');
    }

    // Validação de saldo suficiente na conta de origem
    const availableBalance = this.getAccountBalance(params.fromAccountId);
    if (amount > availableBalance) {
      throw new Error('Saldo insuficiente para realizar esta transferência.');
    }

    const transfers = this.getFinancialTransfers();
    const now = new Date().toISOString();
    const transferIndex = transfers.length + 1;
    const transferNumber = `TRF-${String(transferIndex).padStart(3, '0')}`;
    const id = `trf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTransfer: FinancialTransfer = {
      id,
      transferNumber,
      type: 'TRANSFERENCIA',
      fromAccountId: fromAccount.id,
      fromAccountName: fromAccount.name,
      toAccountId: toAccount.id,
      toAccountName: toAccount.name,
      amount,
      date: params.date || now.split('T')[0],
      observation: params.observation?.trim() || undefined,
      userId: params.user?.id,
      userName: params.user?.name,
      createdAt: now,
      updatedAt: now,
    };

    transfers.unshift(newTransfer);
    setItemToStorage(STORAGE_KEYS.FINANCIAL_TRANSFERS, transfers);

    api.saveFinancialTransfer(newTransfer).catch((e) =>
      console.debug('Background saveFinancialTransfer sync notice:', e)
    );

    return newTransfer;
  }

  static deleteFinancialTransfer(id: string): void {
    const transfers = this.getFinancialTransfers().filter((t) => t.id !== id);
    setItemToStorage(STORAGE_KEYS.FINANCIAL_TRANSFERS, transfers);
    api.deleteFinancialTransfer(id).catch((e) =>
      console.debug('Background deleteFinancialTransfer sync notice:', e)
    );
  }

  // --- EXPENSES & COSTS ---
  static getExpenses(): Expense[] {
    return getItemFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  static saveExpense(expenseData: Omit<Expense, 'id' | 'createdAt'> & { id?: string }): Expense {
    const expenses = this.getExpenses();
    const now = new Date().toISOString();
    const id = expenseData.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const index = expenses.findIndex((e) => e.id === id);

    const currentUser = this.getCurrentUser();
    const expense: Expense = {
      id,
      description: expenseData.description.trim(),
      amount: Number(Number(expenseData.amount).toFixed(2)),
      date: expenseData.date,
      category: expenseData.category,
      observation: expenseData.observation?.trim() || undefined,
      paymentMethod: expenseData.paymentMethod,
      accountId: expenseData.accountId,
      accountName: expenseData.accountName,
      nature: expenseData.nature || 'OPERACIONAL',
      type: expenseData.type || (expenseData.nature === 'RETIRADA_PESSOAL' ? 'RETIRADA_PESSOAL' : 'DESPESA_OPERACIONAL'),
      userId: expenseData.userId || currentUser?.id,
      userName: expenseData.userName || currentUser?.name,
      createdAt: index >= 0 ? expenses[index].createdAt : now,
      updatedAt: now,
    };

    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.unshift(expense);
    }

    setItemToStorage(STORAGE_KEYS.EXPENSES, expenses);
    return expense;
  }

  static deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    setItemToStorage(STORAGE_KEYS.EXPENSES, expenses);
  }

  // --- CASH REGISTER SESSIONS (ABERTURA & FECHAMENTO) ---
  static getCashRegisterSessions(): CashRegisterSession[] {
    return getItemFromStorage<CashRegisterSession[]>(STORAGE_KEYS.CASH_REGISTER_SESSIONS, []);
  }

  static getCurrentCashRegister(userId?: string): CashRegisterSession | null {
    const sessions = this.getCashRegisterSessions();
    const targetUserId = userId || this.getCurrentUser()?.id;
    if (targetUserId) {
      const userSession = sessions.find((s) => s.status === 'ABERTO' && s.openedByUserId === targetUserId);
      if (userSession) return userSession;
      const unassignedSession = sessions.find((s) => s.status === 'ABERTO' && !s.openedByUserId);
      if (unassignedSession) return unassignedSession;
      return null;
    }
    return sessions.find((s) => s.status === 'ABERTO') || null;
  }

  static hasOpenCashRegisterSession(userId?: string): boolean {
    return !!this.getCurrentCashRegister(userId);
  }

  static openCashRegister(params: {
    initialAmount: number;
    user: User;
    notes?: string;
  }): CashRegisterSession {
    const current = this.getCurrentCashRegister(params.user.id);
    if (current) {
      throw new Error(
        `Já existe um caixa aberto (${current.registerNumber}) associado a ${current.openedByUserName}. Feche-o antes de abrir um novo.`
      );
    }

    const sessions = this.getCashRegisterSessions();
    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const registerNumber = `CX-${year}-${String(sessions.length + 1).padStart(4, '0')}`;

    const newSession: CashRegisterSession = {
      id: `cx-${Date.now()}`,
      registerNumber,
      status: 'ABERTO',
      openedAt: now,
      openedByUserId: params.user.id,
      openedByUserName: params.user.name,
      initialAmount: Number(params.initialAmount.toFixed(2)),
      cashSalesAmount: 0,
      expectedCashAmount: Number(params.initialAmount.toFixed(2)),
      totalSalesCount: 0,
      totalGrossSales: 0,
      totalCardFees: 0,
      totalNetSales: 0,
      byMethod: [],
      byAccount: [],
      notes: params.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    sessions.unshift(newSession);
    setItemToStorage(STORAGE_KEYS.CASH_REGISTER_SESSIONS, sessions);

    // Persistência imediata no servidor para sincronização entre dispositivos
    api.saveCashRegisterSession(newSession).catch((err) => {
      console.warn('Sessão de caixa salva localmente; aviso de sincronização:', err);
    });

    return newSession;
  }

  static calculateSessionSummary(session: CashRegisterSession): {
    cashSalesAmount: number;
    cashExpensesAmount: number;
    expectedCashAmount: number;
    totalSalesCount: number;
    totalGrossSales: number;
    totalCardFees: number;
    totalNetSales: number;
    byMethod: MethodFinancialSummary[];
    byAccount: AccountFinancialSummary[];
  } {
    const sales = this.getSales();
    const expenses = this.getExpenses();
    const accounts = this.getReceivingAccounts();
    const cashAccountIds = new Set(accounts.filter((a) => a.type === 'CAIXA').map((a) => a.id));

    const openedTime = new Date(session.openedAt).getTime();
    const closedTime = session.closedAt ? new Date(session.closedAt).getTime() : Date.now();

    // Find valid sales during this session
    const sessionSales = sales.filter((s) => {
      if (s.status === 'CANCELADA' || s.status === 'EXCLUIDA' || s.isDeleted || s.paymentStatus === 'CANCELADO') return false;
      const saleTime = new Date(s.createdAt).getTime();
      return saleTime >= openedTime && saleTime <= closedTime;
    });

    const sessionExpenses = expenses.filter((e) => {
      const expTime = new Date(`${e.date}T00:00:00`).getTime();
      return expTime >= openedTime && expTime <= closedTime;
    });

    let cashSales = 0;
    let cashExpenses = 0;
    let totalGross = 0;
    let totalFees = 0;

    const methodMap: Record<string, any> = {};
    const accountMap: Record<string, any> = {};

    sessionExpenses.forEach((e) => {
      const isCash =
        (e.accountId && cashAccountIds.has(e.accountId)) ||
        (!e.accountId && String(e.paymentMethod || '').toLowerCase().includes('dinheiro'));
      if (isCash) {
        cashExpenses += Number(e.amount || 0);
      }
    });

    sessionSales.forEach((sale) => {
      sale.payments.forEach((pay) => {
        const gross = pay.amount || 0;
        const fee = pay.feeAmount || 0;
        const net = pay.netAmount ?? gross - fee;

        totalGross += gross;
        totalFees += fee;

        const methodName = pay.method || 'Outro';
        if (!methodMap[methodName]) {
          methodMap[methodName] = {
            method: methodName,
            grossAmount: 0,
            feeAmount: 0,
            netAmount: 0,
            count: 0,
          };
        }
        methodMap[methodName].grossAmount += gross;
        methodMap[methodName].feeAmount += fee;
        methodMap[methodName].netAmount += net;
        methodMap[methodName].count += 1;

        if (methodName.toLowerCase().includes('dinheiro')) {
          cashSales += gross;
        }

        const accountId = pay.accountId || 'acc-outros';
        const accountName = pay.accountName || `${methodName} — Padrão`;
        const accountType =
          pay.accountType ||
          (methodName.toLowerCase().includes('dinheiro')
            ? 'CAIXA'
            : methodName.toLowerCase().includes('pix')
            ? 'PIX'
            : methodName.toLowerCase().includes('cart')
            ? 'CARTAO'
            : 'OUTRO');

        if (!accountMap[accountId]) {
          accountMap[accountId] = {
            accountId,
            accountName,
            accountType,
            grossAmount: 0,
            feeAmount: 0,
            netAmount: 0,
            count: 0,
          };
        }
        accountMap[accountId].grossAmount += gross;
        accountMap[accountId].feeAmount += fee;
        accountMap[accountId].netAmount += net;
        accountMap[accountId].count += 1;
      });
    });

    return {
      cashSalesAmount: Number(cashSales.toFixed(2)),
      cashExpensesAmount: Number(cashExpenses.toFixed(2)),
      expectedCashAmount: Number((session.initialAmount + cashSales - cashExpenses).toFixed(2)),
      totalSalesCount: sessionSales.length,
      totalGrossSales: Number(totalGross.toFixed(2)),
      totalCardFees: Number(totalFees.toFixed(2)),
      totalNetSales: Number((totalGross - totalFees).toFixed(2)),
      byMethod: Object.values(methodMap).map((m) => ({
        ...m,
        grossAmount: Number(m.grossAmount.toFixed(2)),
        feeAmount: Number(m.feeAmount.toFixed(2)),
        netAmount: Number(m.netAmount.toFixed(2)),
      })),
      byAccount: Object.values(accountMap).map((a) => ({
        ...a,
        grossAmount: Number(a.grossAmount.toFixed(2)),
        feeAmount: Number(a.feeAmount.toFixed(2)),
        netAmount: Number(a.netAmount.toFixed(2)),
      })),
    };
  }

  static closeCashRegister(params: {
    countedCashAmount: number;
    user: User;
    closingNotes?: string;
    sessionId?: string;
  }): CashRegisterSession {
    const current = params.sessionId
      ? this.getCashRegisterSessions().find((s) => s.id === params.sessionId)
      : this.getCurrentCashRegister(params.user.id);

    if (!current) {
      throw new Error('Nenhum caixa aberto para fechamento no momento.');
    }

    const now = new Date().toISOString();
    const summary = this.calculateSessionSummary({ ...current, closedAt: now });
    const counted = Number(params.countedCashAmount.toFixed(2));
    const difference = Number((counted - summary.expectedCashAmount).toFixed(2));

    const updatedSession: CashRegisterSession = {
      ...current,
      status: 'FECHADO',
      closedAt: now,
      closedByUserId: params.user.id,
      closedByUserName: params.user.name,
      cashSalesAmount: summary.cashSalesAmount,
      cashExpensesAmount: summary.cashExpensesAmount,
      expectedCashAmount: summary.expectedCashAmount,
      countedCashAmount: counted,
      cashDifference: difference,
      totalSalesCount: summary.totalSalesCount,
      totalGrossSales: summary.totalGrossSales,
      totalCardFees: summary.totalCardFees,
      totalNetSales: summary.totalNetSales,
      byMethod: summary.byMethod,
      byAccount: summary.byAccount,
      closingNotes: params.closingNotes?.trim() || undefined,
      updatedAt: now,
    };

    const sessions = this.getCashRegisterSessions();
    const index = sessions.findIndex((s) => s.id === current.id);
    if (index >= 0) {
      sessions[index] = updatedSession;
    } else {
      sessions.unshift(updatedSession);
    }

    setItemToStorage(STORAGE_KEYS.CASH_REGISTER_SESSIONS, sessions);

    // Persistência no servidor para sincronizar status com todos os outros dispositivos
    api.saveCashRegisterSession(updatedSession).catch((err) => {
      console.warn('Fechamento de caixa salvo localmente; aviso de sincronização:', err);
    });

    return updatedSession;
  }

  // --- SALE ANNOTATIONS (METADATA SEM ALTERAÇÃO DE DADOS DE VENDA) ---
  static getSaleAnnotations(saleId?: string): import('../types').SaleAnnotation[] {
    const all = getItemFromStorage<import('../types').SaleAnnotation[]>(STORAGE_KEYS.SALE_ANNOTATIONS, []);
    if (saleId) {
      return all
        .filter((a) => a.saleId === saleId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async addSaleAnnotation(params: {
    saleId: string;
    text: string;
    user?: User;
  }): Promise<import('../types').SaleAnnotation> {
    const trimmed = params.text?.trim();
    if (!trimmed) {
      throw new Error('A anotação não pode ser vazia.');
    }

    const sales = this.getSales();
    const saleIndex = sales.findIndex((s) => s.id === params.saleId);
    if (saleIndex === -1) {
      throw new Error('Venda não encontrada para registrar a anotação.');
    }

    const existingSale = sales[saleIndex];
    const now = new Date().toISOString();
    const author = params.user || this.getCurrentUser();

    // Cria anotação como metadado isolado sem tocar em itens, quantidades, valores, comissões ou vendedor original
    const newAnnotation: import('../types').SaleAnnotation = {
      id: `annot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      saleId: params.saleId,
      text: trimmed,
      userId: author?.id,
      userName: author?.name,
      createdAt: now,
    };

    // 1. Persiste na lista de anotações
    const allAnnotations = this.getSaleAnnotations();
    allAnnotations.unshift(newAnnotation);
    setItemToStorage(STORAGE_KEYS.SALE_ANNOTATIONS, allAnnotations);

    // 2. Atualiza a venda preservando todos os campos financeiros e originais intactos
    const updatedSale: Sale = {
      ...existingSale,
      annotations: [newAnnotation, ...(existingSale.annotations || [])],
      notes: existingSale.notes
        ? `${existingSale.notes}\n[${now.split('T')[0]}] ${trimmed}`
        : trimmed,
    };
    sales[saleIndex] = updatedSale;
    setItemToStorage(STORAGE_KEYS.SALES, sales);

    // 3. Persiste no servidor (tabela isolada de anotações e coluna notes)
    try {
      const serverRes = await api.addSaleAnnotation(params.saleId, trimmed, author);
      if (serverRes && serverRes.id) {
        newAnnotation.id = serverRes.id;
      }
    } catch (err) {
      console.warn('Anotação salva localmente; aviso de sincronização:', err);
    }

    return newAnnotation;
  }

  // --- DISMISSED STOCK WARNINGS (FECHAR / IGNORAR AVISOS SEM ALTERAR ESTOQUE) ---
  static getDismissedStockWarnings(): string[] {
    return getItemFromStorage<string[]>(STORAGE_KEYS.DISMISSED_STOCK_WARNINGS, []);
  }

  static dismissStockWarning(itemId: string): void {
    const list = this.getDismissedStockWarnings();
    if (!list.includes(itemId)) {
      list.push(itemId);
      setItemToStorage(STORAGE_KEYS.DISMISSED_STOCK_WARNINGS, list);
    }
  }

  static dismissAllStockWarnings(itemIds: string[]): void {
    const list = this.getDismissedStockWarnings();
    const set = new Set([...list, ...itemIds]);
    setItemToStorage(STORAGE_KEYS.DISMISSED_STOCK_WARNINGS, Array.from(set));
  }

  static restoreStockWarnings(): void {
    setItemToStorage(STORAGE_KEYS.DISMISSED_STOCK_WARNINGS, []);
  }

  static isStockWarningDismissed(itemId: string): boolean {
    const list = this.getDismissedStockWarnings();
    return list.includes(itemId);
  }

  // --- BUDGETS / ORÇAMENTOS ---
  static getBudgets(): Budget[] {
    return getItemFromStorage(STORAGE_KEYS.BUDGETS, []);
  }

  static getBudgetById(id: string): Budget | undefined {
    return this.getBudgets().find((b) => b.id === id);
  }

  static generateNextBudgetNumber(): string {
    const budgets = this.getBudgets();
    const year = new Date().getFullYear();
    const count = budgets.length + 1;
    return `ORC-${year}-${String(count).padStart(4, '0')}`;
  }

  static saveBudget(budget: Budget): Budget {
    const budgets = this.getBudgets();
    const index = budgets.findIndex((b) => b.id === budget.id);
    const updated = { ...budget, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      budgets[index] = updated;
    } else {
      budgets.unshift(updated);
    }
    setItemToStorage(STORAGE_KEYS.BUDGETS, budgets);
    api.saveBudget(updated).catch((e) => console.debug('Background saveBudget sync notice:', e));
    return updated;
  }

  static updateBudgetStatus(id: string, status: BudgetStatus): Budget | undefined {
    const budget = this.getBudgetById(id);
    if (!budget) return undefined;
    budget.status = status;
    return this.saveBudget(budget);
  }

  static updateBudget(id: string, updates: Partial<Budget>): Budget | undefined {
    const budget = this.getBudgetById(id);
    if (!budget) return undefined;

    let subtotal = budget.subtotal;
    let totalCost = budget.totalCost;
    if (updates.items) {
      subtotal = updates.items.reduce((acc, item) => acc + item.totalPrice, 0);
      totalCost = updates.items.reduce((acc, item) => acc + item.totalCost, 0);
    }
    const discount = updates.discount !== undefined ? updates.discount : budget.discount;
    const total = Math.max(0, Number((subtotal - discount).toFixed(2)));

    const updated: Budget = {
      ...budget,
      ...updates,
      subtotal: Number(subtotal.toFixed(2)),
      totalCost: Number((totalCost || 0).toFixed(2)),
      total,
      updatedAt: new Date().toISOString(),
    };

    return this.saveBudget(updated);
  }

  static deleteBudget(id: string): void {
    const budgets = this.getBudgets().filter((b) => b.id !== id);
    setItemToStorage(STORAGE_KEYS.BUDGETS, budgets);
    api.deleteBudget(id).catch((e) => console.debug('Background deleteBudget sync notice:', e));
  }

  static createBudget(params: {
    seller: User;
    customer?: Customer;
    cartItems: CartItem[];
    freight?: number;
    discount: number;
    validUntilDays?: number;
    notes?: string;
    paymentConditions?: string;
    productionLeadTime?: string;
    promoterId?: string;
    promoterName?: string;
  }): Budget {
    const {
      seller,
      customer,
      cartItems,
      freight: paramFreight,
      discount,
      validUntilDays = 15,
      notes,
      paymentConditions,
      productionLeadTime,
      promoterId: paramPromoterId,
      promoterName: paramPromoterName,
    } = params;

    if (!cartItems.length) {
      throw new Error('O carrinho está vazio para gerar orçamento.');
    }

    let finalPromoterId = paramPromoterId;
    let finalPromoterName = paramPromoterName;

    if (!finalPromoterId && customer?.promoterId) {
      finalPromoterId = customer.promoterId;
      finalPromoterName = customer.promoterName;
    }

    if (!finalPromoterId && seller.role === 'PROMOTOR') {
      finalPromoterId = seller.id;
      finalPromoterName = seller.name;
    }

    const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
    const totalCost = cartItems.reduce((acc, item) => acc + item.totalCost, 0);

    const hasThirdParty = cartItems.some(
      (ci) =>
        ci.item?.productionType === 'PRODUCAO_TERCEIRIZADA' ||
        (ci.item as any)?.production_type === 'PRODUCAO_TERCEIRIZADA' ||
        (Number(ci.item?.supplierFreight) > 0)
    );
    const companySettings = this.getCompanySettings();
    const adminFreight =
      companySettings?.defaultSupplierFreight !== undefined
        ? Number(companySettings.defaultSupplierFreight)
        : 20.0;
    const finalFreight =
      paramFreight !== undefined
        ? Number(paramFreight)
        : hasThirdParty && adminFreight > 0
        ? adminFreight
        : 0;

    const total = Math.max(0, Number((subtotal + finalFreight - discount).toFixed(2)));

    const now = new Date();
    const validUntilDate = new Date();
    validUntilDate.setDate(now.getDate() + validUntilDays);

    const budgetNumber = this.generateNextBudgetNumber();

    const newBudget: Budget = {
      id: `orc-${Date.now()}`,
      budgetNumber,
      sellerId: seller.id,
      sellerName: seller.name,
      promoterId: finalPromoterId || undefined,
      promoterName: finalPromoterName || undefined,
      customerId: customer?.id,
      customerName: customer ? customer.name : 'Cliente Avulso',
      customerPhone: customer?.phone,
      customerEmail: customer?.email,
      customerDocument: customer?.document,
      customerAddress: customer?.address ? `${customer.address}${customer.city ? ` - ${customer.city}/${customer.state || ''}` : ''}` : undefined,
      items: [...cartItems],
      subtotal: Number(subtotal.toFixed(2)),
      freight: finalFreight,
      shippingCost: finalFreight,
      addition: finalFreight,
      discount: Number(discount.toFixed(2)),
      total,
      totalCost: Number(totalCost.toFixed(2)),
      validUntil: validUntilDate.toISOString().split('T')[0],
      status: 'ABERTO',
      notes: notes?.trim() || undefined,
      paymentConditions: paymentConditions?.trim() || 'À vista no PIX, Dinheiro ou Cartão',
      productionLeadTime: productionLeadTime?.trim() || '2 a 4 dias úteis após aprovação',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return this.saveBudget(newBudget);
  }

  static convertBudgetToSale(
    budgetId: string,
    saleParams: {
      payments: PaymentRecord[];
      paymentStatus: PaymentStatus;
      dueDate?: string;
      notes?: string;
      convertingUser?: User;
    }
  ): { sale: Sale; productionOrdersCreated: ProductionOrder[]; budget: Budget } {
    const budget = this.getBudgetById(budgetId);
    if (!budget) {
      throw new Error('Orçamento não encontrado para conversão.');
    }

    const currentUser = saleParams.convertingUser || this.getCurrentUser();
    // If the budget was created by a promoter, the converting seller/admin is the seller executing the transaction
    const seller =
      currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'VENDEDOR' || currentUser.role === 'COLABORADOR'
        ? currentUser
        : this.getUsers().find((u) => u.id === budget.sellerId && u.role !== 'PROMOTOR') || currentUser;

    const customer = budget.customerId ? this.getCustomerById(budget.customerId) : undefined;

    const { sale, productionOrdersCreated } = this.createSale({
      seller,
      customer,
      cartItems: budget.items,
      discount: budget.discount,
      payments: saleParams.payments,
      paymentStatus: saleParams.paymentStatus,
      dueDate: saleParams.dueDate,
      notes: saleParams.notes || budget.notes ? `Convertido do ${budget.budgetNumber}. ${saleParams.notes || budget.notes || ''}` : undefined,
      promoterId: budget.promoterId,
      promoterName: budget.promoterName,
    });

    budget.status = 'CONVERTIDO_EM_VENDA';
    budget.convertedSaleId = sale.id;
    budget.convertedSaleNumber = sale.saleNumber;
    this.saveBudget(budget);

    return { sale, productionOrdersCreated, budget };
  }

  // --- CSV EXPORT UTILITIES ---
  static exportItemsToCSV(items: Item[], canViewCosts: boolean): void {
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = canViewCosts
      ? ['ID', 'Código SKU', 'Nome', 'Tipo', 'Categoria', 'Custo Fornecedor (R$)', 'Frete Fornecedor (R$)', 'Custo Total (R$)', 'Preço de Venda (R$)', 'Margem Bruta (R$)', 'Margem (%)', 'Status', 'Visível Vitrine']
      : ['ID', 'Código SKU', 'Nome', 'Tipo', 'Categoria', 'Preço de Venda (R$)', 'Status', 'Visível Vitrine'];

    const rows = items.map((item) => {
      const catName = catMap.get(item.categoryId) || 'Geral';
      const typeLabel = item.type === 'PRODUTO_GRAFICO' ? 'Gráfico' : item.type === 'PRODUTO_FISICO' ? 'Físico' : 'Serviço';
      const statusLabel = item.active ? 'Ativo' : 'Inativo';
      const catalogLabel = item.showInCatalog ? 'Sim' : 'Não';

      if (canViewCosts) {
        return [
          item.id,
          `"${item.sku.replace(/"/g, '""')}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${typeLabel}"`,
          `"${catName.replace(/"/g, '""')}"`,
          (item.supplierCost || 0).toFixed(2).replace('.', ','),
          (item.supplierFreight || 0).toFixed(2).replace('.', ','),
          (item.costPrice || 0).toFixed(2).replace('.', ','),
          (item.salePrice || 0).toFixed(2).replace('.', ','),
          (item.marginReais || 0).toFixed(2).replace('.', ','),
          (item.marginPercent || 0).toFixed(2).replace('.', ','),
          `"${statusLabel}"`,
          `"${catalogLabel}"`,
        ];
      } else {
        return [
          item.id,
          `"${item.sku.replace(/"/g, '""')}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${typeLabel}"`,
          `"${catName.replace(/"/g, '""')}"`,
          (item.salePrice || 0).toFixed(2).replace('.', ','),
          `"${statusLabel}"`,
          `"${catalogLabel}"`,
        ];
      }
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadBlobFile(csvContent, `produtos_catalogo_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  static exportCustomersToCSV(customers: Customer[]): void {
    const headers = ['ID', 'Nome / Razão Social', 'Tipo', 'CPF / CNPJ', 'Telefone / WhatsApp', 'E-mail', 'Endereço', 'Cidade', 'Estado', 'CEP', 'Data Cadastro'];

    const rows = customers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}"`,
      `"${(c.document || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.state || '').replace(/"/g, '""')}"`,
      `"${(c.zipCode || '').replace(/"/g, '""')}"`,
      `"${c.createdAt.split('T')[0]}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadBlobFile(csvContent, `clientes_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  static exportBudgetsToCSV(budgets: Budget[]): void {
    const headers = ['Número Orçamento', 'Cliente', 'Telefone', 'Vendedor', 'Itens Qtd', 'Subtotal (R$)', 'Desconto (R$)', 'Total (R$)', 'Validade', 'Status', 'Data Criação'];

    const rows = budgets.map((b) => [
      b.budgetNumber,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${(b.customerPhone || '').replace(/"/g, '""')}"`,
      `"${b.sellerName.replace(/"/g, '""')}"`,
      b.items.reduce((acc, it) => acc + it.quantity, 0),
      b.subtotal.toFixed(2).replace('.', ','),
      b.discount.toFixed(2).replace('.', ','),
      b.total.toFixed(2).replace('.', ','),
      b.validUntil,
      `"${b.status}"`,
      `"${b.createdAt.split('T')[0]}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadBlobFile(csvContent, `orcamentos_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  static exportSalesToCSV(sales: Sale[]): void {
    const headers = ['Número Venda', 'Data', 'Cliente', 'CPF/CNPJ', 'Vendedor', 'Subtotal (R$)', 'Desconto (R$)', 'Total (R$)', 'Valor Pago (R$)', 'Saldo Aberto (R$)', 'Status Pagamento', 'Comissão Vendedor (R$)', 'Lucro Bruto (R$)'];

    const rows = sales.map((s) => [
      s.saleNumber,
      `"${s.createdAt.replace('T', ' ').substring(0, 19)}"`,
      `"${s.customerName.replace(/"/g, '""')}"`,
      `"${(s.customerDocument || '').replace(/"/g, '""')}"`,
      `"${s.sellerName.replace(/"/g, '""')}"`,
      s.subtotal.toFixed(2).replace('.', ','),
      s.discount.toFixed(2).replace('.', ','),
      s.total.toFixed(2).replace('.', ','),
      s.paidAmount.toFixed(2).replace('.', ','),
      s.remainingAmount.toFixed(2).replace('.', ','),
      `"${s.paymentStatus}"`,
      s.commissionAmount.toFixed(2).replace('.', ','),
      s.grossProfit.toFixed(2).replace('.', ','),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadBlobFile(csvContent, `vendas_faturamento_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  // --- ONLINE EXTERNAL SERVICES ("Serviços Online") ---
  static getOnlineServices(): OnlineService[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ONLINE_SERVICES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.ONLINE_SERVICES, JSON.stringify(INITIAL_ONLINE_SERVICES));
        return INITIAL_ONLINE_SERVICES;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_ONLINE_SERVICES;
    }
  }

  static saveOnlineServices(services: OnlineService[]): void {
    localStorage.setItem(STORAGE_KEYS.ONLINE_SERVICES, JSON.stringify(services));
  }

  static addOnlineService(service: Omit<OnlineService, 'id' | 'createdAt' | 'updatedAt'>): OnlineService {
    const services = this.getOnlineServices();
    const now = new Date().toISOString();
    const newService: OnlineService = {
      ...service,
      id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    if (this.isTestUserActive()) {
      return newService;
    }
    services.push(newService);
    this.saveOnlineServices(services);
    return newService;
  }

  static updateOnlineService(id: string, updates: Partial<OnlineService>): OnlineService | undefined {
    const services = this.getOnlineServices();
    const index = services.findIndex((s) => s.id === id);
    if (index === -1) return undefined;

    const updated: OnlineService = {
      ...services[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (this.isTestUserActive()) {
      return updated;
    }
    services[index] = updated;
    this.saveOnlineServices(services);

    // Synchronize corresponding Item in items collection
    if (updates.url !== undefined) {
      try {
        const items = this.getItems();
        const itemId = `prod-srv-${id.replace('srv-', '')}`;
        let itemChanged = false;
        const newItems = items.map((it) => {
          if (it.id === itemId || it.id === id || it.name.toLowerCase().trim() === updated.name.toLowerCase().trim()) {
            itemChanged = true;
            return { ...it, serviceUrl: updates.url, url: updates.url, updatedAt: new Date().toISOString() };
          }
          return it;
        });
        if (itemChanged) {
          setItemToStorage(STORAGE_KEYS.ITEMS, newItems);
        }
      } catch (err) {
        console.warn('Notice syncing item from online service:', err);
      }
    }

    return updated;
  }

  static deleteOnlineService(id: string): void {
    if (this.isTestUserActive()) {
      return;
    }
    const services = this.getOnlineServices();
    const filtered = services.filter((s) => s.id !== id);
    this.saveOnlineServices(filtered);
  }

  // --- DOCUMENT TEMPLATES ("Modelos de Documentos") ---
  static getDocumentTemplates(): DocumentTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENT_TEMPLATES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_TEMPLATES, JSON.stringify(INITIAL_DOCUMENT_TEMPLATES));
        return INITIAL_DOCUMENT_TEMPLATES;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_DOCUMENT_TEMPLATES;
    }
  }

  static saveDocumentTemplates(templates: DocumentTemplate[]): void {
    localStorage.setItem(STORAGE_KEYS.DOCUMENT_TEMPLATES, JSON.stringify(templates));
  }

  static addDocumentTemplate(template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>): DocumentTemplate {
    const templates = this.getDocumentTemplates();
    const now = new Date().toISOString();
    const newTemplate: DocumentTemplate = {
      ...template,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    templates.push(newTemplate);
    this.saveDocumentTemplates(templates);

    // Sync fields with Global Library so they become reusable across all templates
    if (newTemplate.fields && newTemplate.fields.length > 0) {
      newTemplate.fields.forEach((f) => {
        this.upsertGlobalDocumentField(f);
      });
    }

    return newTemplate;
  }

  static updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): DocumentTemplate | undefined {
    const templates = this.getDocumentTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    const updated: DocumentTemplate = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    templates[index] = updated;
    this.saveDocumentTemplates(templates);

    // Sync fields with Global Library so they become reusable across all templates
    if (updated.fields && updated.fields.length > 0) {
      updated.fields.forEach((f) => {
        this.upsertGlobalDocumentField(f);
      });
    }

    return updated;
  }

  static duplicateDocumentTemplate(id: string): DocumentTemplate | undefined {
    const templates = this.getDocumentTemplates();
    const source = templates.find((t) => t.id === id);
    if (!source) return undefined;

    const now = new Date().toISOString();
    const duplicated: DocumentTemplate = {
      ...source,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: `${source.title} (Cópia)`,
      fields: (source.fields || []).map((f) => ({ ...f })),
      createdAt: now,
      updatedAt: now,
    };

    templates.push(duplicated);
    this.saveDocumentTemplates(templates);
    return duplicated;
  }

  static toggleDocumentTemplateActive(id: string): DocumentTemplate | undefined {
    const templates = this.getDocumentTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    templates[index].active = !templates[index].active;
    templates[index].updatedAt = new Date().toISOString();
    this.saveDocumentTemplates(templates);
    return templates[index];
  }

  static deleteDocumentTemplate(id: string): void {
    const templates = this.getDocumentTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    this.saveDocumentTemplates(filtered);
  }

  // --- GLOBAL DOCUMENT FIELDS LIBRARY ("Biblioteca Global de Campos / Tags") ---
  static getGlobalDocumentFields(): DocumentField[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GLOBAL_DOCUMENT_FIELDS);
      if (stored) {
        const parsed: DocumentField[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge any fields from templates not yet registered in the global library (non-destructive)
          const templates = this.getDocumentTemplates();
          const map = new Map<string, DocumentField>();
          parsed.forEach((f) => map.set(f.id, f));

          let hasNew = false;
          templates.forEach((t) => {
            (t.fields || []).forEach((f) => {
              if (!map.has(f.id)) {
                map.set(f.id, { ...f });
                hasNew = true;
              }
            });
          });

          if (hasNew) {
            const merged = Array.from(map.values());
            this.saveGlobalDocumentFields(merged);
            return merged;
          }
          return parsed;
        }
      }

      // Initial harvest: extract unique fields from existing templates + core base fields
      const map = new Map<string, DocumentField>();

      // Base fields universally expected in documents
      const baseFields: DocumentField[] = [
        { id: 'nome_completo', label: 'Nome Completo', type: 'text', required: true, placeholder: 'Ex: Carlos Eduardo de Oliveira', customerFieldMapping: 'name' },
        { id: 'cpf', label: 'CPF', type: 'text', required: true, placeholder: '000.000.000-00', customerFieldMapping: 'document' },
        { id: 'rg', label: 'RG / Órgão Emissor', type: 'text', required: false, placeholder: '00.000.000-0 SSP/SP' },
        { id: 'telefone', label: 'Telefone / WhatsApp', type: 'phone', required: true, placeholder: '(11) 98765-4321', customerFieldMapping: 'phone' },
        { id: 'email', label: 'E-mail', type: 'email', required: false, placeholder: 'cliente@email.com', customerFieldMapping: 'email' },
        { id: 'endereco', label: 'Endereço Completo', type: 'text', required: false, placeholder: 'Rua, número, bairro', customerFieldMapping: 'address' },
        { id: 'cidade', label: 'Cidade e Estado', type: 'text', required: false, placeholder: 'São Paulo - SP', customerFieldMapping: 'city' },
        { id: 'data_atual', label: 'Data Atual', type: 'text', required: false, customerFieldMapping: 'current_date' },
        { id: 'nome_empresa', label: 'Nome da Empresa / Razão Social', type: 'text', required: false, customerFieldMapping: 'company_name' },
      ];

      baseFields.forEach((f) => map.set(f.id, f));

      // Harvest from all registered document templates
      const templates = this.getDocumentTemplates();
      templates.forEach((t) => {
        (t.fields || []).forEach((f) => {
          if (!map.has(f.id)) {
            map.set(f.id, { ...f });
          }
        });
      });

      const initialFields = Array.from(map.values());
      this.saveGlobalDocumentFields(initialFields);
      return initialFields;
    } catch {
      return [];
    }
  }

  static saveGlobalDocumentFields(fields: DocumentField[]): void {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_DOCUMENT_FIELDS, JSON.stringify(fields));
  }

  static upsertGlobalDocumentField(field: DocumentField): DocumentField {
    const all = this.getGlobalDocumentFields();
    const cleanId = field.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const existingIndex = all.findIndex((f) => f.id === cleanId);

    const updatedField: DocumentField = {
      ...field,
      id: cleanId,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = {
        ...all[existingIndex],
        ...updatedField,
      };
    } else {
      all.push(updatedField);
    }

    this.saveGlobalDocumentFields(all);
    return updatedField;
  }

  static deleteGlobalDocumentField(id: string): void {
    const all = this.getGlobalDocumentFields();
    const filtered = all.filter((f) => f.id !== id);
    this.saveGlobalDocumentFields(filtered);
  }

  // --- GENERATED DOCUMENTS ("Documentos Gerados") ---
  static getGeneratedDocuments(sellerId?: string, isPrivileged?: boolean): GeneratedDocument[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GENERATED_DOCUMENTS);
      const docs: GeneratedDocument[] = stored ? JSON.parse(stored) : [];
      if (sellerId && !isPrivileged) {
        // Normal sellers only see their own created documents
        return docs.filter((d) => d.sellerId === sellerId);
      }
      return docs;
    } catch {
      return [];
    }
  }

  static saveGeneratedDocuments(docs: GeneratedDocument[]): void {
    localStorage.setItem(STORAGE_KEYS.GENERATED_DOCUMENTS, JSON.stringify(docs));
  }

  static addGeneratedDocument(doc: Omit<GeneratedDocument, 'id' | 'createdAt' | 'updatedAt'>): GeneratedDocument {
    const stored = localStorage.getItem(STORAGE_KEYS.GENERATED_DOCUMENTS);
    const docs: GeneratedDocument[] = stored ? JSON.parse(stored) : [];
    const now = new Date().toISOString();
    const newDoc: GeneratedDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    docs.unshift(newDoc);
    this.saveGeneratedDocuments(docs);
    return newDoc;
  }

  static updateGeneratedDocument(id: string, updates: Partial<GeneratedDocument>): GeneratedDocument | undefined {
    const stored = localStorage.getItem(STORAGE_KEYS.GENERATED_DOCUMENTS);
    const docs: GeneratedDocument[] = stored ? JSON.parse(stored) : [];
    const index = docs.findIndex((d) => d.id === id);
    if (index === -1) return undefined;

    const updated: GeneratedDocument = {
      ...docs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    docs[index] = updated;
    this.saveGeneratedDocuments(docs);
    return updated;
  }

  static deleteGeneratedDocument(id: string): void {
    const stored = localStorage.getItem(STORAGE_KEYS.GENERATED_DOCUMENTS);
    const docs: GeneratedDocument[] = stored ? JSON.parse(stored) : [];
    const filtered = docs.filter((d) => d.id !== id);
    this.saveGeneratedDocuments(filtered);
  }

  // ==========================================
  // --- MÓDULO DE CAPTAÇÃO E PROSPECÇÃO ATIVA ---
  // ==========================================

  // --- OPORTUNIDADES ---
  static getOpportunities(): Opportunity[] {
    return getItemFromStorage(STORAGE_KEYS.OPPORTUNITIES, INITIAL_OPPORTUNITIES);
  }

  static getOpportunityById(id: string): Opportunity | undefined {
    return this.getOpportunities().find((o) => o.id === id);
  }

  static saveOpportunity(opportunity: Partial<Opportunity> & { name: string; phone: string }): Opportunity {
    const opps = this.getOpportunities();
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();

    if (!opportunity.name || !opportunity.name.trim()) {
      throw new Error('O Nome do cliente ou estabelecimento é obrigatório.');
    }
    if (!opportunity.phone || !opportunity.phone.trim()) {
      throw new Error('O Telefone ou WhatsApp é obrigatório.');
    }

    if (opportunity.id) {
      const index = opps.findIndex((o) => o.id === opportunity.id);
      if (index >= 0) {
        const oldStage = opps[index].stage;
        const updated: Opportunity = {
          ...opps[index],
          ...opportunity,
          updatedAt: now,
        };
        opps[index] = updated;
        setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, opps);
        api.saveOpportunity(updated).catch((e) => console.debug('Background saveOpportunity sync notice:', e));

        // Se mudou de etapa, registra atividade
        if (opportunity.stage && opportunity.stage !== oldStage) {
          this.addOpportunityActivity({
            opportunityId: updated.id,
            type: 'MUDANCA_ETAPA',
            description: `Etapa alterada de "${this.getStageLabel(oldStage)}" para "${this.getStageLabel(opportunity.stage)}"`,
            userId: currentUser.id,
            userName: currentUser.name,
          });
        }

        return updated;
      }
    }

    // Criar nova oportunidade
    const count = opps.length + 1;
    const oppNumber = `OPP-${String(count).padStart(3, '0')}`;
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      opportunityNumber: oppNumber,
      name: opportunity.name.trim(),
      contactName: opportunity.contactName?.trim() || undefined,
      segment: opportunity.segment || 'Comércio & Serviços Gerais',
      neighborhood: opportunity.neighborhood?.trim() || undefined,
      city: opportunity.city?.trim() || undefined,
      phone: opportunity.phone.trim(),
      whatsapp: opportunity.whatsapp?.trim() || opportunity.phone.trim(),
      instagram: opportunity.instagram?.trim() || undefined,
      needs: opportunity.needs || [],
      needsDescription: opportunity.needsDescription?.trim() || undefined,
      origin: opportunity.origin || 'PROSPECCAO_PRESENCIAL',
      originDetails: opportunity.originDetails?.trim() || undefined,
      stage: opportunity.stage || 'IDENTIFICADO',
      assignedUserId: opportunity.assignedUserId || currentUser.id,
      assignedUserName: opportunity.assignedUserName || currentUser.name,
      notes: opportunity.notes?.trim() || undefined,
      suggestedProductIds: opportunity.suggestedProductIds || [],
      suggestedPackageIds: opportunity.suggestedPackageIds || [],
      nextAction: opportunity.nextAction,
      createdAt: now,
      updatedAt: now,
    };

    opps.unshift(newOpp);
    setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, opps);
    api.saveOpportunity(newOpp).catch((e) => console.debug('Background saveOpportunity sync notice:', e));

    // Registra atividade inicial
    this.addOpportunityActivity({
      opportunityId: newOpp.id,
      type: 'OBSERVACAO',
      description: `Oportunidade cadastrada na etapa "${this.getStageLabel(newOpp.stage)}" (Origem: ${this.getOriginLabel(newOpp.origin)})`,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    return newOpp;
  }

  static updateOpportunityStage(id: string, stage: OpportunityStage, note?: string): Opportunity | undefined {
    const opps = this.getOpportunities();
    const index = opps.findIndex((o) => o.id === id);
    if (index === -1) return undefined;

    const oldStage = opps[index].stage;
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();

    opps[index] = {
      ...opps[index],
      stage,
      updatedAt: now,
    };

    if (stage === 'CONVERTIDO') {
      opps[index].convertedAt = now;
    }

    setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, opps);
    api.saveOpportunity(opps[index]).catch((e) => console.debug('Background updateOpportunityStage sync notice:', e));

    const desc = note
      ? `Etapa alterada para "${this.getStageLabel(stage)}". Nota: ${note}`
      : `Etapa alterada de "${this.getStageLabel(oldStage)}" para "${this.getStageLabel(stage)}"`;

    this.addOpportunityActivity({
      opportunityId: id,
      type: stage === 'CONVERTIDO' ? 'CONVERSAO' : 'MUDANCA_ETAPA',
      description: desc,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    return opps[index];
  }

  static deleteOpportunity(id: string): void {
    const opps = this.getOpportunities().filter((o) => o.id !== id);
    setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, opps);
    api.deleteOpportunity(id).catch((e) => console.debug('Background deleteOpportunity sync notice:', e));

    // Remove atividades associadas
    const activities = this.getOpportunityActivities().filter((a) => a.opportunityId !== id);
    setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, activities);
  }

  // --- CONVERSÃO DE OPORTUNIDADE EM CLIENTE ---
  static convertOpportunityToCustomer(oppId: string): { customer: Customer; opportunity: Opportunity } {
    const opp = this.getOpportunityById(oppId);
    if (!opp) {
      throw new Error('Oportunidade não encontrada.');
    }

    const cleanPhone = normalizePhone(opp.phone);
    const existingCustomers = this.getCustomers();
    let targetCustomer: Customer;

    // Verifica se já existe cliente com este telefone
    const existing = existingCustomers.find((c) => normalizePhone(c.phone) === cleanPhone);

    if (existing) {
      targetCustomer = existing;
    } else {
      // Cria novo cliente usando os dados da oportunidade sem retrabalho
      const newCust: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: opp.name,
        phone: opp.whatsapp || opp.phone,
        type: 'PJ',
        address: opp.neighborhood ? `${opp.neighborhood}, ${opp.city || ''}` : undefined,
        city: opp.city || undefined,
        notes: `Contato: ${opp.contactName || 'Responsável'}. Cliente originado da Prospecção / Oportunidade #${opp.opportunityNumber || opp.id}. Segmento: ${opp.segment}.`,
        createdAt: new Date().toISOString(),
      };
      existingCustomers.push(newCust);
      setItemToStorage(STORAGE_KEYS.CUSTOMERS, existingCustomers);
      targetCustomer = newCust;
    }

    // Atualiza a oportunidade para CONVERTIDO
    const updatedOpp = this.saveOpportunity({
      ...opp,
      stage: 'CONVERTIDO',
      convertedCustomerId: targetCustomer.id,
      convertedAt: new Date().toISOString(),
    });

    const currentUser = this.getCurrentUser();
    this.addOpportunityActivity({
      opportunityId: opp.id,
      type: 'CONVERSAO',
      description: `Oportunidade convertida com sucesso no Cliente "${targetCustomer.name}"!`,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    return { customer: targetCustomer, opportunity: updatedOpp };
  }

  // --- HISTÓRICO DE ATIVIDADES DE PROSPECÇÃO ---
  static getOpportunityActivities(opportunityId?: string): OpportunityActivity[] {
    const all = getItemFromStorage<OpportunityActivity[]>(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, []);
    if (opportunityId) {
      return all
        .filter((a) => a.opportunityId === opportunityId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static addOpportunityActivity(params: {
    opportunityId: string;
    type: OpportunityActivityType;
    description: string;
    userId?: string;
    userName?: string;
    date?: string;
  }): OpportunityActivity {
    const all = this.getOpportunityActivities();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const newActivity: OpportunityActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      opportunityId: params.opportunityId,
      type: params.type,
      description: params.description,
      userId: params.userId || currentUser.id,
      userName: params.userName || currentUser.name,
      date: params.date || now,
      createdAt: now,
    };

    all.unshift(newActivity);
    setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, all);
    api.saveOpportunityActivity(newActivity).catch((e) => console.debug('Background saveOpportunityActivity sync notice:', e));

    // Atualiza updatedAt da oportunidade
    const opps = this.getOpportunities();
    const idx = opps.findIndex((o) => o.id === params.opportunityId);
    if (idx >= 0) {
      opps[idx].updatedAt = now;
      setItemToStorage(STORAGE_KEYS.OPPORTUNITIES, opps);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('opportunity-activities-updated', { detail: { opportunityId: params.opportunityId } }));
    }

    return newActivity;
  }

  static deleteOpportunityActivity(id: string): void {
    const all = this.getOpportunityActivities().filter((a) => a.id !== id);
    setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, all);
    api.deleteOpportunityActivity(id).catch((e) => console.debug('Background deleteOpportunityActivity sync notice:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('opportunity-activities-updated'));
    }
  }

  // --- ITENS QUE PRECISAM DE RETORNO OU AÇÕES DE HOJE ---
  static getTodayProspectingTasks(userId?: string): Opportunity[] {
    const opps = this.getOpportunities();
    const todayStr = new Date().toISOString().split('T')[0];

    return opps.filter((o) => {
      if (o.stage === 'CONVERTIDO' || o.stage === 'NAO_CONVERTEU') return false;
      if (userId && o.assignedUserId && o.assignedUserId !== userId) return false;

      // Tem próxima ação para hoje ou atrasada
      if (o.nextAction && !o.nextAction.completed) {
        if (o.nextAction.date <= todayStr) return true;
      }
      return false;
    });
  }

  static getOpportunitiesNeedingReturn(): Opportunity[] {
    const opps = this.getOpportunities();
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    return opps.filter((o) => {
      // Não filtra os já finalizados
      if (o.stage === 'CONVERTIDO' || o.stage === 'NAO_CONVERTEU') return false;

      // Em orçamento ou interessado sem contato há mais de 3 dias
      const lastUpdate = new Date(o.updatedAt).getTime();
      const isStale = now - lastUpdate > threeDaysMs;

      // Ou tem próxima ação atrasada
      const todayStr = new Date().toISOString().split('T')[0];
      const hasOverdueAction = o.nextAction && !o.nextAction.completed && o.nextAction.date < todayStr;

      return (isStale && (o.stage === 'ORCAMENTO' || o.stage === 'INTERESSADO' || o.stage === 'CONTATADO')) || hasOverdueAction;
    });
  }

  // --- PACOTES E SOLUÇÕES ---
  static getPackages(): ProductPackage[] {
    return getItemFromStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  }

  static getPackageById(id: string): ProductPackage | undefined {
    return this.getPackages().find((p) => p.id === id);
  }

  static savePackage(pkg: Partial<ProductPackage> & { name: string; items: ProductPackage['items'] }): ProductPackage {
    const packages = this.getPackages();
    const now = new Date().toISOString();

    if (!pkg.name || !pkg.name.trim()) {
      throw new Error('O nome do pacote é obrigatório.');
    }
    if (!pkg.items || pkg.items.length === 0) {
      throw new Error('O pacote deve conter pelo menos 1 item.');
    }

    const originalTotal = pkg.items.reduce((sum, i) => sum + (i.totalPrice || i.unitPrice * i.quantity), 0);
    const packagePrice = pkg.packagePrice !== undefined ? pkg.packagePrice : originalTotal;
    const discountPercent = originalTotal > 0 ? Math.round(((originalTotal - packagePrice) / originalTotal) * 100) : 0;

    if (pkg.id) {
      const idx = packages.findIndex((p) => p.id === pkg.id);
      if (idx >= 0) {
        const updated: ProductPackage = {
          ...packages[idx],
          ...pkg,
          originalTotal,
          packagePrice,
          discountPercent: Math.max(0, discountPercent),
          updatedAt: now,
        };
        packages[idx] = updated;
        setItemToStorage(STORAGE_KEYS.PACKAGES, packages);
        return updated;
      }
    }

    const newPkg: ProductPackage = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: pkg.name.trim(),
      description: pkg.description || '',
      targetSegment: pkg.targetSegment || 'Geral',
      items: pkg.items,
      originalTotal,
      packagePrice,
      discountPercent: Math.max(0, discountPercent),
      active: pkg.active !== undefined ? pkg.active : true,
      featuredInPublic: pkg.featuredInPublic !== undefined ? pkg.featuredInPublic : true,
      createdAt: now,
      updatedAt: now,
    };

    packages.push(newPkg);
    setItemToStorage(STORAGE_KEYS.PACKAGES, packages);
    return newPkg;
  }

  static deletePackage(id: string): void {
    const packages = this.getPackages().filter((p) => p.id !== id);
    setItemToStorage(STORAGE_KEYS.PACKAGES, packages);
  }

  // --- MODELOS DE MENSAGENS / ABORDAGENS ---
  static getApproachTemplates(): ApproachMessageTemplate[] {
    return getItemFromStorage(STORAGE_KEYS.APPROACH_TEMPLATES, INITIAL_APPROACH_TEMPLATES);
  }

  static saveApproachTemplate(tpl: Partial<ApproachMessageTemplate> & { title: string; templateText: string }): ApproachMessageTemplate {
    const templates = this.getApproachTemplates();
    const now = new Date().toISOString();

    let result: ApproachMessageTemplate;

    if (tpl.id) {
      const idx = templates.findIndex((t) => t.id === tpl.id);
      if (idx >= 0) {
        const updated: ApproachMessageTemplate = {
          ...templates[idx],
          ...tpl,
        };
        templates[idx] = updated;
        setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, templates);
        result = updated;
      } else {
        const newTpl: ApproachMessageTemplate = {
          id: tpl.id,
          title: tpl.title.trim(),
          category: tpl.category || 'Geral',
          targetStage: tpl.targetStage || 'ALL',
          templateText: tpl.templateText.trim(),
          isDefault: tpl.isDefault || false,
          active: tpl.active !== undefined ? tpl.active : true,
          createdAt: now,
        };
        templates.push(newTpl);
        setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, templates);
        result = newTpl;
      }
    } else {
      const newTpl: ApproachMessageTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: tpl.title.trim(),
        category: tpl.category || 'Geral',
        targetStage: tpl.targetStage || 'ALL',
        templateText: tpl.templateText.trim(),
        isDefault: tpl.isDefault || false,
        active: tpl.active !== undefined ? tpl.active : true,
        createdAt: now,
      };

      templates.push(newTpl);
      setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, templates);
      result = newTpl;
    }

    // Persistência compartilhada no servidor
    api.saveApproachTemplate(result).catch((e) => console.debug('Background saveApproachTemplate sync notice:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('approach-templates-updated'));
    }

    return result;
  }

  static deleteApproachTemplate(id: string): void {
    const templates = this.getApproachTemplates().filter((t) => t.id !== id);
    setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, templates);
    api.deleteApproachTemplate(id).catch((e) => console.debug('Background deleteApproachTemplate sync notice:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('approach-templates-updated'));
    }
  }

  static async loadApproachTemplatesAsync(): Promise<ApproachMessageTemplate[]> {
    try {
      const remote = await api.getApproachTemplates();
      if (Array.isArray(remote) && remote.length > 0) {
        setItemToStorage(STORAGE_KEYS.APPROACH_TEMPLATES, remote);
        return remote;
      }
    } catch {
      // fallback to local
    }
    return this.getApproachTemplates();
  }

  static async loadOpportunityActivitiesAsync(opportunityId?: string): Promise<OpportunityActivity[]> {
    try {
      const remote = await api.getOpportunityActivities(opportunityId);
      if (Array.isArray(remote)) {
        if (!opportunityId) {
          setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, remote);
        } else {
          const current = this.getOpportunityActivities().filter((a) => a.opportunityId !== opportunityId);
          const merged = [...current, ...remote].sort(
            (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
          );
          setItemToStorage(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, merged);
        }
        return remote;
      }
    } catch {
      // fallback
    }
    return this.getOpportunityActivities(opportunityId);
  }

  // Gerador de mensagem formatada substituindo variáveis dinâmicas
  static buildApproachMessage(
    templateText: string,
    opportunity: Opportunity,
    sellerName?: string,
    companyName?: string,
    suggestedPackageName?: string
  ): string {
    const seller = sellerName || this.getCurrentUser().name || 'Equipe Comercial';
    const company = companyName || this.getCompanySettings().name || 'Nossa Gráfica';
    const oppName = opportunity.contactName || opportunity.name || 'Amigo(a)';
    const bizName = opportunity.name || 'seu negócio';
    const need = opportunity.needs && opportunity.needs.length > 0 ? opportunity.needs[0] : 'divulgação e impressos';
    const pkg = suggestedPackageName || 'Kit Promocional de Divulgação';

    let text = templateText;
    text = text.replace(/\[NOME\]/g, oppName);
    text = text.replace(/\[VENDEDOR\]/g, seller);
    text = text.replace(/\[EMPRESA\]/g, company);
    text = text.replace(/\[NOME_DO_NEGOCIO\]/g, bizName);
    text = text.replace(/\[NECESSIDADE\]/g, need);
    text = text.replace(/\[PACOTE_SUGERIDO\]/g, pkg);
    text = text.replace(/\[PRODUTO_SUGERIDO\]/g, pkg);

    return text;
  }

  // --- REGRAS DE SUGESTÃO POR SEGMENTO ---
  static getSegmentSuggestions(): SegmentSuggestionRule[] {
    return getItemFromStorage(STORAGE_KEYS.SEGMENT_SUGGESTIONS, INITIAL_SEGMENT_SUGGESTIONS);
  }

  static saveSegmentSuggestion(rule: SegmentSuggestionRule): SegmentSuggestionRule {
    const list = this.getSegmentSuggestions();
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.push({ ...rule, id: rule.id || `sug-${Date.now()}` });
    }
    setItemToStorage(STORAGE_KEYS.SEGMENT_SUGGESTIONS, list);
    return rule;
  }

  static deleteSegmentSuggestion(id: string): void {
    const list = this.getSegmentSuggestions().filter((r) => r.id !== id);
    setItemToStorage(STORAGE_KEYS.SEGMENT_SUGGESTIONS, list);
  }

  // --- PRODUTOS COMPLEMENTARES ---
  static getComplementaryRules(): ComplementaryProductRule[] {
    return getItemFromStorage(STORAGE_KEYS.COMPLEMENTARY_RULES, INITIAL_COMPLEMENTARY_RULES);
  }

  static saveComplementaryRule(rule: ComplementaryProductRule): ComplementaryProductRule {
    const list = this.getComplementaryRules();
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.push({ ...rule, id: rule.id || `comp-${Date.now()}` });
    }
    setItemToStorage(STORAGE_KEYS.COMPLEMENTARY_RULES, list);
    return rule;
  }

  static deleteComplementaryRule(id: string): void {
    const list = this.getComplementaryRules().filter((r) => r.id !== id);
    setItemToStorage(STORAGE_KEYS.COMPLEMENTARY_RULES, list);
  }

  // Sugestões inteligentes para o carrinho atual
  static getComplementarySuggestionsForCart(cartItemNamesOrIds: string[]): Item[] {
    const allItems = this.getItems().filter((i) => i.active !== false);
    const rules = this.getComplementaryRules();
    const cartLower = (cartItemNamesOrIds || []).map((c) => String(c || '').toLowerCase());

    const suggestedItems: Item[] = [];
    const addedIds = new Set<string>();

    for (const rule of rules) {
      const baseIdLower = String(rule.baseItemId || '').toLowerCase();
      const baseNameLower = String(rule.baseItemName || '').toLowerCase();
      const match = cartLower.some((c) => (baseIdLower && c.includes(baseIdLower)) || (baseNameLower && c.includes(baseNameLower)));
      if (match) {
        for (const tag of rule.suggestedItemIds || []) {
          const tagLower = String(tag || '').toLowerCase();
          const matching = allItems.filter((i) => {
            const name = String(i.name || '').toLowerCase();
            const desc = String(i.description || '').toLowerCase();
            const itemIdLower = String(i.id || '').toLowerCase();
            return (name.includes(tagLower) || desc.includes(tagLower)) && !cartLower.some((c) => c.includes(itemIdLower));
          });

          for (const m of matching) {
            if (!addedIds.has(m.id)) {
              addedIds.add(m.id);
              suggestedItems.push(m);
            }
          }
        }
      }
    }

    // Se nenhuma regra disparou, sugere itens populares (cartões, adesivos ou banners) que não estejam no carrinho
    if (suggestedItems.length === 0) {
      const popular = allItems.filter((i) => (i.featuredInCatalog || i.showInCatalog) && !cartLower.some((c) => c.includes(String(i.id || '').toLowerCase()))).slice(0, 4);
      return popular;
    }

    return suggestedItems.slice(0, 6);
  }

  // --- PÁGINAS PÚBLICAS DE SEGMENTO / LANDING PAGES ---
  static getPublicSegmentPages(): PublicSegmentPage[] {
    return getItemFromStorage(STORAGE_KEYS.PUBLIC_SEGMENT_PAGES, INITIAL_PUBLIC_SEGMENT_PAGES);
  }

  static getPublicSegmentPageBySlug(slug: string): PublicSegmentPage | undefined {
    const targetSlug = String(slug || '').toLowerCase();
    return this.getPublicSegmentPages().find(
      (p) => (String(p.slug || '').toLowerCase() === targetSlug || p.id === slug) && p.active !== false
    );
  }

  static savePublicSegmentPage(page: PublicSegmentPage): PublicSegmentPage {
    const list = this.getPublicSegmentPages();
    const now = new Date().toISOString();
    const idx = list.findIndex((p) => p.id === page.id);
    const updated: PublicSegmentPage = {
      ...page,
      id: page.id || `seg-${Date.now()}`,
      createdAt: page.createdAt || now,
      updatedAt: now,
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setItemToStorage(STORAGE_KEYS.PUBLIC_SEGMENT_PAGES, list);
    return updated;
  }

  static deletePublicSegmentPage(id: string): boolean {
    const list = this.getPublicSegmentPages();
    const remaining = list.filter((p) => p.id !== id);
    setItemToStorage(STORAGE_KEYS.PUBLIC_SEGMENT_PAGES, remaining);
    return true;
  }

  static duplicatePublicSegmentPage(id: string): PublicSegmentPage {
    const list = this.getPublicSegmentPages();
    const orig = list.find((p) => p.id === id) || list[0];
    const now = new Date().toISOString();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const duplicated: PublicSegmentPage = {
      ...orig,
      id: `seg-${Date.now()}`,
      slug: `${orig.slug}-copia-${randomSuffix}`,
      title: `${orig.title} (Cópia)`,
      isDefault: false,
      active: true,
      createdAt: now,
      updatedAt: now,
      benefits: orig.benefits ? [...orig.benefits] : [],
      suggestedPackageIds: orig.suggestedPackageIds ? [...orig.suggestedPackageIds] : [],
      suggestedProductIds: orig.suggestedProductIds ? [...orig.suggestedProductIds] : [],
      featuredPackageIds: orig.featuredPackageIds ? [...orig.featuredPackageIds] : [],
    };
    return this.savePublicSegmentPage(duplicated);
  }

  static togglePublicSegmentPageActive(id: string): PublicSegmentPage | undefined {
    const list = this.getPublicSegmentPages();
    const item = list.find((p) => p.id === id);
    if (!item) return undefined;
    item.active = !item.active;
    item.updatedAt = new Date().toISOString();
    setItemToStorage(STORAGE_KEYS.PUBLIC_SEGMENT_PAGES, list);
    return item;
  }

  // --- FORMULÁRIOS DE CAPTAÇÃO PÚBLICA ---
  static getCaptureForms(): CaptureFormConfig[] {
    const forms = getItemFromStorage<CaptureFormConfig[]>(STORAGE_KEYS.CAPTURE_FORMS, INITIAL_CAPTURE_FORMS);
    if (!forms || forms.length === 0) {
      return INITIAL_CAPTURE_FORMS;
    }
    return forms;
  }

  static getCaptureFormById(id?: string): CaptureFormConfig | undefined {
    const list = this.getCaptureForms();
    if (!id || id === 'default' || id === 'padrao' || id === 'form-geral') {
      return list.find((f) => f.id === 'form-geral') || list.find((f) => f.isDefault) || list[0];
    }
    return list.find((f) => f.id === id || f.slug === id);
  }

  static getDefaultCaptureForm(): CaptureFormConfig {
    const list = this.getCaptureForms();
    const activeDefault = list.find((f) => f.isDefault && f.active);
    if (activeDefault) return activeDefault;
    const firstActive = list.find((f) => f.active);
    if (firstActive) return firstActive;
    return list[0] || INITIAL_CAPTURE_FORMS[0];
  }

  static saveCaptureForm(form: CaptureFormConfig): CaptureFormConfig {
    const list = this.getCaptureForms();
    const now = new Date().toISOString();
    const idx = list.findIndex((f) => f.id === form.id);
    const updated: CaptureFormConfig = {
      ...form,
      id: form.id || `form-${Date.now()}`,
      updatedAt: now,
      createdAt: form.createdAt || now,
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setItemToStorage(STORAGE_KEYS.CAPTURE_FORMS, list);
    return updated;
  }

  static deleteCaptureForm(id: string): boolean {
    const list = this.getCaptureForms();
    const target = list.find((f) => f.id === id);
    if (!target) return false;
    const remaining = list.filter((f) => f.id !== id);
    setItemToStorage(STORAGE_KEYS.CAPTURE_FORMS, remaining);
    return true;
  }

  static duplicateCaptureForm(id: string): CaptureFormConfig {
    const orig = this.getCaptureFormById(id) || this.getDefaultCaptureForm();
    const now = new Date().toISOString();
    const newId = `form-${Date.now()}`;
    const duplicated: CaptureFormConfig = {
      ...orig,
      id: newId,
      slug: `${orig.slug || 'form'}-copia-${Math.floor(Math.random() * 1000)}`,
      internalName: `${orig.internalName} (Cópia)`,
      title: `${orig.title}`,
      isDefault: false,
      active: true,
      createdAt: now,
      updatedAt: now,
      fields: (orig.fields || []).map((fld, i) => ({
        ...fld,
        id: `fld-${Math.random().toString(36).substring(2, 9)}-${i}`,
      })),
    };
    return this.saveCaptureForm(duplicated);
  }

  static toggleCaptureFormActive(id: string): CaptureFormConfig | undefined {
    const list = this.getCaptureForms();
    const item = list.find((f) => f.id === id);
    if (!item) return undefined;
    item.active = !item.active;
    item.updatedAt = new Date().toISOString();
    setItemToStorage(STORAGE_KEYS.CAPTURE_FORMS, list);
    return item;
  }

  // --- CRIAR OPORTUNIDADE A PARTIR DE FORMULÁRIO PÚBLICO ---
  static createPublicQuoteOpportunity(params: {
    name: string;
    contactName?: string;
    phone: string;
    email?: string;
    segment?: string;
    need: string;
    description: string;
    quantity?: string;
    deadline?: string;
    packageId?: string;
    sourceFormId?: string;
    sourceFormTitle?: string;
    sourcePageId?: string;
    sourcePageTitle?: string;
    formResponses?: Record<string, any>;
  }): Opportunity {
    const opp = this.saveOpportunity({
      name: params.name,
      contactName: params.contactName,
      phone: params.phone,
      whatsapp: params.phone,
      segment: params.segment || 'Formulário do Site',
      needs: [params.need],
      needsDescription: `[Solicitação Pública]\nDemanda: ${params.need}\nDetalhes: ${params.description}\nQuantidade: ${params.quantity || 'Não informada'}\nPrazo desejado: ${params.deadline || 'Padrão'}${params.email ? `\nE-mail: ${params.email}` : ''}`,
      origin: 'FORMULARIO_PUBLICO',
      originDetails: params.sourceFormTitle
        ? `Formulário: ${params.sourceFormTitle}`
        : params.packageId
        ? `Interesse no pacote ID: ${params.packageId}`
        : 'Formulário público de orçamento',
      stage: 'IDENTIFICADO',
      suggestedPackageIds: params.packageId ? [params.packageId] : [],
      notes: `Lead gerado diretamente pelo formulário online público (${params.sourceFormTitle || 'Geral'}${params.sourcePageTitle ? ` - ${params.sourcePageTitle}` : ''}).`,
      sourceFormId: params.sourceFormId,
      sourceFormTitle: params.sourceFormTitle,
      sourcePageId: params.sourcePageId,
      sourcePageTitle: params.sourcePageTitle,
      formResponses: params.formResponses,
      nextAction: {
        type: 'WHATSAPP',
        date: new Date().toISOString().split('T')[0],
        note: 'Fazer contato rápido com o cliente para enviar proposta',
        completed: false,
      },
    });

    return opp;
  }

  // --- AUXILIARES VISUAIS ---
  static getStageLabel(stage: OpportunityStage): string {
    switch (stage) {
      case 'IDENTIFICADO':
        return 'Identificado';
      case 'A_CONTATAR':
        return 'A Contatar';
      case 'CONTATADO':
        return 'Contatado';
      case 'INTERESSADO':
        return 'Interessado';
      case 'ORCAMENTO':
        return 'Em Orçamento';
      case 'CONVERTIDO':
        return 'Convertido em Cliente';
      case 'NAO_CONVERTEU':
        return 'Não Converteu';
      default:
        return stage;
    }
  }

  static getOriginLabel(origin: OpportunityOrigin): string {
    switch (origin) {
      case 'PESQUISA_PROPRIA':
        return 'Pesquisa Própria';
      case 'PROSPECCAO_PRESENCIAL':
        return 'Prospecção Presencial / Rua';
      case 'WHATSAPP':
        return 'WhatsApp Direto';
      case 'INSTAGRAM':
        return 'Instagram / Redes Sociais';
      case 'ATENDIMENTO_PRESENCIAL':
        return 'Balcão / Loja';
      case 'EVENTO':
        return 'Evento / Feira';
      case 'FORMULARIO_PUBLICO':
        return 'Site / Formulário Público';
      case 'VENDEDOR_EXTERNO':
        return 'Vendedor Externo / Promotor';
      default:
        return 'Outro';
    }
  }

  // Reset demo data
  static resetToDemoData(): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_COMPANY_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRODUCTION, JSON.stringify(INITIAL_PRODUCTION_ORDERS));
    localStorage.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, JSON.stringify(INITIAL_INVENTORY_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(INITIAL_RECEIVABLES));
    localStorage.setItem(STORAGE_KEYS.RECEIVING_ACCOUNTS, JSON.stringify(INITIAL_RECEIVING_ACCOUNTS));
    localStorage.setItem(STORAGE_KEYS.ONLINE_SERVICES, JSON.stringify(INITIAL_ONLINE_SERVICES));
    localStorage.setItem(STORAGE_KEYS.DOCUMENT_TEMPLATES, JSON.stringify(INITIAL_DOCUMENT_TEMPLATES));
    localStorage.removeItem(STORAGE_KEYS.GLOBAL_DOCUMENT_FIELDS);
    localStorage.setItem(STORAGE_KEYS.GENERATED_DOCUMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(INITIAL_OPPORTUNITIES));
    localStorage.setItem(STORAGE_KEYS.OPPORTUNITY_ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(INITIAL_PACKAGES));
    localStorage.setItem(STORAGE_KEYS.APPROACH_TEMPLATES, JSON.stringify(INITIAL_APPROACH_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.SEGMENT_SUGGESTIONS, JSON.stringify(INITIAL_SEGMENT_SUGGESTIONS));
    localStorage.setItem(STORAGE_KEYS.COMPLEMENTARY_RULES, JSON.stringify(INITIAL_COMPLEMENTARY_RULES));
    localStorage.setItem(STORAGE_KEYS.PUBLIC_SEGMENT_PAGES, JSON.stringify(INITIAL_PUBLIC_SEGMENT_PAGES));
    localStorage.setItem(STORAGE_KEYS.CASH_REGISTER_SESSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_USERS[0].id);
    localStorage.removeItem('deleted_items');
  }

  // --- NICHOS DA VITRINE PÚBLICA ---
  static getCatalogNiches(): ProductNicheCard[] {
    const niches = getItemFromStorage<ProductNicheCard[]>(STORAGE_KEYS.CATALOG_NICHES, INITIAL_CATALOG_NICHES);
    if (!niches || !Array.isArray(niches) || niches.length === 0) {
      return INITIAL_CATALOG_NICHES;
    }
    return [...niches].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  static getCatalogNicheById(id: string): ProductNicheCard | undefined {
    return this.getCatalogNiches().find((n) => n.id === id);
  }

  static async saveCatalogNiche(niche: Partial<ProductNicheCard> & { title: string; id?: string }): Promise<ProductNicheCard> {
    const list = this.getCatalogNiches();
    const now = new Date().toISOString();

    let slug = niche.id?.trim();
    if (!slug) {
      slug = niche.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `nicho-${Date.now()}`;
    }

    const idx = list.findIndex((n) => n.id === slug);
    const existing = idx >= 0 ? list[idx] : null;

    const updated: ProductNicheCard = {
      id: slug,
      title: niche.title.trim(),
      description: niche.description?.trim() || '',
      ctaText: niche.ctaText?.trim() || 'Ver produtos',
      imageUrl:
        niche.imageUrl?.trim() ||
        'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800&auto=format&fit=crop&q=80',
      badge: niche.badge?.trim() || 'Destaque',
      order: niche.order !== undefined ? niche.order : (existing?.order ?? list.length + 1),
      active: niche.active !== undefined ? niche.active : true,
      itemTypeMatch: niche.itemTypeMatch || 'ALL',
      categoryMatchKeywords: niche.categoryMatchKeywords || [],
      customKeywords: niche.customKeywords || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }

    setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
      window.dispatchEvent(new CustomEvent('catalog-updated'));
    }

    // Persist to central server database immediately
    try {
      const serverNiche = await api.saveCatalogNiche(updated);
      if (serverNiche && serverNiche.imageUrl && serverNiche.imageUrl !== updated.imageUrl) {
        updated.imageUrl = serverNiche.imageUrl;
        setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, list);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
          window.dispatchEvent(new CustomEvent('catalog-updated'));
        }
      }
    } catch (e) {
      console.debug('Notice saving catalog niche to server:', e);
    }

    return updated;
  }

  static async deleteCatalogNiche(id: string): Promise<boolean> {
    const list = this.getCatalogNiches();
    const filtered = list.filter((n) => n.id !== id);
    setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
      window.dispatchEvent(new CustomEvent('catalog-updated'));
    }
    try {
      await api.deleteCatalogNiche(id);
    } catch (e) {
      console.debug('Notice deleting catalog niche on server:', e);
    }
    return true;
  }

  static async reorderCatalogNiches(orderedIds: string[]): Promise<ProductNicheCard[]> {
    const list = this.getCatalogNiches();
    const map = new Map(list.map((n) => [n.id, n]));
    const reordered: ProductNicheCard[] = [];

    orderedIds.forEach((id, index) => {
      const niche = map.get(id);
      if (niche) {
        niche.order = index + 1;
        reordered.push(niche);
        map.delete(id);
      }
    });

    map.forEach((niche) => {
      niche.order = reordered.length + 1;
      reordered.push(niche);
    });

    setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, reordered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
      window.dispatchEvent(new CustomEvent('catalog-updated'));
    }
    try {
      await api.saveCatalogNichesBatch(reordered);
    } catch (e) {
      console.debug('Notice saving reordered catalog niches to server:', e);
    }
    return reordered;
  }

  static async resetCatalogNiches(): Promise<ProductNicheCard[]> {
    setItemToStorage(STORAGE_KEYS.CATALOG_NICHES, INITIAL_CATALOG_NICHES);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog-niches-updated'));
      window.dispatchEvent(new CustomEvent('catalog-updated'));
    }
    try {
      await api.saveCatalogNichesBatch(INITIAL_CATALOG_NICHES);
    } catch (e) {
      console.debug('Notice resetting catalog niches on server:', e);
    }
    return INITIAL_CATALOG_NICHES;
  }

  static async resetToInitialData(): Promise<void> {
    this.resetToDemoData();
    localStorage.removeItem('deleted_items');
    sessionStorage.clear();

    try {
      await api.resetDatabaseToSeed();
    } catch (err) {
      console.warn('Background database seed reset notice:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('storage-sync-completed'));
    }
  }
}


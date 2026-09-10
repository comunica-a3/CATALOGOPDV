import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Lock,
  Percent,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Sliders,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  AccountBalanceAdjustment,
  AccountType,
  CashRegisterSession,
  Category,
  CompanySettings,
  Expense,
  ExpenseNature,
  FinancialTransfer,
  Item,
  ReceivingAccount,
  Sale,
} from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CashSessionReceiptModal } from './CashSessionReceiptModal';
import { CloseCashModal } from './CloseCashModal';
import { ExpenseModal } from './ExpenseModal';
import { OpenCashModal } from './OpenCashModal';
import { ReceivingAccountModal } from './ReceivingAccountModal';
import { AccountTransferModal } from './AccountTransferModal';
import { AdjustAccountBalanceModal } from './AdjustAccountBalanceModal';

interface FinanceViewProps {
  sales: Sale[];
  companySettings: CompanySettings;
  onDataChange: () => void;
}

type FinanceTab =
  | 'dashboard'
  | 'caixa'
  | 'transferencias'
  | 'despesas'
  | 'dre'
  | 'relatorio'
  | 'contas';
type PeriodFilter = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos' | 'custom';

export const FinanceView: React.FC<FinanceViewProps> = ({
  sales,
  companySettings,
  onDataChange,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');

  // Accounts and Cash Sessions State
  const [receivingAccounts, setReceivingAccounts] = useState<ReceivingAccount[]>(() =>
    StorageService.getReceivingAccounts()
  );
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>(() =>
    StorageService.getCashRegisterSessions()
  );
  const currentCashRegister = useMemo(() => {
    return cashSessions.find((s) => s.status === 'ABERTO') || null;
  }, [cashSessions]);

  // Account Balances & Transfers State
  const [financialTransfers, setFinancialTransfers] = useState<FinancialTransfer[]>(() =>
    StorageService.getFinancialTransfers()
  );
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>(() =>
    StorageService.getAllAccountBalances()
  );
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [defaultTransferFromId, setDefaultTransferFromId] = useState<string | undefined>(undefined);
  const [defaultTransferToId, setDefaultTransferToId] = useState<string | undefined>(undefined);
  const [transferToDelete, setTransferToDelete] = useState<FinancialTransfer | null>(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferAccountFilter, setTransferAccountFilter] = useState('ALL');

  // Modal States
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [selectedReceiptSession, setSelectedReceiptSession] = useState<CashRegisterSession | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<ReceivingAccount | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ReceivingAccount | null>(null);

  // Balance Adjustment States (Exclusivo para Administrador)
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [accountToAdjust, setAccountToAdjust] = useState<ReceivingAccount | null>(null);
  const [accountAdjustBalance, setAccountAdjustBalance] = useState<number>(0);
  const [balanceAdjustments, setBalanceAdjustments] = useState<AccountBalanceAdjustment[]>(() =>
    StorageService.getAccountBalanceAdjustments()
  );
  const [balanceAdjustmentAccountFilter, setBalanceAdjustmentAccountFilter] = useState('ALL');

  // Expense States
  const [expenses, setExpenses] = useState<Expense[]>(() => StorageService.getExpenses());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseNatureFilter, setExpenseNatureFilter] = useState<'ALL' | 'OPERACIONAL' | 'RETIRADA_PESSOAL' | 'NAO_OPERACIONAL'>('ALL');
  const [expenseAccountFilter, setExpenseAccountFilter] = useState('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Filter States for Financial Report & Dashboard
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Categories and Items Catalog
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [items, setItems] = useState<Item[]>(() => StorageService.getItems());

  // Keep balances in sync when sales, accounts, transfers, or expenses change
  useEffect(() => {
    setAccountBalances(StorageService.getAllAccountBalances());
  }, [sales, receivingAccounts, financialTransfers, expenses, balanceAdjustments]);

  // Reload data helper
  const reloadFinanceData = () => {
    setReceivingAccounts(StorageService.getReceivingAccounts());
    setCashSessions(StorageService.getCashRegisterSessions());
    setExpenses(StorageService.getExpenses());
    setCategories(StorageService.getCategories());
    setItems(StorageService.getItems());
    setFinancialTransfers(StorageService.getFinancialTransfers());
    setAccountBalances(StorageService.getAllAccountBalances());
    setBalanceAdjustments(StorageService.getAccountBalanceAdjustments());
    onDataChange();
  };

  // Balance Adjustment Handlers (Exclusivo Administrador)
  const handleOpenAdjustBalance = (account: ReceivingAccount, currentBal: number) => {
    if (!isAdmin) return;
    setAccountToAdjust(account);
    setAccountAdjustBalance(currentBal);
    setIsAdjustBalanceModalOpen(true);
  };

  const handleAdjustSuccess = () => {
    setBalanceAdjustments(StorageService.getAccountBalanceAdjustments());
    reloadFinanceData();
  };

  // Date validation for custom period filter
  const isDateRangeInvalid =
    periodFilter === 'custom' &&
    Boolean(customStartDate && customEndDate && customStartDate > customEndDate);

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriodFilter(newPeriod);
    if (newPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const today = now.toISOString().split('T')[0];
      if (!customStartDate) setCustomStartDate(firstDayOfMonth);
      if (!customEndDate) setCustomEndDate(today);
    }
  };

  // Mapping of item ID to its category ID
  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (it.id) {
        map.set(it.id, it.categoryId || '');
      }
    });
    return map;
  }, [items]);

  // Resolve category IDs, names and display label for a sale
  const getSaleCategoryInfo = useCallback(
    (sale: Sale) => {
      const catIdSet = new Set<string>();
      const catNameSet = new Set<string>();

      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((si) => {
          const catId =
            (si as any).categoryId ||
            (si as any).item?.categoryId ||
            itemCategoryMap.get(si.itemId) ||
            '';
          catIdSet.add(catId);

          if (catId) {
            const foundCat = categories.find((c) => c.id === catId || c.slug === catId);
            if (foundCat) {
              catNameSet.add(foundCat.name);
            } else {
              catNameSet.add(catId);
            }
          } else {
            catNameSet.add('Sem Categoria');
          }
        });
      } else {
        catIdSet.add('');
        catNameSet.add('Sem Categoria');
      }

      const catIds = Array.from(catIdSet);
      const catNames = Array.from(catNameSet);
      const label = catNames.length > 0 ? catNames.join(', ') : 'Sem Categoria';

      return { catIds, catNames, label };
    },
    [categories, itemCategoryMap]
  );

  // Check if there are any uncategorized items or sales in the system
  const hasUncategorizedItems = useMemo(() => {
    const hasUncatCatalog = items.some(
      (it) => !it.categoryId || !categories.some((c) => c.id === it.categoryId)
    );
    const hasUncatSale = sales.some((s) => {
      const { catIds } = getSaleCategoryInfo(s);
      return catIds.some((cid) => !cid || !categories.some((c) => c.id === cid));
    });
    return hasUncatCatalog || hasUncatSale;
  }, [items, categories, sales, getSaleCategoryInfo]);

  // DRE & Financial Calculations
  const dreData = useMemo(() => {
    if (isDateRangeInvalid) {
      return {
        grossRevenue: 0,
        totalFees: 0,
        netRevenue: 0,
        totalCMV: 0,
        grossResult: 0,
        totalOperatingExpenses: 0,
        totalPersonalWithdrawals: 0,
        totalNonOperatingExpenses: 0,
        expensesByCategory: {},
        operatingResult: 0,
        finalNetResult: 0,
        netMarginPercent: 0,
        periodSalesCount: 0,
        periodExpensesCount: 0,
        periodOperationalExpensesCount: 0,
        periodWithdrawalsCount: 0,
      };
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (periodFilter === 'hoje') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'ontem') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    } else if (periodFilter === '7dias') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      startDate = new Date(d7.getFullYear(), d7.getMonth(), d7.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodFilter === 'custom' && customStartDate) {
      startDate = new Date(`${customStartDate}T00:00:00`);
      endDate = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
    }

    const periodSales = sales.filter((sale) => {
      if (sale.status === 'CANCELADA' || sale.status === 'EXCLUIDA' || sale.isDeleted || sale.paymentStatus === 'CANCELADO') return false;
      const d = new Date(sale.createdAt);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    const periodExpenses = expenses.filter((exp) => {
      const d = new Date(`${exp.date}T00:00:00`);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    let grossRevenue = 0;
    let totalFees = 0;
    let totalCMV = 0;

    periodSales.forEach((sale) => {
      grossRevenue += sale.total || 0;
      const saleCost =
        sale.totalCost !== undefined
          ? sale.totalCost
          : sale.items.reduce(
              (acc, item) => acc + (item.totalCost || (item.unitCost || 0) * item.quantity),
              0
            );
      totalCMV += saleCost;

      sale.payments.forEach((pay) => {
        let fee = pay.feeAmount || 0;
        const gross = pay.amount || 0;
        if (!fee && pay.feePercent && pay.feePercent > 0) {
          fee = Number(((gross * pay.feePercent) / 100).toFixed(2));
        } else if (!fee) {
          const pMethod = String(pay.method || '').toLowerCase();
          const isCredit = pay.cardType === 'CREDITO' || pMethod.includes('crédito') || pMethod.includes('credito');
          const isDebit = pay.cardType === 'DEBITO' || pMethod.includes('débito') || pMethod.includes('debito');
          if (isCredit || isDebit || pMethod.includes('cart')) {
            const acc = receivingAccounts.find((a) => a.id === pay.accountId) || receivingAccounts.find((a) => a.type === 'CARTAO');
            const rate = isCredit ? (acc?.creditFeePercent ?? 3.5) : (acc?.debitFeePercent ?? 1.5);
            fee = Number(((gross * rate) / 100).toFixed(2));
          }
        }
        totalFees += fee;
      });
    });

    const netRevenue = Number((grossRevenue - totalFees).toFixed(2));
    const grossResult = Number((netRevenue - totalCMV).toFixed(2));

    let totalOperatingExpenses = 0;
    let totalPersonalWithdrawals = 0;
    let totalNonOperatingExpenses = 0;
    const expensesByCategory: Record<string, number> = {};

    periodExpenses.forEach((exp) => {
      const nature = exp.nature || 'OPERACIONAL';
      if (nature === 'OPERACIONAL') {
        totalOperatingExpenses += exp.amount;
        const cat = exp.category || 'Outros';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount;
      } else if (nature === 'RETIRADA_PESSOAL') {
        totalPersonalWithdrawals += exp.amount;
      } else {
        totalNonOperatingExpenses += exp.amount;
      }
    });

    const operatingResult = Number((grossResult - totalOperatingExpenses).toFixed(2));
    const finalNetResult = Number(
      (operatingResult - totalPersonalWithdrawals - totalNonOperatingExpenses).toFixed(2)
    );
    const netMarginPercent =
      grossRevenue > 0 ? Number(((operatingResult / grossRevenue) * 100).toFixed(2)) : 0;

    return {
      grossRevenue: Number(grossRevenue.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netRevenue,
      totalCMV: Number(totalCMV.toFixed(2)),
      grossResult,
      totalOperatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
      totalPersonalWithdrawals: Number(totalPersonalWithdrawals.toFixed(2)),
      totalNonOperatingExpenses: Number(totalNonOperatingExpenses.toFixed(2)),
      expensesByCategory,
      operatingResult,
      finalNetResult,
      netMarginPercent,
      periodSalesCount: periodSales.length,
      periodExpensesCount: periodExpenses.length,
      periodOperationalExpensesCount: periodExpenses.filter(
        (e) => !e.nature || e.nature === 'OPERACIONAL'
      ).length,
      periodWithdrawalsCount: periodExpenses.filter((e) => e.nature === 'RETIRADA_PESSOAL').length,
    };
  }, [sales, expenses, receivingAccounts, periodFilter, customStartDate, customEndDate, isDateRangeInvalid]);

  const filteredExpensesList = useMemo(() => {
    if (isDateRangeInvalid) {
      return [];
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (periodFilter === 'hoje') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'ontem') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    } else if (periodFilter === '7dias') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      startDate = new Date(d7.getFullYear(), d7.getMonth(), d7.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodFilter === 'custom' && customStartDate) {
      startDate = new Date(`${customStartDate}T00:00:00`);
      endDate = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
    }

    return expenses.filter((exp) => {
      const d = new Date(`${exp.date}T00:00:00`);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;

      const nature = exp.nature || 'OPERACIONAL';
      if (expenseNatureFilter !== 'ALL' && nature !== expenseNatureFilter) {
        return false;
      }

      if (expenseAccountFilter !== 'ALL' && exp.accountId !== expenseAccountFilter) {
        return false;
      }

      if (expenseCategoryFilter !== 'ALL' && exp.category !== expenseCategoryFilter) {
        return false;
      }

      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const matchesDesc = (exp.description || '').toLowerCase().includes(q);
        const matchesObs = exp.observation ? exp.observation.toLowerCase().includes(q) : false;
        const matchesAcc = exp.accountName ? exp.accountName.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesObs && !matchesAcc) return false;
      }

      return true;
    });
  }, [
    expenses,
    periodFilter,
    customStartDate,
    customEndDate,
    expenseNatureFilter,
    expenseAccountFilter,
    expenseCategoryFilter,
    expenseSearch,
    isDateRangeInvalid,
  ]);

  // Filter valid sales and their payments by selected period and category
  const filteredSalesData = useMemo(() => {
    if (isDateRangeInvalid) {
      return [];
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (periodFilter === 'hoje') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'ontem') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    } else if (periodFilter === '7dias') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      startDate = new Date(d7.getFullYear(), d7.getMonth(), d7.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodFilter === 'mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodFilter === 'custom' && customStartDate) {
      startDate = new Date(`${customStartDate}T00:00:00`);
      endDate = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
    }

    return sales.filter((sale) => {
      if (sale.status === 'CANCELADA' || sale.status === 'EXCLUIDA' || sale.isDeleted || sale.paymentStatus === 'CANCELADO') return false;

      const saleDate = new Date(sale.createdAt);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;

      if (selectedSellerFilter !== 'ALL' && sale.sellerId !== selectedSellerFilter) {
        return false;
      }

      // Category filter (Aba Relatório Financeiro)
      if (selectedCategoryFilter !== 'ALL') {
        const { catIds } = getSaleCategoryInfo(sale);
        if (selectedCategoryFilter === 'UNCATEGORIZED') {
          const hasUncat = catIds.some((cid) => !cid || !categories.some((c) => c.id === cid));
          if (!hasUncat) return false;
        } else {
          const targetCat = categories.find((c) => c.id === selectedCategoryFilter);
          const matches = catIds.some(
            (cid) =>
              cid === selectedCategoryFilter ||
              (targetCat && (cid === targetCat.slug || cid === targetCat.name))
          );
          if (!matches) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = String(sale.saleNumber || '').toLowerCase().includes(q);
        const matchesCustomer = String(sale.customerName || '').toLowerCase().includes(q);
        const matchesSeller = String(sale.sellerName || '').toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer && !matchesSeller) {
          return false;
        }
      }

      return true;
    });
  }, [
    sales,
    periodFilter,
    customStartDate,
    customEndDate,
    selectedSellerFilter,
    selectedCategoryFilter,
    searchQuery,
    isDateRangeInvalid,
    categories,
    getSaleCategoryInfo,
  ]);

  // Extract all payment transactions from filtered sales
  const allPaymentTransactions = useMemo(() => {
    const list: Array<{
      paymentId: string;
      saleId: string;
      saleNumber: string;
      categoryLabel: string;
      saleCreatedAt: string;
      customerName: string;
      sellerName: string;
      method: string;
      accountName: string;
      accountId: string;
      accountType: AccountType;
      grossAmount: number;
      feePercent: number;
      feeAmount: number;
      netAmount: number;
      cardType?: 'CREDITO' | 'DEBITO';
      notes?: string;
    }> = [];

    filteredSalesData.forEach((sale) => {
      const { label: categoryLabel } = getSaleCategoryInfo(sale);
      sale.payments.forEach((pay) => {
        const gross = pay.amount || 0;
        let fee = pay.feeAmount || 0;
        if (!fee && pay.feePercent && pay.feePercent > 0) {
          fee = Number(((gross * pay.feePercent) / 100).toFixed(2));
        } else if (!fee) {
          const pMethod = String(pay.method || '').toLowerCase();
          const isCredit = pay.cardType === 'CREDITO' || pMethod.includes('crédito') || pMethod.includes('credito');
          const isDebit = pay.cardType === 'DEBITO' || pMethod.includes('débito') || pMethod.includes('debito');
          if (isCredit || isDebit || pMethod.includes('cart')) {
            const acc = receivingAccounts.find((a) => a.id === pay.accountId) || receivingAccounts.find((a) => a.type === 'CARTAO');
            const rate = isCredit ? (acc?.creditFeePercent ?? 3.5) : (acc?.debitFeePercent ?? 1.5);
            fee = Number(((gross * rate) / 100).toFixed(2));
          }
        }
        const net = pay.netAmount !== undefined ? pay.netAmount : Number((gross - fee).toFixed(2));

        const matchesMethod =
          selectedMethodFilter === 'ALL' || pay.method === selectedMethodFilter;
        const matchesAccount =
          selectedAccountFilter === 'ALL' || pay.accountId === selectedAccountFilter;

        if (matchesMethod && matchesAccount) {
          const payMethod = String(pay.method || '');
          list.push({
            paymentId: pay.id,
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            categoryLabel,
            saleCreatedAt: pay.date || sale.createdAt,
            customerName: sale.customerName,
            sellerName: sale.sellerName,
            method: pay.method,
            accountName: pay.accountName || `${pay.method || 'Outro'} — Padrão`,
            accountId: pay.accountId || 'acc-padrao',
            accountType: pay.accountType || (payMethod.toLowerCase().includes('dinheiro') ? 'CAIXA' : payMethod.toLowerCase().includes('pix') ? 'PIX' : 'CARTAO'),
            grossAmount: gross,
            feePercent: pay.feePercent || 0,
            feeAmount: fee,
            netAmount: net,
            cardType: pay.cardType,
            notes: pay.notes,
          });
        }
      });
    });

    // Sort by date desc
    return list.sort(
      (a, b) => new Date(b.saleCreatedAt).getTime() - new Date(a.saleCreatedAt).getTime()
    );
  }, [filteredSalesData, selectedMethodFilter, selectedAccountFilter, getSaleCategoryInfo, receivingAccounts]);

  // Consolidated Financial KPI Totals for the selected period
  const totals = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let net = 0;

    filteredSalesData.forEach((sale) => {
      sale.payments.forEach((pay) => {
        const pGross = pay.amount || 0;
        let pFee = pay.feeAmount || 0;
        if (!pFee && pay.feePercent && pay.feePercent > 0) {
          pFee = Number(((pGross * pay.feePercent) / 100).toFixed(2));
        } else if (!pFee) {
          const pMethod = String(pay.method || '').toLowerCase();
          const isCredit = pay.cardType === 'CREDITO' || pMethod.includes('crédito') || pMethod.includes('credito');
          const isDebit = pay.cardType === 'DEBITO' || pMethod.includes('débito') || pMethod.includes('debito');
          if (isCredit || isDebit || pMethod.includes('cart')) {
            const acc = receivingAccounts.find((a) => a.id === pay.accountId) || receivingAccounts.find((a) => a.type === 'CARTAO');
            const rate = isCredit ? (acc?.creditFeePercent ?? 3.5) : (acc?.debitFeePercent ?? 1.5);
            pFee = Number(((pGross * rate) / 100).toFixed(2));
          }
        }
        const pNet = pay.netAmount !== undefined ? pay.netAmount : Number((pGross - pFee).toFixed(2));

        gross += pGross;
        fees += pFee;
        net += pNet;
      });
    });

    const salesCount = filteredSalesData.length;
    const averageTicket = salesCount > 0 ? gross / salesCount : 0;

    return {
      gross: Number(gross.toFixed(2)),
      fees: Number(fees.toFixed(2)),
      net: Number(net.toFixed(2)),
      salesCount,
      averageTicket: Number(averageTicket.toFixed(2)),
    };
  }, [filteredSalesData, receivingAccounts]);

  // Aggregation by Payment Method
  const methodAggregation = useMemo(() => {
    const map: Record<
      string,
      { method: string; gross: number; fees: number; net: number; count: number }
    > = {};

    allPaymentTransactions.forEach((t) => {
      if (!map[t.method]) {
        map[t.method] = {
          method: t.method,
          gross: 0,
          fees: 0,
          net: 0,
          count: 0,
        };
      }
      map[t.method].gross += t.grossAmount;
      map[t.method].fees += t.feeAmount;
      map[t.method].net += t.netAmount;
      map[t.method].count += 1;
    });

    return Object.values(map).sort((a, b) => b.gross - a.gross);
  }, [allPaymentTransactions]);

  // Aggregation by Receiving Account ("Onde está o dinheiro")
  const accountAggregation = useMemo(() => {
    const map: Record<
      string,
      {
        accountId: string;
        accountName: string;
        accountType: AccountType;
        gross: number;
        fees: number;
        net: number;
        count: number;
      }
    > = {};

    allPaymentTransactions.forEach((t) => {
      if (!map[t.accountId]) {
        map[t.accountId] = {
          accountId: t.accountId,
          accountName: t.accountName,
          accountType: t.accountType,
          gross: 0,
          fees: 0,
          net: 0,
          count: 0,
        };
      }
      map[t.accountId].gross += t.grossAmount;
      map[t.accountId].fees += t.feeAmount;
      map[t.accountId].net += t.netAmount;
      map[t.accountId].count += 1;
    });

    return Object.values(map).sort((a, b) => b.net - a.net);
  }, [allPaymentTransactions]);

  // Handlers for Accounts
  const handleSaveAccount = (account: ReceivingAccount) => {
    StorageService.saveReceivingAccount(account);
    reloadFinanceData();
  };

  const handleDeleteAccount = () => {
    if (accountToDelete) {
      StorageService.deleteReceivingAccount(accountToDelete.id);
      setAccountToDelete(null);
      reloadFinanceData();
    }
  };

  const handleDeleteExpense = () => {
    if (expenseToDelete) {
      StorageService.deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
      reloadFinanceData();
    }
  };

  // Handlers for Financial Transfers
  const handleTransferSuccess = () => {
    setFinancialTransfers(StorageService.getFinancialTransfers());
    setAccountBalances(StorageService.getAllAccountBalances());
    reloadFinanceData();
  };

  const handleDeleteTransfer = () => {
    if (transferToDelete) {
      StorageService.deleteFinancialTransfer(transferToDelete.id);
      setTransferToDelete(null);
      setFinancialTransfers(StorageService.getFinancialTransfers());
      setAccountBalances(StorageService.getAllAccountBalances());
      reloadFinanceData();
    }
  };

  // Filtered transfers for the transfer history table
  const filteredTransfers = useMemo(() => {
    return financialTransfers.filter((t) => {
      if (transferAccountFilter !== 'ALL') {
        if (t.fromAccountId !== transferAccountFilter && t.toAccountId !== transferAccountFilter) {
          return false;
        }
      }
      if (transferSearch.trim()) {
        const q = transferSearch.toLowerCase().trim();
        const matchNumber = t.transferNumber?.toLowerCase().includes(q);
        const matchObs = t.observation?.toLowerCase().includes(q);
        const matchFrom = t.fromAccountName?.toLowerCase().includes(q);
        const matchTo = t.toAccountName?.toLowerCase().includes(q);
        const matchUser = t.userName?.toLowerCase().includes(q);
        if (!matchNumber && !matchObs && !matchFrom && !matchTo && !matchUser) {
          return false;
        }
      }
      return true;
    });
  }, [financialTransfers, transferAccountFilter, transferSearch]);

  // Filtered balance adjustments for the adjustments history table
  const filteredBalanceAdjustments = useMemo(() => {
    if (!balanceAdjustmentAccountFilter || balanceAdjustmentAccountFilter === 'ALL') {
      return balanceAdjustments;
    }
    return balanceAdjustments.filter(
      (adj) => adj.accountId === balanceAdjustmentAccountFilter
    );
  }, [balanceAdjustments, balanceAdjustmentAccountFilter]);

  // Total consolidated money across all financial accounts
  const totalAccountWealth = useMemo(() => {
    return Object.values(accountBalances).reduce((acc: number, curr: number) => acc + (Number(curr) || 0), 0);
  }, [accountBalances]);

  // Export Financial CSV
  const handleExportCSV = () => {
    if (!allPaymentTransactions.length) {
      alert('Não há dados para exportar no período selecionado.');
      return;
    }

    const headers = [
      'Data/Hora',
      'Venda',
      'Categoria',
      'Cliente',
      'Vendedor',
      'Forma de Pagamento',
      'Conta de Recebimento',
      'Valor Bruto (R$)',
      'Taxa %',
      'Custo da Loja (Taxa R$)',
      'Valor Líquido (R$)',
    ];

    const rows = allPaymentTransactions.map((t) => [
      formatDateTime(t.saleCreatedAt),
      t.saleNumber,
      `"${t.categoryLabel || 'Sem Categoria'}"`,
      `"${t.customerName}"`,
      `"${t.sellerName}"`,
      `"${t.method}"`,
      `"${t.accountName}"`,
      t.grossAmount.toFixed(2),
      `${t.feePercent.toFixed(2)}%`,
      t.feeAmount.toFixed(2),
      t.netAmount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_financeiro_${periodFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="finance-module-view" className="space-y-5">
      {/* Header & Live Cash Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100/70 text-blue-700 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Controle Financeiro e Caixa
              </h1>
              <p className="text-xs text-slate-500">
                Acompanhamento de faturamento, taxas de maquininhas, contas de recebimento e caixa físico
              </p>
            </div>
          </div>
        </div>

        {/* Live Cash Register Banner */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {currentCashRegister ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-emerald-900">
                    Caixa Aberto ({currentCashRegister.registerNumber})
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded">
                    Fundo: {formatCurrency(currentCashRegister.initialAmount)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Por {currentCashRegister.openedByUserName} às {formatDateTime(currentCashRegister.openedAt)}
                </p>
              </div>
              <button
                type="button"
                id="btn-close-cash-header"
                onClick={() => setIsCloseCashModalOpen(true)}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Fechar Caixa</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-300 px-3.5 py-2 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <div>
                <p className="text-xs font-bold text-slate-800">Caixa Físico Fechado</p>
                <p className="text-[10px] text-slate-500">Abra o caixa para iniciar o turno e troco</p>
              </div>
              <button
                type="button"
                id="btn-open-cash-header"
                onClick={() => setIsOpenCashModalOpen(true)}
                className="ml-2 flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Abrir Caixa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'dashboard', label: 'Resumo e Dashboard', icon: BarChart3 },
          { id: 'caixa', label: 'Caixa Físico', icon: Wallet },
          { id: 'transferencias', label: 'Transferência entre Contas', icon: ArrowLeftRight },
          { id: 'despesas', label: 'Custos e Despesas', icon: TrendingDown },
          { id: 'dre', label: 'DRE Gerencial', icon: BarChart3 },
          { id: 'relatorio', label: 'Relatório Financeiro', icon: FileSpreadsheet },
          ...(isAdmin ? [{ id: 'contas', label: 'Contas de Recebimento', icon: Building2 }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`finance-tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white border-t-2 border-l border-r border-t-blue-600 border-l-slate-200 border-r-slate-200 text-blue-700 -mb-[1px] shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-t-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: RESUMO & DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Quick Period Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
              <span className="text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'todos', label: 'Todo Período' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    periodFilter === p.id
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {periodFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>
            )}
          </div>

          {/* 4 Financial Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Gross Revenue */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Faturamento Bruto
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(totals.gross)}
              </p>
              <p className="text-[11px] text-slate-500">
                Total bruto registrado em {totals.salesCount} venda(s)
              </p>
            </div>

            {/* Card Fees (Custo da Loja) */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Taxas de Maquininhas
                </span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 tracking-tight">
                -{formatCurrency(totals.fees)}
              </p>
              <p className="text-[11px] text-slate-500">
                Custo operacional retido pelas operadoras
              </p>
            </div>

            {/* Net Revenue */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Faturamento Líquido
                </span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatCurrency(totals.net)}
              </p>
              <p className="text-[11px] text-emerald-800">
                Valor líquido disponível após dedução das taxas
              </p>
            </div>

            {/* Average Ticket */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Ticket Médio
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(totals.averageTicket)}
              </p>
              <p className="text-[11px] text-slate-500">
                Média de gasto por cliente / venda
              </p>
            </div>
          </div>

          {/* Breakdown Grid: By Payment Method & By Account ("Onde está o dinheiro") */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Faturamento por Forma de Pagamento */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Vendas por Forma de Pagamento
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {methodAggregation.length} método(s)
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {methodAggregation.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Nenhum pagamento registrado no período selecionado.
                  </p>
                ) : (
                  methodAggregation.map((m) => {
                    const pctOfTotal =
                      totals.gross > 0 ? ((m.gross / totals.gross) * 100).toFixed(1) : 0;
                    return (
                      <div key={m.method} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{m.method}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {m.count}x ({pctOfTotal}%)
                            </span>
                          </div>
                          {m.fees > 0 ? (
                            <p className="text-[11px] text-rose-600 font-medium">
                              Taxas: -{formatCurrency(m.fees)} • Líquido: {formatCurrency(m.net)}
                            </p>
                          ) : (
                            <p className="text-[11px] text-emerald-600 font-medium">
                              Sem taxas aplicadas (100% líquido)
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatCurrency(m.gross)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 2: Destino dos Recebimentos ("Onde está o dinheiro") */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Onde está o Dinheiro (Por Conta / Recebedor)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {accountAggregation.length} conta(s)
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {accountAggregation.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Nenhuma movimentação no período selecionado.
                  </p>
                ) : (
                  accountAggregation.map((a) => {
                    const pctOfNet =
                      totals.net > 0 ? ((a.net / totals.net) * 100).toFixed(1) : 0;
                    return (
                      <div key={a.accountId} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{a.accountName}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                              {pctOfNet}% do total
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {a.count} transação(ões) {a.fees > 0 ? `| Taxa: ${formatCurrency(a.fees)}` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-sm text-emerald-700">
                            {formatCurrency(a.net)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: CAIXA FÍSICO (ABERTURA, FECHAMENTO & HISTÓRICO) --- */}
      {activeTab === 'caixa' && (
        <div className="space-y-5">
          {/* Active Cash Box Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Status Atual do Caixa Físico (Balcão)
                </h2>
                <p className="text-xs text-slate-500">
                  Controle de fundo de troco, conferência diária de notas e fechamentos
                </p>
              </div>

              <div>
                {currentCashRegister ? (
                  <button
                    type="button"
                    onClick={() => setIsCloseCashModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Realizar Fechamento do Caixa</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsOpenCashModalOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Abrir Caixa com Saldo Inicial</span>
                  </button>
                )}
              </div>
            </div>

            {currentCashRegister ? (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-extrabold text-emerald-900">
                      SESSÃO EM ANDAMENTO #{currentCashRegister.registerNumber}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">
                    Aberto em {formatDateTime(currentCashRegister.openedAt)} por{' '}
                    <strong>{currentCashRegister.openedByUserName}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">
                      Fundo de Troco Inicial
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {formatCurrency(currentCashRegister.initialAmount)}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">
                      Entradas em Dinheiro
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {formatCurrency(
                        StorageService.calculateSessionSummary(currentCashRegister).cashSalesAmount
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-lg">
                    <span className="block text-[10px] uppercase font-bold text-emerald-900">
                      Saldo Esperado na Gaveta
                    </span>
                    <span className="text-lg font-black text-emerald-900">
                      {formatCurrency(
                        StorageService.calculateSessionSummary(currentCashRegister)
                          .expectedCashAmount
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">O caixa está fechado no momento</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Para iniciar as operações do dia e receber pagamentos em dinheiro com troco, abra o caixa informando o valor inicial.
                </p>
              </div>
            )}
          </div>

          {/* Cash Closing Sessions History */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Histórico de Fechamentos de Caixa
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {cashSessions.filter((s) => s.status === 'FECHADO').length} fechamento(s) registrado(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Caixa</th>
                    <th className="py-2.5 px-3">Abertura</th>
                    <th className="py-2.5 px-3">Fechamento</th>
                    <th className="py-2.5 px-3">Fundo Inicial</th>
                    <th className="py-2.5 px-3">Dinheiro Esperado</th>
                    <th className="py-2.5 px-3">Dinheiro Contado</th>
                    <th className="py-2.5 px-3">Diferença</th>
                    <th className="py-2.5 px-3">Total Faturado</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cashSessions.filter((s) => s.status === 'FECHADO').length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Nenhum fechamento registrado ainda.
                      </td>
                    </tr>
                  ) : (
                    cashSessions
                      .filter((s) => s.status === 'FECHADO')
                      .map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {session.registerNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-slate-800">
                              {formatDateTime(session.openedAt)}
                            </p>
                            <p className="text-[10px] text-slate-400">{session.openedByUserName}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-slate-800">
                              {session.closedAt ? formatDateTime(session.closedAt) : '-'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {session.closedByUserName || '-'}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {formatCurrency(session.initialAmount)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {formatCurrency(session.expectedCashAmount)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-blue-700">
                            {formatCurrency(session.countedCashAmount || 0)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                session.cashDifference === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : (session.cashDifference || 0) < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {session.cashDifference === 0
                                ? 'R$ 0,00'
                                : (session.cashDifference || 0) < 0
                                ? `- ${formatCurrency(Math.abs(session.cashDifference || 0))}`
                                : `+ ${formatCurrency(session.cashDifference || 0)}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900">
                            {formatCurrency(session.totalGrossSales)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptSession(session)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Comprovante</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: TRANSFERÊNCIA ENTRE CONTAS --- */}
      {activeTab === 'transferencias' && (
        <div className="space-y-5" id="finance-tab-transferencias-content">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5" />
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Transferência entre Contas Financeiras
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Transfira valores entre as contas da empresa (Caixa físico, Bancos, Pix ou Maquininhas).
                <strong className="text-slate-700 font-semibold ml-1">
                  Transferência é uma movimentação neutra: não é receita e não é despesa.
                </strong>
              </p>
            </div>

            <button
              type="button"
              id="btn-new-account-transfer"
              onClick={() => {
                setDefaultTransferFromId(undefined);
                setDefaultTransferToId(undefined);
                setIsTransferModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Transferência</span>
            </button>
          </div>

          {/* Account Balances Overview Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Saldos Disponíveis por Conta
              </h3>
              <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                Patrimônio Consolidado nas Contas:{' '}
                <strong className="text-slate-900 font-black">{formatCurrency(totalAccountWealth)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {receivingAccounts
                .filter((a) => a.active)
                .map((acc) => {
                  const bal = accountBalances[acc.id] ?? StorageService.getAccountBalance(acc.id);
                  const Icon =
                    acc.type === 'CAIXA'
                      ? DollarSign
                      : acc.type === 'PIX'
                      ? QrCode
                      : acc.type === 'CARTAO'
                      ? CreditCard
                      : Building2;

                  const colorStyles =
                    acc.type === 'CAIXA'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : acc.type === 'PIX'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : acc.type === 'CARTAO'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200';

                  return (
                    <div
                      key={acc.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl border ${colorStyles}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={acc.name}>
                              {acc.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">{acc.receiverName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400">
                            Saldo Disponível
                          </span>
                          <span className={`text-base font-black ${bal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {formatCurrency(bal)}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            id={`btn-transfer-adjust-${acc.id}`}
                            onClick={() => handleOpenAdjustBalance(acc, bal)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer"
                            title="Ajustar saldo real desta conta (Exclusivo Administrador)"
                          >
                            <Sliders className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ajustar Saldo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Transfers History Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header & Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">
                  Histórico de Transferências ({filteredTransfers.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    placeholder="Buscar por código, conta ou obs..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none w-56"
                  />
                </div>

                {/* Filter by Account */}
                <select
                  value={transferAccountFilter}
                  onChange={(e) => setTransferAccountFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todas as Contas</option>
                  {receivingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Conta Origem (Saída)</th>
                    <th className="py-2.5 px-3">Conta Destino (Entrada)</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3">Observação</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                            <ArrowLeftRight className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">
                            Nenhuma transferência encontrada
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Realize transferências entre o caixa físico, bancos ou contas digitais para movimentar seus recursos.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDefaultTransferFromId(undefined);
                              setDefaultTransferToId(undefined);
                              setIsTransferModalOpen(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Realizar Primeira Transferência</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                          {new Date(trf.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                            {trf.transferNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                            <ArrowLeftRight className="w-2.5 h-2.5 text-slate-500" />
                            Transferência
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-xs">
                            <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            {trf.fromAccountName}
                            <span className="text-[10px] font-extrabold opacity-75">
                              (-{formatCurrency(trf.amount)})
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            {trf.toAccountName}
                            <span className="text-[10px] font-extrabold opacity-75">
                              (+{formatCurrency(trf.amount)})
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(trf.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={trf.observation}>
                          {trf.observation || <span className="text-slate-400 italic">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {trf.userName || 'Sistema'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setTransferToDelete(trf)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Estornar transferência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CUSTOS E DESPESAS --- */}
      {activeTab === 'despesas' && (
        <div className="space-y-5">
          {/* Top Bar with Period Filter & Add Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
                <Calendar className="w-4 h-4" /> Período:
              </div>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'todos', label: 'Todo Período' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodFilter === p.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="btn-add-expense"
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Custo / Despesa / Retirada</span>
            </button>
          </div>

          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total de Saídas
                </span>
                <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 mt-2">
                {formatCurrency(filteredExpensesList.reduce((acc, e) => acc + e.amount, 0))}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {filteredExpensesList.length} lançamento(s) no período
              </p>
            </div>

            <div className="p-4 bg-white border border-blue-100 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Despesas Operacionais (DRE)
                </span>
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl font-black text-rose-600 mt-2">
                {formatCurrency(
                  filteredExpensesList
                    .filter((e) => !e.nature || e.nature === 'OPERACIONAL')
                    .reduce((acc, e) => acc + e.amount, 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Impactam o resultado e lucro operacional
              </p>
            </div>

            <div className="p-4 bg-white border border-purple-100 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Retiradas Pessoais (Sócios)
                </span>
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <User className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl font-black text-purple-700 mt-2">
                {formatCurrency(
                  filteredExpensesList
                    .filter((e) => e.nature === 'RETIRADA_PESSOAL')
                    .reduce((acc, e) => acc + e.amount, 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saem do caixa/conta sem poluir a DRE
              </p>
            </div>
          </div>

          {/* Search & Multi-Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Buscar por descrição, observação ou conta..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Natureza:</span>
                <select
                  value={expenseNatureFilter}
                  onChange={(e) =>
                    setExpenseNatureFilter(
                      e.target.value as 'ALL' | 'OPERACIONAL' | 'RETIRADA_PESSOAL' | 'NAO_OPERACIONAL'
                    )
                  }
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="ALL">Todas as Naturezas</option>
                  <option value="OPERACIONAL">Operacional (DRE)</option>
                  <option value="RETIRADA_PESSOAL">Retirada Sócios (Apenas Caixa)</option>
                  <option value="NAO_OPERACIONAL">Não Operacional</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Conta Origem:</span>
                <select
                  value={expenseAccountFilter}
                  onChange={(e) => setExpenseAccountFilter(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="ALL">Todas as Contas</option>
                  {receivingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Categoria:</span>
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="ALL">Todas as Categorias</option>
                  <option value="Materiais/Produção">Materiais/Produção</option>
                  <option value="Despesas Fixas">Despesas Fixas</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Pessoal">Pessoal / Pró-labore</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expenses List / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Saídas Financeiras e Despesas</h3>
                <p className="text-xs text-slate-500">
                  Total no filtro: <span className="font-bold text-rose-600">{formatCurrency(filteredExpensesList.reduce((acc, e) => acc + e.amount, 0))}</span> ({filteredExpensesList.length} registro(s))
                </p>
              </div>
            </div>

            {filteredExpensesList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Nenhum lançamento encontrado</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clique em "Adicionar Custo / Despesa / Retirada" para registrar novos lançamentos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Natureza</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Conta Origem</th>
                      <th className="px-4 py-3">Forma Pagto</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredExpensesList.map((exp) => {
                      const nature = exp.nature || 'OPERACIONAL';
                      const acc = receivingAccounts.find((a) => a.id === exp.accountId);
                      const displayAccountName = exp.accountName || acc?.name || (exp.paymentMethod?.toLowerCase().includes('dinheiro') ? 'Caixa Físico' : 'Conta Padrão');

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                            {new Date(`${exp.date}T00:00:00`).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {exp.description}
                            {exp.observation && (
                              <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                                {exp.observation}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {nature === 'OPERACIONAL' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Operacional (DRE)
                              </span>
                            ) : nature === 'RETIRADA_PESSOAL' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Retirada Sócios
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Não Operacional
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-semibold">
                              <Wallet className="w-3 h-3 text-slate-500" />
                              {displayAccountName}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                String(exp.paymentMethod || '').toLowerCase().includes('dinheiro')
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {exp.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-rose-600">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpenseToEdit(exp);
                                  setIsExpenseModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar lançamento"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpenseToDelete(exp)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir lançamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: DRE GERENCIAL --- */}
      {activeTab === 'dre' && (
        <div className="space-y-6">
          {/* Period Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
                <Calendar className="w-4 h-4" /> Período da DRE:
              </div>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'todos', label: 'Todo Período' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodFilter === p.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>

          {/* DRE Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Receita Bruta
              </span>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(dreData.grossRevenue)}
              </p>
              <p className="text-[11px] text-slate-500">{dreData.periodSalesCount} venda(s) no período</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Receita Líquida
              </span>
              <p className="text-2xl font-black text-blue-600">
                {formatCurrency(dreData.netRevenue)}
              </p>
              <p className="text-[11px] text-slate-500">Após dedução de taxas (-{formatCurrency(dreData.totalFees)})</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Resultado Operacional
              </span>
              <p className={`text-2xl font-black ${dreData.operatingResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(dreData.operatingResult)}
              </p>
              <p className="text-[11px] text-slate-500">
                {dreData.totalPersonalWithdrawals > 0
                  ? `Lucro da operação (${formatCurrency(dreData.finalNetResult)} após retiradas)`
                  : 'Lucro operacional da empresa'}
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Margem Operacional
              </span>
              <p className="text-2xl font-black text-indigo-600">
                {dreData.netMarginPercent}%
              </p>
              <p className="text-[11px] text-slate-500">Rentabilidade operacional sobre receita</p>
            </div>
          </div>

          {/* DRE Detailed Statement Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  DRE Gerencial — Demonstração do Resultado
                </h3>
                <p className="text-xs text-slate-500">
                  Visão econômica da empresa. Considera estritamente despesas operacionais, mantendo retiradas pessoais segregadas.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold self-start sm:self-auto">
                {periodFilter.toUpperCase()}
              </span>
            </div>

            <div className="p-6 space-y-3 text-sm">
              {/* Row 1: Gross Revenue */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100 font-bold">
                <span className="text-slate-800">1. (+) RECEITA BRUTA DE VENDAS</span>
                <span className="text-slate-900 text-base">{formatCurrency(dreData.grossRevenue)}</span>
              </div>

              {/* Row 2: Deductions / Fees */}
              <div className="flex items-center justify-between py-2 pl-4 border-b border-slate-100 text-slate-600 text-xs">
                <span>(-) Deduções da Receita (Taxas de Pagamento / Maquininha)</span>
                <span className="font-bold text-rose-600">-{formatCurrency(dreData.totalFees)}</span>
              </div>

              {/* Row 3: Net Revenue */}
              <div className="flex items-center justify-between py-3 border-b border-slate-200 font-black text-blue-700 bg-blue-50/40 px-4 rounded-xl">
                <span>= 2. RECEITA LÍQUIDA</span>
                <span className="text-base">{formatCurrency(dreData.netRevenue)}</span>
              </div>

              {/* Row 4: CMV */}
              <div className="flex items-center justify-between py-2 pl-4 border-b border-slate-100 text-slate-600 text-xs">
                <span>(-) Custo dos Produtos Vendidos (CMV)</span>
                <span className="font-bold text-rose-600">-{formatCurrency(dreData.totalCMV)}</span>
              </div>

              {/* Row 5: Gross Result */}
              <div className="flex items-center justify-between py-3 border-b border-slate-200 font-black text-slate-900 bg-slate-50 px-4 rounded-xl">
                <span>= 3. RESULTADO BRUTO</span>
                <span className="text-base">{formatCurrency(dreData.grossResult)}</span>
              </div>

              {/* Row 6: Operating Expenses */}
              <div className="py-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>(-) DESPESAS OPERACIONAIS TOTAIS</span>
                  <span className="text-rose-600">-{formatCurrency(dreData.totalOperatingExpenses)}</span>
                </div>
                {Object.keys(dreData.expensesByCategory).length > 0 ? (
                  <div className="pl-4 space-y-1.5 border-l-2 border-rose-200 my-2">
                    {Object.entries(dreData.expensesByCategory).map(([cat, val]) => (
                      <div key={cat} className="flex items-center justify-between text-xs text-slate-600">
                        <span>• {cat}</span>
                        <span className="font-bold text-rose-600">-{formatCurrency(val as number)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pl-4 italic">Nenhuma despesa operacional lançada no período.</p>
                )}
              </div>

              {/* Row 7: Operating Result */}
              <div className={`flex items-center justify-between py-4 px-5 rounded-2xl font-black text-white ${
                dreData.operatingResult >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
              } shadow-md`}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-base">= 4. RESULTADO OPERACIONAL (LUCRO / PREJUÍZO DA EMPRESA)</span>
                </div>
                <span className="text-xl">{formatCurrency(dreData.operatingResult)}</span>
              </div>

              {/* Row 8: Net Margin */}
              <div className="flex items-center justify-between py-2.5 px-4 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                <span>Margem Operacional (%)</span>
                <span className="text-indigo-600 font-black text-sm">{dreData.netMarginPercent}%</span>
              </div>

              {/* Personal Withdrawals / Non-Operating Section */}
              {(dreData.totalPersonalWithdrawals > 0 || dreData.totalNonOperatingExpenses > 0) && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-800">
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Movimentações dos Sócios e Não Operacionais (Fora da DRE da Empresa)</span>
                  </div>

                  {dreData.totalPersonalWithdrawals > 0 && (
                    <div className="flex items-center justify-between py-2 pl-4 border-b border-purple-100 text-purple-950 text-xs">
                      <div>
                        <span className="font-semibold">(-) Retiradas Pessoais dos Sócios / Proprietário</span>
                        <p className="text-[11px] text-purple-600/80">
                          Deduzidas das contas financeiras sem distorcer o resultado operacional do negócio.
                        </p>
                      </div>
                      <span className="font-black text-purple-700 text-sm">
                        -{formatCurrency(dreData.totalPersonalWithdrawals)}
                      </span>
                    </div>
                  )}

                  {dreData.totalNonOperatingExpenses > 0 && (
                    <div className="flex items-center justify-between py-2 pl-4 border-b border-amber-100 text-amber-950 text-xs">
                      <div>
                        <span className="font-semibold">(-) Despesas Não Operacionais</span>
                      </div>
                      <span className="font-black text-amber-700 text-sm">
                        -{formatCurrency(dreData.totalNonOperatingExpenses)}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-center justify-between py-3.5 px-5 rounded-2xl font-black ${
                    dreData.finalNetResult >= 0 ? 'bg-purple-900 text-white' : 'bg-rose-900 text-white'
                  } shadow-sm`}>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-300" />
                      <span className="text-sm">= 5. SALDO LÍQUIDO DISPONÍVEL (APÓS RETIRADAS)</span>
                    </div>
                    <span className="text-lg">{formatCurrency(dreData.finalNetResult)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: RELATÓRIO FINANCEIRO DETALHADO --- */}
      {activeTab === 'relatorio' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filtros do Relatório</span>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Planilha (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              {/* Period Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Período
                </label>
                <select
                  value={periodFilter}
                  onChange={(e) => handlePeriodChange(e.target.value as PeriodFilter)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="hoje">Hoje</option>
                  <option value="ontem">Ontem</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="mes">Este Mês</option>
                  <option value="todos">Todo o Histórico</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Categoria
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {hasUncategorizedItems && (
                    <option value="UNCATEGORIZED">Sem Categoria</option>
                  )}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={selectedMethodFilter}
                  onChange={(e) => setSelectedMethodFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todas as Formas</option>
                  {companySettings.paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receiving Account Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Conta de Recebimento
                </label>
                <select
                  value={selectedAccountFilter}
                  onChange={(e) => setSelectedAccountFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todas as Contas</option>
                  {receivingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Buscar por Venda / Cliente
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nº da venda, cliente..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {periodFilter === 'custom' && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Período Personalizado:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-600">
                      Data inicial:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-600">
                      Data final:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {isDateRangeInvalid && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>A Data Inicial não pode ser maior que a Data Final. Ajuste as datas para exibir o relatório.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Lançamentos Encontrados ({allPaymentTransactions.length})
              </span>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span>Bruto: {formatCurrency(totals.gross)}</span>
                <span className="text-rose-600">Taxas: -{formatCurrency(totals.fees)}</span>
                <span className="text-emerald-700">Líquido: {formatCurrency(totals.net)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Data/Hora</th>
                    <th className="py-2.5 px-3">Venda</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Vendedor</th>
                    <th className="py-2.5 px-3">Forma</th>
                    <th className="py-2.5 px-3">Conta Recebedora</th>
                    <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                    <th className="py-2.5 px-3 text-right">Taxa (Custo Loja)</th>
                    <th className="py-2.5 px-3 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isDateRangeInvalid ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-rose-500 font-medium">
                        A Data Inicial não pode ser maior que a Data Final. Ajuste as datas para exibir o relatório.
                      </td>
                    </tr>
                  ) : allPaymentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    allPaymentTransactions.map((tx) => (
                      <tr key={tx.paymentId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-[11px] font-medium text-slate-600">
                          {formatDateTime(tx.saleCreatedAt)}
                        </td>
                        <td className="py-2 px-3 font-bold text-blue-600">
                          {tx.saleNumber}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded font-semibold text-[11px] whitespace-nowrap">
                            {tx.categoryLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {tx.customerName}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{tx.sellerName}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{tx.method}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[11px]">
                            {tx.accountName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(tx.grossAmount)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {tx.feeAmount > 0 ? (
                            <span className="font-bold text-rose-600">
                              -{formatCurrency(tx.feeAmount)} ({tx.feePercent.toFixed(2)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-emerald-700">
                          {formatCurrency(tx.netAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: CONTAS DE RECEBIMENTO --- */}
      {activeTab === 'contas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cadastro de Contas de Recebimento
              </h3>
              <p className="text-xs text-slate-500">
                Configure quem recebe os pagamentos (Caixa físico, Pix e Maquininhas de Cartão com suas respectivas taxas)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-new-receiving-account"
                onClick={() => {
                  setAccountToEdit(null);
                  setIsAccountModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Conta de Recebimento</span>
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {receivingAccounts.map((account) => {
              const Icon =
                account.type === 'CAIXA'
                  ? DollarSign
                  : account.type === 'PIX'
                  ? QrCode
                  : account.type === 'CARTAO'
                  ? CreditCard
                  : Building2;

              const badgeColor =
                account.type === 'CAIXA'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : account.type === 'PIX'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : account.type === 'CARTAO'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              const bal = accountBalances[account.id] ?? StorageService.getAccountBalance(account.id);

              return (
                <div
                  key={account.id}
                  className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 transition-all ${
                    account.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${badgeColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{account.name}</h4>
                        <p className="text-xs text-slate-500">
                          Titular: <strong>{account.receiverName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountToEdit(account);
                          setIsAccountModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Conta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountToDelete(account)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Account Current Balance & Transfer Action */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">
                        Saldo Disponível
                      </span>
                      <span className={`text-sm font-extrabold ${bal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(bal)}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        id={`btn-adjust-balance-${account.id}`}
                        onClick={() => handleOpenAdjustBalance(account, bal)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Ajustar saldo real desta conta (Exclusivo Administrador)"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ajustar Saldo</span>
                      </button>
                    )}
                  </div>

                  {/* Card Fees Info if CARTAO */}
                  {account.type === 'CARTAO' && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 text-xs">
                      <p className="font-bold text-indigo-900 text-[11px]">
                        Taxas Configuradas da Maquininha:
                      </p>
                      <div className="flex items-center justify-between text-indigo-800 font-semibold text-[11px]">
                        <span>Crédito: {account.creditFeePercent ?? 3.5}%</span>
                        <span>Débito: {account.debitFeePercent ?? 1.5}%</span>
                      </div>
                    </div>
                  )}

                  {account.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {account.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        account.active ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          account.active ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      ></span>
                      {account.active ? 'Ativa no PDV' : 'Inativa'}
                    </span>
                    {account.isDefault && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Histórico de Ajustes Administrativos de Saldo */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Histórico de Ajustes Administrativos de Saldo ({filteredBalanceAdjustments.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Registros de conciliação manual de saldo real. Totalmente isolados de receitas, despesas e faturamento.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={balanceAdjustmentAccountFilter}
                  onChange={(e) => setBalanceAdjustmentAccountFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todas as Contas</option>
                  {receivingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Conta</th>
                    <th className="py-2.5 px-3 text-right">Saldo Anterior</th>
                    <th className="py-2.5 px-3 text-right">Novo Saldo Real</th>
                    <th className="py-2.5 px-3 text-right">Ajuste (Diferença)</th>
                    <th className="py-2.5 px-3">Motivo / Justificativa</th>
                    <th className="py-2.5 px-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBalanceAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Sliders className="w-5 h-5 text-slate-400" />
                          <p className="text-xs font-bold text-slate-600">
                            Nenhum ajuste administrativo de saldo registrado
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Quando o administrador realizar conciliações ou correções manuais de saldo real, os registros aparecerão aqui.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBalanceAdjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                          {formatDateTime(adj.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {adj.adjustmentNumber}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {adj.accountName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          {formatCurrency(adj.previousBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                          {formatCurrency(adj.newBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              adj.adjustedAmount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : adj.adjustedAmount < 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {adj.adjustedAmount > 0 ? `+ ${formatCurrency(adj.adjustedAmount)}` : `- ${formatCurrency(Math.abs(adj.adjustedAmount))}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={adj.reason}>
                          {adj.reason}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {adj.userName || 'Administrador'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isOpenCashModalOpen && (
        <OpenCashModal
          isOpen={isOpenCashModalOpen}
          onClose={() => setIsOpenCashModalOpen(false)}
          onCashOpened={(session) => {
            reloadFinanceData();
          }}
        />
      )}

      {isCloseCashModalOpen && currentCashRegister && (
        <CloseCashModal
          isOpen={isCloseCashModalOpen}
          onClose={() => setIsCloseCashModalOpen(false)}
          session={currentCashRegister}
          onCashClosed={(session) => {
            reloadFinanceData();
            setSelectedReceiptSession(session);
          }}
        />
      )}

      {selectedReceiptSession && (
        <CashSessionReceiptModal
          isOpen={!!selectedReceiptSession}
          onClose={() => setSelectedReceiptSession(null)}
          session={selectedReceiptSession}
          companySettings={companySettings}
        />
      )}

      {isAccountModalOpen && (
        <ReceivingAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setAccountToEdit(null);
          }}
          accountToEdit={accountToEdit}
          onSave={handleSaveAccount}
        />
      )}

      {accountToDelete && (
        <ConfirmDialog
          isOpen={!!accountToDelete}
          title="Excluir Conta de Recebimento"
          message={`Tem certeza que deseja excluir a conta "${accountToDelete.name}"? Ela não estará mais disponível para novas vendas.`}
          confirmLabel="Excluir Conta"
          variant="danger"
          onConfirm={handleDeleteAccount}
          onCancel={() => setAccountToDelete(null)}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setExpenseToEdit(null);
          }}
          expenseToEdit={expenseToEdit}
          onSave={reloadFinanceData}
        />
      )}

      {expenseToDelete && (
        <ConfirmDialog
          isOpen={!!expenseToDelete}
          title="Excluir Custo / Despesa"
          message={`Tem certeza que deseja excluir o registro "${expenseToDelete.description}" (${formatCurrency(expenseToDelete.amount)})?`}
          confirmLabel="Excluir Despesa"
          variant="danger"
          onConfirm={handleDeleteExpense}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}

      {/* Account Transfer Modal */}
      {isTransferModalOpen && (
        <AccountTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setDefaultTransferFromId(undefined);
            setDefaultTransferToId(undefined);
          }}
          accounts={receivingAccounts}
          accountBalances={accountBalances}
          onTransferSuccess={handleTransferSuccess}
          defaultFromAccountId={defaultTransferFromId}
          defaultToAccountId={defaultTransferToId}
          currentUser={currentUser || undefined}
        />
      )}

      {/* Revert / Delete Transfer Confirmation Dialog */}
      {transferToDelete && (
        <ConfirmDialog
          isOpen={!!transferToDelete}
          title="Estornar Transferência entre Contas"
          message={`Tem certeza que deseja estornar a transferência ${transferToDelete.transferNumber} no valor de ${formatCurrency(transferToDelete.amount)}? O valor retornará para a conta "${transferToDelete.fromAccountName}" e será debitado da conta "${transferToDelete.toAccountName}".`}
          confirmLabel="Confirmar Estorno"
          variant="danger"
          onConfirm={handleDeleteTransfer}
          onCancel={() => setTransferToDelete(null)}
        />
      )}

      {/* Adjust Account Balance Modal (Exclusivo Administrador) */}
      {isAdjustBalanceModalOpen && accountToAdjust && (
        <AdjustAccountBalanceModal
          isOpen={isAdjustBalanceModalOpen}
          onClose={() => {
            setIsAdjustBalanceModalOpen(false);
            setAccountToAdjust(null);
          }}
          account={accountToAdjust}
          currentBalance={accountAdjustBalance}
          onSuccess={handleAdjustSuccess}
          currentUser={currentUser || undefined}
        />
      )}
    </div>
  );
};

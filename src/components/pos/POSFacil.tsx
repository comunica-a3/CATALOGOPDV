import {
  AlertCircle,
  ArrowRight,
  Barcode,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CornerDownLeft,
  CreditCard,
  DollarSign,
  Edit2,
  FileText,
  HelpCircle,
  Info,
  Keyboard,
  Layers,
  Minus,
  Package,
  Percent,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  CartItem,
  Category,
  CompanySettings,
  Customer,
  Item,
  ItemType,
  PaymentRecord,
  PaymentStatus,
  ProductionOrder,
  Sale,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CustomerSearchModal } from '../customers/CustomerSearchModal';
import { OpenCashModal } from '../finance/OpenCashModal';
import { POSBudgetModal } from './POSBudgetModal';
import { POSCustomerModal } from './POSCustomerModal';
import { POSItemConfigModal } from './POSItemConfigModal';
import { POSReceiptModal } from './POSReceiptModal';

interface POSFacilProps {
  items: Item[];
  categories: Category[];
  companySettings: CompanySettings;
  onSaleCreated: () => void;
  onNavigate?: (view: string) => void;
}

type QuickPaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'A_PRAZO' | 'MULTIPLO';

export const POSFacil: React.FC<POSFacilProps> = ({
  items,
  categories,
  companySettings,
  onSaleCreated,
  onNavigate,
}) => {
  const { currentUser, isPromotor } = useAuth();

  // Search & Navigation State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Discount State
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Single-Screen Checkout State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<QuickPaymentMethod>('PIX');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [dueDateInput, setDueDateInput] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Multi-Payment Records State
  const [multiPayments, setMultiPayments] = useState<PaymentRecord[]>([
    { method: 'PIX', amount: 0, reference: '' },
  ]);

  // Cash Register State
  const [isCashOpen, setIsCashOpen] = useState<boolean>(() =>
    StorageService.hasOpenCashRegisterSession()
  );
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  // Modals State
  const [configItem, setConfigItem] = useState<Item | null>(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Feedback State
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [lastProdOrders, setLastProdOrders] = useState<ProductionOrder[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Focus search bar on initial render
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Update cash session state
  const refreshCashSession = useCallback(() => {
    setIsCashOpen(StorageService.hasOpenCashRegisterSession());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filtered Products for the Search Autocomplete Overlay
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term && selectedCategory === 'ALL') {
      return [];
    }

    return items
      .filter((it) => {
        if (!it.active) return false;
        if (selectedCategory !== 'ALL' && it.categoryId !== selectedCategory) {
          return false;
        }
        if (!term) return true;

        const matchName = (it.name || '').toLowerCase().includes(term);
        const matchBarcode = it.barcode ? it.barcode.toLowerCase().includes(term) : false;
        const matchSku = it.sku ? it.sku.toLowerCase().includes(term) : false;
        return matchName || matchBarcode || matchSku;
      })
      .slice(0, 10);
  }, [items, searchTerm, selectedCategory]);

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchResults]);

  // Derived Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const hasThirdParty = useMemo(() => {
    return cart.some(
      (ci) =>
        ci.item?.productionType === 'PRODUCAO_TERCEIRIZADA' ||
        (ci.item as any)?.production_type === 'PRODUCAO_TERCEIRIZADA' ||
        (Number(ci.item?.supplierFreight) > 0)
    );
  }, [cart]);

  const freightAmount = useMemo(() => {
    if (!hasThirdParty) return 0;
    const adminFreight =
      Number(companySettings?.defaultSupplierFreight) ||
      Number(StorageService.getCompanySettings()?.defaultSupplierFreight) ||
      20.0;
    return adminFreight > 0 ? adminFreight : 0;
  }, [hasThirdParty, companySettings]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountInput) || 0;
    if (val <= 0) return 0;
    const base = subtotal + freightAmount;
    if (discountType === 'PERCENT') {
      return Number(((base * Math.min(100, val)) / 100).toFixed(2));
    }
    return Number(Math.min(base, val).toFixed(2));
  }, [subtotal, freightAmount, discountInput, discountType]);

  const finalTotal = useMemo(() => {
    return Math.max(0, Number((subtotal + freightAmount - discountAmount).toFixed(2)));
  }, [subtotal, freightAmount, discountAmount]);

  // Cash change calculation
  const cashReceivedValue = parseFloat(cashReceivedInput) || 0;
  const cashChange = useMemo(() => {
    if (selectedPaymentMethod !== 'DINHEIRO') return 0;
    if (cashReceivedValue <= 0) return 0;
    return Math.max(0, Number((cashReceivedValue - finalTotal).toFixed(2)));
  }, [selectedPaymentMethod, cashReceivedValue, finalTotal]);

  // Multi-Payment Total
  const multiPaymentsTotal = useMemo(() => {
    return multiPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [multiPayments]);

  const multiPaymentsRemaining = useMemo(() => {
    return Math.max(0, Number((finalTotal - multiPaymentsTotal).toFixed(2)));
  }, [finalTotal, multiPaymentsTotal]);

  // Add Item to Cart
  const handleAddItemToCart = useCallback(
    (item: Item) => {
      // If it requires configuration (m², progressive pricing tiers, packages, options, variants or service fields), open configuration modal
      const hasConfig =
        item.pricingModel === 'POR_M2' ||
        item.pricingModel === 'POR_PACOTE' ||
        (item.priceRules && item.priceRules.length > 0) ||
        (item.packages && item.packages.length > 0) ||
        (item.options && item.options.length > 0) ||
        (item.variants && item.variants.length > 0) ||
        (item.serviceFields && item.serviceFields.length > 0);

      if (hasConfig) {
        setConfigItem(item);
        setSearchTerm('');
        return;
      }

      // Standard item: Add or increment
      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.item.id === item.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          const curr = next[existingIdx];
          const newQty = curr.quantity + 1;
          let uPrice = curr.unitPrice;
          let uCost = curr.unitCost;

          // Progressive pricing tier update if applicable
          if (curr.item.priceRules && curr.item.priceRules.length > 0) {
            const sortedRules = [...curr.item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
            const applicableTier = sortedRules.find((r) => newQty >= r.minQuantity) || sortedRules[sortedRules.length - 1];
            if (applicableTier) {
              const optionAddition = curr.configuration?.additionalPrice || 0;
              uPrice = applicableTier.unitSalePrice + optionAddition;
              uCost = applicableTier.unitCost;
            }
          }

          next[existingIdx] = {
            ...curr,
            quantity: newQty,
            unitPrice: uPrice,
            unitCost: uCost,
            totalPrice: Number((uPrice * newQty).toFixed(2)),
            totalCost: Number((uCost * newQty).toFixed(2)),
          };
          return next;
        }

        let unitPrice = item.salePrice || 0;
        let unitCost = item.costPrice || 0;
        if (item.priceRules && item.priceRules.length > 0) {
          const sortedRules = [...item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
          const applicableTier = sortedRules.find((r) => 1 >= r.minQuantity) || sortedRules[sortedRules.length - 1];
          if (applicableTier) {
            unitPrice = applicableTier.unitSalePrice;
            unitCost = applicableTier.unitCost;
          }
        }

        const newCartItem: CartItem = {
          cartItemId: `CART-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          item,
          quantity: 1,
          unitPrice,
          unitCost,
          totalPrice: unitPrice,
          totalCost: unitCost,
          configuration: {},
        };
        return [...prev, newCartItem];
      });

      setSearchTerm('');
      setHighlightedIndex(0);
      showToast(`Item "${item.name}" adicionado`);
      searchInputRef.current?.focus();
    },
    []
  );

  const handleConfigSave = (configuredItem: CartItem) => {
    setCart((prev) => [...prev, configuredItem]);
    setConfigItem(null);
    showToast(`Item "${configuredItem.item.name}" configurado e adicionado`);
    searchInputRef.current?.focus();
  };

  // Modify Cart Item Quantity
  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.cartItemId === cartItemId) {
          const qty = Math.max(1, newQty);
          let uPrice = i.unitPrice;
          let uCost = i.unitCost;

          // Recalculate price rule if item has progressive pricing
          if (i.item.priceRules && i.item.priceRules.length > 0) {
            const sortedRules = [...i.item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
            const applicableTier = sortedRules.find((r) => qty >= r.minQuantity) || sortedRules[sortedRules.length - 1];
            if (applicableTier) {
              const optionAddition = i.configuration?.additionalPrice || 0;
              uPrice = applicableTier.unitSalePrice + optionAddition;
              uCost = applicableTier.unitCost;
            }
          }

          return {
            ...i,
            quantity: qty,
            unitPrice: uPrice,
            unitCost: uCost,
            totalPrice: Number((uPrice * qty).toFixed(2)),
            totalCost: Number((uCost * qty).toFixed(2)),
          };
        }
        return i;
      })
    );
  };

  // Modify Cart Item Unit Price Inline
  const handleUpdateUnitPrice = (cartItemId: string, newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setCart((prev) =>
      prev.map((i) => {
        if (i.cartItemId === cartItemId) {
          return {
            ...i,
            unitPrice: safePrice,
            totalPrice: Number((safePrice * i.quantity).toFixed(2)),
          };
        }
        return i;
      })
    );
  };

  // Remove Item
  const handleRemoveItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Deseja realmente cancelar a venda atual e limpar o carrinho?')) {
      setCart([]);
      setSelectedCustomer(null);
      setDiscountInput('0');
      setCashReceivedInput('');
      setSaleNotes('');
      setErrorMessage('');
      searchInputRef.current?.focus();
      showToast('Venda cancelada e carrinho limpo.');
    }
  };

  // Finalize Sale (Checkout in 1 single screen)
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('Adicione pelo menos um item ao carrinho para finalizar a venda.');
      searchInputRef.current?.focus();
      return;
    }

    if (isPromotor) {
      setErrorMessage('Promotores de vendas devem utilizar a tela padrão de Orçamentos e Propostas.');
      return;
    }

    // Check customer for A Prazo
    if (selectedPaymentMethod === 'A_PRAZO' && !selectedCustomer) {
      setErrorMessage('Para vendas A Prazo / Fiado, é obrigatório selecionar ou cadastrar o Cliente [F7].');
      setIsCustomerSearchOpen(true);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      // Build Payment Records
      let payments: PaymentRecord[] = [];
      let paymentStatus: PaymentStatus = 'PAGO';

      if (selectedPaymentMethod === 'PIX') {
        payments = [
          {
            id: `PAY-${Date.now()}-1`,
            method: 'PIX',
            amount: finalTotal,
            date: new Date().toISOString(),
          },
        ];
        paymentStatus = 'PAGO';
      } else if (selectedPaymentMethod === 'CARTAO_CREDITO') {
        payments = [
          {
            id: `PAY-${Date.now()}-1`,
            method: 'Cartão de Crédito',
            amount: finalTotal,
            cardType: 'CREDITO',
            notes: creditInstallments > 1 ? `${creditInstallments}x de ${formatCurrency(finalTotal / creditInstallments)}` : undefined,
            date: new Date().toISOString(),
          },
        ];
        paymentStatus = 'PAGO';
      } else if (selectedPaymentMethod === 'CARTAO_DEBITO') {
        payments = [
          {
            id: `PAY-${Date.now()}-1`,
            method: 'Cartão de Débito',
            amount: finalTotal,
            cardType: 'DEBITO',
            date: new Date().toISOString(),
          },
        ];
        paymentStatus = 'PAGO';
      } else if (selectedPaymentMethod === 'DINHEIRO') {
        payments = [
          {
            id: `PAY-${Date.now()}-1`,
            method: 'Dinheiro',
            amount: finalTotal,
            notes: cashReceivedValue > 0 ? `Recebido: ${formatCurrency(cashReceivedValue)} | Troco: ${formatCurrency(cashChange)}` : undefined,
            date: new Date().toISOString(),
          },
        ];
        paymentStatus = 'PAGO';
      } else if (selectedPaymentMethod === 'A_PRAZO') {
        payments = [];
        paymentStatus = 'A_PRAZO';
      } else if (selectedPaymentMethod === 'MULTIPLO') {
        payments = multiPayments
          .filter((p) => p.amount > 0)
          .map((p, idx) => {
            const mLower = String(p.method || '').toLowerCase();
            const isCredit = mLower.includes('crédito') || mLower.includes('credito');
            const isDebit = mLower.includes('débito') || mLower.includes('debito');
            return {
              id: `PAY-${Date.now()}-${idx + 1}`,
              method: p.method,
              amount: p.amount,
              cardType: isCredit ? ('CREDITO' as const) : isDebit ? ('DEBITO' as const) : undefined,
              date: new Date().toISOString(),
            };
          });
        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
        if (totalPaid >= finalTotal) {
          paymentStatus = 'PAGO';
        } else if (totalPaid > 0) {
          paymentStatus = 'PARCIALMENTE_PAGO';
        } else {
          paymentStatus = 'PENDENTE';
        }
      }

      // Execute Sale
      const currentSeller = currentUser || {
        id: 'balcao',
        name: 'Operador de Caixa',
        email: 'caixa@loja.com',
        role: 'VENDEDOR',
        active: true,
      };

      const result = StorageService.createSale({
        seller: currentSeller,
        customer: selectedCustomer || undefined,
        cartItems: cart,
        freight: freightAmount,
        discount: discountAmount,
        payments,
        paymentStatus,
        dueDate: selectedPaymentMethod === 'A_PRAZO' ? dueDateInput : undefined,
        notes: saleNotes,
      });

      // Feedback & Reset
      setLastCompletedSale(result.sale);
      setLastProdOrders(result.productionOrdersCreated || []);
      setIsReceiptModalOpen(true);
      onSaleCreated();

      // Reset Form for next sale
      setCart([]);
      setSelectedCustomer(null);
      setDiscountInput('0');
      setCashReceivedInput('');
      setSaleNotes('');
      setMultiPayments([{ method: 'PIX', amount: 0, reference: '' }]);
      showToast(`Venda ${result.sale.saleNumber} realizada com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao finalizar venda no PDV Fácil:', err);
      setErrorMessage(err?.message || 'Erro ao processar a venda. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if any modal is open
      if (
        isCustomerSearchOpen ||
        isNewCustomerModalOpen ||
        isBudgetModalOpen ||
        isReceiptModalOpen ||
        isDiscountModalOpen ||
        isShortcutsModalOpen ||
        configItem ||
        isOpenCashModalOpen
      ) {
        return;
      }

      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      // 1. Slash [/] -> Focus Search Bar
      if (e.key === '/' && activeEl !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 2. Escape [Esc] -> Close Search results or Clear Cart
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('');
          return;
        }
        if (cart.length > 0) {
          handleClearCart();
          return;
        }
      }

      // 3. Arrow Down / Up in Search Input
      if (activeEl === searchInputRef.current && searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = searchResults[highlightedIndex];
          if (selected) {
            handleAddItemToCart(selected);
          }
          return;
        }
      }

      // Global Action Shortcuts (when not actively writing text)
      if (!isTyping || activeEl === searchInputRef.current) {
        // Quick Payment Shortcuts: 1, 2, 3, 4
        if (e.key === '1' && (e.altKey || activeEl !== searchInputRef.current)) {
          e.preventDefault();
          setSelectedPaymentMethod('PIX');
          return;
        }
        if (e.key === '2' && (e.altKey || activeEl !== searchInputRef.current)) {
          e.preventDefault();
          setSelectedPaymentMethod('CARTAO_CREDITO');
          return;
        }
        if (e.key === '3' && (e.altKey || activeEl !== searchInputRef.current)) {
          e.preventDefault();
          setSelectedPaymentMethod('CARTAO_DEBITO');
          return;
        }
        if (e.key === '4' && (e.altKey || activeEl !== searchInputRef.current)) {
          e.preventDefault();
          setSelectedPaymentMethod('DINHEIRO');
          setTimeout(() => cashInputRef.current?.focus(), 50);
          return;
        }
      }

      // Function Keys
      if (e.key === 'F1') {
        e.preventDefault();
        setSelectedPaymentMethod('PIX');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setSelectedPaymentMethod('CARTAO_CREDITO');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setSelectedPaymentMethod('CARTAO_DEBITO');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setSelectedPaymentMethod('DINHEIRO');
        setTimeout(() => cashInputRef.current?.focus(), 50);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsCustomerSearchOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsDiscountModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleFinalizeSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    searchTerm,
    searchResults,
    highlightedIndex,
    cart,
    isCustomerSearchOpen,
    isNewCustomerModalOpen,
    isBudgetModalOpen,
    isReceiptModalOpen,
    isDiscountModalOpen,
    isShortcutsModalOpen,
    configItem,
    isOpenCashModalOpen,
    handleAddItemToCart,
    finalTotal,
  ]);

  return (
    <div id="pos-facil-view" className="space-y-4 animate-in fade-in duration-150">
      {/* 1. TOP STATUS & SHORTCUTS HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">PDV Fácil</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Balcão Rápido
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Operador:{' '}
              <strong className="text-slate-800">{currentUser?.name || 'Caixa'}</strong>
            </p>
          </div>
        </div>

        {/* Quick Toolbar / Cash Session */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {isCashOpen ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caixa Aberto</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenCashModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 cursor-pointer transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Abrir Caixa</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Ver Atalhos de Teclado"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Atalhos</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="p-0.5 hover:bg-emerald-700 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="p-1 text-rose-500 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN SINGLE-SCREEN WORKSPACE: 2-COLUMN DESKTOP LAYOUT                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: SEARCH BAR + CART ITEMS TABLE (7 OF 12 COLS)               */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* MAIN PROMINENT SEARCH BAR */}
          <div className="relative bg-white p-3 sm:p-4 rounded-xl border-2 border-blue-500/80 shadow-md">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar produto, código de barras ou SKU... [ / ]"
                  className="w-full pl-11 pr-24 py-3 bg-slate-50 text-slate-900 font-bold placeholder-slate-400 border border-slate-300 rounded-lg text-sm sm:text-base focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-600 rounded border border-slate-300">
                    ENTER
                  </span>
                </div>
              </div>

              {/* Category Quick Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="hidden sm:block text-xs border border-slate-300 rounded-lg px-3 py-3 bg-white text-slate-700 font-bold focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SEARCH AUTOCOMPLETE DROPDOWN OVERLAY */}
            {searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-300 shadow-2xl z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length > 0 ? (
                  searchResults.map((item, idx) => {
                    const isSelected = idx === highlightedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItemToCart(item)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/90 text-blue-900 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              {item.code && <span className="font-mono font-semibold">Cód: {item.code}</span>}
                              {item.type && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                                  {item.type === 'PRODUTO_GRAFICO'
                                    ? 'Gráfico'
                                    : item.type === 'PRODUTO_FISICO'
                                    ? 'Físico'
                                    : 'Serviço'}
                                </span>
                              )}
                              {item.stock !== undefined && (
                                <span>Estoque: {item.stock}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-sm text-emerald-700 block">
                            {item.pricingModel === 'POR_M2' && item.areaPricing?.salePricePerM2
                              ? `${formatCurrency(item.areaPricing.salePricePerM2)}/m²`
                              : item.pricingModel === 'POR_PACOTE' && item.packages && item.packages.length > 0
                              ? `A partir de ${formatCurrency(item.packages[0].salePrice)}`
                              : item.pricingModel === 'POR_UNIDADE' && item.priceRules && item.priceRules.length > 0
                              ? `A partir de ${formatCurrency(item.priceRules[item.priceRules.length - 1]?.unitSalePrice || item.salePrice)}/un`
                              : formatCurrency(item.salePrice || 0)}
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold flex items-center justify-end gap-1">
                            <span>Adicionar</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhum produto encontrado com "{searchTerm}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CURRENT CART ITEMS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                  Produtos no Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar Venda [F9]</span>
                </button>
              )}
            </div>

            {cart.length > 0 ? (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-500 uppercase font-bold text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-2 text-center">Qtd</th>
                      <th className="py-2.5 px-2 text-right">Unitário</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((cartItem, index) => (
                      <tr key={cartItem.cartItemId} className="hover:bg-slate-50/70 transition-colors">
                        {/* Item Name & Specs */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                            {cartItem.item.name}
                          </p>
                          {cartItem.configuration?.variantName && (
                            <span className="text-[10px] text-blue-600 block">
                              Variação: {cartItem.configuration.variantName}
                            </span>
                          )}
                          {cartItem.configuration?.packageName && (
                            <span className="text-[10px] text-blue-600 block">
                              Pacote: {cartItem.configuration.packageName}
                            </span>
                          )}
                          {cartItem.configuration?.selectedOptions && (
                            <div className="mt-0.5 space-y-0.5">
                              {Object.entries(cartItem.configuration.selectedOptions).map(([optName, optVal]) => (
                                <span key={optName} className="text-[10px] text-indigo-600 font-medium block">
                                  • {optName}: {optVal}
                                </span>
                              ))}
                            </div>
                          )}
                          {cartItem.configuration?.calculatedAreaM2 && (
                            <span className="text-[10px] text-slate-500 block">
                              Medida: {cartItem.configuration.width}x{cartItem.configuration.height}
                              {cartItem.configuration.dimensionUnit} ({cartItem.configuration.calculatedAreaM2}m²)
                            </span>
                          )}
                          {cartItem.configuration?.notes && (
                            <span className="text-[10px] text-slate-500 italic block">
                              Obs: {cartItem.configuration.notes}
                            </span>
                          )}
                        </td>

                        {/* Quantity Controls */}
                        <td className="py-3 px-2 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(cartItem.cartItemId, cartItem.quantity - 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={cartItem.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(cartItem.cartItemId, parseInt(e.target.value) || 1)
                              }
                              className="w-10 text-center font-bold text-xs text-slate-900 border-x border-slate-300 py-1 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(cartItem.cartItemId, cartItem.quantity + 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Unit Price (Editable inline) */}
                        <td className="py-3 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cartItem.unitPrice}
                            onChange={(e) =>
                              handleUpdateUnitPrice(cartItem.cartItemId, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 text-right font-bold text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:bg-white focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Total Price */}
                        <td className="py-3 px-3 text-right font-extrabold text-slate-950 text-xs sm:text-sm">
                          {formatCurrency(cartItem.totalPrice)}
                        </td>

                        {/* Delete Action */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(cartItem.cartItemId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-14 text-center space-y-2 text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-600">Nenhum item na venda atual</p>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Digite na barra de pesquisa acima ou aperte <strong className="text-slate-700">[/]</strong> para buscar e adicionar itens.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: SINGLE-SCREEN CHECKOUT & FINALIZE (5 OF 12 COLS)          */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. CUSTOMER IDENTIFICATION CARD */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Identificação do Cliente
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-pos-facil-search-customer"
                  onClick={() => setIsCustomerSearchOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  Buscar [F7]
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  title="Cadastrar Novo Cliente"
                >
                  + Novo
                </button>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-blue-950">{selectedCustomer.name}</h4>
                  <div className="text-[11px] text-blue-800 flex items-center gap-2 mt-0.5">
                    {selectedCustomer.phone && <span>Tel: {selectedCustomer.phone}</span>}
                    {selectedCustomer.document && <span>Doc: {selectedCustomer.document}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-blue-400 hover:text-blue-700 rounded"
                  title="Remover Cliente"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500 font-medium">
                Cliente Balcão (Não Identificado)
              </div>
            )}
          </div>

          {/* 2. FINANCIAL TOTALS SUMMARY (BIG TOTAL DISPLAY) */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Subtotal:</span>
              <span className="font-bold text-white text-sm">{formatCurrency(subtotal + freightAmount)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-rose-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Desconto ({discountType === 'PERCENT' ? `${discountInput}%` : 'R$'}):
                </span>
                <span className="font-bold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                  Total a Pagar
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(finalTotal)}
                </span>
              </div>

              {/* Discount Quick Button */}
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                % Desconto [F8]
              </button>
            </div>

            {/* Se for pagamento em dinheiro com troco, destacar Troco com o mesmo protagonismo de Total a Pagar */}
            {selectedPaymentMethod === 'DINHEIRO' && cashChange > 0 && (
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between animate-in fade-in duration-150">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 block">
                    Troco
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight">
                    {formatCurrency(cashChange)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. FAST PAYMENT METHODS (SHORTCUTS 1 TO 4) */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight block">
              Forma de Pagamento (Atalhos 1 a 4)
            </span>

            {/* Quick 1-Click Payment Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* [1] PIX */}
              <button
                type="button"
                id="btn-pay-pix"
                onClick={() => setSelectedPaymentMethod('PIX')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPaymentMethod === 'PIX'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>PIX</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-inherit font-bold">
                  1 / F1
                </span>
              </button>

              {/* [2] Crédito */}
              <button
                type="button"
                id="btn-pay-credit"
                onClick={() => setSelectedPaymentMethod('CARTAO_CREDITO')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPaymentMethod === 'CARTAO_CREDITO'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>C. Crédito</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-inherit font-bold">
                  2 / F2
                </span>
              </button>

              {/* [3] Débito */}
              <button
                type="button"
                id="btn-pay-debit"
                onClick={() => setSelectedPaymentMethod('CARTAO_DEBITO')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPaymentMethod === 'CARTAO_DEBITO'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>C. Débito</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-inherit font-bold">
                  3 / F3
                </span>
              </button>

              {/* [4] Dinheiro */}
              <button
                type="button"
                id="btn-pay-cash"
                onClick={() => {
                  setSelectedPaymentMethod('DINHEIRO');
                  setTimeout(() => cashInputRef.current?.focus(), 50);
                }}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPaymentMethod === 'DINHEIRO'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span>Dinheiro</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-inherit font-bold">
                  4 / F4
                </span>
              </button>
            </div>

            {/* Extra Payment Modes: A Prazo / Múltiplo */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('A_PRAZO')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  selectedPaymentMethod === 'A_PRAZO'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-extrabold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                A Prazo / Fiado
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('MULTIPLO')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  selectedPaymentMethod === 'MULTIPLO'
                    ? 'bg-purple-100 border-purple-300 text-purple-900 font-extrabold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Múltiplos / Misto
              </button>
            </div>

            {/* DYNAMIC METHOD CONTROLS */}
            {/* Dinheiro: Campo de Troco e Cédulas Rápidas */}
            {selectedPaymentMethod === 'DINHEIRO' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label htmlFor="pos-facil-cash-input" className="text-xs font-bold text-amber-900">Valor Recebido (R$):</label>
                </div>

                <input
                  id="pos-facil-cash-input"
                  ref={cashInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(e.target.value)}
                  placeholder={`Ex: ${finalTotal.toFixed(2)}`}
                  className="w-full px-3 py-2 bg-white text-slate-900 font-extrabold text-base border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-200 focus:outline-none"
                />

                {/* Quick Cash Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput(finalTotal.toString())}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold rounded cursor-pointer"
                  >
                    Valor Exato
                  </button>
                  {[10, 20, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceivedInput(val.toString())}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold rounded cursor-pointer"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Crédito: Parcelas */}
            {selectedPaymentMethod === 'CARTAO_CREDITO' && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                <span className="font-bold text-blue-900">Número de Parcelas:</span>
                <select
                  value={creditInstallments}
                  onChange={(e) => setCreditInstallments(parseInt(e.target.value) || 1)}
                  className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg font-bold text-blue-900 focus:outline-none"
                >
                  <option value={1}>1x à vista ({formatCurrency(finalTotal)})</option>
                  {[2, 3, 4, 5, 6, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatCurrency(finalTotal / n)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* A Prazo: Vencimento */}
            {selectedPaymentMethod === 'A_PRAZO' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label htmlFor="pos-facil-due-date" className="font-bold text-amber-900 cursor-pointer">
                    Data de Vencimento:
                  </label>
                  <input
                    id="pos-facil-due-date"
                    type="date"
                    value={dueDateInput}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch {}
                    }}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
                {!selectedCustomer && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    * Selecione um cliente para registrar a venda a prazo.
                  </p>
                )}
              </div>
            )}

            {/* Múltiplo: Adicionar Parcelas / Formas Mistas */}
            {selectedPaymentMethod === 'MULTIPLO' && (
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-950">Composição do Pagamento:</span>
                  <span className={multiPaymentsRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    Restante: {formatCurrency(multiPaymentsRemaining)}
                  </span>
                </div>

                {multiPayments.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={(e) => {
                        const next = [...multiPayments];
                        next[pIdx].method = e.target.value;
                        setMultiPayments(next);
                      }}
                      className="px-2 py-1.5 bg-white border border-purple-300 rounded-lg font-semibold text-xs text-slate-800"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CARTAO_CREDITO">C. Crédito</option>
                      <option value="CARTAO_DEBITO">C. Débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="BOLETO">Boleto</option>
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.amount || ''}
                      onChange={(e) => {
                        const next = [...multiPayments];
                        next[pIdx].amount = parseFloat(e.target.value) || 0;
                        setMultiPayments(next);
                      }}
                      placeholder="Valor R$"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-bold text-slate-900"
                    />

                    {multiPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMultiPayments(multiPayments.filter((_, i) => i !== pIdx))}
                        className="p-1.5 text-rose-500 hover:text-rose-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setMultiPayments([...multiPayments, { method: 'PIX', amount: multiPaymentsRemaining, reference: '' }])
                  }
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Outra Forma</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. FINAL ACTION BUTTONS: FINALIZE SALE [F12 / ENTER] & PROPOSAL */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="btn-finalize-sale"
              onClick={handleFinalizeSale}
              disabled={isProcessing || cart.length === 0}
              className={`w-full py-4 px-6 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer ${
                cart.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>{isProcessing ? 'Processando Venda...' : 'FINALIZAR VENDA [F12]'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                disabled={cart.length === 0}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Salvar Orçamento</span>
              </button>

              <button
                type="button"
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar Venda</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTEGRATED MODALS (Customer Search, Discount, Item Config, Receipt, etc.)  */}
      {/* ========================================================================= */}

      {/* Discount Quick Modal */}
      {isDiscountModalOpen && (
        <Modal
          id="pos-facil-discount-modal"
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          title="Aplicar Desconto na Venda"
          subtitle={`Subtotal atual: ${formatCurrency(subtotal)}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDiscountType('FIXED')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  discountType === 'FIXED' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'
                }`}
              >
                Valor em Reais (R$)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('PERCENT')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  discountType === 'PERCENT' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'
                }`}
              >
                Percentual (%)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {discountType === 'FIXED' ? 'Valor do Desconto (R$):' : 'Percentual de Desconto (%):'}
              </label>
              <input
                type="number"
                step={discountType === 'FIXED' ? '0.01' : '1'}
                min="0"
                max={discountType === 'PERCENT' ? '100' : subtotal.toString()}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-base font-bold bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Discount Percent Suggestions */}
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountType('PERCENT');
                    setDiscountInput(pct.toString());
                  }}
                  className="flex-1 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-xs font-bold rounded transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountInput('0');
                  setIsDiscountModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Remover Desconto
              </button>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Aplicar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item Configuration Modal (for m² / finishes) */}
      {configItem && (
        <POSItemConfigModal
          isOpen={!!configItem}
          onClose={() => setConfigItem(null)}
          item={configItem}
          onAddToCart={handleConfigSave}
          onSave={handleConfigSave}
        />
      )}

      {/* Customer Search Modal */}
      {isCustomerSearchOpen && (
        <CustomerSearchModal
          isOpen={isCustomerSearchOpen}
          onClose={() => setIsCustomerSearchOpen(false)}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setIsCustomerSearchOpen(false);
            showToast(`Cliente "${cust.name}" selecionado.`);
          }}
          onNewCustomer={() => {
            setIsCustomerSearchOpen(false);
            setIsNewCustomerModalOpen(true);
          }}
        />
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <POSCustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setIsNewCustomerModalOpen(false);
            showToast(`Cliente "${cust.name}" cadastrado e selecionado.`);
          }}
        />
      )}

      {/* Budget Modal (Proposals) */}
      {isBudgetModalOpen && (
        <POSBudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          initialBudget={null}
          initialItems={cart}
          initialDiscount={discountAmount}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          onBudgetSaved={() => {
            setIsBudgetModalOpen(false);
            setCart([]);
            showToast('Orçamento gerado e salvo com sucesso!');
          }}
          companySettings={companySettings}
        />
      )}

      {/* Receipt Modal (Thermal 58mm/80mm / A4 PDF Download) */}
      {isReceiptModalOpen && lastCompletedSale && (
        <POSReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setLastCompletedSale(null);
            searchInputRef.current?.focus();
          }}
          sale={lastCompletedSale}
          productionOrders={lastProdOrders}
          companySettings={companySettings}
        />
      )}

      {/* Open Cash Modal */}
      {isOpenCashModalOpen && (
        <OpenCashModal
          isOpen={isOpenCashModalOpen}
          onClose={() => setIsOpenCashModalOpen(false)}
          onCashOpened={() => {
            setIsOpenCashModalOpen(false);
            refreshCashSession();
            showToast('Caixa aberto com sucesso!');
          }}
          onSuccess={() => {
            setIsOpenCashModalOpen(false);
            refreshCashSession();
            showToast('Caixa aberto com sucesso!');
          }}
        />
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {isShortcutsModalOpen && (
        <Modal
          id="pos-shortcuts-modal"
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
          title="Atalhos de Teclado — PDV Fácil"
          subtitle="Agilize as operações no balcão utilizando o teclado"
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="divide-y divide-slate-100">
              {[
                { key: '/', desc: 'Focar na barra de pesquisa de produtos' },
                { key: '1 ou F1', desc: 'Selecionar pagamento via PIX' },
                { key: '2 ou F2', desc: 'Selecionar Cartão de Crédito' },
                { key: '3 ou F3', desc: 'Selecionar Cartão de Débito' },
                { key: '4 ou F4', desc: 'Selecionar pagamento em Dinheiro' },
                { key: 'F7', desc: 'Buscar ou identificar cliente' },
                { key: 'F8', desc: 'Aplicar desconto comercial' },
                { key: 'F9', desc: 'Limpar carrinho / cancelar venda atual' },
                { key: 'F12', desc: 'Finalizar venda e emitir recibo' },
                { key: 'ESC', desc: 'Fechar pesquisa ou limpar campos' },
              ].map((sc, i) => (
                <div key={i} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{sc.desc}</span>
                  <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 text-blue-700 border border-slate-200 rounded">
                    {sc.key}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

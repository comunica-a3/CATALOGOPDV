import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Layers,
  Minus,
  Package,
  Percent,
  Plus,
  PlusCircle,
  Search,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  Budget,
  CartItem,
  Category,
  CompanySettings,
  Customer,
  Item,
  ItemType,
  ProductPackage,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CustomItemModal } from '../budgets/CustomItemModal';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';
import { CustomerSearchModal } from '../customers/CustomerSearchModal';
import { ComplementarySuggestionsBar } from '../prospecting/ComplementarySuggestionsBar';
import { PackagePickerModal } from '../prospecting/PackagePickerModal';
import { POSCustomerModal } from './POSCustomerModal';

interface POSBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBudget?: Budget | null;
  initialItems?: CartItem[];
  cartItems?: CartItem[];
  subtotal?: number;
  initialDiscount?: number;
  initialNotes?: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onBudgetSaved?: (budget?: Budget) => void;
  onBudgetCreated?: (budget: Budget) => void;
  onBudgetUpdated?: (budget: Budget) => void;
  companySettings: CompanySettings;
}

export const POSBudgetModal: React.FC<POSBudgetModalProps> = ({
  isOpen,
  onClose,
  initialBudget,
  initialItems,
  cartItems,
  subtotal: _subtotal,
  initialDiscount,
  initialNotes,
  selectedCustomer: propCustomer,
  onSelectCustomer,
  onBudgetSaved,
  onBudgetCreated,
  onBudgetUpdated,
  companySettings,
}) => {
  const { currentUser } = useAuth();

  // Budget Items State
  const [budgetItems, setBudgetItems] = useState<CartItem[]>([]);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerDocument, setCustomerDocument] = useState<string>('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);

  // Catalog Items for Quick Add
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('ALL');

  // Budget Settings State
  const [validUntilDays, setValidUntilDays] = useState<number>(15);
  const [customValidDate, setCustomValidDate] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [paymentConditions, setPaymentConditions] = useState<string>(
    '50% de entrada e 50% na retirada do material'
  );
  const [productionLeadTime, setProductionLeadTime] = useState<string>('2 a 3 dias úteis');
  const [notes, setNotes] = useState<string>('');

  // Modals inside Budget
  const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isPackagePickerModalOpen, setIsPackagePickerModalOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState<CartItem | null>(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize and load customers / catalog
  useEffect(() => {
    if (isOpen) {
      const allCust = StorageService.getCustomers();
      const allItems = StorageService.getItems();
      const allCats = StorageService.getCategories();
      setCustomersList(allCust);
      setCatalogItems(allItems);
      setCategories(allCats);
      setErrorMessage('');

      if (initialBudget) {
        // Editing existing budget
        setBudgetItems(initialBudget.items ? [...initialBudget.items] : []);
        setSelectedCustomerId(initialBudget.customerId || '');
        setCustomerName(initialBudget.customerName || '');
        setCustomerPhone(initialBudget.customerPhone || '');
        setCustomerDocument(initialBudget.customerDocument || '');
        setDiscount(initialBudget.discount || 0);
        setNotes(initialBudget.notes || '');
        setPaymentConditions(
          initialBudget.paymentConditions || '50% de entrada e 50% na retirada do material'
        );
        setProductionLeadTime(initialBudget.productionLeadTime || '2 a 3 dias úteis');
        if (initialBudget.validUntil) {
          const diffDays = Math.round(
            (new Date(initialBudget.validUntil).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );
          setValidUntilDays(Math.max(1, diffDays));
          setCustomValidDate(initialBudget.validUntil.split('T')[0]);
        }
      } else {
        // New budget - capture cart items and discounts passed from PDV
        const sourceItems = initialItems || cartItems || [];
        setBudgetItems(sourceItems.length > 0 ? sourceItems.map((i) => ({ ...i })) : []);
        if (propCustomer) {
          setSelectedCustomerId(propCustomer.id);
          setCustomerName(propCustomer.name);
          setCustomerPhone(propCustomer.phone || '');
          setCustomerDocument(propCustomer.document || '');
        } else {
          setSelectedCustomerId('');
          setCustomerName('');
          setCustomerPhone('');
          setCustomerDocument('');
        }
        setDiscount(initialDiscount || 0);
        setNotes(initialNotes || '');
        setPaymentConditions('50% de entrada e 50% na retirada do material');
        setProductionLeadTime('2 a 3 dias úteis');
        setValidUntilDays(15);
      }
    }
  }, [isOpen, initialBudget, initialItems, cartItems, initialDiscount, initialNotes, propCustomer]);

  // Derived Calculations
  const calculatedSubtotal = useMemo(() => {
    return budgetItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [budgetItems]);

  const calculatedTotalCost = useMemo(() => {
    return budgetItems.reduce((acc, item) => acc + (item.totalCost || 0), 0);
  }, [budgetItems]);

  const hasThirdParty = useMemo(() => {
    return budgetItems.some(
      (ci) =>
        ci.item?.productionType === 'PRODUCAO_TERCEIRIZADA' ||
        (ci.item as any)?.production_type === 'PRODUCAO_TERCEIRIZADA' ||
        (Number(ci.item?.supplierFreight) > 0)
    );
  }, [budgetItems]);

  const freightAmount = useMemo(() => {
    if (!hasThirdParty) return 0;
    const adminFreight =
      Number(companySettings?.defaultSupplierFreight) ||
      Number(StorageService.getCompanySettings()?.defaultSupplierFreight) ||
      20.0;
    return adminFreight > 0 ? adminFreight : 0;
  }, [hasThirdParty, companySettings]);

  const finalTotal = useMemo(() => {
    return Math.max(0, Number((calculatedSubtotal + freightAmount - discount).toFixed(2)));
  }, [calculatedSubtotal, freightAmount, discount]);

  // Filter catalog items for adding to budget
  const filteredCatalogItems = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    return catalogItems
      .filter((it) => {
        if (!it.active) return false;
        if (selectedCatalogCategory !== 'ALL' && it.categoryId !== selectedCatalogCategory) {
          return false;
        }
        if (!term) return true;
        return (
          (it.name || '').toLowerCase().includes(term) ||
          (it.code ? it.code.toLowerCase().includes(term) : false) ||
          (it.sku ? it.sku.toLowerCase().includes(term) : false) ||
          (it.description ? it.description.toLowerCase().includes(term) : false)
        );
      })
      .slice(0, 8);
  }, [catalogItems, catalogSearch, selectedCatalogCategory]);

  // Quick Add Catalog Item to Budget
  const handleAddCatalogItem = (item: Item) => {
    setBudgetItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.item.id === item.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        const curr = next[existingIdx];
        const newQty = curr.quantity + 1;
        next[existingIdx] = {
          ...curr,
          quantity: newQty,
          totalPrice: Number((curr.unitPrice * newQty).toFixed(2)),
          totalCost: Number((curr.unitCost * newQty).toFixed(2)),
        };
        return next;
      }

      const unitPrice = item.salePrice || 0;
      const unitCost = item.costPrice || 0;
      const newCartItem: CartItem = {
        cartItemId: `BGT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    setCatalogSearch('');
  };

  // Item modifications inside budget
  const handleUpdateItemQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setBudgetItems((prev) =>
      prev.map((it) => {
        if (it.cartItemId === cartItemId) {
          const qty = Math.max(1, newQty);
          return {
            ...it,
            quantity: qty,
            totalPrice: Number((it.unitPrice * qty).toFixed(2)),
            totalCost: Number((it.unitCost * qty).toFixed(2)),
          };
        }
        return it;
      })
    );
  };

  const handleUpdateItemUnitPrice = (cartItemId: string, newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setBudgetItems((prev) =>
      prev.map((it) => {
        if (it.cartItemId === cartItemId) {
          return {
            ...it,
            unitPrice: safePrice,
            totalPrice: Number((safePrice * it.quantity).toFixed(2)),
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setBudgetItems((prev) => prev.filter((it) => it.cartItemId !== cartItemId));
  };

  const handleSaveCustomItem = (customCartItem: CartItem) => {
    setBudgetItems((prev) => {
      const exists = prev.findIndex((i) => i.cartItemId === customCartItem.cartItemId);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = customCartItem;
        return next;
      }
      return [...prev, customCartItem];
    });
    setIsCustomItemModalOpen(false);
    setEditingCustomItem(null);
  };

  const handleSelectPackage = (pkg: ProductPackage, convertedCartItems: CartItem[]) => {
    setBudgetItems((prev) => [...prev, ...convertedCartItems]);
  };

  // Customer selection
  const handleCustomerSelect = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || '');
    setCustomerDocument(cust.document || '');
    onSelectCustomer(cust);
    setIsCustomerSearchModalOpen(false);
  };

  // Save / Update Budget Handler
  const handleSaveBudget = async () => {
    if (!budgetItems.length) {
      setErrorMessage('Adicione pelo menos um item ao orçamento.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Informe o nome do cliente ou selecione um cliente cadastrado.');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    try {
      const currentSeller = currentUser || {
        id: 'geral',
        name: 'Vendedor',
        email: 'vendas@loja.com',
        role: 'VENDEDOR',
        active: true,
      };

      // Customer object if matched
      let matchedCust = customersList.find((c) => c.id === selectedCustomerId);
      if (!matchedCust && customerName.trim()) {
        matchedCust = {
          id: selectedCustomerId || `CUST-TMP-${Date.now()}`,
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
          document: customerDocument.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
      }

      if (initialBudget) {
        // UPDATE existing budget
        const updated = StorageService.updateBudget(initialBudget.id, {
          customerId: matchedCust?.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          customerDocument: customerDocument.trim() || undefined,
          items: budgetItems,
          freight: freightAmount,
          shippingCost: freightAmount,
          addition: freightAmount,
          discount,
          notes,
          paymentConditions,
          productionLeadTime,
          validUntil: customValidDate
            ? new Date(`${customValidDate}T23:59:59`).toISOString()
            : new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (updated && onBudgetUpdated) {
          onBudgetUpdated(updated);
        } else if (onBudgetSaved) {
          onBudgetSaved(updated || initialBudget);
        }
      } else {
        // CREATE new budget
        const newBudget = StorageService.createBudget({
          seller: currentSeller,
          customer: matchedCust,
          cartItems: budgetItems,
          freight: freightAmount,
          discount,
          validUntilDays,
          notes,
          paymentConditions,
          productionLeadTime,
        });
        if (onBudgetCreated) {
          onBudgetCreated(newBudget);
        } else if (onBudgetSaved) {
          onBudgetSaved(newBudget);
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err);
      setErrorMessage(err?.message || 'Erro ao salvar o orçamento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      id="pos-budget-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={initialBudget ? `Editar Orçamento #${initialBudget.budgetNumber}` : 'Novo Orçamento Comercial'}
      subtitle="Elabore propostas completas de produtos, impressos e serviços para seus clientes"
      maxWidth="3xl"
    >
      <div className="space-y-5 text-xs text-slate-800">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage('')} className="p-1 text-rose-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. SEÇÃO DO CLIENTE */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              Dados do Cliente
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCustomerSearchModalOpen(true)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-slate-300 hover:border-blue-300 transition-colors cursor-pointer"
              >
                Buscar Cliente Cadastrado
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                + Novo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Nome do Cliente <strong className="text-rose-500">*</strong>:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: João da Silva / Empresa X"
                className="w-full px-3 py-2 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">WhatsApp / Telefone:</label>
              <PhoneInput
                id="budget-customer-phone"
                value={customerPhone}
                onChange={(masked) => setCustomerPhone(masked)}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF / CNPJ (Opcional):</label>
              <input
                type="text"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. SEÇÃO DE ITENS DO ORÇAMENTO */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Itens da Proposta ({budgetItems.length})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPackagePickerModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Adicionar Pacote / Kit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCustomItem(null);
                  setIsCustomItemModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Item Personalizado</span>
              </button>
            </div>
          </div>

          {/* Quick Catalog Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="🔍 Buscar produto ou serviço do catálogo para adicionar..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none shadow-2xs"
            />

            {/* Matching Catalog Dropdown */}
            {catalogSearch.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredCatalogItems.length > 0 ? (
                  filteredCatalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddCatalogItem(item)}
                      className="p-2.5 hover:bg-blue-50/80 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          {item.code && <span>Cód: {item.code}</span>}
                          <span>Preço padrão: {formatCurrency(item.salePrice)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-md shadow-2xs"
                      >
                        + Adicionar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    Nenhum item do catálogo encontrado com "{catalogSearch}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table of Added Budget Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            {budgetItems.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item / Descrição</th>
                    <th className="py-2.5 px-2 text-center w-24">Qtd</th>
                    <th className="py-2.5 px-2 text-right w-28">Preço Unit (R$)</th>
                    <th className="py-2.5 px-3 text-right w-28">Total</th>
                    <th className="py-2.5 px-2 text-center w-12">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetItems.map((cartItem) => (
                    <tr key={cartItem.cartItemId} className="hover:bg-slate-50/60">
                      {/* Name & Config */}
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{cartItem.item.name}</p>
                        {cartItem.configuration?.variantName && (
                          <span className="text-[10px] text-blue-600 block">
                            Var: {cartItem.configuration.variantName}
                          </span>
                        )}
                        {cartItem.configuration?.calculatedAreaM2 && (
                          <span className="text-[10px] text-slate-500 block">
                            Medida: {cartItem.configuration.width}x{cartItem.configuration.height}m (
                            {cartItem.configuration.calculatedAreaM2}m²)
                          </span>
                        )}
                        {cartItem.configuration?.notes && (
                          <span className="text-[10px] text-slate-500 italic block">
                            Obs: {cartItem.configuration.notes}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded-md bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemQuantity(cartItem.cartItemId, cartItem.quantity - 1)
                            }
                            className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={cartItem.quantity}
                            onChange={(e) =>
                              handleUpdateItemQuantity(cartItem.cartItemId, parseInt(e.target.value) || 1)
                            }
                            className="w-8 text-center font-bold text-xs py-0.5 border-x border-slate-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemQuantity(cartItem.cartItemId, cartItem.quantity + 1)
                            }
                            className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cartItem.unitPrice}
                          onChange={(e) =>
                            handleUpdateItemUnitPrice(cartItem.cartItemId, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 text-right font-bold text-xs px-1.5 py-1 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(cartItem.totalPrice)}
                      </td>

                      {/* Remove */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(cartItem.cartItemId)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remover Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-xs text-slate-600">Nenhum item adicionado ao orçamento</p>
                <p className="text-[11px] text-slate-400">
                  Adicione produtos do catálogo ou crie um item personalizado acima.
                </p>
              </div>
            )}
          </div>

          {/* Complementary Suggestions / Upsell Bar */}
          <ComplementarySuggestionsBar
            cartItems={budgetItems}
            onAddSuggestedItem={(item) => {
              handleAddCatalogItem(item);
            }}
          />
        </div>

        {/* 3. CONDIÇÕES COMERCIAIS & TOTAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Terms & Notes */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight block">
              Condições da Proposta
            </span>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Validade da Proposta:
              </label>
              <div className="flex items-center gap-2">
                {[3, 7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      setValidUntilDays(days);
                      setCustomValidDate('');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                      validUntilDays === days && !customValidDate
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Condições de Pagamento:
              </label>
              <input
                type="text"
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="Ex: 50% na entrada e 50% na entrega"
                className="w-full px-2.5 py-1.5 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Prazo de Produção:</label>
              <input
                type="text"
                value={productionLeadTime}
                onChange={(e) => setProductionLeadTime(e.target.value)}
                placeholder="Ex: 2 a 3 dias úteis após aprovação da arte"
                className="w-full px-2.5 py-1.5 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Observações Gerais:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observações complementares que constarão no orçamento impresso..."
                className="w-full px-2.5 py-1.5 bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight block">
                Resumo Financeiro
              </span>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Subtotal dos Itens:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(calculatedSubtotal + freightAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Desconto Comercial (R$):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={(calculatedSubtotal + freightAmount).toString()}
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-24 text-right font-bold text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total do Orçamento</span>
                <span className="text-2xl font-black text-blue-700">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveBudget}
            disabled={isSaving || budgetItems.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : initialBudget ? 'Atualizar Orçamento' : 'Salvar e Gerar Proposta'}</span>
          </button>
        </div>
      </div>

      {/* Customer Search Modal */}
      {isCustomerSearchModalOpen && (
        <CustomerSearchModal
          isOpen={isCustomerSearchModalOpen}
          onClose={() => setIsCustomerSearchModalOpen(false)}
          onSelectCustomer={handleCustomerSelect}
          onNewCustomer={() => {
            setIsCustomerSearchModalOpen(false);
            setIsNewCustomerModalOpen(true);
          }}
        />
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <POSCustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          onSelectCustomer={handleCustomerSelect}
        />
      )}

      {/* Custom Item Modal */}
      {isCustomItemModalOpen && (
        <CustomItemModal
          isOpen={isCustomItemModalOpen}
          onClose={() => {
            setIsCustomItemModalOpen(false);
            setEditingCustomItem(null);
          }}
          onSave={handleSaveCustomItem}
          initialItem={editingCustomItem}
        />
      )}

      {/* Package Picker Modal */}
      <PackagePickerModal
        isOpen={isPackagePickerModalOpen}
        onClose={() => setIsPackagePickerModalOpen(false)}
        onSelectPackage={handleSelectPackage}
      />
    </Modal>
  );
};

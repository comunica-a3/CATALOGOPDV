import {
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Edit,
  ExternalLink,
  FileCode,
  FileEdit,
  FilePlus,
  FileText,
  Globe,
  Layers,
  LayoutTemplate,
  Minus,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Zap,
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
  DocumentTemplate,
  Item,
  OnlineService,
  ProductionOrder,
  ProductSeparation,
  Sale,
} from '../../types';
import {
  compileDocumentTemplate,
  formatDocumentToHtml,
  printDocumentContent,
} from '../../utils/documentGenerator';
import { formatCurrency } from '../../utils/formatters';
import { getCustomerFacingPresentation } from '../../utils/freightUtils';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ProductImage } from '../common/ProductImage';
import { CustomerSearchModal } from '../customers/CustomerSearchModal';
import { CustomItemModal } from '../budgets/CustomItemModal';
import { POSBudgetModal } from './POSBudgetModal';
import { POSCheckoutModal } from './POSCheckoutModal';
import { POSCustomerModal } from './POSCustomerModal';
import { POSItemConfigModal } from './POSItemConfigModal';
import { POSReceiptModal } from './POSReceiptModal';
import { getSeparationIcon } from '../items/ProductSeparationManagerModal';

interface POSViewProps {
  categories: Category[];
  items: Item[];
  companySettings: CompanySettings;
  onSaleCreated: () => void;
  onNavigate?: (view: string) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  categories,
  items,
  companySettings,
  onSaleCreated,
  onNavigate,
}) => {
  const { currentUser } = useAuth();

  // View Modes in Catalog column: category separation id, 'PRODUCTS', 'GRAPHICS', 'SERVICES', 'DOCS'
  const [posMode, setPosMode] = useState<string>('PRODUTO_FISICO');
  const [productSeparations, setProductSeparations] = useState<ProductSeparation[]>(() =>
    StorageService.getProductSeparations()
  );

  useEffect(() => {
    const handleSeps = () => {
      setProductSeparations(StorageService.getProductSeparations());
    };
    window.addEventListener('product-separations-updated', handleSeps);
    return () => window.removeEventListener('product-separations-updated', handleSeps);
  }, []);

  const resolveTargetType = (mode: string): string => {
    if (mode === 'PRODUCTS') return 'PRODUTO_FISICO';
    if (mode === 'GRAPHICS') return 'PRODUTO_GRAFICO';
    if (mode === 'SERVICES') return 'SERVICO';
    return mode;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('TODOS');

  // Services & Document Templates Data
  const [onlineServices, setOnlineServices] = useState<OnlineService[]>(() => StorageService.getOnlineServices());
  const [docTemplates, setDocTemplates] = useState<DocumentTemplate[]>(() => StorageService.getDocumentTemplates());
  const [selectedDocTemplate, setSelectedDocTemplate] = useState<DocumentTemplate | null>(null);
  const [docFormData, setDocFormData] = useState<Record<string, string>>({});
  const [docPreviewContent, setDocPreviewContent] = useState<string>('');
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [isDocEditing, setIsDocEditing] = useState<boolean>(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals
  const [configItem, setConfigItem] = useState<Item | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isIdentifyCustomerOpen, setIsIdentifyCustomerOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [lastProdOrders, setLastProdOrders] = useState<ProductionOrder[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Filter Active Items for sale
  const activeItems = useMemo(() => {
    return items.filter((i) => i.active !== false);
  }, [items]);

  // Unified Service Items (combining catalog items of type SERVICO with any existing online services)
  const allServiceItems = useMemo(() => {
    const serviceItems = activeItems.filter((i) => i.type === 'SERVICO');
    const existingNames = new Set(serviceItems.map((i) => i.name.toLowerCase().trim()));
    const existingIds = new Set(serviceItems.map((i) => i.id));

    const extraItems: Item[] = [];
    for (const svc of onlineServices) {
      const itemId = `prod-srv-${svc.id.replace('srv-', '')}`;
      if (!existingIds.has(itemId) && !existingIds.has(svc.id) && !existingNames.has(svc.name.toLowerCase().trim())) {
        extraItems.push({
          id: itemId,
          name: svc.name,
          type: 'SERVICO',
          categoryId: 'cat-servicos',
          sku: `SRV-${svc.name.substring(0, 3).toUpperCase()}`,
          description: svc.description || 'Serviço online prestado no balcão',
          costPrice: svc.cost || 0,
          salePrice: svc.price || 15.0,
          marginReais: (svc.price || 15.0) - (svc.cost || 0),
          marginPercent: 100,
          active: svc.active !== false,
          showInCatalog: true,
          featuredInCatalog: false,
          serviceUrl: svc.url,
          url: svc.url,
          createdAt: svc.createdAt,
          updatedAt: svc.updatedAt,
        });
      }
    }
    return [...serviceItems, ...extraItems];
  }, [activeItems, onlineServices]);

  // Fast URL lookup map for services by id or name
  const onlineServiceUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of onlineServices) {
      if (s.url) {
        map.set(s.id, s.url);
        map.set(`prod-${s.id}`, s.url);
        map.set(`prod-srv-${s.id.replace('srv-', '')}`, s.url);
        map.set(s.name.toLowerCase().trim(), s.url);
      }
    }
    return map;
  }, [onlineServices]);

  const relevantCategories = useMemo(() => {
    if (posMode === 'DOCS') return [];
    const targetType = resolveTargetType(posMode);

    if (targetType === 'SERVICO') {
      const activeTypeCatIds = new Set(
        allServiceItems.map((i) => i.categoryId)
      );
      return categories.filter((c) => activeTypeCatIds.has(c.id));
    }

    const activeTypeCatIds = new Set(
      activeItems.filter((i) => i.type === targetType).map((i) => i.categoryId)
    );
    return categories.filter((c) => activeTypeCatIds.has(c.id));
  }, [categories, activeItems, allServiceItems, posMode]);

  const filteredItems = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const targetType = resolveTargetType(posMode);

    let baseList = activeItems;
    if (targetType === 'SERVICO') {
      baseList = allServiceItems;
    } else {
      baseList = activeItems.filter((item) => item.type === targetType);
    }

    return baseList.filter((item) => {
      const matchSearch =
        (item.name || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term) ||
        (item.barcode ? item.barcode.toLowerCase().includes(term) : false);

      let matchCategory = true;
      if (selectedCategoryTab === 'TODOS') {
        matchCategory = true;
      } else {
        matchCategory = item.categoryId === selectedCategoryTab;
      }

      return matchSearch && matchCategory;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id));
  }, [activeItems, allServiceItems, searchTerm, selectedCategoryTab, posMode]);

  // Filtered Online Services
  const filteredServices = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return onlineServices.filter((s) => {
      if (!s.active) return false;
      return (
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.description ? s.description.toLowerCase().includes(q) : false) ||
        (s.category ? s.category.toLowerCase().includes(q) : false)
      );
    });
  }, [onlineServices, searchTerm]);

  // Filtered Document Templates
  const filteredDocTemplates = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return docTemplates.filter((t) => {
      if (!t.active) return false;
      return (
        !q ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.description ? t.description.toLowerCase().includes(q) : false) ||
        (t.category ? t.category.toLowerCase().includes(q) : false)
      );
    });
  }, [docTemplates, searchTerm]);

  // Cart Totals
  const cartSubtotal = useMemo(() => {
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

  const cartFreight = useMemo(() => {
    if (!hasThirdParty) return 0;
    const adminFreight =
      Number(companySettings?.defaultSupplierFreight) ||
      Number(StorageService.getCompanySettings()?.defaultSupplierFreight) ||
      20.0;
    return adminFreight > 0 ? adminFreight : 0;
  }, [hasThirdParty, companySettings]);

  const cartTotal = useMemo(() => {
    return Number((cartSubtotal + cartFreight).toFixed(2));
  }, [cartSubtotal, cartFreight]);

  const presentation = useMemo(() => {
    return getCustomerFacingPresentation({
      items: cart,
      subtotal: cartSubtotal,
      freight: cartFreight,
      discount: 0,
      total: cartTotal,
    });
  }, [cart, cartSubtotal, cartFreight, cartTotal]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Handlers
  const handleItemClick = (item: Item) => {
    setConfigItem(item);
  };

  const handleAddToCart = (newItem: CartItem) => {
    setCart((prev) => [...prev, newItem]);
  };

  // Add External Online Service to Cart
  const handleAddOnlineServiceToCart = (svc: OnlineService) => {
    const price = svc.price || 15.0;
    const cartItem: CartItem = {
      cartItemId: `cart-srv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      item: {
        id: svc.id,
        name: svc.name,
        type: 'SERVICO',
        categoryId: 'cat-servicos',
        sku: `SRV-${svc.name.substring(0, 3).toUpperCase()}`,
        description: svc.description || 'Serviço online prestado no balcão',
        costPrice: 0,
        salePrice: price,
        marginReais: price,
        marginPercent: 100,
        active: true,
        showInCatalog: false,
        featuredInCatalog: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      quantity: 1,
      unitPrice: price,
      unitCost: 0,
      totalPrice: price,
      totalCost: 0,
      configuration: {
        serviceData: {
          url: svc.url,
          category: svc.category,
        },
      },
    };

    setCart((prev) => [...prev, cartItem]);
    setToastMessage(`Serviço "${svc.name}" adicionado ao pedido!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Open External Service in New Tab
  const handleOpenExternalService = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  // Quick Open Document Generator Modal inside POS
  const handleOpenDocModal = (tmpl: DocumentTemplate) => {
    setSelectedDocTemplate(tmpl);
    setIsDocEditing(false);

    // Initial form state pre-filled with selected customer
    const initialValues: Record<string, string> = {};
    tmpl.fields.forEach((f) => {
      if (selectedCustomer && f.customerFieldMapping) {
        if (f.customerFieldMapping === 'name') initialValues[f.id] = selectedCustomer.name || '';
        if (f.customerFieldMapping === 'document') initialValues[f.id] = selectedCustomer.document || '';
        if (f.customerFieldMapping === 'phone') initialValues[f.id] = selectedCustomer.phone || '';
        if (f.customerFieldMapping === 'email') initialValues[f.id] = selectedCustomer.email || '';
        if (f.customerFieldMapping === 'address') initialValues[f.id] = selectedCustomer.address || '';
        if (f.customerFieldMapping === 'city') initialValues[f.id] = `${selectedCustomer.city || ''} - ${selectedCustomer.state || ''}`.replace(/^ - | - $/g, '');
      } else {
        initialValues[f.id] = f.defaultValue || '';
      }
    });

    setDocFormData(initialValues);
    const compiled = compileDocumentTemplate(tmpl.templateBody, initialValues, tmpl.fields);
    setDocPreviewContent(compiled);
    setIsDocModalOpen(true);
  };

  const handleUpdateDocForm = (fieldId: string, val: string) => {
    const nextForm = { ...docFormData, [fieldId]: val };
    setDocFormData(nextForm);
    if (selectedDocTemplate) {
      const compiled = compileDocumentTemplate(selectedDocTemplate.templateBody, nextForm, selectedDocTemplate.fields);
      setDocPreviewContent(compiled);
    }
  };

  const handleAddDocToCart = () => {
    if (!selectedDocTemplate) return;

    const price = selectedDocTemplate.defaultPrice || 30.0;
    const docTitle = `${selectedDocTemplate.title} - ${selectedCustomer?.name || docFormData['nome_completo'] || 'Cliente'}`;

    // Also persist to history
    StorageService.addGeneratedDocument({
      templateId: selectedDocTemplate.id,
      templateTitle: selectedDocTemplate.title,
      category: selectedDocTemplate.category,
      title: docTitle,
      content: docPreviewContent,
      formData: docFormData,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || docFormData['nome_completo'] || 'Cliente',
      customerPhone: selectedCustomer?.phone || docFormData['contato_telefone'],
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      priceCharged: price,
    });

    const cartItem: CartItem = {
      cartItemId: `cart-doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      item: {
        id: selectedDocTemplate.id,
        name: `Doc: ${selectedDocTemplate.title}`,
        type: 'SERVICO',
        categoryId: 'cat-servicos',
        sku: `DOC-${selectedDocTemplate.category.substring(0, 3).toUpperCase()}`,
        description: `Elaboração e impressão: ${docTitle}`,
        costPrice: 0,
        salePrice: price,
        marginReais: price,
        marginPercent: 100,
        active: true,
        showInCatalog: false,
        featuredInCatalog: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      quantity: 1,
      unitPrice: price,
      unitCost: 0,
      totalPrice: price,
      totalCost: 0,
      configuration: {
        notes: `Documento: ${docTitle}`,
      },
    };

    setCart((prev) => [...prev, cartItem]);
    setIsDocModalOpen(false);
    setToastMessage(`Documento "${docTitle}" adicionado ao pedido!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.cartItemId === cartItemId) {
            const newQty = Math.max(1, ci.quantity + delta);
            let uPrice = ci.unitPrice;
            let uCost = ci.unitCost;

            // Recalculate price rule if item has progressive pricing
            if (ci.item.priceRules && ci.item.priceRules.length > 0) {
              const sortedRules = [...ci.item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
              const applicableTier = sortedRules.find((r) => newQty >= r.minQuantity) || sortedRules[sortedRules.length - 1];
              if (applicableTier) {
                const addPrice = ci.configuration?.additionalPrice || 0;
                uPrice = applicableTier.unitSalePrice + addPrice;
                uCost = applicableTier.unitCost;
              }
            }

            return {
              ...ci,
              quantity: newQty,
              unitPrice: uPrice,
              unitCost: uCost,
              totalPrice: Number((uPrice * newQty).toFixed(2)),
              totalCost: Number((uCost * newQty).toFixed(2)),
            };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0)
    );
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Deseja realmente limpar todo o carrinho?')) {
      setCart([]);
      setSelectedCustomer(null);
    }
  };

  const handleSaleCompleted = (sale: Sale, prodOrders: ProductionOrder[]) => {
    setCart([]);
    setSelectedCustomer(null);
    setLastCompletedSale(sale);
    setLastProdOrders(prodOrders);
    setIsReceiptOpen(true);
    onSaleCreated();
  };

  return (
    <div id="pos-main-view" className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner / Seller info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 text-slate-900 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-lg text-white shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <span>PDV</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Caixa Aberto
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Atendente: <strong className="text-slate-800">{currentUser.name}</strong>
            </p>
          </div>
        </div>

        {/* Selected Customer Quick Badge & Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {selectedCustomer ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {selectedCustomer.name}
                </p>
                <p className="text-[10px] text-slate-500">{selectedCustomer.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-rose-600 ml-1 text-xs font-bold transition-colors cursor-pointer"
                title="Desvincular cliente"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsIdentifyCustomerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="Localizar cliente cadastrado por Nome ou Telefone"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Identificar Cliente</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                title="Cadastrar um novo cliente no sistema"
              >
                <span className="hidden sm:inline">Cadastrar Novo Cliente</span>
              </button>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('pdv_facil')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Abrir PDV Fácil (otimizado para balcão rápido)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">PDV Fácil</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Catalog / Items Search (Left) + Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: ITEM SEARCH & GRID (7 cols on LG, 8 on XL) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Module Mode Selector Tabs: Produtos | Gráfica | Serviços Online | Geração de Documentos */}
          {/* Catalog Separation Selector */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
            {productSeparations.map((sep) => {
              const IconComp = getSeparationIcon(sep.icon);
              const targetType = resolveTargetType(posMode);
              const isSelected = targetType === sep.id;

              return (
                <button
                  key={sep.id}
                  type="button"
                  onClick={() => {
                    setPosMode(sep.id);
                    setSelectedCategoryTab('TODOS');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? sep.id === 'PRODUTO_GRAFICO'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : sep.id === 'SERVICO'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{sep.name}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setPosMode('DOCS');
                setSelectedCategoryTab('TODOS');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                posMode === 'DOCS'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              <span>Geração de Documentos</span>
            </button>
          </div>

          {/* Search Box & Category Filters */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="pos-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    posMode === 'DOCS'
                      ? 'Buscar modelo de documento (currículo, contrato, declaração)...'
                      : resolveTargetType(posMode) === 'SERVICO'
                      ? 'Buscar serviços, consultas, DETRAN, CPF, MEI, antecedentes...'
                      : resolveTargetType(posMode) === 'PRODUTO_GRAFICO'
                      ? 'Buscar produtos gráficos, banners, adesivos, cartões, panfletos...'
                      : 'Buscar itens, produtos, suprimentos, materiais...'
                  }
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all font-medium"
                />
              </div>

              {/* Action: + Item Personalizado Sob Demanda */}
              <button
                type="button"
                id="btn-pos-add-custom-item"
                onClick={() => setIsCustomItemModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Adicionar item exclusivo sob demanda"
              >
                <span>Adicionar Item Personalizado</span>
              </button>
            </div>

            {/* Category Filter Pills (PRODUCTS, GRAPHICS, or SERVICES mode) */}
            {posMode !== 'DOCS' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  {
                    id: 'TODOS',
                    label: 'Todos',
                  },
                  ...relevantCategories.map((c) => ({ id: c.id, label: c.name })),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategoryTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryTab === tab.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ================= MODE 1 & 2: STANDARD PRODUCTS & GRAPHICS & CUSTOM ================= */}
          {posMode !== 'DOCS' && resolveTargetType(posMode) !== 'SERVICO' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isLowStock =
                    (item.type === 'PRODUTO_FISICO' || item.stock !== undefined) &&
                    (item.stock || 0) <= (item.minStock || 5);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="group bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all p-3.5 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Image & Badges */}
                        <div className="flex items-start gap-3 mb-2.5">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.name}
                            itemType={item.type}
                            className="w-14 h-14 rounded-lg shrink-0 group-hover:scale-102 transition-transform"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {item.sku}
                              </span>
                              <Badge
                                variant={
                                  item.type === 'PRODUTO_GRAFICO'
                                    ? 'primary'
                                    : item.type === 'PRODUTO_FISICO'
                                    ? 'purple'
                                    : 'info'
                                }
                                size="sm"
                              >
                                {productSeparations.find((s) => s.id === item.type)?.name ||
                                  (item.type === 'PRODUTO_GRAFICO'
                                    ? 'Gráfico'
                                    : item.type === 'PRODUTO_FISICO'
                                    ? 'Físico'
                                    : 'Serviço')}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </h3>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer Info: Price + Stock / Model */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Preço / m²</span>
                              <span className="text-sm font-bold text-emerald-700">
                                {formatCurrency(item.areaPricing?.salePricePerM2)}/m²
                              </span>
                            </div>
                          ) : item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE' ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">A partir de</span>
                              <span className="text-sm font-bold text-emerald-700">
                                {formatCurrency(item.packages?.[0]?.salePrice || item.salePrice)}
                              </span>
                            </div>
                          ) : item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_UNIDADE' ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Faixas a partir de</span>
                              <span className="text-sm font-bold text-emerald-700">
                                {formatCurrency(item.priceRules?.[item.priceRules.length - 1]?.unitSalePrice || item.salePrice)}/un
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Preço Unitário</span>
                              <span className="text-sm font-bold text-emerald-700">
                                {formatCurrency(item.salePrice)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.type === 'PRODUTO_FISICO' && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isLowStock
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.stock || 0} un
                            </span>
                          )}

                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">
                    Nenhum item comercial encontrado nesta busca
                  </p>
                  <p className="text-xs text-slate-400">Verifique os termos ou altere a categoria.</p>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 2: SERVICES ================= */}
          {posMode !== 'DOCS' && resolveTargetType(posMode) === 'SERVICO' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const targetUrl =
                    item.serviceUrl ||
                    item.url ||
                    onlineServiceUrlMap.get(item.id) ||
                    onlineServiceUrlMap.get(item.name.toLowerCase().trim()) ||
                    '';
                  const catName = categories.find((c) => c.id === item.categoryId)?.name || 'Serviços';

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-cyan-400 shadow-xs p-3.5 flex flex-col justify-between space-y-3 transition-all"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => handleItemClick(item)}
                        title="Clique para adicionar este serviço ao pedido"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                            {catName}
                          </span>
                          <strong className="text-xs font-bold text-emerald-700">
                            {formatCurrency(item.salePrice)}
                          </strong>
                        </div>

                        <h3 className="font-bold text-xs text-slate-900 leading-snug hover:text-cyan-700 transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.estimatedTime && (
                          <span className="inline-block text-[10px] text-slate-400 mt-1">
                            Tempo estimado: {item.estimatedTime}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        {Boolean(targetUrl?.trim()) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenExternalService(targetUrl);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold rounded-lg border bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200 transition-colors cursor-pointer"
                            title={`Abrir página do serviço: ${targetUrl}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir serviço</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className={`${Boolean(targetUrl?.trim()) ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs transition-colors cursor-pointer`}
                          title="Adicionar serviço ao pedido"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Pedido</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">Nenhum serviço encontrado</p>
                  <p className="text-xs text-slate-400">Verifique os termos ou altere a categoria.</p>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 3: DOCUMENT GENERATION ================= */}
          {posMode === 'DOCS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredDocTemplates.length > 0 ? (
                filteredDocTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleOpenDocModal(tmpl)}
                    className="group bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200 hover:border-violet-400 shadow-xs p-3.5 flex flex-col justify-between space-y-3 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                          {tmpl.category}
                        </span>
                        <strong className="text-xs font-bold text-emerald-700">
                          R$ {tmpl.defaultPrice.toFixed(2).replace('.', ',')}
                        </strong>
                      </div>

                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-violet-700 transition-colors">
                        {tmpl.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tmpl.fields.length} campos
                      </span>

                      <span className="flex items-center gap-1 text-[11px] font-bold text-violet-700 group-hover:underline">
                        <span>Preencher e Gerar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <FileEdit className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">Nenhum modelo de documento encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE CART (5 cols on LG, 4 on XL) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
            {/* Cart Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Carrinho do Pedido</h2>
                  <p className="text-[10px] text-slate-500">{cart.length} item(ns) selecionado(s)</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-3">
              {cart.length > 0 ? (
                cart.map((cartItem) => (
                  <div key={cartItem.cartItemId} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            {cartItem.item.sku}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {cartItem.item.name}
                          </span>
                        </div>

                        {/* Selected Specifics */}
                        <div className="text-[11px] text-slate-600 pl-1 space-y-0.5 mt-0.5">
                          {cartItem.configuration.variantName && (
                            <p>• {cartItem.configuration.variantName}</p>
                          )}
                          {cartItem.configuration.selectedOptions && (
                            <div className="space-y-0.5">
                              {Object.entries(cartItem.configuration.selectedOptions).map(([optName, optVal]) => (
                                <p key={optName} className="text-indigo-600 font-medium">
                                  • {optName}: {optVal}
                                </p>
                              ))}
                            </div>
                          )}
                          {cartItem.configuration.packageName && (
                            <p>• {cartItem.configuration.packageName}</p>
                          )}
                          {cartItem.configuration.calculatedAreaM2 && (
                            <p>
                              • Medida: {cartItem.configuration.width}x{cartItem.configuration.height}
                              {cartItem.configuration.dimensionUnit} ({cartItem.configuration.calculatedAreaM2}m²)
                            </p>
                          )}
                          {cartItem.configuration.notes && (
                            <p className="text-slate-500 italic truncate">
                              • {cartItem.configuration.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(cartItem.cartItemId)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(cartItem.cartItemId, -1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(cartItem.cartItemId, 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">
                          {formatCurrency(
                            presentation.presentedItems[cart.indexOf(cartItem)]?.displayedTotalPrice ??
                              cartItem.totalPrice
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatCurrency(
                            presentation.presentedItems[cart.indexOf(cartItem)]?.displayedUnitPrice ??
                              cartItem.unitPrice
                          )}{' '}
                          un
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold text-slate-700">Carrinho Vazio</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto mt-1">
                    Selecione produtos, serviços online ou modelos de documentos para iniciar a venda.
                  </p>
                </div>
              )}
            </div>

            {/* Cart Footer Summary & Action Buttons */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-slate-600 text-xs">
                  <span>Subtotal ({totalCartCount} itens)</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(presentation.presentedSubtotal)}
                  </span>
                </div>

                {!presentation.hideFreightLine && presentation.presentedFreight > 0 && (
                  <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
                    <span className="flex items-center gap-1">Frete</span>
                    <span className="font-bold text-slate-800">
                      +{formatCurrency(presentation.presentedFreight)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-900 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">Total Geral</span>
                    <span className="text-[10px] text-slate-500">
                      Sem taxas adicionais
                    </span>
                  </div>
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                {/* Main Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Budget Button */}
                  <button
                    type="button"
                    id="btn-pos-budget"
                    onClick={() => setIsBudgetModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <span>Orçamento</span>
                  </button>

                  {/* Final Checkout Button */}
                  <button
                    type="button"
                    id="btn-pos-checkout"
                    onClick={() => setIsCheckoutOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Finalizar Venda</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Configuration Modal (Quantity, M2, Packages, Variants) */}
      {configItem && (
        <POSItemConfigModal
          isOpen={!!configItem}
          onClose={() => setConfigItem(null)}
          item={configItem}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Checkout Payment Modal */}
      {isCheckoutOpen && (
        <POSCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cartItems={cart}
          subtotal={cartSubtotal}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          companySettings={companySettings}
          onSaleCompleted={handleSaleCompleted}
        />
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <POSBudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          cartItems={cart}
          subtotal={cartSubtotal}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          companySettings={companySettings}
          onBudgetSaved={(budget) => {
            const num = budget?.budgetNumber ? ` #${budget.budgetNumber}` : '';
            setToastMessage(`Orçamento${num} gerado com sucesso!`);
            setCart([]);
            setSelectedCustomer(null);
            setIsBudgetModalOpen(false);
            setTimeout(() => setToastMessage(''), 4000);
          }}
          onBudgetCreated={(budget) => {
            const num = budget?.budgetNumber ? ` #${budget.budgetNumber}` : '';
            setToastMessage(`Orçamento${num} gerado com sucesso!`);
            setCart([]);
            setSelectedCustomer(null);
            setIsBudgetModalOpen(false);
            setTimeout(() => setToastMessage(''), 4000);
          }}
        />
      )}

      {/* Customer Identification (Search Only) Modal */}
      {isIdentifyCustomerOpen && (
        <CustomerSearchModal
          isOpen={isIdentifyCustomerOpen}
          onClose={() => setIsIdentifyCustomerOpen(false)}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setIsIdentifyCustomerOpen(false);
            setToastMessage(`Cliente "${cust.name}" identificado e vinculado com sucesso!`);
            setTimeout(() => setToastMessage(''), 2500);
          }}
          onRequestNewCustomer={() => {
            setIsIdentifyCustomerOpen(false);
            setIsNewCustomerModalOpen(true);
          }}
        />
      )}

      {/* Customer Registration (New Customer) Modal */}
      {isNewCustomerModalOpen && (
        <POSCustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          onSelectCustomer={(cust) => {
            setSelectedCustomer(cust);
            setIsNewCustomerModalOpen(false);
            setToastMessage(`Cliente "${cust.name}" cadastrado e vinculado!`);
            setTimeout(() => setToastMessage(''), 2500);
          }}
          onCustomerCreated={(cust) => {
            setSelectedCustomer(cust);
            setIsNewCustomerModalOpen(false);
            setToastMessage(`Cliente "${cust.name}" cadastrado com sucesso!`);
            setTimeout(() => setToastMessage(''), 2500);
          }}
        />
      )}

      {/* Print Receipt Modal (Post Sale) */}
      {isReceiptOpen && lastCompletedSale && (
        <POSReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={lastCompletedSale}
          productionOrders={lastProdOrders}
          companySettings={companySettings}
        />
      )}

      {/* Fast In-POS Document Generation Modal */}
      {isDocModalOpen && selectedDocTemplate && (
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title={`Gerar ${selectedDocTemplate.title}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <span className="text-slate-500">
                Preço do serviço: <strong className="text-emerald-700 font-bold">R$ {selectedDocTemplate.defaultPrice.toFixed(2).replace('.', ',')}</strong>
              </span>
              {selectedCustomer && (
                <span className="text-violet-700 font-semibold">
                  Cliente vinculado: {selectedCustomer.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Form Fields */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Preenchimento dos Campos
                </h4>
                {selectedDocTemplate.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={docFormData[field.id] || ''}
                        onChange={(e) => handleUpdateDocForm(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-hidden"
                      />
                    ) : (
                      <input
                        type="text"
                        value={docFormData[field.id] || ''}
                        onChange={(e) => handleUpdateDocForm(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Live Preview */}
              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pré-visualização do Documento
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsDocEditing(!isDocEditing)}
                    className="text-[11px] text-violet-700 font-semibold hover:underline"
                  >
                    {isDocEditing ? 'Visualizar Página' : 'Editar Texto Diretamente'}
                  </button>
                </div>

                {isDocEditing ? (
                  <textarea
                    rows={16}
                    value={docPreviewContent}
                    onChange={(e) => setDocPreviewContent(e.target.value)}
                    className="flex-1 w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 leading-relaxed"
                  />
                ) : (
                  <div
                    className="flex-1 p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed max-h-[420px] overflow-y-auto font-serif"
                    dangerouslySetInnerHTML={{
                      __html: formatDocumentToHtml(docPreviewContent, selectedDocTemplate.title),
                    }}
                  />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const html = formatDocumentToHtml(docPreviewContent, selectedDocTemplate.title);
                  printDocumentContent(selectedDocTemplate.title, html);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Agora</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleAddDocToCart}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar ao Pedido (R$ {selectedDocTemplate.defaultPrice.toFixed(2).replace('.', ',')})</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {/* Custom Item Modal */}
      {isCustomItemModalOpen && (
        <CustomItemModal
          isOpen={isCustomItemModalOpen}
          onClose={() => setIsCustomItemModalOpen(false)}
          onSave={(customCartItem) => {
            handleAddToCart(customCartItem);
            setToastMessage(`Item personalizado "${customCartItem.item.name}" adicionado ao pedido!`);
            setTimeout(() => setToastMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
};

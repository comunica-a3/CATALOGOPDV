import {
  ArrowRight,
  ArrowUpDown,
  Boxes,
  Check,
  ChevronRight,
  ExternalLink,
  Filter,
  Layers,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Wrench,
  X,
  Edit2,
  Settings,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Category, CompanySettings, Item, ProductNicheCard, VitrineCartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { getItemTypeLabel } from '../../utils/commissions';
import { Badge } from '../common/Badge';
import { BrandLogo } from '../common/BrandLogo';
import { ProductImage } from '../common/ProductImage';
import { CatalogCartModal } from './CatalogCartModal';
import { CatalogItemModal } from './CatalogItemModal';
import { NicheManagerModal } from './NicheManagerModal';

export type ProductNicheId = string;
export type ProductNicheCardInfo = ProductNicheCard;

export const PRODUCT_NICHES: ProductNicheCard[] = StorageService.getCatalogNiches();

/**
 * Associa dinamicamente um item a um nicho cadastrado no sistema
 */
export function getItemNiche(item: Item, nichesList?: ProductNicheCard[]): string | null {
  const niches = nichesList || StorageService.getCatalogNiches();

  // 1. Nicho explicitamente cadastrado no item
  if (item.niche) {
    const raw = item.niche.toLowerCase().trim();
    const exact = niches.find(
      (n) => n.id.toLowerCase() === raw || n.title.toLowerCase() === raw
    );
    if (exact) return exact.id;

    const partial = niches.find(
      (n) =>
        raw.includes(n.id.toLowerCase()) ||
        raw.includes(n.title.toLowerCase()) ||
        n.categoryMatchKeywords?.some((kw) => raw.includes(kw.toLowerCase()))
    );
    if (partial) return partial.id;
  }

  // Obter separações conhecidas para suporte a correspondência por id ou nome
  const knownSeparations = StorageService.getProductSeparations();
  const currentItemSep = knownSeparations.find(
    (s) => s.id === item.type || s.name.toLowerCase() === item.type?.toLowerCase()
  );

  // 2. Classificação pelo Tipo/Separação de Item configurado no Nicho
  const matchedByType = niches.find((n) => {
    if (!n.itemTypeMatch || n.itemTypeMatch === 'ALL') return false;
    // Correspondência direta por ID ou valor
    if (n.itemTypeMatch === item.type) return true;
    if (item.type && n.itemTypeMatch.toLowerCase() === item.type.toLowerCase()) return true;
    // Correspondência cruzada por separação (ID x Nome)
    if (currentItemSep) {
      if (
        n.itemTypeMatch === currentItemSep.id ||
        n.itemTypeMatch.toLowerCase() === currentItemSep.name.toLowerCase()
      ) {
        return true;
      }
    }
    const nicheSep = knownSeparations.find(
      (s) => s.id === n.itemTypeMatch || s.name.toLowerCase() === n.itemTypeMatch.toLowerCase()
    );
    if (
      nicheSep &&
      (nicheSep.id === item.type || nicheSep.name.toLowerCase() === item.type?.toLowerCase())
    ) {
      return true;
    }
    return false;
  });

  if (matchedByType) {
    return matchedByType.id;
  }

  // 3. Fallback inteligente pelos tipos padrões do sistema
  if (item.type === 'PRODUTO_GRAFICO') {
    const graf = niches.find(
      (n) =>
        n.id === 'grafica-e-personalizados' ||
        n.title.toLowerCase().includes('grafic') ||
        n.title.toLowerCase().includes('personalizad')
    );
    if (graf) return graf.id;
  }
  if (item.type === 'PRODUTO_FISICO') {
    const elet = niches.find(
      (n) =>
        n.id === 'produtos-eletronicos' ||
        n.title.toLowerCase().includes('eletron') ||
        n.title.toLowerCase().includes('acessorio')
    );
    if (elet) return elet.id;
  }
  if (item.type === 'SERVICO') {
    const serv = niches.find(
      (n) =>
        n.id === 'servicos-digitais' ||
        n.title.toLowerCase().includes('digital') ||
        n.title.toLowerCase().includes('servico')
    );
    if (serv) return serv.id;
  }

  // 4. Fallback por nome da separação customizada no título do nicho
  if (currentItemSep) {
    const matchedBySepTitle = niches.find((n) =>
      n.title.toLowerCase().includes(currentItemSep.name.toLowerCase())
    );
    if (matchedBySepTitle) return matchedBySepTitle.id;
  }

  // 4. Verificação por categoria e palavras-chave
  const searchCorpus = `${item.name} ${item.description || ''} ${item.categoryId || ''}`.toLowerCase();
  for (const niche of niches) {
    if (niche.categoryMatchKeywords && niche.categoryMatchKeywords.length > 0) {
      const match = niche.categoryMatchKeywords.some((kw) =>
        searchCorpus.includes(kw.toLowerCase().trim())
      );
      if (match) return niche.id;
    }
  }

  return null;
}

interface PublicCatalogViewProps {
  items: Item[];
  categories: Category[];
  companySettings: CompanySettings;
  onOpenManagement?: () => void;
  isStandalone?: boolean;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  items,
  categories,
  companySettings,
  onOpenManagement,
  isStandalone = false,
}) => {
  const { isAdmin } = useAuth();
  const [niches, setNiches] = useState<ProductNicheCard[]>(() =>
    StorageService.getCatalogNiches()
  );
  const [isNicheManagerOpen, setIsNicheManagerOpen] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'name_asc'>('featured');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Carrinho da Vitrine (persistente via localStorage sem exigir login)
  const CART_STORAGE_KEY = 'vitrine_shopping_cart';

  const [cartItems, setCartItems] = useState<VitrineCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('Erro ao ler carrinho da vitrine no localStorage:', err);
    }
    return [];
  });

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [addedItemFeedbackId, setAddedItemFeedbackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Erro ao salvar carrinho da vitrine no localStorage:', err);
    }
  }, [cartItems]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((acc, ci) => acc + ci.quantity, 0);
  }, [cartItems]);

  const totalCartAmount = useMemo(() => {
    return cartItems.reduce((acc, ci) => acc + ci.unitPrice * ci.quantity, 0);
  }, [cartItems]);

  const handleAddToCart = (item: Item, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const isM2 = item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2';
    const isPackage = item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE';

    let unitPrice = item.salePrice;
    let labelDisplay = item.name;
    let dimensions: VitrineCartItem['dimensions'] = undefined;
    let packageName: string | undefined = undefined;

    if (isM2) {
      const areaPrice = item.areaPricing?.salePricePerM2 || item.salePrice;
      unitPrice = Number(areaPrice.toFixed(2));
      labelDisplay = `${item.name} (1,00 m²)`;
      dimensions = { width: 100, height: 100, unit: 'cm', areaM2: 1.0 };
    } else if (isPackage && item.packages && item.packages.length > 0) {
      const pkg = item.packages[0];
      unitPrice = pkg.salePrice || item.salePrice;
      labelDisplay = `${item.name} (${pkg.name})`;
      packageName = pkg.name;
    }

    setCartItems((prev) => {
      // Verifica se o item padrão já está no carrinho
      const existingIdx = prev.findIndex(
        (ci) => ci.itemId === item.id && !ci.selectedOptions && !ci.variantName
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        const current = copy[existingIdx];
        const newQty = current.quantity + 1;
        copy[existingIdx] = {
          ...current,
          quantity: newQty,
          totalPrice: Number((current.unitPrice * newQty).toFixed(2)),
        };
        return copy;
      }

      const newItem: VitrineCartItem = {
        id: `${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        imageUrl: item.imageUrl,
        type: item.type,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        labelDisplay,
        dimensions,
        packageName,
      };
      return [...prev, newItem];
    });

    setAddedItemFeedbackId(item.id);
    setToastMessage(`"${item.name}" adicionado ao carrinho!`);

    setTimeout(() => {
      setAddedItemFeedbackId((curr) => (curr === item.id ? null : curr));
    }, 2000);

    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleAddCustomCartItem = (customCartItem: VitrineCartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.id === customCartItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = customCartItem;
        return updated;
      }
      return [...prev, customCartItem];
    });

    setToastMessage(`"${customCartItem.labelDisplay || customCartItem.name}" adicionado ao carrinho!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((ci) =>
        ci.id === cartItemId
          ? {
              ...ci,
              quantity: newQuantity,
              totalPrice: Number((ci.unitPrice * newQuantity).toFixed(2)),
            }
          : ci
      )
    );
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Escuta atualizações de nichos feitas no painel ou configurações
  useEffect(() => {
    const handleNichesUpdated = () => {
      setNiches(StorageService.getCatalogNiches());
    };
    window.addEventListener('catalog-niches-updated', handleNichesUpdated);
    return () => window.removeEventListener('catalog-niches-updated', handleNichesUpdated);
  }, []);

  const activeNiches = useMemo(() => {
    return niches.filter((n) => n.active !== false);
  }, [niches]);

  // Filter only items strictly active && marked with showInCatalog
  const catalogItems = useMemo(() => {
    return items.filter((i) => {
      const isActive = i.active !== false && (i as any).active !== 0 && (i as any).active !== 'false';
      return isActive && i.showInCatalog;
    });
  }, [items]);

  // Contagem de itens por nicho
  const nicheCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    niches.forEach((niche) => {
      counts[niche.id] = catalogItems.filter(
        (item) => getItemNiche(item, niches) === niche.id
      ).length;
    });
    return counts;
  }, [catalogItems, niches]);

  // Category counts (considera o nicho ativo se houver)
  const categoryCounts = useMemo(() => {
    const baseItems =
      selectedNiche && selectedNiche !== 'TODOS'
        ? catalogItems.filter((i) => getItemNiche(i, niches) === selectedNiche)
        : catalogItems;

    const counts: Record<string, number> = {
      TODOS: baseItems.length,
      GRAFICA: baseItems.filter((i) => i.type === 'PRODUTO_GRAFICO').length,
      FISICOS: baseItems.filter((i) => i.type === 'PRODUTO_FISICO').length,
      SERVICOS: baseItems.filter((i) => i.type === 'SERVICO').length,
    };
    categories.forEach((cat) => {
      counts[cat.id] = baseItems.filter((i) => i.categoryId === cat.id).length;
    });
    return counts;
  }, [catalogItems, categories, selectedNiche, niches]);

  const filteredItems = useMemo(() => {
    // Se nenhum nicho foi escolhido e não há termo digitado, a lista fica oculta inicialmente
    if (selectedNiche === null && !searchTerm.trim()) {
      return [];
    }

    const result = catalogItems.filter((item) => {
      // 1. Filtro primário de Nicho
      if (selectedNiche && selectedNiche !== 'TODOS') {
        const itemNiche = getItemNiche(item, niches);
        if (itemNiche !== selectedNiche) {
          return false;
        }
      }

      // 2. Busca por texto
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      // 3. Filtro secundário de Categoria
      const matchCategory =
        selectedCategory === 'TODOS' ||
        (selectedCategory === 'GRAFICA' && item.type === 'PRODUTO_GRAFICO') ||
        (selectedCategory === 'FISICOS' && item.type === 'PRODUTO_FISICO') ||
        (selectedCategory === 'SERVICOS' && item.type === 'SERVICO') ||
        item.categoryId === selectedCategory;

      // 4. Filtro secundário de Tipo
      const matchType =
        selectedType === 'TODOS' ||
        selectedType === item.type ||
        (selectedType === 'PRODUTO_GRAFICO' && item.type === 'PRODUTO_GRAFICO') ||
        (selectedType === 'PRODUTO_FISICO' && item.type === 'PRODUTO_FISICO') ||
        (selectedType === 'SERVICO' && item.type === 'SERVICO');

      return matchSearch && matchCategory && matchType;
    });

    // Sorting com desempate determinístico e estável entre ciclos de sincronização
    return result.sort((a, b) => {
      const getBasePrice = (item: Item) => {
        if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2') {
          return item.areaPricing?.salePricePerM2 || item.salePrice;
        }
        if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE') {
          return item.packages?.[0]?.salePrice || item.salePrice;
        }
        return item.salePrice;
      };

      if (sortBy === 'price_asc') {
        const diff = getBasePrice(a) - getBasePrice(b);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id);
      }
      if (sortBy === 'price_desc') {
        const diff = getBasePrice(b) - getBasePrice(a);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id);
      }

      // Ordenação padrão/destaque:
      // 1. Destaque manual configurado no produto
      const featDiff = (b.featuredInCatalog ? 1 : 0) - (a.featuredInCatalog ? 1 : 0);
      if (featDiff !== 0) return featDiff;

      // 2. Presença de foto
      const hasImgA = Boolean(a.imageUrl && a.imageUrl.trim());
      const hasImgB = Boolean(b.imageUrl && b.imageUrl.trim());
      const imgDiff = (hasImgB ? 1 : 0) - (hasImgA ? 1 : 0);
      if (imgDiff !== 0) return imgDiff;

      // 3. Desempate estável e determinístico por nome e ID
      return (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id);
    });
  }, [catalogItems, selectedNiche, searchTerm, selectedCategory, selectedType, sortBy]);

  const handleNicheSelect = (nicheId: string) => {
    if (selectedNiche === nicheId) {
      setSelectedNiche('TODOS');
    } else {
      setSelectedNiche(nicheId);
      setSelectedCategory('TODOS');
      setSelectedType('TODOS');
    }
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSelectAll = () => {
    setSelectedNiche('TODOS');
    setSelectedCategory('TODOS');
    setSelectedType('TODOS');
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleGeneralWhatsApp = () => {
    const cleanPhone = companySettings.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá! Estava navegando no catálogo da *${companySettings.name}* e gostaria de solicitar um atendimento/orçamento!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const handleDirectProductWhatsApp = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    const cleanPhone = companySettings.phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá! Tenho interesse no produto ${item.name}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('TODOS');
    setSelectedType('TODOS');
    setSortBy('featured');
    setSelectedNiche('TODOS');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'TODOS' ||
    selectedType !== 'TODOS' ||
    sortBy !== 'featured' ||
    (selectedNiche !== null && selectedNiche !== 'TODOS');

  return (
    <div id="public-catalog-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Standalone Public Top Bar (when viewed publicly) */}
      {isStandalone && (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 -mx-4 sm:-mx-6 -mt-4 mb-6 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {companySettings?.catalogHeaderType === 'LOGO' && (companySettings?.logoUrl || companySettings?.logoDriveFileId) ? (
              <BrandLogo
                logoUrl={companySettings.logoUrl}
                logoDriveFileId={companySettings.logoDriveFileId}
                alt={companySettings.name}
                className="h-8 max-w-[120px] object-contain rounded"
                fallback={
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                }
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Store className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight block">
                {companySettings?.name || 'Catálogo Digital'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Vitrine Pública de Produtos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-standalone-cart"
              onClick={() => setIsCartModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors cursor-pointer"
              title="Abrir carrinho de compras"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              <span>Carrinho ({totalCartCount})</span>
            </button>

            <button
              type="button"
              onClick={handleGeneralWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {onOpenManagement && (
              <button
                type="button"
                onClick={onOpenManagement}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Acessar o painel administrativo restrito"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Área Restrita</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Brand Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 shadow-xl flex flex-col items-center justify-center text-center">
        <div className="relative z-10 max-w-3xl w-full mx-auto space-y-4 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catálogo Digital</span>
          </div>

          {companySettings?.catalogHeaderType === 'LOGO' ? (
            companySettings?.logoUrl || companySettings?.logoDriveFileId ? (
              <div className="flex items-center justify-center py-2 w-full">
                <BrandLogo
                  logoUrl={companySettings.logoUrl}
                  logoDriveFileId={companySettings.logoDriveFileId}
                  alt={companySettings.name}
                  className="max-h-24 sm:max-h-32 w-auto max-w-[85%] object-contain drop-shadow-md mx-auto"
                  fallback={
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                      {companySettings.name}
                    </h1>
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center gap-3">
                  <Store className="w-7 h-7 text-blue-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xl sm:text-2xl font-black text-white">{companySettings.name}</p>
                    <p className="text-[11px] text-blue-200">Exibição de Logo ativada no catálogo</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {companySettings.name}
            </h1>
          )}

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            {companySettings.catalogSubtitle || 'Sua rotina, mais simples.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGeneralWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chamar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE NICHOS: CARDS GRANDES E DESTACADOS */}
      <section id="vitrine-nichos" className="space-y-6 pt-2 pb-2">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
              Encontre o que precisa
            </h2>
            {isAdmin && (
              <button
                type="button"
                id="btn-admin-gerenciar-nichos"
                onClick={() => setIsNicheManagerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-105"
                title="Personalizar nichos da vitrine: imagens, nomes, textos, adicionar e excluir"
              >
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                <span>Gerenciar Nichos (Admin)</span>
              </button>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Escolha uma categoria para começar sua busca
          </p>
        </div>

        {/* Grade com os Cards de Nicho Ativos */}
        <div
          className={`grid grid-cols-1 ${
            activeNiches.length === 1
              ? 'max-w-md mx-auto'
              : activeNiches.length === 2
              ? 'sm:grid-cols-2 max-w-3xl mx-auto'
              : activeNiches.length === 4
              ? 'sm:grid-cols-2 lg:grid-cols-4'
              : 'sm:grid-cols-2 md:grid-cols-3'
          } gap-5 sm:gap-6`}
        >
          {activeNiches.map((niche) => {
            const isSelected = selectedNiche === niche.id;
            const count = nicheCounts[niche.id] || 0;

            return (
              <div
                key={niche.id}
                id={`card-nicho-${niche.id}`}
                onClick={() => handleNicheSelect(niche.id)}
                className={`group relative flex flex-col justify-between rounded-3xl border-2 transition-all duration-300 overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xl ring-4 ring-blue-500/20 scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                {/* Botão de Edição Rápida para Administrador */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsNicheManagerOpen(true);
                    }}
                    className="absolute top-3.5 right-3.5 z-20 p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full shadow-md backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer"
                    title={`Editar propriedades do nicho "${niche.title}"`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Imagem de Destaque do Nicho */}
                <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                  <img
                    src={niche.imageUrl}
                    alt={niche.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-black/20 to-transparent" />

                  {/* Badge de Categoria */}
                  <div className="absolute top-3.5 left-3.5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/95 text-slate-800 shadow-sm backdrop-blur-xs">
                      {niche.badge}
                    </span>
                  </div>

                  {/* Indicador de Seleção Ativa no Card (quando não é admin ou quando admin seleciona) */}
                  {isSelected && !isAdmin && (
                    <div className="absolute top-3.5 right-3.5 animate-in fade-in zoom-in duration-200">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Selecionado</span>
                      </span>
                    </div>
                  )}

                  {/* Quantidade de itens disponíveis no nicho */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs font-semibold">
                    <span className="bg-black/55 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                      {count} {count === 1 ? 'item disponível' : 'itens disponíveis'}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {niche.title}
                      </h3>
                      {isSelected && (
                        <span className="text-blue-600 font-extrabold text-xl">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {niche.description}
                    </p>
                  </div>

                  {/* Chamada para Ação (CTA) */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-2 text-sm font-black transition-all ${
                        isSelected
                          ? 'text-blue-700'
                          : 'text-blue-600 group-hover:text-blue-800 group-hover:translate-x-1'
                      }`}
                    >
                      <span>{isSelected ? `${niche.ctaText} (Ativo)` : niche.ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>

                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ÁREA DA LISTA DE PRODUTOS E FILTROS */}
      <div ref={productsSectionRef} id="produtos-vitrine" className="space-y-4 pt-1">
        {selectedNiche === null && !searchTerm.trim() ? (
          /* Estado Inicial: Convite para escolha com opção de ver tudo */
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                Escolha uma categoria acima para começar sua busca
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Clique em um dos 3 nichos em destaque para visualizar os produtos e serviços filtrados, ou acesse todo o catálogo:
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                id="btn-ver-todos-produtos-inicial"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Todos os produtos e serviços ({catalogItems.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Barra de Status do Nicho Selecionado + Contagem + Opção Discreta "Todos" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3 flex-wrap">
                {selectedNiche && selectedNiche !== 'TODOS' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {niches.find((n) => n.id === selectedNiche)?.title || selectedNiche}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>selecionado</span>
                    </span>
                  </div>
                ) : (
                  <span className="font-black text-slate-900 text-sm sm:text-base">
                    Todos os produtos e serviços
                  </span>
                )}

                <span className="text-xs sm:text-sm font-semibold text-slate-500 border-l border-slate-200 pl-3">
                  Produtos e serviços encontrados:{' '}
                  <strong className="text-blue-700 font-extrabold">{filteredItems.length}</strong>
                </span>
              </div>

              {/* Botão discreto para ver Todos os produtos e serviços */}
              {selectedNiche && selectedNiche !== 'TODOS' ? (
                <button
                  type="button"
                  id="btn-discreto-todos-produtos"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-slate-600 hover:text-blue-600 underline underline-offset-4 transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Todos os produtos e serviços</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedNiche(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Voltar para escolha de nichos ↑
                </button>
              )}
            </div>

            {/* TOP SEARCH BAR AREA (Prominently placed at the top of the Vitrine) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="catalog-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos gráficos, brindes, impressos, serviços ou código SKU..."
              className="w-full pl-11 pr-10 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector & Mobile Filter Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-52">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Ordenar produtos"
                className="w-full pl-9 pr-8 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-700 cursor-pointer appearance-none"
              >
                <option value="featured">Destaques</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="name_asc">Nome (A - Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`lg:hidden flex items-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl border transition-colors cursor-pointer ${
                showMobileFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>

            {/* Carrinho Button */}
            <button
              type="button"
              id="btn-searchbar-cart"
              onClick={() => setIsCartModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Abrir carrinho de compras"
            >
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Carrinho</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white min-w-5 text-center">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: VERTICAL SEARCH & FILTERS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: Vertical Search & Category Navigation Sidebar */}
        <aside
          className={`lg:block ${
            showMobileFilters ? 'block' : 'hidden'
          } lg:col-span-1 space-y-4`}
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-5">
            {/* Header & Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Filtros
                </h3>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Vertical Type Filter */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tipo de Item
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PRODUTO_GRAFICO', label: 'Gráfico' },
                  { id: 'PRODUTO_FISICO', label: 'Físico' },
                  { id: 'SERVICO', label: 'Serviço' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedType === t.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Category Tree */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Categorias
              </label>

              {/* Todos */}
              <button
                type="button"
                onClick={() => setSelectedCategory('TODOS')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'TODOS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5" />
                  <span>Todos os Produtos</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedCategory === 'TODOS'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {categoryCounts['TODOS'] || 0}
                </span>
              </button>

              {/* Gráfica & Impressão */}
              <button
                type="button"
                onClick={() => setSelectedCategory('GRAFICA')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'GRAFICA'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Gráfica e Impressão</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedCategory === 'GRAFICA'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {categoryCounts['GRAFICA'] || 0}
                </span>
              </button>

              {/* Físicos & Brindes */}
              <button
                type="button"
                onClick={() => setSelectedCategory('FISICOS')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'FISICOS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>Brindes e Físicos</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedCategory === 'FISICOS'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {categoryCounts['FISICOS'] || 0}
                </span>
              </button>

              {/* Serviços */}
              <button
                type="button"
                onClick={() => setSelectedCategory('SERVICOS')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'SERVICOS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Serviços Rápidos</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedCategory === 'SERVICOS'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {categoryCounts['SERVICOS'] || 0}
                </span>
              </button>

              {/* Custom categories */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {categoryCounts[cat.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* WhatsApp Direct Help Box */}
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xs">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-emerald-950">Precisa de Ajuda?</h4>
              <button
                type="button"
                onClick={handleGeneralWhatsApp}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Chamar no WhatsApp
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Results Header & Products Grid */}
        <section className="lg:col-span-3 space-y-4">
          {/* Active Filters Chips & Results Count Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">
                {filteredItems.length} {filteredItems.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </span>

              {/* Chip de Nicho Ativo */}
              {selectedNiche && selectedNiche !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                  <span>Nicho: {niches.find((n) => n.id === selectedNiche)?.title || selectedNiche}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedNiche('TODOS')}
                    className="hover:text-blue-950 cursor-pointer"
                    title="Remover filtro de nicho"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  <span>Busca: &quot;{searchTerm}&quot;</span>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="hover:text-blue-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCategory !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  <span>
                    Categoria:{' '}
                    {selectedCategory === 'GRAFICA'
                      ? 'Gráfica'
                      : selectedCategory === 'FISICOS'
                      ? 'Físicos'
                      : selectedCategory === 'SERVICOS'
                      ? 'Serviços'
                      : categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('TODOS')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedType !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  <span>Tipo: {selectedType}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedType('TODOS')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all p-4 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-4/3 mb-3">
                      <ProductImage
                        src={item.imageUrl}
                        alt={item.name}
                        itemType={item.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant={
                            item.type === 'PRODUTO_GRAFICO'
                              ? 'primary'
                              : item.type === 'PRODUTO_FISICO'
                              ? 'purple'
                              : 'success'
                          }
                          size="sm"
                        >
                          {getItemTypeLabel(item.type)}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {item.description || 'Produto de alta qualidade com acabamento profissional.'}
                    </p>
                  </div>

                  {/* Price & Action */}
                  {(() => {
                    const itemInCartCount = cartItems
                      .filter((ci) => ci.itemId === item.id)
                      .reduce((acc, ci) => acc + ci.quantity, 0);

                    return (
                      <div className="pt-3 mt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              {item.pricingModel === 'POR_M2'
                                ? 'Preço / m²'
                                : item.pricingModel === 'POR_PACOTE'
                                ? 'A partir de'
                                : 'A partir de'}
                            </span>
                            <span className="text-base font-black text-blue-700">
                              {item.pricingModel === 'POR_M2'
                                ? `${formatCurrency(item.areaPricing?.salePricePerM2 || item.salePrice)}/m²`
                                : item.pricingModel === 'POR_PACOTE'
                                ? formatCurrency(item.packages?.[0]?.salePrice || item.salePrice)
                                : formatCurrency(item.salePrice)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDirectProductWhatsApp(e, item)}
                              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                              title="Falar sobre este item no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-0.5 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform pl-1">
                              <span>Detalhes</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>

                        {/* Botão Adicionar ao Carrinho */}
                        <button
                          type="button"
                          id={`btn-add-cart-${item.id}`}
                          onClick={(e) => handleAddToCart(item, e)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            addedItemFeedbackId === item.id
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : itemInCartCount > 0
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-900 hover:bg-blue-600 text-white shadow-2xs'
                          }`}
                        >
                          {addedItemFeedbackId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Adicionado ao carrinho!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>
                                {itemInCartCount > 0
                                  ? `Adicionar mais (+${itemInCartCount} no carrinho)`
                                  : 'Adicionar ao carrinho'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 space-y-3">
                <Store className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700 text-base">Nenhum produto encontrado no catálogo</p>
                  <p className="text-xs text-slate-400 mt-1">Tente pesquisar por outro termo ou limpe os filtros aplicados.</p>
                </div>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Ver todos os produtos
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
          </>
        )}
      </div>

      {/* Catalog Item Modal & Simulator */}
      {selectedItem && (
        <CatalogItemModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          companySettings={companySettings}
          onAddToCart={handleAddCustomCartItem}
        />
      )}

      {/* Shopping Cart Modal */}
      <CatalogCartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        companySettings={companySettings}
      />

      {/* Floating Cart Button */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            id="btn-floating-cart"
            onClick={() => setIsCartModalOpen(true)}
            className="flex items-center gap-3 px-4 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer group hover:scale-103 border border-slate-700/60"
            title="Abrir carrinho de compras"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs border-2 border-slate-900">
                {totalCartCount}
              </span>
            </div>
            <div className="text-left">
              <div className="text-xs font-black leading-tight flex items-center gap-1">
                <span>Carrinho</span>
                <span className="text-slate-300 font-medium">({totalCartCount})</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold block leading-tight">
                {formatCurrency(totalCartAmount)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs sm:text-sm">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="font-semibold">{toastMessage}</span>
            <button
              type="button"
              onClick={() => {
                setToastMessage(null);
                setIsCartModalOpen(true);
              }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver carrinho ({totalCartCount})
            </button>
          </div>
        </div>
      )}

      {/* Niche Manager Modal for Administrators */}
      {isAdmin && (
        <NicheManagerModal
          isOpen={isNicheManagerOpen}
          onClose={() => setIsNicheManagerOpen(false)}
          onNichesChanged={() => setNiches(StorageService.getCatalogNiches())}
        />
      )}
    </div>
  );
};

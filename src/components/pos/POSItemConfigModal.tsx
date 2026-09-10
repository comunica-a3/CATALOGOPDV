import {
  AlertCircle,
  Calculator,
  Check,
  FileCode,
  Info,
  Layers,
  Package,
  Plus,
  Ruler,
  ShoppingBag,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CartItem,
  CartItemConfiguration,
  Item,
  ItemOption,
  ItemPackage,
  ItemPriceRule,
  ItemVariant,
} from '../../types';
import { calculateAreaPricing, getTechnicalMinArea } from '../../utils/areaPricing';
import { formatCurrency } from '../../utils/formatters';
import { getItemTypeLabel } from '../../utils/commissions';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ProductImage } from '../common/ProductImage';

interface POSItemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onAddToCart?: (cartItem: CartItem) => void;
  onSave?: (cartItem: CartItem) => void;
}

export const POSItemConfigModal: React.FC<POSItemConfigModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
  onSave,
}) => {
  if (!item) return null;

  const { currentUser } = useAuth();
  const canViewCosts = currentUser?.role === 'ADMINISTRADOR' || currentUser?.role === 'COLABORADOR';

  // Configuration States
  const [quantity, setQuantity] = useState<number>(() => {
    if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_UNIDADE') {
      return item.priceRules?.[0]?.minQuantity || 100;
    }
    return 1;
  });

  // Physical variant
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    item.variants?.[0]?.id || ''
  );

  // Graphic options (Acabamentos)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    item.options?.forEach((opt) => {
      if (opt.values.length > 0) {
        initial[opt.name] = opt.values[0].label;
      }
    });
    return initial;
  });

  // M2 Dimensions (Padrão: 100cm x 100cm = 1.00m²)
  const [width, setWidth] = useState<number>(100);
  const [widthUnit, setWidthUnit] = useState<'m' | 'cm'>('cm');
  const [height, setHeight] = useState<number>(100);
  const [heightUnit, setHeightUnit] = useState<'m' | 'cm'>('cm');

  const handleWidthUnitChange = (newUnit: 'm' | 'cm') => {
    if (newUnit === widthUnit) return;
    if (newUnit === 'm') {
      setWidth((w) => Number((w / 100).toFixed(4)));
    } else {
      setWidth((w) => Number((w * 100).toFixed(2)));
    }
    setWidthUnit(newUnit);
  };

  const handleHeightUnitChange = (newUnit: 'm' | 'cm') => {
    if (newUnit === heightUnit) return;
    if (newUnit === 'm') {
      setHeight((h) => Number((h / 100).toFixed(4)));
    } else {
      setHeight((h) => Number((h * 100).toFixed(2)));
    }
    setHeightUnit(newUnit);
  };

  // Package
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    item.packages?.[0]?.id || ''
  );

  // Services Dynamic Fields
  const [serviceData, setServiceData] = useState<Record<string, string>>({});

  // Notes
  const [notes, setNotes] = useState('');

  // Selected Variant Object
  const selectedVariant = useMemo(() => {
    return item.variants?.find((v) => v.id === selectedVariantId);
  }, [item.variants, selectedVariantId]);

  // Selected Package Object
  const selectedPackage = useMemo(() => {
    return item.packages?.find((p) => p.id === selectedPackageId);
  }, [item.packages, selectedPackageId]);

  // Calculation Engine
  const {
    unitPrice,
    unitCost,
    totalPrice,
    totalCost,
    areaM2,
    totalAreaM2,
    widthInMeters,
    heightInMeters,
    technicalMinArea,
    isBelowTechnicalMin,
    validationMessage,
    effectivePricePerM2,
    optionAdditionalPrice,
    activeTier,
  } = useMemo(() => {
    let uPrice = item.salePrice;
    let uCost = item.costPrice;
    let tPrice = 0;
    let tCost = 0;
    let calcArea = 0;
    let totArea = 0;
    let wInM = 0;
    let hInM = 0;
    let techMin = 0.01;
    let belowMin = false;
    let valMsg: string | undefined;
    let effPricePerM2 = 0;
    let applicableTier: ItemPriceRule | undefined;

    // 1. Calculate Option Additions (Finishes / Acabamentos)
    let additionalPrice = 0;
    let additionalCost = 0;

    if (item.options && item.options.length > 0) {
      item.options.forEach((opt) => {
        const chosenValLabel = selectedOptions[opt.name];
        const valObj = opt.values.find((v) => v.label === chosenValLabel);
        if (valObj) {
          additionalPrice += valObj.additionalPrice || 0;
          additionalCost += valObj.additionalCost || 0;
        }
      });
    }

    if (item.type !== 'PRODUTO_GRAFICO' && item.type !== 'SERVICO') {
      if (selectedVariant) {
        uPrice = selectedVariant.salePrice;
        uCost = selectedVariant.costPrice;
      }
      uPrice = uPrice + additionalPrice;
      uCost = uCost + additionalCost;
      tPrice = uPrice * quantity;
      tCost = uCost * quantity;
    } else if (item.type === 'PRODUTO_GRAFICO') {
      if (item.pricingModel === 'POR_M2') {
        const pricingResult = calculateAreaPricing({
          width,
          widthUnit,
          height,
          heightUnit,
          costPerM2: item.areaPricing?.costPerM2 ?? item.costPrice ?? 0,
          salePricePerM2: item.areaPricing?.salePricePerM2 ?? item.salePrice ?? 0,
          technicalMinArea: getTechnicalMinArea(item.areaPricing),
          minSalePrice: item.areaPricing?.minSalePrice,
          additionalPrice,
          additionalCost,
          quantity,
        });

        uPrice = pricingResult.unitPrice;
        uCost = pricingResult.unitCost;
        tPrice = pricingResult.totalPrice;
        tCost = pricingResult.totalCost;
        calcArea = pricingResult.singleAreaM2;
        totArea = pricingResult.totalAreaM2;
        wInM = pricingResult.widthInMeters;
        hInM = pricingResult.heightInMeters;
        techMin = pricingResult.technicalMinArea;
        belowMin = pricingResult.isBelowTechnicalMin;
        valMsg = pricingResult.validationMessage;
        effPricePerM2 = pricingResult.effectivePricePerM2;
      } else if (item.pricingModel === 'POR_PACOTE') {
        if (selectedPackage) {
          uPrice = selectedPackage.salePrice + additionalPrice;
          uCost = selectedPackage.costPrice + additionalCost;
          tPrice = uPrice * quantity;
          tCost = uCost * quantity;
        } else {
          uPrice = item.salePrice + additionalPrice;
          uCost = item.costPrice + additionalCost;
          tPrice = uPrice * quantity;
          tCost = uCost * quantity;
        }
      } else {
        // POR_UNIDADE - Find best applicable progressive tier
        if (item.priceRules && item.priceRules.length > 0) {
          const sortedRules = [...item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
          applicableTier = sortedRules.find((r) => quantity >= r.minQuantity);
          if (!applicableTier) {
            applicableTier = sortedRules[sortedRules.length - 1];
          }
        }

        if (applicableTier) {
          uPrice = applicableTier.unitSalePrice;
          uCost = applicableTier.unitCost;
        } else {
          uPrice = item.salePrice;
          uCost = item.costPrice;
        }

        // Add finish / option price to the unit price
        uPrice = uPrice + additionalPrice;
        uCost = uCost + additionalCost;

        tPrice = Number((uPrice * quantity).toFixed(2));
        tCost = Number((uCost * quantity).toFixed(2));
      }
    } else {
      // SERVICO
      uPrice = item.salePrice + additionalPrice;
      uCost = item.costPrice + additionalCost;
      tPrice = uPrice * quantity;
      tCost = uCost * quantity;
    }

    return {
      unitPrice: Number(uPrice.toFixed(2)),
      unitCost: Number(uCost.toFixed(2)),
      totalPrice: Number(tPrice.toFixed(2)),
      totalCost: Number(tCost.toFixed(2)),
      areaM2: calcArea,
      totalAreaM2: totArea,
      widthInMeters: wInM,
      heightInMeters: hInM,
      technicalMinArea: techMin,
      isBelowTechnicalMin: belowMin,
      validationMessage: valMsg,
      effectivePricePerM2: effPricePerM2,
      optionAdditionalPrice: additionalPrice,
      activeTier: applicableTier,
    };
  }, [
    item,
    quantity,
    selectedVariant,
    selectedPackage,
    selectedOptions,
    width,
    widthUnit,
    height,
    heightUnit,
  ]);

  const handleAdd = () => {
    // Block sale if below technical minimum
    if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2') {
      if (isBelowTechnicalMin) {
        alert(
          validationMessage ||
          `A área calculada (${areaM2} m²) está abaixo do mínimo técnico permitido (${technicalMinArea} m²). Por favor, aumente a largura ou altura.`
        );
        return;
      }
    }

    // Validate service fields if required
    if (item.type === 'SERVICO' && item.serviceFields) {
      for (const field of item.serviceFields) {
        if (field.required && !serviceData[field.label]?.trim()) {
          alert(`O campo "${field.label}" é obrigatório para este serviço.`);
          return;
        }
      }
    }

    const config: CartItemConfiguration = {
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      additionalPrice: optionAdditionalPrice > 0 ? optionAdditionalPrice : undefined,
      width: item.pricingModel === 'POR_M2' ? width : undefined,
      height: item.pricingModel === 'POR_M2' ? height : undefined,
      dimensionUnit: item.pricingModel === 'POR_M2' ? (widthUnit === heightUnit ? widthUnit : `${widthUnit}x${heightUnit}`) : undefined,
      widthUnit: item.pricingModel === 'POR_M2' ? widthUnit : undefined,
      heightUnit: item.pricingModel === 'POR_M2' ? heightUnit : undefined,
      calculatedAreaM2: item.pricingModel === 'POR_M2' ? areaM2 : undefined,
      packageId: selectedPackage?.id,
      packageName: selectedPackage?.name,
      serviceData: Object.keys(serviceData).length > 0 ? serviceData : undefined,
      notes: notes.trim() || undefined,
    };

    const cartItem: CartItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item,
      quantity,
      unitPrice,
      unitCost,
      totalPrice,
      totalCost,
      configuration: config,
    };

    if (onAddToCart) {
      onAddToCart(cartItem);
    } else if (onSave) {
      onSave(cartItem);
    }
    onClose();
  };

  return (
    <Modal
      id="pos-item-config-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      subtitle={`SKU: ${item.sku} • ${getItemTypeLabel(item.type)}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Item Header Badge & Description */}
        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <ProductImage
            src={item.imageUrl}
            alt={item.name}
            itemType={item.type}
            className="w-14 h-14 rounded-lg shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.type === 'PRODUTO_GRAFICO' && (
                <Badge variant="primary" size="sm">
                  {item.pricingModel === 'POR_UNIDADE'
                    ? 'Preço por Faixa'
                    : item.pricingModel === 'POR_PACOTE'
                    ? 'Pacote Fechado'
                    : 'Preço por m²'}
                </Badge>
              )}
              {item.type === 'PRODUTO_GRAFICO' && item.leadTime && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Prazo: {item.leadTime}
                </span>
              )}
              {item.type !== 'PRODUTO_GRAFICO' && item.type !== 'SERVICO' && item.stock !== undefined && (
                <Badge
                  variant={(item.stock || 0) <= (item.minStock || 5) ? 'danger' : 'success'}
                  size="sm"
                >
                  Estoque: {item.stock || 0} un
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 1. PHYSICAL / CUSTOM CONFIG: VARIANTS */}
        {item.type !== 'PRODUTO_GRAFICO' && item.type !== 'SERVICO' && item.variants && item.variants.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Selecione a Variante / Cor / Tamanho *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {item.variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{v.name}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(v.salePrice)}
                      </span>
                      <span
                        className={`font-semibold ${
                          v.stock <= 2 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {v.stock} em estoque
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. GRAPHIC CONFIG: M2 CALCULATION */}
        {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' && (
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3.5">
            {/* Header & Pricing Parameters */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Precificação por Metro Quadrado (Cobrança Proporcional)
              </span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>Unidades rápidas:</span>
                <button
                  type="button"
                  onClick={() => {
                    handleWidthUnitChange('cm');
                    handleHeightUnitChange('cm');
                  }}
                  className={`px-2 py-0.5 rounded cursor-pointer border transition-colors ${
                    widthUnit === 'cm' && heightUnit === 'cm'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Ambos em cm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleWidthUnitChange('m');
                    handleHeightUnitChange('m');
                  }}
                  className={`px-2 py-0.5 rounded cursor-pointer border transition-colors ${
                    widthUnit === 'm' && heightUnit === 'm'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Ambos em m
                </button>
              </div>
            </div>

            {/* Informational Parameter Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {canViewCosts && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Custo por m² (R$)
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700">
                    {formatCurrency(item.areaPricing?.costPerM2 ?? item.costPrice)}/m²
                  </span>
                </div>
              )}

              <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Preço Venda / m² (R$)
                </span>
                <span className="text-xs sm:text-sm font-black text-blue-900">
                  {formatCurrency(item.areaPricing?.salePricePerM2 ?? item.salePrice)}/m²
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mínimo Técnico
                  </span>
                  <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">
                    Menor Tam.
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {technicalMinArea} m²
                </span>
              </div>

              {item.areaPricing?.minSalePrice && item.areaPricing.minSalePrice > 0 ? (
                <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Preço Mínimo (R$)
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-900">
                    {formatCurrency(item.areaPricing.minSalePrice)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Inputs: Largura e Altura com seletores individuais de unidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Largura */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Largura *
                  </label>
                  <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleWidthUnitChange('cm')}
                      className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                        widthUnit === 'cm' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWidthUnitChange('m')}
                      className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                        widthUnit === 'm' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      m
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={widthUnit === 'cm' ? '1' : '0.01'}
                    min="0.01"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                    {widthUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Equivalente:</span>
                  <span className="font-semibold text-slate-700">{widthInMeters} m</span>
                </div>
              </div>

              {/* Altura */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Altura *
                  </label>
                  <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('cm')}
                      className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                        heightUnit === 'cm' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('m')}
                      className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                        heightUnit === 'm' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      m
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={heightUnit === 'cm' ? '1' : '0.01'}
                    min="0.01"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                    {heightUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Equivalente:</span>
                  <span className="font-semibold text-slate-700">{heightInMeters} m</span>
                </div>
              </div>
            </div>

            {/* Live Calculation Display: Área Real e Preço Proporcional */}
            <div className="p-3.5 bg-white border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Área Calculada (Real)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-blue-900">
                    {areaM2} m²
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({widthInMeters}m × {heightInMeters}m)
                  </span>
                </div>
                {quantity > 1 && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Total ({quantity} un): {totalAreaM2} m²
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Preço de Venda da Peça
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5 justify-end">
                  <span className="text-xl font-black text-emerald-700">
                    {formatCurrency(unitPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    / un
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>{areaM2} m² × {formatCurrency(effectivePricePerM2)}/m²</span>
                  {canViewCosts && (
                    <span className="font-medium text-slate-600">
                      • Custo: {formatCurrency(unitCost)}/un
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Validation Alert if below technical minimum */}
            {isBelowTechnicalMin && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm text-rose-950">
                    Medida abaixo do Mínimo Técnico! Venda Bloqueada.
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    A área calculada de <strong>{areaM2} m²</strong> é menor que o tamanho mínimo técnico permitido de <strong>{technicalMinArea} m²</strong> para este produto.
                  </p>
                  <p className="text-rose-700 font-semibold">
                    O sistema bloqueia a venda para garantir viabilidade técnica. Por favor, aumente a largura ou a altura para poder prosseguir.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. GRAPHIC CONFIG: PACKAGES */}
        {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE' && item.packages && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Selecione o Pacote Desejado *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {item.packages.map((pkg) => {
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{pkg.name}</p>
                    <p className="text-[11px] text-slate-500">{pkg.quantity} unidades</p>
                    <p className="text-xs font-extrabold text-emerald-700 mt-1">
                      {formatCurrency(pkg.salePrice)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. OPTIONS & FINISHES (ACABAMENTOS) */}
        {item.options && item.options.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Acabamentos e Opções Adicionais
              </label>
              {optionAdditionalPrice > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Total Acabamento: + {formatCurrency(optionAdditionalPrice)}/un
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.options.map((opt) => {
                const currentVal = selectedOptions[opt.name] || opt.values[0]?.label;
                const currentValObj = opt.values.find((v) => v.label === currentVal);
                return (
                  <div key={opt.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        {opt.name}
                      </label>
                      {currentValObj?.additionalPrice && currentValObj.additionalPrice > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                          + {formatCurrency(currentValObj.additionalPrice)}
                        </span>
                      ) : null}
                    </div>
                    <select
                      value={currentVal}
                      onChange={(e) =>
                        setSelectedOptions({
                          ...selectedOptions,
                          [opt.name]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-medium focus:border-blue-500 focus:outline-none"
                    >
                      {opt.values.map((v) => (
                        <option key={v.id} value={v.label} className="bg-white text-slate-900">
                          {v.label} {v.additionalPrice ? `(+ ${formatCurrency(v.additionalPrice)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SERVICES DYNAMIC FIELDS */}
        {item.type === 'SERVICO' && item.serviceFields && item.serviceFields.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-600" />
              Informações Necessárias para o Atendimento / Serviço
            </span>

            <div className="space-y-2.5">
              {item.serviceFields.map((fld) => (
                <div key={fld.id}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {fld.label} {fld.required && <span className="text-rose-500">*</span>}
                  </label>
                  {fld.type === 'select' && fld.options ? (
                    <select
                      value={serviceData[fld.label] || ''}
                      onChange={(e) =>
                        setServiceData({ ...serviceData, [fld.label]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="" className="bg-white text-slate-900">Selecione...</option>
                      {fld.options.map((opt, oi) => (
                        <option key={oi} value={opt} className="bg-white text-slate-900">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={fld.type === 'number' ? 'number' : 'text'}
                      value={serviceData[fld.label] || ''}
                      onChange={(e) =>
                        setServiceData({ ...serviceData, [fld.label]: e.target.value })
                      }
                      placeholder={fld.placeholder || ''}
                      className="w-full px-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESSIVE PRICING TIERS DISPLAY */}
        {item.priceRules && item.priceRules.length > 0 && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Progressão de Preços (Faixas por Quantidade)
              </span>
              <span className="text-[10px] text-blue-700 font-medium">
                Selecione a faixa ou digite a quantidade desejada
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {item.priceRules.map((rule, ri) => {
                const isActive = activeTier?.minQuantity === rule.minQuantity;
                return (
                  <button
                    key={ri}
                    type="button"
                    onClick={() => setQuantity(rule.minQuantity)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-85">
                      A partir de {rule.minQuantity} un
                    </div>
                    <div className="text-xs font-extrabold mt-0.5">
                      {formatCurrency(rule.unitSalePrice)}/un
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. QUANTITY SELECTOR & NOTES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantidade {item.pricingModel === 'POR_PACOTE' ? 'de Pacotes' : 'de Unidades'} *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações / Instruções de Arte (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Nome da arte, texto do banner, etc."
              className="w-full px-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* LIVE TOTAL SUMMARY BOX */}
        <div className="p-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Valor Calculado do Item
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {formatCurrency(totalPrice)}
              </span>
              <span className="text-xs text-slate-500">
                ({formatCurrency(unitPrice)} unit.)
              </span>
            </div>
            {optionAdditionalPrice > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  + {formatCurrency(optionAdditionalPrice)} / un
                </span>
                <span className="text-slate-600">
                  adicionado pelo acabamento selecionado
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            id="btn-confirm-add-cart"
            onClick={handleAdd}
            disabled={isBelowTechnicalMin}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-lg shadow-xs transition-colors cursor-pointer ${
              isBelowTechnicalMin
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300 hover:bg-slate-300 shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={isBelowTechnicalMin ? `Bloqueado: área (${areaM2} m²) abaixo do mínimo técnico (${technicalMinArea} m²)` : ''}
          >
            {isBelowTechnicalMin ? (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Bloqueado (&lt; {technicalMinArea} m²)</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>{onAddToCart ? 'Adicionar ao Carrinho' : 'Salvar Configuração'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

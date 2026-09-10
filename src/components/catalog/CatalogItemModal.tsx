import {
  AlertCircle,
  Calculator,
  Check,
  CheckCircle2,
  FileCode,
  MessageCircle,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CompanySettings, Item, ItemPackage, ItemPriceRule, VitrineCartItem } from '../../types';
import { calculateAreaPricing, getTechnicalMinArea } from '../../utils/areaPricing';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ProductImage } from '../common/ProductImage';

interface CatalogItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  companySettings: CompanySettings;
  onAddToCart?: (cartItem: VitrineCartItem) => void;
}

export const CatalogItemModal: React.FC<CatalogItemModalProps> = ({
  isOpen,
  onClose,
  item,
  companySettings,
  onAddToCart,
}) => {
  if (!item) return null;

  const [quantity, setQuantity] = useState<number>(() => {
    if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_UNIDADE') {
      return item.priceRules?.[0]?.minQuantity || 100;
    }
    return 1;
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    item.variants?.[0]?.id || ''
  );

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
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

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

  const selectedVariant = useMemo(() => {
    return item.variants?.find((v) => v.id === selectedVariantId);
  }, [item.variants, selectedVariantId]);

  const selectedPackage = useMemo(() => {
    return item.packages?.find((p) => p.id === selectedPackageId);
  }, [item.packages, selectedPackageId]);

  // Live Price Calculation for Customer
  const {
    unitPrice,
    totalPrice,
    areaM2,
    totalAreaM2,
    widthInMeters,
    heightInMeters,
    technicalMinArea,
    isBelowTechnicalMin,
    validationMessage,
  } = useMemo(() => {
    let uPrice = item.salePrice;
    let tPrice = 0;
    let calcArea = 0;
    let totArea = 0;
    let wInM = 0;
    let hInM = 0;
    let techMin = 0.01;
    let belowMin = false;
    let valMsg: string | undefined;

    if (item.type === 'PRODUTO_FISICO') {
      if (selectedVariant) {
        uPrice = selectedVariant.salePrice;
      }
      tPrice = uPrice * quantity;
    } else if (item.type === 'PRODUTO_GRAFICO') {
      let additionalPrice = 0;
      item.options?.forEach((opt) => {
        const chosenValLabel = selectedOptions[opt.name];
        const valObj = opt.values.find((v) => v.label === chosenValLabel);
        if (valObj) {
          additionalPrice += valObj.additionalPrice || 0;
        }
      });

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
          quantity,
        });

        uPrice = pricingResult.unitPrice;
        tPrice = pricingResult.totalPrice;
        calcArea = pricingResult.singleAreaM2;
        totArea = pricingResult.totalAreaM2;
        wInM = pricingResult.widthInMeters;
        hInM = pricingResult.heightInMeters;
        techMin = pricingResult.technicalMinArea;
        belowMin = pricingResult.isBelowTechnicalMin;
        valMsg = pricingResult.validationMessage;
      } else if (item.pricingModel === 'POR_PACOTE') {
        if (selectedPackage) {
          uPrice = selectedPackage.salePrice + additionalPrice;
          tPrice = uPrice * quantity;
        } else {
          uPrice = item.salePrice + additionalPrice;
          tPrice = uPrice * quantity;
        }
      } else {
        // POR_UNIDADE
        let applicableTier: ItemPriceRule | undefined;
        if (item.priceRules && item.priceRules.length > 0) {
          const sortedRules = [...item.priceRules].sort((a, b) => b.minQuantity - a.minQuantity);
          applicableTier = sortedRules.find((r) => quantity >= r.minQuantity);
          if (!applicableTier) {
            applicableTier = sortedRules[sortedRules.length - 1];
          }
        }
        if (applicableTier) {
          uPrice = applicableTier.unitSalePrice;
        } else {
          uPrice = item.salePrice;
        }
        tPrice = Number((uPrice * quantity + additionalPrice).toFixed(2));
      }
    } else {
      uPrice = item.salePrice;
      tPrice = uPrice * quantity;
    }

    return {
      unitPrice: Number(uPrice.toFixed(2)),
      totalPrice: Number(tPrice.toFixed(2)),
      areaM2: calcArea,
      totalAreaM2: totArea,
      widthInMeters: wInM,
      heightInMeters: hInM,
      technicalMinArea: techMin,
      isBelowTechnicalMin: belowMin,
      validationMessage: valMsg,
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

  const handleDirectInterestWhatsApp = () => {
    const cleanPhone = companySettings.phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá! Tenho interesse no produto ${item.name}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const handleWhatsAppQuote = () => {
    if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' && isBelowTechnicalMin) {
      alert(
        validationMessage ||
        `A medida informada (${areaM2} m²) está abaixo do mínimo técnico permitido (${technicalMinArea} m²). Por favor, ajuste as dimensões.`
      );
      return;
    }

    const cleanPhone = companySettings.phone.replace(/\D/g, '');
    let details = `Olá! Tenho interesse no produto *${item.name}* (SKU: ${item.sku}).\n\n`;
    details += `*Especificações Solicitadas:*\n`;

    if (item.type === 'PRODUTO_GRAFICO') {
      if (item.pricingModel === 'POR_M2') {
        details += `📐 Medidas: ${width}${widthUnit} x ${height}${heightUnit} (${widthInMeters}m x ${heightInMeters}m = ${areaM2}m²)\n`;
      } else if (item.pricingModel === 'POR_PACOTE' && selectedPackage) {
        details += `📦 Pacote: ${selectedPackage.name} (${selectedPackage.quantity} un)\n`;
      }
      if (Object.keys(selectedOptions).length > 0) {
        details += `✨ Acabamentos: ${Object.entries(selectedOptions)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}\n`;
      }
    } else if (item.type === 'PRODUTO_FISICO' && selectedVariant) {
      details += `🎨 Variante: ${selectedVariant.name}\n`;
    }

    details += `🔢 Quantidade: ${quantity}\n`;
    details += `💰 Valor Estimado: ${formatCurrency(totalPrice)}\n\nPodem me orientar sobre o envio da arte e prazo de entrega?`;

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(details)}`, '_blank');
  };

  const handleAddToCart = () => {
    if (item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' && isBelowTechnicalMin) {
      alert(
        validationMessage ||
        `A medida informada (${areaM2} m²) está abaixo do mínimo técnico permitido (${technicalMinArea} m²). Por favor, ajuste as dimensões.`
      );
      return;
    }

    if (onAddToCart) {
      const isM2 = item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2';
      let label = item.name;
      if (isM2) {
        label = `${item.name} (${width}${widthUnit} x ${height}${heightUnit} — ${areaM2}m²)`;
      } else if (selectedPackage) {
        label = `${item.name} (${selectedPackage.name})`;
      } else if (selectedVariant) {
        label = `${item.name} (${selectedVariant.name})`;
      }

      onAddToCart({
        id: `${item.id}-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        imageUrl: item.imageUrl,
        type: item.type,
        quantity,
        unitPrice: Number((totalPrice / quantity).toFixed(2)),
        totalPrice,
        labelDisplay: label,
        dimensions: isM2 ? { width, height, unit: widthUnit, areaM2 } : undefined,
        variantName: selectedVariant?.name,
        packageName: selectedPackage?.name,
        selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      });

      setIsAddedSuccess(true);
      setTimeout(() => {
        setIsAddedSuccess(false);
        onClose();
      }, 700);
    }
  };

  return (
    <Modal
      id="catalog-item-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      subtitle={`Catálogo ${companySettings.name}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Banner with image and details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <ProductImage
            src={item.imageUrl}
            alt={item.name}
            itemType={item.type}
            className="w-full sm:w-36 h-36 rounded-xl shadow-xs shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <h3 className="font-extrabold text-base text-slate-900">{item.name}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            {item.leadTime && (
              <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                ⏱️ Prazo de Produção: {item.leadTime}
              </span>
            )}
          </div>
        </div>

        {/* 1. M2 CONFIG */}
        {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' && (
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Medidas Personalizadas (m²)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Preço: <strong className="text-blue-900">{formatCurrency(item.areaPricing?.salePricePerM2 ?? item.salePrice)}/m²</strong>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  Mínimo técnico: {technicalMinArea} m²
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Largura */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Largura *
                  </label>
                  <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleWidthUnitChange('cm')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        widthUnit === 'cm' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWidthUnitChange('m')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        widthUnit === 'm' ? 'bg-blue-600 text-white' : 'text-slate-600'
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
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                    {widthUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Equivale a {widthInMeters} m
                </span>
              </div>

              {/* Altura */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Altura *
                  </label>
                  <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('cm')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        heightUnit === 'cm' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('m')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        heightUnit === 'm' ? 'bg-blue-600 text-white' : 'text-slate-600'
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
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                    {heightUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Equivale a {heightInMeters} m
                </span>
              </div>
            </div>

            {/* Live calculated area card */}
            <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Área Real da Peça
                </span>
                <span className="text-base font-black text-blue-900">
                  {areaM2} m²
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  ({widthInMeters}m × {heightInMeters}m)
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Valor Unitário Estimado
                </span>
                <span className="text-base font-black text-emerald-600">
                  {formatCurrency(unitPrice)}
                </span>
              </div>
            </div>

            {/* Validation alert if below technical min */}
            {isBelowTechnicalMin && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-950">
                    Medida abaixo do Mínimo Técnico ({technicalMinArea} m²)
                  </p>
                  <p className="text-rose-700 mt-0.5">
                    A área total informada ({areaM2} m²) não atinge o tamanho mínimo de produção. Por favor, amplie as medidas para prosseguir com o pedido.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PACKAGES */}
        {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE' && item.packages && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Selecione o Pacote de Quantidade:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {item.packages.map((pkg) => {
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{pkg.name}</p>
                    <p className="text-[11px] text-slate-500">{pkg.quantity} unidades</p>
                    <p className="text-xs font-extrabold text-blue-700 mt-1">
                      {formatCurrency(pkg.salePrice)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. PHYSICAL VARIANTS */}
        {item.type === 'PRODUTO_FISICO' && item.variants && item.variants.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Selecione a Opção / Modelo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{v.name}</p>
                    <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                      {formatCurrency(v.salePrice)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. GRAPHIC OPTIONS (ACABAMENTOS) */}
        {item.type === 'PRODUTO_GRAFICO' && item.options && item.options.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Escolha os Acabamentos:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.options.map((opt) => (
                <div key={opt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {opt.name}
                  </label>
                  <select
                    value={selectedOptions[opt.name] || opt.values[0]?.label}
                    onChange={(e) =>
                      setSelectedOptions({
                        ...selectedOptions,
                        [opt.name]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {opt.values.map((v) => (
                      <option key={v.id} value={v.label}>
                        {v.label} {v.additionalPrice ? `(+ ${formatCurrency(v.additionalPrice)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUANTITY */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Quantidade Desejada
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-32 px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg"
          />
        </div>

        {/* TOTAL BOX & WHATSAPP ACTION */}
        <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Valor Total Estimado
            </span>
            <p className="text-2xl font-black text-white">{formatCurrency(totalPrice)}</p>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {onAddToCart && (
              <button
                type="button"
                id="btn-add-to-cart-modal"
                onClick={handleAddToCart}
                disabled={isBelowTechnicalMin}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold text-sm rounded-xl transition-all cursor-pointer ${
                  isAddedSuccess
                    ? 'bg-emerald-600 text-white'
                    : isBelowTechnicalMin
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30'
                }`}
              >
                {isAddedSuccess ? (
                  <>
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                    <span>Adicionado ao Carrinho!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Adicionar ao Carrinho</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              id="btn-whatsapp-quote"
              onClick={handleWhatsAppQuote}
              disabled={isBelowTechnicalMin}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-black text-sm rounded-xl transition-all cursor-pointer ${
                isBelowTechnicalMin
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
              }`}
            >
              {isBelowTechnicalMin ? (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span>Abaixo do Mínimo Técnico</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  <span>Pedir no WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

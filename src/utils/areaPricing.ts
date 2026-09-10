/**
 * Utilitário de Precificação por Metro Quadrado (m²)
 * 
 * Regras fundamentais:
 * 1. COBRANÇA PROPORCIONAL: Preço e custo são calculados estritamente sobre a área REAL informada.
 *    Área (m²) = largura(m) × altura(m)
 *    Custo = área × custo_por_m²
 *    Preço = área × preço_de_venda_por_m²
 * 
 * 2. MÍNIMO TÉCNICO: Representa exclusivamente o MENOR tamanho físico permitido para produção.
 *    NUNCA deve ser usado como substituto da área cobrada (NUNCA fazer MAX(área, mínimo_técnico)).
 *    Se área < mínimo técnico, a inclusão no pedido deve ser bloqueada com alerta claro.
 * 
 * 3. PREÇO MÍNIMO (FINANCEIRO): Regra independente e opcional para definir um piso monetário em R$.
 */

import { ItemAreaPricing } from '../types';

export function roundArea(val: number): number {
  return Math.round((val + Number.EPSILON) * 10000) / 10000;
}

export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function convertDimensionToMeters(value: number, unit: 'm' | 'cm'): number {
  const num = Number(value) || 0;
  if (num <= 0) return 0;
  const inMeters = unit === 'cm' ? num / 100 : num;
  return Math.round((inMeters + Number.EPSILON) * 10000) / 10000;
}

export function getTechnicalMinArea(areaPricing?: Partial<ItemAreaPricing>): number {
  if (!areaPricing) return 0.01;
  if (typeof areaPricing.technicalMinArea === 'number' && areaPricing.technicalMinArea >= 0) {
    return roundArea(areaPricing.technicalMinArea);
  }
  if (typeof areaPricing.minAreaM2 === 'number' && areaPricing.minAreaM2 >= 0) {
    return roundArea(areaPricing.minAreaM2);
  }
  return 0.01;
}

export interface AreaPricingCalculationParams {
  width: number;
  widthUnit: 'm' | 'cm';
  height: number;
  heightUnit: 'm' | 'cm';
  costPerM2: number;
  salePricePerM2: number;
  technicalMinArea?: number;
  minSalePrice?: number;
  additionalPrice?: number;
  additionalCost?: number;
  quantity?: number;
}

export interface AreaPricingCalculationResult {
  widthInMeters: number;
  heightInMeters: number;
  singleAreaM2: number;
  totalAreaM2: number;
  effectivePricePerM2: number;
  effectiveCostPerM2: number;
  proportionalUnitPrice: number;
  proportionalUnitCost: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
  technicalMinArea: number;
  isBelowTechnicalMin: boolean;
  validationMessage?: string;
}

export function calculateAreaPricing(params: AreaPricingCalculationParams): AreaPricingCalculationResult {
  const qty = Math.max(1, params.quantity || 1);
  const widthInMeters = convertDimensionToMeters(params.width, params.widthUnit);
  const heightInMeters = convertDimensionToMeters(params.height, params.heightUnit);

  // Área REAL estritamente proporcional: largura(m) × altura(m)
  const singleAreaM2 = roundArea(widthInMeters * heightInMeters);
  const totalAreaM2 = roundArea(singleAreaM2 * qty);

  const effectivePricePerM2 = roundCurrency((params.salePricePerM2 || 0) + (params.additionalPrice || 0));
  const effectiveCostPerM2 = roundCurrency((params.costPerM2 || 0) + (params.additionalCost || 0));

  // Cobrança Proporcional exata: área real × valor por m²
  const proportionalUnitPrice = roundCurrency(singleAreaM2 * effectivePricePerM2);
  const proportionalUnitCost = roundCurrency(singleAreaM2 * effectiveCostPerM2);

  // Mínimo Técnico (validação física)
  const technicalMinArea = params.technicalMinArea !== undefined && params.technicalMinArea >= 0
    ? roundArea(params.technicalMinArea)
    : 0.01;

  const isBelowTechnicalMin = singleAreaM2 > 0 && singleAreaM2 < technicalMinArea;
  let validationMessage: string | undefined;

  if (singleAreaM2 <= 0) {
    validationMessage = 'Informe largura e altura válidas maiores que zero.';
  } else if (isBelowTechnicalMin) {
    validationMessage = `Medida abaixo do Mínimo Técnico: A área calculada (${singleAreaM2.toFixed(4)} m²) é inferior ao tamanho mínimo permitido (${technicalMinArea.toFixed(4)} m²).`;
  }

  // Regra independente de Preço Mínimo Financeiro (R$)
  let finalUnitPrice = proportionalUnitPrice;
  const minSalePrice = params.minSalePrice && params.minSalePrice > 0 ? roundCurrency(params.minSalePrice) : 0;
  if (minSalePrice > 0 && finalUnitPrice < minSalePrice) {
    finalUnitPrice = minSalePrice;
  }

  const unitCost = proportionalUnitCost;
  const totalPrice = roundCurrency(finalUnitPrice * qty);
  const totalCost = roundCurrency(unitCost * qty);

  return {
    widthInMeters,
    heightInMeters,
    singleAreaM2,
    totalAreaM2,
    effectivePricePerM2,
    effectiveCostPerM2,
    proportionalUnitPrice,
    proportionalUnitCost,
    unitPrice: finalUnitPrice,
    unitCost,
    totalPrice,
    totalCost,
    technicalMinArea,
    isBelowTechnicalMin,
    validationMessage,
  };
}

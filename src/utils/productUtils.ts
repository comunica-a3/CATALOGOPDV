import { Item, ProductSeparation } from '../types';

/**
 * Checks whether a product separation should have Graphic/Personalized capabilities
 * (packages, M², progressive quantity pricing, finishings, production orders).
 */
export function isGraphicOrPersonalizedSeparation(
  sep?: Partial<ProductSeparation> | null
): boolean {
  if (!sep) return false;
  if (sep.id === 'PRODUTO_GRAFICO' || sep.id === 'PRODUTO_PERSONALIZADO') return true;
  if (sep.behavior === 'GRAFICO') return true;
  
  const name = (sep.name || '').toLowerCase();
  const id = (sep.id || '').toLowerCase();
  
  if (name.includes('personaliz') || id.includes('personaliz')) return true;
  if (name.includes('gráfi') || name.includes('grafi') || id.includes('grafi')) return true;
  if (name.includes('brinde') || id.includes('brinde')) return true;
  if (name.includes('sublima') || id.includes('sublima')) return true;
  if (name.includes('comunicação visual') || name.includes('comunicacao visual')) return true;

  return false;
}

/**
 * Checks whether an item type string corresponds to a Graphic or Personalized separation.
 */
export function isGraphicOrPersonalizedType(
  type?: string | null,
  separations?: ProductSeparation[]
): boolean {
  if (!type) return false;
  if (type === 'PRODUTO_GRAFICO' || type === 'PRODUTO_PERSONALIZADO') return true;
  
  if (separations && separations.length > 0) {
    const matchedSep = separations.find((s) => s.id === type);
    if (matchedSep) {
      return isGraphicOrPersonalizedSeparation(matchedSep);
    }
  }

  const cleanType = type.toLowerCase();
  if (cleanType.includes('personaliz')) return true;
  if (cleanType.includes('grafic') || cleanType.includes('gráfi') || cleanType.includes('graf')) return true;
  if (cleanType.includes('brinde')) return true;
  if (cleanType.includes('sublima')) return true;

  return false;
}

/**
 * Checks whether an Item has Graphic/Personalized properties or belongs to a Graphic/Personalized separation.
 */
export function isGraphicOrPersonalizedItem(
  item?: Partial<Item> | null,
  separations?: ProductSeparation[]
): boolean {
  if (!item) return false;
  
  // Explicit pricing model overrides
  if (item.pricingModel === 'POR_M2' || item.pricingModel === 'POR_PACOTE') {
    return true;
  }
  
  if (
    item.pricingModel === 'POR_UNIDADE' &&
    ((item.priceRules && item.priceRules.length > 0) ||
      (item.packages && item.packages.length > 0) ||
      item.areaPricing !== undefined ||
      (item.options && item.options.length > 0) ||
      item.productionType !== undefined ||
      item.leadTime !== undefined)
  ) {
    return true;
  }

  return isGraphicOrPersonalizedType(item.type, separations);
}

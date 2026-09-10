import { StorageService } from '../services/storage';

/**
 * Verifica se um item de catálogo é de produção terceirizada ou possui frete de fornecedor
 */
export function isThirdPartyItem(item: any): boolean {
  if (!item) return false;
  if (item.productionType === 'PRODUCAO_TERCEIRIZADA' || item.production_type === 'PRODUCAO_TERCEIRIZADA') {
    return true;
  }
  if (Number(item.supplierFreight) > 0) {
    return true;
  }
  return false;
}

/**
 * Verifica se um item do carrinho, orçamento ou venda é terceirizado
 */
export function isOutsourcedCartOrSaleItem(itemOrCartItem: any): boolean {
  if (!itemOrCartItem) return false;
  if (itemOrCartItem.item && isThirdPartyItem(itemOrCartItem.item)) {
    return true;
  }
  if (
    itemOrCartItem.productionType === 'PRODUCAO_TERCEIRIZADA' ||
    itemOrCartItem.production_type === 'PRODUCAO_TERCEIRIZADA'
  ) {
    return true;
  }
  if (Number(itemOrCartItem.supplierFreight) > 0) {
    return true;
  }
  if (itemOrCartItem.itemId) {
    const catalogItem = StorageService.getItemById(itemOrCartItem.itemId);
    if (catalogItem && isThirdPartyItem(catalogItem)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica se a lista de itens possui algum produto terceirizado
 */
export function hasOutsourcedItems(items: any[]): boolean {
  if (!items || !Array.isArray(items)) return false;
  return items.some((it) => isOutsourcedCartOrSaleItem(it));
}

/**
 * Ajusta a apresentação da venda para o cliente conforme regra:
 * Quando um produto for terceirizado e possuir frete do fornecedor:
 * - O frete NÃO deve aparecer no detalhamento da venda apresentado ao cliente
 * - NÃO aparecer como linha ou item separado no PDV, orçamento, recibo ou detalhamento
 * - NÃO ser exibido como "Frete", "Frete do fornecedor", "Frete terceirizado"
 * - O cliente deve visualizar somente o produto e o valor de venda correspondente
 */
export function getCustomerFacingPresentation(params: {
  items: any[];
  subtotal: number;
  freight?: number;
  discount?: number;
  total: number;
}) {
  const { items, subtotal, freight = 0, discount = 0, total } = params;
  const isOutsourced = hasOutsourcedItems(items);

  if (isOutsourced && freight > 0) {
    const presentedSubtotal = Number((subtotal + freight).toFixed(2));
    const outsourcedItems = items.filter((it) => isOutsourcedCartOrSaleItem(it));
    const outsourcedTotalValue = outsourcedItems.reduce(
      (acc, it) => acc + (Number(it.totalPrice) || 0),
      0
    );

    const presentedItems = items.map((it) => {
      const isThisOutsourced = isOutsourcedCartOrSaleItem(it);
      if (!isThisOutsourced) {
        return {
          ...it,
          displayedUnitPrice: Number(it.unitPrice) || 0,
          displayedTotalPrice: Number(it.totalPrice) || 0,
        };
      }

      let itemFreightShare = 0;
      if (outsourcedTotalValue > 0) {
        itemFreightShare = ((Number(it.totalPrice) || 0) / outsourcedTotalValue) * freight;
      } else if (outsourcedItems.length > 0) {
        itemFreightShare = freight / outsourcedItems.length;
      }

      const displayedTotalPrice = Number(
        ((Number(it.totalPrice) || 0) + itemFreightShare).toFixed(2)
      );
      const qty = Math.max(1, Number(it.quantity) || 1);
      const displayedUnitPrice = Number((displayedTotalPrice / qty).toFixed(2));

      return {
        ...it,
        displayedUnitPrice,
        displayedTotalPrice,
      };
    });

    return {
      isOutsourced: true,
      hideFreightLine: true,
      presentedSubtotal,
      presentedFreight: 0,
      presentedDiscount: discount,
      presentedTotal: total,
      presentedItems,
    };
  }

  // Se não for terceirizado com frete de fornecedor, mantém a apresentação padrão
  return {
    isOutsourced: false,
    hideFreightLine: false,
    presentedSubtotal: subtotal,
    presentedFreight: freight,
    presentedDiscount: discount,
    presentedTotal: total,
    presentedItems: items.map((it) => ({
      ...it,
      displayedUnitPrice: Number(it.unitPrice) || 0,
      displayedTotalPrice: Number(it.totalPrice) || 0,
    })),
  };
}

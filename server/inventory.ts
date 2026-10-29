import { db, persistDatabase } from './db';

export interface InventoryUserContext {
  id?: string;
  name?: string;
}

/**
 * Checks whether an item represents a physical product with physical inventory.
 */
export async function isPhysicalItem(
  dbItem: any,
  saleItemType?: string
): Promise<boolean> {
  if (!dbItem) return false;

  // Direct physical type
  if (dbItem.type === 'PRODUTO_FISICO' || saleItemType === 'PRODUTO_FISICO') {
    return true;
  }

  // Check product separation behavior
  if (dbItem.type) {
    try {
      const sep = await db.get<any>(
        'SELECT behavior FROM product_separations WHERE id = ?',
        [dbItem.type]
      );
      if (sep && sep.behavior === 'FISICO') {
        return true;
      }
    } catch {
      // Ignore query error
    }
  }

  // Exclude services and graphic prints
  if (dbItem.type === 'SERVICO' || dbItem.type === 'PRODUTO_GRAFICO') {
    return false;
  }

  return false;
}

/**
 * Deducts stock for a sale in the SQLite database.
 * IDEMPOTENT: If the sale has already deducted inventory (inventory_deducted == 1),
 * this operation will safely do nothing and return false.
 */
export async function deductStockForSale(
  saleId: string,
  saleNumber: string,
  items: any[],
  user?: InventoryUserContext
): Promise<{ success: boolean; deductedCount: number }> {
  try {
    const sale = await db.get<any>(
      'SELECT id, status, is_deleted, inventory_deducted, items_json FROM sales WHERE id = ?',
      [saleId]
    );

    if (!sale) {
      console.warn(`[Inventory] Venda ${saleId} não encontrada para baixa de estoque.`);
      return { success: false, deductedCount: 0 };
    }

    // Cancelled or deleted sales do not deduct inventory
    if (sale.status === 'CANCELADA' || sale.status === 'EXCLUIDA' || Number(sale.is_deleted) === 1) {
      return { success: false, deductedCount: 0 };
    }

    // Idempotency check: already deducted
    if (Number(sale.inventory_deducted) === 1) {
      console.log(`[Inventory] Baixa de estoque já efetuada para a venda ${saleNumber || saleId}. Ignorando duplicação.`);
      return { success: false, deductedCount: 0 };
    }

    let itemsToProcess = Array.isArray(items) && items.length > 0 ? items : [];
    if (itemsToProcess.length === 0 && sale.items_json) {
      try {
        itemsToProcess = JSON.parse(sale.items_json);
      } catch {
        itemsToProcess = [];
      }
    }

    const now = new Date().toISOString();
    let deductedCount = 0;

    for (const item of itemsToProcess) {
      const itemId = item.itemId || item.id;
      if (!itemId) continue;

      const dbItem = await db.get<any>(
        'SELECT * FROM items WHERE id = ? OR sku = ?',
        [itemId, item.sku || '']
      );

      if (!dbItem) continue;

      const physical = await isPhysicalItem(dbItem, item.itemType);
      if (!physical) continue;

      const qty = Math.max(0, Number(item.quantity) || 1);
      if (qty <= 0) continue;

      const variantId = item.configuration?.variantId || item.variantId;
      let prevStock = Number(dbItem.stock) || 0;
      let newStock = Math.max(0, prevStock - qty);
      let updatedVariantsJson = dbItem.variants_json;

      if (variantId && dbItem.variants_json) {
        try {
          const variants = JSON.parse(dbItem.variants_json);
          if (Array.isArray(variants)) {
            const vIdx = variants.findIndex((v: any) => v.id === variantId);
            if (vIdx >= 0) {
              const vPrevStock = Number(variants[vIdx].stock) || 0;
              variants[vIdx].stock = Math.max(0, vPrevStock - qty);
              newStock = variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
              updatedVariantsJson = JSON.stringify(variants);
            }
          }
        } catch {
          // If variants json parsing fails, use base stock calculation
        }
      }

      // Update item stock in SQLite
      await db.run(
        'UPDATE items SET stock = ?, variants_json = ?, updated_at = ? WHERE id = ?',
        [newStock, updatedVariantsJson, now, dbItem.id]
      );

      // Record movement in inventory_movements
      const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.run(
        `INSERT INTO inventory_movements (
          id, item_id, item_name, type, quantity, previous_stock, current_stock,
          reason, user_id, user_name, reference_id, reference_type, created_at
        ) VALUES (?, ?, ?, 'VENDA', ?, ?, ?, ?, ?, ?, ?, 'SALE', ?)`,
        [
          movId,
          dbItem.id,
          dbItem.name,
          -qty,
          prevStock,
          newStock,
          `Baixa automática por venda ${saleNumber || saleId}`,
          user?.id || 'SISTEMA',
          user?.name || 'Sistema PDV',
          saleId,
          now,
        ]
      );

      deductedCount++;
    }

    // Mark sale as inventory deducted
    await db.run(
      'UPDATE sales SET inventory_deducted = 1, inventory_reverted = 0, updated_at = ? WHERE id = ?',
      [now, saleId]
    );

    persistDatabase();
    return { success: true, deductedCount };
  } catch (err: any) {
    console.error(`[Inventory] Erro ao dar baixa no estoque da venda ${saleId}:`, err);
    throw err;
  }
}

/**
 * Restores stock for a cancelled or soft-deleted sale in SQLite.
 * IDEMPOTENT:
 * - If the sale NEVER deducted inventory (inventory_deducted != 1), it skips (prevents phantom restorations).
 * - If the sale has ALREADY restored inventory (inventory_reverted == 1), it skips (prevents duplicate restorations).
 */
export async function restoreStockForSale(
  saleId: string,
  saleNumber: string,
  user?: InventoryUserContext,
  reason?: string
): Promise<{ success: boolean; restoredCount: number }> {
  try {
    const sale = await db.get<any>(
      'SELECT id, sale_code, sale_number, inventory_deducted, inventory_reverted, items_json FROM sales WHERE id = ?',
      [saleId]
    );

    if (!sale) {
      console.warn(`[Inventory] Venda ${saleId} não encontrada para estorno de estoque.`);
      return { success: false, restoredCount: 0 };
    }

    // Rule: Do not restore if inventory was never deducted
    if (Number(sale.inventory_deducted) !== 1) {
      console.log(`[Inventory] A venda ${saleNumber || saleId} nunca teve estoque baixado. Pulando reposição.`);
      return { success: false, restoredCount: 0 };
    }

    // Rule: Do not restore if already restored
    if (Number(sale.inventory_reverted) === 1) {
      console.log(`[Inventory] O estoque da venda ${saleNumber || saleId} já foi restaurado anteriormente. Ignorando reposição duplicada.`);
      return { success: false, restoredCount: 0 };
    }

    let itemsToProcess = [];
    if (sale.items_json) {
      try {
        itemsToProcess = JSON.parse(sale.items_json);
      } catch {
        itemsToProcess = [];
      }
    }

    const now = new Date().toISOString();
    let restoredCount = 0;

    for (const item of itemsToProcess) {
      const itemId = item.itemId || item.id;
      if (!itemId) continue;

      const dbItem = await db.get<any>(
        'SELECT * FROM items WHERE id = ? OR sku = ?',
        [itemId, item.sku || '']
      );

      if (!dbItem) continue;

      const physical = await isPhysicalItem(dbItem, item.itemType);
      if (!physical) continue;

      const qty = Math.max(0, Number(item.quantity) || 1);
      if (qty <= 0) continue;

      const variantId = item.configuration?.variantId || item.variantId;
      let prevStock = Number(dbItem.stock) || 0;
      let newStock = prevStock + qty;
      let updatedVariantsJson = dbItem.variants_json;

      if (variantId && dbItem.variants_json) {
        try {
          const variants = JSON.parse(dbItem.variants_json);
          if (Array.isArray(variants)) {
            const vIdx = variants.findIndex((v: any) => v.id === variantId);
            if (vIdx >= 0) {
              const vPrevStock = Number(variants[vIdx].stock) || 0;
              variants[vIdx].stock = vPrevStock + qty;
              newStock = variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
              updatedVariantsJson = JSON.stringify(variants);
            }
          }
        } catch {
          // If variants json parsing fails, use base stock calculation
        }
      }

      // Update item stock in SQLite
      await db.run(
        'UPDATE items SET stock = ?, variants_json = ?, updated_at = ? WHERE id = ?',
        [newStock, updatedVariantsJson, now, dbItem.id]
      );

      // Record movement in inventory_movements
      const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.run(
        `INSERT INTO inventory_movements (
          id, item_id, item_name, type, quantity, previous_stock, current_stock,
          reason, user_id, user_name, reference_id, reference_type, created_at
        ) VALUES (?, ?, ?, 'DEVOLUCAO', ?, ?, ?, ?, ?, ?, ?, 'SALE', ?)`,
        [
          movId,
          dbItem.id,
          dbItem.name,
          qty,
          prevStock,
          newStock,
          reason || `Estorno por cancelamento da venda ${saleNumber || sale.sale_code || sale.sale_number}`,
          user?.id || 'SISTEMA',
          user?.name || 'Sistema PDV',
          saleId,
          now,
        ]
      );

      restoredCount++;
    }

    // Mark sale as inventory reverted
    await db.run(
      'UPDATE sales SET inventory_reverted = 1, updated_at = ? WHERE id = ?',
      [now, saleId]
    );

    persistDatabase();
    return { success: true, restoredCount };
  } catch (err: any) {
    console.error(`[Inventory] Erro ao restaurar estoque da venda ${saleId}:`, err);
    throw err;
  }
}

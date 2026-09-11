import {
  Boxes,
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Filter,
  Layers,
  Package,
  Plus,
  Search,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Category, Item, ItemType, ProductSeparation } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProductImage } from '../common/ProductImage';
import { ItemFormModal } from './ItemFormModal';
import { ProductImportModal } from './ProductImportModal';
import { ProductSeparationManagerModal } from './ProductSeparationManagerModal';

interface ItemListProps {
  categories: Category[];
  items: Item[];
  onItemsChange: () => void;
}

export const ItemList: React.FC<ItemListProps> = ({
  categories,
  items,
  onItemsChange,
}) => {
  const { isAdmin, canManageProducts, canViewCosts, isSeller } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [catalogFilter, setCatalogFilter] = useState<string>('TODOS');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSeparationsModalOpen, setIsSeparationsModalOpen] = useState(false);
  const [productSeparations, setProductSeparations] = useState<ProductSeparation[]>(() =>
    StorageService.getProductSeparations()
  );
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDuplicationMode, setIsDuplicationMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const handleSepsUpdated = () => {
      setProductSeparations(StorageService.getProductSeparations());
    };
    window.addEventListener('product-separations-updated', handleSepsUpdated);
    return () => {
      window.removeEventListener('product-separations-updated', handleSepsUpdated);
    };
  }, []);

  // Delete Confirm State
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const filteredItems = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        (item.name || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term) ||
        (item.barcode && item.barcode.includes(searchTerm)) ||
        (item.description && item.description.toLowerCase().includes(term));

      const matchType = typeFilter === 'TODOS' || item.type === typeFilter;
      const isPublished = item.active !== false && (item as any).active !== 0 && Boolean(item.showInCatalog);
      const matchCatalog =
        catalogFilter === 'TODOS' ||
        (catalogFilter === 'CATALOGO_SIM' && isPublished) ||
        (catalogFilter === 'CATALOGO_NAO' && !isPublished);

      return matchSearch && matchType && matchCatalog;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR') || a.id.localeCompare(b.id));
  }, [items, searchTerm, typeFilter, catalogFilter]);

  const handleOpenNew = () => {
    setEditingItem(null);
    setIsDuplicationMode(false);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsDuplicationMode(false);
    setIsFormOpen(true);
  };

  const handleDuplicate = async (item: Item) => {
    try {
      const duplicated = await StorageService.duplicateItem(item.id);
      onItemsChange();
      setEditingItem(duplicated);
      setIsDuplicationMode(true);
      setIsFormOpen(true);
      setToastMessage('Item duplicado com sucesso. Revise os dados antes de salvar.');
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar item');
    }
  };

  const handleToggleActive = async (item: Item) => {
    try {
      await StorageService.toggleItemActive(item.id);
      onItemsChange();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do item');
    }
  };

  const handleToggleCatalog = async (item: Item) => {
    try {
      await StorageService.toggleItemCatalog(item.id);
      onItemsChange();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar visibilidade no catálogo');
    }
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await StorageService.deleteItem(itemToDelete.id);
        setItemToDelete(null);
        onItemsChange();
        setToastMessage(`Produto "${itemToDelete.name}" removido com sucesso.`);
        setTimeout(() => setToastMessage(''), 5000);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir produto no servidor.');
      }
    }
  };

  const handleExportCSV = () => {
    StorageService.exportItemsToCSV(filteredItems, canViewCosts);
  };

  const getItemCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'Geral';
  };

  const getTypeBadge = (type: ItemType) => {
    switch (type) {
      case 'PRODUTO_GRAFICO':
        return <Badge variant="primary" size="sm">Gráfico</Badge>;
      case 'PRODUTO_FISICO':
        return <Badge variant="purple" size="sm">Físico</Badge>;
      case 'SERVICO':
        return <Badge variant="success" size="sm">Serviço</Badge>;
      default: {
        const sep = productSeparations.find((s) => s.id === type || s.name === type);
        return <Badge variant="indigo" size="sm">{sep?.name || type}</Badge>;
      }
    }
  };

  return (
    <div id="items-management-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Banner */}
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

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>Catálogo e Itens Comerciais</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {canManageProducts
              ? 'Gerencie produtos gráficos, produtos físicos e serviços digitais no catálogo integrado.'
              : 'Consulte os produtos gráficos, físicos e serviços disponíveis com preços de venda oficiais.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button
            type="button"
            id="btn-export-items-csv"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Exportar produtos filtrados para planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          {/* Import Products in Bulk (Admins & Collaborators) */}
          {canManageProducts && (
            <button
              type="button"
              id="btn-import-products"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Importar lista de produtos via planilha Excel ou CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar Lista</span>
            </button>
          )}

          {/* New Item Button (Admins & Collaborators) */}
          {canManageProducts && (
            <button
              type="button"
              id="btn-new-item"
              onClick={handleOpenNew}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="item-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SKU, código de barras..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'TODOS', label: 'Todos' },
              ...productSeparations.map((s) => ({
                id: s.id,
                label: s.name,
              })),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {canManageProducts && (
              <button
                type="button"
                id="btn-manage-separations-filter"
                onClick={() => setIsSeparationsModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Criar ou gerenciar separações/categorias de produtos"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Separação</span>
              </button>
            )}
          </div>

          {/* Catalog Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="TODOS">Todos na Vitrine</option>
              <option value="CATALOGO_SIM">Publicados no Catálogo</option>
              <option value="CATALOGO_NAO">Ocultos no Catálogo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Item e SKU</th>
                <th className="py-3.5 px-3">Tipo e Categoria</th>
                {canViewCosts && <th className="py-3.5 px-3">Custo Forn.</th>}
                <th className="py-3.5 px-3">Preço Venda</th>
                {canViewCosts && <th className="py-3.5 px-3">Margem (R$ / %)</th>}
                <th className="py-3.5 px-3">Estoque / Modelo</th>
                <th className="py-3.5 px-3 text-center">Catálogo</th>
                {canManageProducts && <th className="py-3.5 px-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !item.active ? 'opacity-40 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.name}
                            itemType={item.type}
                            imageSource={item.imageSource}
                            showBadge={true}
                            className="w-10 h-10 rounded-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm break-words whitespace-normal leading-snug">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {item.sku}
                              </span>
                              {item.barcode && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {item.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Category */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div>{getTypeBadge(item.type)}</div>
                          <span className="text-[11px] text-slate-500 font-medium block break-words whitespace-normal">
                            {getItemCategoryName(item.categoryId)}
                          </span>
                        </div>
                      </td>

                      {/* Cost (Admin/Colaborador only) */}
                      {canViewCosts && (
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' ? (
                            <span>{formatCurrency(item.areaPricing?.costPerM2)}/m²</span>
                          ) : (
                            formatCurrency(item.costPrice)
                          )}
                        </td>
                      )}

                      {/* Sale Price */}
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_M2' ? (
                          <span className="text-blue-700">{formatCurrency(item.areaPricing?.salePricePerM2)}/m²</span>
                        ) : item.type === 'PRODUTO_GRAFICO' && item.pricingModel === 'POR_PACOTE' ? (
                          <span className="text-blue-700">A partir de {formatCurrency(item.packages?.[0]?.salePrice || item.salePrice)}</span>
                        ) : (
                          <span className="text-blue-700 font-bold">{formatCurrency(item.salePrice)}</span>
                        )}
                      </td>

                      {/* Margins (Admin/Colaborador only) */}
                      {canViewCosts && (
                        <td className="py-3.5 px-3">
                          <div>
                            <span className="font-bold text-emerald-700 block">
                              +{formatCurrency(item.marginReais)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {formatPercent(item.marginPercent)}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Stock / Graphic Model / Service */}
                      <td className="py-3.5 px-3">
                        {item.type === 'PRODUTO_FISICO' ? (
                          <div>
                            <span
                              className={`font-bold text-xs ${
                                (item.stock || 0) <= (item.minStock || 5)
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {item.stock || 0} un
                            </span>
                            {item.variants && item.variants.length > 0 && (
                              <span className="text-[10px] text-purple-700 block font-medium">
                                {item.variants.length} variantes
                              </span>
                            )}
                            {(item.stock || 0) <= (item.minStock || 5) && (
                              <span className="text-[10px] text-rose-600 block font-bold">
                                Estoque Baixo!
                              </span>
                            )}
                          </div>
                        ) : item.type === 'PRODUTO_GRAFICO' ? (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {item.pricingModel === 'POR_PACOTE' || (item.packages && item.packages.length > 0)
                                ? 'Pacotes'
                                : item.pricingModel === 'POR_M2' || item.areaPricing
                                ? 'Preço por m²'
                                : item.pricingModel === 'POR_UNIDADE' || (item.priceRules && item.priceRules.length > 0)
                                ? 'Faixas de Qtd'
                                : 'Por Unidade'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.productionType === 'PRODUCAO_TERCEIRIZADA' ? 'Terceirizada' : 'Própria'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              Serviço Digital
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {(item as any).estimatedTime || 'Sob Demanda'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Catalog Visibility */}
                      <td className="py-3.5 px-3 text-center">
                        {canManageProducts ? (
                          <button
                            type="button"
                            disabled={item.active === false}
                            onClick={() => handleToggleCatalog(item)}
                            title={
                              item.active === false
                                ? 'Item desativado (não pode ser exibido na vitrine)'
                                : item.showInCatalog
                                ? 'Publicado na Vitrine (clique para ocultar)'
                                : 'Oculto na Vitrine (clique para publicar)'
                            }
                            className={`p-2 rounded-lg border transition-colors ${
                              item.active === false
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                                : item.showInCatalog
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            <Store className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className={`inline-flex p-1.5 rounded-md border ${
                              item.active !== false && item.showInCatalog
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                            }`}
                          >
                            <Store className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {canManageProducts && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Duplicate Action */}
                            <button
                              type="button"
                              onClick={() => handleDuplicate(item)}
                              title="Duplicar Item (gera novo SKU e abre para edição)"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Edit Action */}
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              title="Editar Item"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Toggle Active */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              title={item.active ? 'Desativar Item' : 'Ativar Item'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                item.active
                                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              {item.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            {/* Delete (Admin Only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete(item)}
                                title="Excluir Item"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canViewCosts ? (canManageProducts ? 8 : 7) : (canManageProducts ? 6 : 5)} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Nenhum item comercial encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tente alterar os filtros de busca {canManageProducts ? 'ou clique em "Novo Item".' : '.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <ItemFormModal
          key={editingItem ? `edit-${editingItem.id}` : isDuplicationMode ? 'dup-item' : 'new-item'}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          itemToEdit={editingItem}
          categories={categories}
          isDuplication={isDuplicationMode}
          onSaved={() => {
            onItemsChange();
            setIsFormOpen(false);
          }}
        />
      )}

      {/* Bulk Product Import Modal */}
      {isImportOpen && (
        <ProductImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          categories={categories}
          existingItems={items}
          onImportCompleted={() => {
            onItemsChange();
            setToastMessage('Importação de produtos realizada com sucesso!');
            setTimeout(() => setToastMessage(''), 4000);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Item Comercial"
        message={`Tem certeza que deseja excluir o item "${itemToDelete?.name}" (${itemToDelete?.sku})? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />

      {/* Product Separations Manager Modal */}
      <ProductSeparationManagerModal
        isOpen={isSeparationsModalOpen}
        onClose={() => setIsSeparationsModalOpen(false)}
      />
    </div>
  );
};

import {
  Check,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { CartItem, Item, ProductPackage } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface PackagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage: (pkg: ProductPackage, convertedCartItems: CartItem[]) => void;
}

export const PackagePickerModal: React.FC<PackagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPackage,
}) => {
  const [packages, setPackages] = useState<ProductPackage[]>(() =>
    StorageService.getPackages().filter((p) => p.active !== false)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('TODOS');

  const segments = Array.from(new Set(packages.map((p) => p.targetSegment || 'Geral')));

  const filteredPackages = packages.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    const matchSearch =
      String(p.name || '').toLowerCase().includes(term) ||
      (p.description ? p.description.toLowerCase().includes(term) : false);
    const matchSegment =
      selectedSegment === 'TODOS' || (p.targetSegment || 'Geral') === selectedSegment;
    return matchSearch && matchSegment;
  });

  const handleApplyPackage = (pkg: ProductPackage) => {
    const allCatalogItems = StorageService.getItems();

    // Converte os itens do pacote para CartItem prontos para inserção no orçamento/PDV
    const cartItems: CartItem[] = pkg.items.map((pkgItem, index) => {
      const realItem = allCatalogItems.find((i) => i.id === pkgItem.itemId);

      const fallbackItem: Item = {
        id: pkgItem.itemId,
        name: pkgItem.itemName,
        sku: `PKG-ITEM-${index + 1}`,
        categoryId: '',
        type: pkgItem.itemType,
        description: `Item do ${pkg.name}`,
        salePrice: pkgItem.unitPrice,
        costPrice: pkgItem.unitPrice * 0.4,
        marginReais: pkgItem.unitPrice * 0.6,
        marginPercent: 60,
        active: true,
        showInCatalog: true,
        featuredInCatalog: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const finalItem = realItem || fallbackItem;
      const unitCost = finalItem.costPrice || 0;

      return {
        cartItemId: `cart-pkg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        item: finalItem,
        quantity: pkgItem.quantity,
        unitPrice: pkgItem.unitPrice,
        unitCost,
        totalPrice: pkgItem.totalPrice || pkgItem.unitPrice * pkgItem.quantity,
        totalCost: unitCost * pkgItem.quantity,
        configuration: {
          packageName: pkg.name,
          packageId: pkg.id,
          notes: `Incluso no ${pkg.name}`,
        },
      };
    });

    onSelectPackage(pkg, cartItems);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 Selecionar Pacote / Kit Promocional para Venda"
      size="xl"
    >
      <div className="space-y-4">
        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pacotes (ex: Kit Restaurante, Novo Negócio...)"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-xs"
          >
            <option value="TODOS">Todos os Segmentos</option>
            {segments.map((seg) => (
              <option key={seg} value={seg}>
                {seg}
              </option>
            ))}
          </select>
        </div>

        {/* LISTA DE PACOTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-xl p-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-800">{pkg.name}</h4>
                  {pkg.discountPercent ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">
                      {pkg.discountPercent}% OFF
                    </span>
                  ) : null}
                </div>

                <span className="inline-block mt-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {pkg.targetSegment || 'Geral'}
                </span>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {pkg.description}
                </p>

                {/* ITENS INCLUSOS */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {pkg.items.length} Itens inclusos:
                  </div>
                  {pkg.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span className="truncate pr-2">
                        • {it.quantity}x {it.itemName}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatCurrency(it.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PREÇO E BOTÃO APLICAR */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 line-through">
                    De: {formatCurrency(pkg.originalTotal)}
                  </div>
                  <div className="text-base font-black text-emerald-600">
                    Por: {formatCurrency(pkg.packagePrice)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyPackage(pkg)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Kit ao Orçamento</span>
                </button>
              </div>
            </div>
          ))}

          {filteredPackages.length === 0 && (
            <div className="col-span-2 text-center py-8 text-slate-400 text-sm italic">
              Nenhum pacote encontrado para a busca.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

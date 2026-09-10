import {
  Layers,
  Minus,
  Package,
  Plus,
  PlusCircle,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage';
import { Item, ProductPackage, ProductPackageItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg?: ProductPackage | null;
  onSaved: (savedPackage: ProductPackage) => void;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  pkg,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetSegment, setTargetSegment] = useState('Geral');
  const [items, setItems] = useState<ProductPackageItem[]>([]);
  const [customPackagePrice, setCustomPackagePrice] = useState<number | ''>('');
  const [active, setActive] = useState(true);
  const [featuredInPublic, setFeaturedInPublic] = useState(true);

  // Seleção de produtos do catálogo
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const all = StorageService.getItems().filter((i) => i.active !== false);
      setCatalogItems(all);
      setError('');

      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description || '');
        setTargetSegment(pkg.targetSegment || 'Geral');
        setItems(pkg.items || []);
        setCustomPackagePrice(pkg.packagePrice);
        setActive(pkg.active !== false);
        setFeaturedInPublic(pkg.featuredInPublic !== false);
      } else {
        setName('');
        setDescription('');
        setTargetSegment('Geral');
        setItems([]);
        setCustomPackagePrice('');
        setActive(true);
        setFeaturedInPublic(true);
      }
    }
  }, [isOpen, pkg]);

  const originalTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const effectivePrice = customPackagePrice !== '' ? Number(customPackagePrice) : originalTotal;
  const discountPercent =
    originalTotal > 0 && effectivePrice < originalTotal
      ? Math.round(((originalTotal - effectivePrice) / originalTotal) * 100)
      : 0;

  const handleAddCatalogItem = () => {
    if (!selectedCatalogId) return;
    const catItem = catalogItems.find((i) => i.id === selectedCatalogId);
    if (!catItem) return;

    const unitPrice = catItem.basePrice || (catItem.priceRules && catItem.priceRules[0]?.price) || 0;
    const qty = Math.max(1, addItemQty);
    const totalPrice = unitPrice * qty;

    const newItem: ProductPackageItem = {
      itemId: catItem.id,
      itemName: catItem.name,
      itemType: catItem.type,
      quantity: qty,
      unitPrice,
      totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedCatalogId('');
    setAddItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            unitPrice: newPrice,
            totalPrice: newPrice * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do pacote.');
      return;
    }
    if (items.length === 0) {
      setError('Adicione pelo menos 1 produto ao pacote.');
      return;
    }

    try {
      const saved = StorageService.savePackage({
        id: pkg?.id,
        name: name.trim(),
        description: description.trim(),
        targetSegment: targetSegment.trim(),
        items,
        packagePrice: effectivePrice,
        active,
        featuredInPublic,
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar pacote.');
    }
  };

  const filteredCatalog = catalogItems.filter((i) => {
    if (!searchTerm) return true;
    return (
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pkg ? `Editar Pacote: ${pkg.name}` : 'Criar Novo Pacote / Kit de Produtos'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Pacote / Kit *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Kit Novo Negócio, Kit Restaurante, Kit Salão..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Segmento Alvo
            </label>
            <input
              type="text"
              value={targetSegment}
              onChange={(e) => setTargetSegment(e.target.value)}
              placeholder="Ex: Restaurantes, Salões de Beleza, Comércio Geral..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição / Benefícios do Pacote
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Explique o que está incluso e por que vale a pena para o cliente..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* PRODUTOS INCLUSOS NO PACOTE */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Itens Inclusos no Pacote ({items.length})</span>
            </div>
            <div className="text-xs text-slate-500">
              Soma Original: <strong>{formatCurrency(originalTotal)}</strong>
            </div>
          </div>

          {/* Adicionar Item */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <select
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um produto do catálogo...</option>
                {catalogItems.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — (R$ {(cat.basePrice || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Qtd:</span>
                <input
                  type="number"
                  min="1"
                  value={addItemQty}
                  onChange={(e) => setAddItemQty(Number(e.target.value))}
                  className="w-16 text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-center font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCatalogItem}
                disabled={!selectedCatalogId}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar ao Kit</span>
              </button>
            </div>
          </div>

          {/* Tabela de Itens */}
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{item.itemName}</div>
                    <div className="text-[11px] text-slate-500">
                      Preço Unit: R$ {item.unitPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(index, item.quantity - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center bg-white text-slate-600 hover:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(index, item.quantity + 1)}
                        className="w-6 h-6 rounded flex items-center justify-center bg-white text-slate-600 hover:bg-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-24 text-right font-bold text-slate-800">
                      {formatCurrency(item.totalPrice)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-4">
              Nenhum item adicionado ao pacote ainda. Selecione acima.
            </p>
          )}
        </div>

        {/* VALORES E PRECIFICAÇÃO PROMOCIONAL DO PACOTE */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <span className="block text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              Valor Total dos Itens
            </span>
            <span className="text-lg font-bold text-slate-700">
              {formatCurrency(originalTotal)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
              Preço Promocional do Pacote (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              value={customPackagePrice}
              onChange={(e) => setCustomPackagePrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={originalTotal.toFixed(2)}
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-base font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              Economia / Desconto
            </span>
            <span className="text-lg font-black text-emerald-600">
              {discountPercent > 0 ? `${discountPercent}% OFF` : 'Sem desconto'}
            </span>
          </div>
        </div>

        {/* VISIBILIDADE */}
        <div className="flex items-center gap-6 text-xs text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Pacote Ativo para Vendas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={featuredInPublic}
              onChange={(e) => setFeaturedInPublic(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Exibir na Vitrine e Landing Pages Públicas</span>
          </label>
        </div>

        {/* BOTÕES */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            {pkg ? 'Salvar Pacote' : 'Cadastrar Pacote'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

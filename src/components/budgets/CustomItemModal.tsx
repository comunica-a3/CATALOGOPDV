import {
  AlertCircle,
  Check,
  DollarSign,
  FileSpreadsheet,
  Info,
  Layers,
  Package,
  Sparkles,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import { CartItem, ItemType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customCartItem: CartItem) => void;
  initialItem?: CartItem | null;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<ItemType>('PRODUTO_GRAFICO');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Taxas de comissão configuradas pelo Administrador por Tipo de Item
  const commissionRates = useMemo(() => StorageService.getCommissionRates(), [isOpen]);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.item.name || '');
      setDescription(initialItem.configuration?.notes || initialItem.item.description || '');
      setItemType(initialItem.item.type || 'PRODUTO_GRAFICO');
      setQuantity(initialItem.quantity || 1);
      setUnitCost(initialItem.unitCost || 0);
      setUnitPrice(initialItem.unitPrice || 0);
      setErrorMessage('');
    } else {
      setName('');
      setDescription('');
      setItemType('PRODUTO_GRAFICO');
      setQuantity(1);
      setUnitCost(0);
      setUnitPrice(0);
      setErrorMessage('');
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  // Percentual de comissão correspondente ao Tipo de Item selecionado
  const currentCommissionRate = Math.max(0, Math.min(100, Number(commissionRates[itemType] ?? 0)));

  const totalSale = Number(((Number(unitPrice) || 0) * (Number(quantity) || 1)).toFixed(2));
  const totalCost = Number(((Number(unitCost) || 0) * (Number(quantity) || 1)).toFixed(2));
  const grossProfit = Number((totalSale - totalCost).toFixed(2));
  const estimatedCommission = Number(((totalSale * currentCommissionRate) / 100).toFixed(2));
  const estimatedCompanyShare = Number((totalSale - estimatedCommission).toFixed(2));

  const getItemTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'PRODUTO_GRAFICO':
        return 'Produto Gráfico (Impressos, Banners, Adesivos, Cartões)';
      case 'PRODUTO_FISICO':
        return 'Produto Físico (Acessórios, Materiais, Insumos de Revenda)';
      case 'SERVICO':
        return 'Serviço Digital (Consultas, Digitação, Criação, Emissão)';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome do item personalizado.');
      return;
    }
    if (quantity <= 0) {
      setErrorMessage('A quantidade deve ser maior ou igual a 1.');
      return;
    }
    if (unitPrice < 0) {
      setErrorMessage('O valor de venda não pode ser negativo.');
      return;
    }

    const defaultSku =
      itemType === 'PRODUTO_GRAFICO'
        ? 'PERS-GRAF'
        : itemType === 'PRODUTO_FISICO'
        ? 'PERS-FIS'
        : 'PERS-SRV';

    const customCartItem: CartItem = {
      cartItemId:
        initialItem?.cartItemId ||
        `custom-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      item: {
        id: initialItem?.item.id || `custom-${Date.now()}`,
        name: name.trim(),
        type: itemType,
        categoryId:
          itemType === 'PRODUTO_GRAFICO'
            ? 'cat-grafica'
            : itemType === 'PRODUTO_FISICO'
            ? 'cat-fisicos'
            : 'cat-servicos',
        sku: initialItem?.item.sku || defaultSku,
        description: description.trim() || 'Item personalizado sob demanda',
        costPrice: Number(unitCost) || 0,
        salePrice: Number(unitPrice) || 0,
        marginReais: Number(((Number(unitPrice) || 0) - (Number(unitCost) || 0)).toFixed(2)),
        marginPercent:
          unitPrice > 0
            ? Number(
                ((((Number(unitPrice) || 0) - (Number(unitCost) || 0)) / (Number(unitPrice) || 1)) * 100).toFixed(2)
              )
            : 0,
        active: true,
        showInCatalog: false,
        featuredInCatalog: false,
        isCustom: true,
        createdAt: initialItem?.item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      unitCost: Number(unitCost) || 0,
      totalPrice: totalSale,
      totalCost: totalCost,
      configuration: {
        notes: description.trim() || undefined,
      },
      isCustom: true,
    };

    onSave(customCartItem);
    onClose();
  };

  return (
    <Modal
      id="custom-item-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={initialItem ? 'Editar Item Personalizado' : '+ Adicionar Item Personalizado'}
      subtitle="Item exclusivo para este orçamento/venda sem alterar o catálogo fixo do sistema"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Informative Banner */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Item Sob Demanda (Snapshot)</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Este item existirá somente neste orçamento/venda. Ele <strong>não</strong> será
              cadastrado como produto fixo no catálogo geral.
            </p>
          </div>
        </div>

        {/* 1. Nome do Item */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Nome do Item *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Faixa em Lona 3x0.70m com acabamento em madeira"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium"
          />
        </div>

        {/* 2. Descrição / Detalhes */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Descrição / Especificações Técnicas (Opcional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Lona 440g fosca, impressão alta resolução, acabamento com madeira e ponteiras plásticas nas extremidades"
            className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none"
          />
        </div>

        {/* 3. Tipo de Item (Pré-definido no sistema) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Tipo de Item *
          </label>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as ItemType)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="PRODUTO_GRAFICO">{getItemTypeLabel('PRODUTO_GRAFICO')}</option>
            <option value="PRODUTO_FISICO">{getItemTypeLabel('PRODUTO_FISICO')}</option>
            <option value="SERVICO">{getItemTypeLabel('SERVICO')}</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            O tipo de item determina as regras de comissão e categorização interna.
          </p>
        </div>

        {/* 4. Quantidade, Valor de Custo e Valor de Venda */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quantidade */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Quantidade *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold"
            />
          </div>

          {/* Valor de Custo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Valor de Custo (R$)
              </label>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost || ''}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
            />
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Uso interno (oculto no orçamento)
            </span>
          </div>

          {/* Valor de Venda */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Valor de Venda Unit. (R$) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={unitPrice || ''}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-blue-700"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Total: {formatCurrency(totalSale)}
            </span>
          </div>
        </div>

        {/* 5. Painel de Regras de Comissão & Prévia Financeira */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Regra de Comissão por Tipo:</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {currentCommissionRate}% ({itemType === 'PRODUTO_GRAFICO' ? 'Gráfico' : itemType === 'PRODUTO_FISICO' ? 'Físico' : 'Serviço'})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-400 block">Subtotal Venda</span>
              <span className="font-bold text-slate-800">{formatCurrency(totalSale)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Custo Total</span>
              <span className="font-bold text-slate-600">{formatCurrency(totalCost)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Comissão Vendedor</span>
              <span className="font-bold text-emerald-700">{formatCurrency(estimatedCommission)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Repasse Empresa</span>
              <span className="font-bold text-blue-800">{formatCurrency(estimatedCompanyShare)}</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-save-custom-item"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialItem ? 'Salvar Alterações' : 'Adicionar ao Orçamento'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

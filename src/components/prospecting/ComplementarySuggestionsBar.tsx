import { Plus, Sparkles, TrendingUp } from 'lucide-react';
import React from 'react';
import { StorageService } from '../../services/storage';
import { CartItem, Item } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ComplementarySuggestionsBarProps {
  cartItems: CartItem[];
  onAddItem: (item: Item) => void;
}

export const ComplementarySuggestionsBar: React.FC<ComplementarySuggestionsBarProps> = ({
  cartItems,
  onAddItem,
}) => {
  if (cartItems.length === 0) return null;

  const itemNames = cartItems.map((ci) => ci.item.name);
  const suggestions = StorageService.getComplementarySuggestionsForCart(itemNames);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>Aumento de Venda — Produtos Complementares Recomendados:</span>
        </div>
        <span className="text-[11px] text-amber-700 font-medium">
          Adicione com 1 clique para aumentar o ticket do pedido
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {suggestions.map((item) => {
          const price = item.salePrice || (item.priceRules && item.priceRules[0]?.unitSalePrice) || 0;
          return (
            <div
              key={item.id}
              className="bg-white border border-amber-200/80 rounded-lg p-2 flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                  {formatCurrency(price)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAddItem(item)}
                className="mt-2 w-full py-1 px-2 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

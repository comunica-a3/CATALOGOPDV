import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { CompanySettings, VitrineCartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ProductImage } from '../common/ProductImage';

interface CatalogCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: VitrineCartItem[];
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  companySettings: CompanySettings;
}

export const CatalogCartModal: React.FC<CatalogCartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  companySettings,
}) => {
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Total de itens individuais somando as quantidades
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Total geral monetário
  const totalGeneral = cartItems.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );

  const handleSendToWhatsApp = () => {
    if (cartItems.length === 0) return;

    const rawPhone = companySettings?.phone?.replace(/\D/g, '') || '';
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    // Construção da mensagem estritamente no padrão solicitado:
    // Olá! Gostaria de solicitar um orçamento para:
    //
    // 1x Banner Personalizado — R$ 150,00
    // 2x Crachá Personalizado — R$ 40,00
    // 1x Kit Corporativo — R$ 120,00
    //
    // Total: R$ 310,00
    let message = `Olá! Gostaria de solicitar um orçamento para:\n\n`;

    cartItems.forEach((item) => {
      const itemSubtotal = formatCurrency(item.unitPrice * item.quantity);
      let itemLineTitle = item.labelDisplay || item.name;

      // Adiciona detalhes adicionais concisos se houver
      const extraDetails: string[] = [];
      if (item.dimensions) {
        extraDetails.push(
          `${item.dimensions.width}${item.dimensions.unit} x ${item.dimensions.height}${item.dimensions.unit}`
        );
      }
      if (item.variantName) {
        extraDetails.push(item.variantName);
      }
      if (item.packageName) {
        extraDetails.push(item.packageName);
      }

      if (extraDetails.length > 0 && !item.labelDisplay?.includes(extraDetails[0])) {
        itemLineTitle += ` (${extraDetails.join(', ')})`;
      }

      message += `${item.quantity}x ${itemLineTitle} — ${itemSubtotal}\n`;
    });

    message += `\nTotal: ${formatCurrency(totalGeneral)}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      id="catalog-cart-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Carrinho de Compras"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Top Header Information */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm">Itens Selecionados</span>
              <span className="text-xs text-slate-500 block">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'itens'} no seu pedido
              </span>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Esvaziar carrinho
            </button>
          )}
        </div>

        {/* Confirmação de Esvaziar */}
        {isConfirmClearOpen && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Deseja realmente remover todos os itens do carrinho?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  setIsConfirmClearOpen(false);
                }}
                className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Sim, esvaziar
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        {cartItems.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <h4 className="font-bold text-slate-800 text-base">Seu carrinho está vazio</h4>
              <p className="text-xs text-slate-500">
                Explore os produtos e serviços da vitrine e clique em &quot;Adicionar ao carrinho&quot; para montar seu pedido.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Explorar Vitrine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto pr-1">
            {cartItems.map((cartItem) => {
              const subtotal = cartItem.unitPrice * cartItem.quantity;

              return (
                <div
                  key={cartItem.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 group"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <ProductImage
                      src={cartItem.imageUrl}
                      alt={cartItem.name}
                      itemType={cartItem.type}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {cartItem.labelDisplay || cartItem.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(cartItem.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover produto do carrinho"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Especificações se houver */}
                    {(cartItem.dimensions || cartItem.variantName || cartItem.packageName) && (
                      <p className="text-[11px] text-slate-500">
                        {cartItem.dimensions && (
                          <span>
                            Medidas: {cartItem.dimensions.width}
                            {cartItem.dimensions.unit} x {cartItem.dimensions.height}
                            {cartItem.dimensions.unit}
                            {cartItem.dimensions.areaM2 ? ` (${cartItem.dimensions.areaM2} m²)` : ''}
                          </span>
                        )}
                        {cartItem.variantName && <span> • {cartItem.variantName}</span>}
                        {cartItem.packageName && <span> • {cartItem.packageName}</span>}
                      </p>
                    )}

                    {/* Quantity controls & Prices */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {/* Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (cartItem.quantity > 1) {
                              onUpdateQuantity(cartItem.id, cartItem.quantity - 1);
                            } else {
                              onRemoveItem(cartItem.id);
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                          title="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-extrabold text-slate-900 min-w-7 text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                          className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                          title="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Unit price & Subtotal */}
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-medium">
                          {formatCurrency(cartItem.unitPrice)} un.
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with Total and WhatsApp Action */}
        {cartItems.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                  Total Estimado ({totalQuantity} {totalQuantity === 1 ? 'item' : 'itens'})
                </span>
                <span className="text-2xl font-black text-white">
                  {formatCurrency(totalGeneral)}
                </span>
              </div>

              <button
                type="button"
                id="btn-cart-solicitar-whatsapp"
                onClick={handleSendToWhatsApp}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl shadow-md shadow-emerald-500/30 transition-all cursor-pointer hover:scale-102"
              >
                <MessageCircle className="w-5 h-5 fill-white/20" />
                <span>Solicitar pelo WhatsApp</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Continuar escolhendo produtos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] text-slate-400">
                Atendimento via WhatsApp • {companySettings.phone}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

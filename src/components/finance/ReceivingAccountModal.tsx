import { AlertCircle, Building2, Check, CreditCard, DollarSign, QrCode, X } from 'lucide-react';
import React, { useState } from 'react';
import { AccountType, ReceivingAccount } from '../../types';
import { Modal } from '../common/Modal';

interface ReceivingAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: ReceivingAccount | null;
  onSave: (account: ReceivingAccount) => void;
}

export const ReceivingAccountModal: React.FC<ReceivingAccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
  onSave,
}) => {
  const [type, setType] = useState<AccountType>(accountToEdit?.type || 'PIX');
  const [name, setName] = useState(accountToEdit?.name || '');
  const [receiverName, setReceiverName] = useState(accountToEdit?.receiverName || '');
  const [initialBalance, setInitialBalance] = useState<string>(
    accountToEdit?.initialBalance !== undefined ? String(accountToEdit.initialBalance) : '0'
  );
  const [creditFeePercent, setCreditFeePercent] = useState<string>(
    accountToEdit?.creditFeePercent !== undefined ? String(accountToEdit.creditFeePercent) : '3.50'
  );
  const [debitFeePercent, setDebitFeePercent] = useState<string>(
    accountToEdit?.debitFeePercent !== undefined ? String(accountToEdit.debitFeePercent) : '1.50'
  );
  const [active, setActive] = useState<boolean>(accountToEdit?.active ?? true);
  const [notes, setNotes] = useState(accountToEdit?.notes || '');
  const [error, setError] = useState('');

  // Pre-generate nice title if user types receiver
  const handleReceiverChange = (val: string) => {
    setReceiverName(val);
    if (!accountToEdit) {
      const typeLabel =
        type === 'CAIXA' ? 'Caixa' : type === 'PIX' ? 'Pix' : type === 'CARTAO' ? 'Cartão' : 'Outro';
      setName(`${typeLabel} — ${val.trim() || 'Nova Conta'}`);
    }
  };

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    if (!accountToEdit) {
      const typeLabel =
        newType === 'CAIXA' ? 'Caixa' : newType === 'PIX' ? 'Pix' : newType === 'CARTAO' ? 'Cartão' : 'Outro';
      setName(`${typeLabel} — ${receiverName.trim() || (newType === 'CAIXA' ? 'Caixa físico' : 'Empresa')}`);
      if (newType === 'CAIXA' && !receiverName) {
        setReceiverName('Caixa físico');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da conta é obrigatório.');
      return;
    }
    if (!receiverName.trim()) {
      setError('O nome de quem recebe é obrigatório.');
      return;
    }

    const creditFee = type === 'CARTAO' ? Math.max(0, parseFloat(creditFeePercent) || 0) : undefined;
    const debitFee = type === 'CARTAO' ? Math.max(0, parseFloat(debitFeePercent) || 0) : undefined;
    const initBal = Math.max(0, parseFloat(initialBalance) || 0);

    const newAccount: ReceivingAccount = {
      id: accountToEdit?.id || `acc-${Date.now()}`,
      type,
      name: name.trim(),
      receiverName: receiverName.trim(),
      initialBalance: initBal,
      creditFeePercent: creditFee,
      debitFeePercent: debitFee,
      active,
      isDefault: accountToEdit?.isDefault || false,
      notes: notes.trim() || undefined,
      createdAt: accountToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newAccount);
    onClose();
  };

  return (
    <Modal
      id="receiving-account-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? 'Editar Conta de Recebimento' : 'Nova Conta de Recebimento'}
      subtitle="Defina o tipo, recebedor e taxas aplicáveis (para maquininhas de cartão)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Type selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tipo de Recebimento *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'PIX', label: 'Pix', icon: QrCode, color: 'text-teal-600' },
              { id: 'CARTAO', label: 'Cartão / Maquininha', icon: CreditCard, color: 'text-indigo-600' },
              { id: 'CAIXA', label: 'Caixa Físico', icon: DollarSign, color: 'text-emerald-600' },
              { id: 'OUTRO', label: 'Outro / Banco', icon: Building2, color: 'text-slate-600' },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id as AccountType)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${t.color}`} />
                  <span className="text-xs text-center">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Receiver Name & Display Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quem recebe / Titular *
            </label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={(e) => handleReceiverChange(e.target.value)}
              placeholder="Ex: João, Maria, Empresa, Gaveta"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Identifica o responsável ou destino.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome de Exibição da Conta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pix — João, Cartão — Empresa"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Aparecerá no PDV e relatórios.</p>
          </div>
        </div>

        {/* Card Rates if type === CARTAO */}
        {type === 'CARTAO' && (
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-700" />
              <span className="text-xs font-bold text-indigo-900">
                Taxas da Maquininha (Custo da Loja)
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Essas taxas serão deduzidas automaticamente nas vendas para apuração do valor líquido e custo operacional real.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taxa Cartão de Crédito (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={creditFeePercent}
                    onChange={(e) => setCreditFeePercent(e.target.value)}
                    placeholder="3.50"
                    className="w-full px-3 py-2 pr-8 text-xs sm:text-sm bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Padrão do mercado: ~3.50%</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taxa Cartão de Débito (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={debitFeePercent}
                    onChange={(e) => setDebitFeePercent(e.target.value)}
                    placeholder="1.50"
                    className="w-full px-3 py-2 pr-8 text-xs sm:text-sm bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Padrão do mercado: ~1.50%</p>
              </div>
            </div>
          </div>
        )}

        {/* Active Toggle & Notes */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="account-active-toggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="account-active-toggle"
              className="text-xs font-bold text-slate-700 cursor-pointer"
            >
              Conta Ativa (Disponível para seleção no PDV)
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Saldo Inicial Disponível (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Saldo de partida desta conta para controle e transferências.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações / Instruções (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Maquininha portátil da Stone, Chave aleatória do Nubank..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Conta</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

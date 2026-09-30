import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, CreditCard, Building2, Info, ArrowDownCircle } from 'lucide-react';
import { Expense, ExpenseNature, ReceivingAccount } from '../../types';
import { StorageService } from '../../services/storage';
import { formatCurrency } from '../../utils/formatters';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  expenseToEdit?: Expense | null;
}

const CATEGORIES = [
  'Pessoal',
  'Materiais/Produção',
  'Despesas Fixas',
  'Manutenção',
  'Transporte',
  'Serviços',
  'Energia / Água / Internet',
  'Administrativo',
  'Retirada de Sócios / Pró-labore',
  'Outros',
];

const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Transferência Bancária',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Boleto',
  'Outros',
];

const NATURE_OPTIONS: Array<{
  id: ExpenseNature;
  label: string;
  desc: string;
  badge: string;
}> = [
  {
    id: 'OPERACIONAL',
    label: 'Despesa Operacional',
    desc: 'Pagamento de pessoal, materiais, contas, energia ou serviços. Reduz o saldo da conta e ENTRA na DRE Gerencial.',
    badge: 'Impacta DRE e Caixa',
  },
  {
    id: 'RETIRADA_PESSOAL',
    label: 'Retirada Pessoal / Pró-labore',
    desc: 'Retirada pessoal do proprietário / sócios. Reduz a conta de origem, mas NÃO entra na DRE como despesa da empresa.',
    badge: 'Reduz Saldo (Não afeta DRE)',
  },
  {
    id: 'NAO_OPERACIONAL',
    label: 'Não Operacional',
    desc: 'Outras saídas financeiras não operacionais. Reduz o saldo da conta sem impactar o resultado operacional na DRE.',
    badge: 'Reduz Saldo (Não afeta DRE)',
  },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseToEdit,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [nature, setNature] = useState<ExpenseNature>('OPERACIONAL');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState<ReceivingAccount[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;

    const loadedAccounts = StorageService.getReceivingAccounts().filter((a) => a.active);
    setAccounts(loadedAccounts);

    const balances: Record<string, number> = {};
    loadedAccounts.forEach((acc) => {
      balances[acc.id] = StorageService.getAccountBalance(acc.id);
    });
    setAccountBalances(balances);

    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setDate(expenseToEdit.date);
      setCategory(expenseToEdit.category || CATEGORIES[0]);
      setPaymentMethod(expenseToEdit.paymentMethod || PAYMENT_METHODS[0]);
      setAccountId(expenseToEdit.accountId || (loadedAccounts[0]?.id || ''));
      setNature(expenseToEdit.nature || (expenseToEdit.type === 'RETIRADA_PESSOAL' ? 'RETIRADA_PESSOAL' : 'OPERACIONAL'));
      setObservation(expenseToEdit.observation || '');
    } else {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(CATEGORIES[0]);
      // Default account: prefer default or first CAIXA or first available
      const defaultAcc = loadedAccounts.find((a) => a.isDefault && a.type === 'CAIXA') || loadedAccounts[0];
      setAccountId(defaultAcc ? defaultAcc.id : '');
      setPaymentMethod(defaultAcc?.type === 'CAIXA' ? 'Dinheiro' : 'PIX');
      setNature('OPERACIONAL');
      setObservation('');
    }
    setError('');
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    const selected = accounts.find((a) => a.id === newAccId);
    if (selected) {
      if (selected.type === 'CAIXA') {
        setPaymentMethod('Dinheiro');
      } else if (selected.type === 'PIX') {
        setPaymentMethod('PIX');
      } else if (selected.type === 'CARTAO') {
        setPaymentMethod('Cartão de Débito');
      } else if (selected.type === 'OUTRO') {
        setPaymentMethod('Transferência Bancária');
      }
    }
  };

  const handleNatureChange = (newNature: ExpenseNature) => {
    setNature(newNature);
    if (newNature === 'RETIRADA_PESSOAL' && (category === 'Materiais/Produção' || category === 'Despesas Fixas')) {
      setCategory('Retirada de Sócios / Pró-labore');
    } else if (newNature === 'OPERACIONAL' && category === 'Retirada de Sócios / Pró-labore') {
      setCategory('Pessoal');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Informe a descrição da despesa ou saída.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }
    if (!date) {
      setError('Informe a data da movimentação.');
      return;
    }
    if (!accountId) {
      setError('Selecione a conta de origem da saída.');
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);

    try {
      StorageService.saveExpense({
        id: expenseToEdit ? expenseToEdit.id : undefined,
        description: description.trim(),
        amount: numAmount,
        date,
        category,
        paymentMethod,
        accountId,
        accountName: selectedAccount?.name || 'Conta Financeira',
        nature,
        type: nature === 'OPERACIONAL' ? 'DESPESA_OPERACIONAL' : nature,
        observation: observation.trim() || undefined,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar despesa.');
    }
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedBalance = accountId ? (accountBalances[accountId] ?? 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {expenseToEdit ? 'Editar Saída Financeira / Despesa' : 'Lançar Saída Financeira / Despesa'}
              </h3>
              <p className="text-xs text-slate-500">
                Registra uma única saída financeira deduzindo da conta e integrando com a DRE.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Classification / Nature Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo / Natureza da Saída *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {NATURE_OPTIONS.map((opt) => {
                const isSelected = nature === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleNatureChange(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? opt.id === 'OPERACIONAL'
                          ? 'border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                          : opt.id === 'RETIRADA_PESSOAL'
                          ? 'border-purple-500 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? opt.id === 'OPERACIONAL'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-purple-200 text-purple-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {NATURE_OPTIONS.find((o) => o.id === nature)?.desc}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição da Despesa / Saída *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento de pessoal, Tinta para impressora, Energia elétrica..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor da Saída (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data do Lançamento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Account and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Conta de Origem (De onde sai o dinheiro) *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  <option value="" disabled>Selecione a conta...</option>
                  {accounts.map((acc) => {
                    const bal = accountBalances[acc.id] ?? 0;
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>
              {selectedAccount && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Saldo disponível:</span>
                  <span className={`font-bold ${selectedBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(selectedBalance)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Forma de Pagamento
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observação Opcional
              </label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="NF, fornecedor ou detalhe da saída..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {expenseToEdit ? 'Salvar Alterações' : 'Registrar Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


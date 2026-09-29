import { AlertCircle, Check, Phone, UserCheck, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { Customer } from '../../types';
import { extractPhoneDigits, formatPhone, isValidPhone, maskPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';

interface POSCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onCustomerCreated?: (customer: Customer) => void;
}

export const POSCustomerModal: React.FC<POSCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onCustomerCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setDocument('');
      setEmail('');
      setAddress('');
      setNotes('');
      setErrorMsg('');
      setDuplicateCustomer(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateCustomer(null);

    if (!name.trim()) {
      setErrorMsg('O Nome do cliente é obrigatório.');
      return;
    }

    const cleanPhone = extractPhoneDigits(phone);
    if (!cleanPhone || !isValidPhone(cleanPhone, true)) {
      setErrorMsg('Informe um Telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }

    // Verificar duplicidade de telefone
    const duplicate = StorageService.checkDuplicateCustomerPhone(phone);
    if (duplicate) {
      setDuplicateCustomer(duplicate);
      setErrorMsg(`Já existe um cliente cadastrado com o telefone ${formatPhone(phone)}: "${duplicate.name}".`);
      return;
    }

    const newCustomer: Customer = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: formatPhone(phone),
      document: document.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = StorageService.saveCustomer(newCustomer);
      if (onCustomerCreated) {
        onCustomerCreated(saved);
      }
      if (onSelectCustomer) {
        onSelectCustomer(saved);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao cadastrar cliente.');
    }
  };

  const handleUseExistingCustomer = () => {
    if (duplicateCustomer) {
      if (onSelectCustomer) {
        onSelectCustomer(duplicateCustomer);
      }
      onClose();
    }
  };

  return (
    <Modal
      id="pos-customer-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Cliente"
      subtitle="Os únicos campos obrigatórios são Nome e Telefone"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {duplicateCustomer && (
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-rose-200">
                <span className="text-[11px] text-rose-700">
                  Deseja selecionar o cadastro existente de <strong>{duplicateCustomer.name}</strong>?
                </span>
                <button
                  type="button"
                  onClick={handleUseExistingCustomer}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Utilizar este Cliente</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">
            Nome do Cliente / Razão Social *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João da Silva / Restaurante Bom Sabor"
            className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp / Telefone *</span>
            </label>
            <PhoneInput
              id="pos-customer-phone-input"
              required
              value={phone}
              onChange={(masked) => setPhone(masked)}
              placeholder="(11) 99999-9999"
              className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              CPF / CNPJ (Opcional)
            </label>
            <input
              type="text"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            E-mail (Opcional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com"
            className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Endereço Completo (Opcional)
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, Número, Bairro, Cidade"
            className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Observações (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferências, regras comerciais..."
            className="w-full px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar e Selecionar</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

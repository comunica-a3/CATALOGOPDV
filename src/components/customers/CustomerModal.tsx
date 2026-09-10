import { AlertCircle, Check, MapPin, Phone, User, UserCheck, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Customer } from '../../types';
import { extractPhoneDigits, formatPhone, isValidPhone, maskPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSave: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<'PF' | 'PJ'>('PF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setType(customerToEdit.type || 'PF');
      setDocument(customerToEdit.document || '');
      setPhone(customerToEdit.phone ? maskPhone(customerToEdit.phone) : '');
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address || '');
      setCity(customerToEdit.city || '');
      setState(customerToEdit.state || '');
      setZipCode(customerToEdit.zipCode || '');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setType('PF');
      setDocument('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('');
      setZipCode('');
      setNotes('');
    }
    setErrorMsg('');
    setDuplicateCustomer(null);
  }, [customerToEdit, isOpen]);

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

    // Verificar duplicidade de telefone no cadastro
    const duplicate = StorageService.checkDuplicateCustomerPhone(phone, customerToEdit?.id);
    if (duplicate) {
      setDuplicateCustomer(duplicate);
      setErrorMsg(`Já existe um cliente cadastrado com o telefone ${formatPhone(phone)}: "${duplicate.name}".`);
      return;
    }

    const isPromoter = currentUser?.role === 'PROMOTOR';

    const customer: Customer = {
      id: customerToEdit?.id || `cust-${Date.now()}`,
      name: name.trim(),
      type,
      document: document.trim() || undefined,
      phone: formatPhone(phone),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      notes: notes.trim() || undefined,
      promoterId: customerToEdit?.promoterId || (isPromoter ? currentUser.id : undefined),
      promoterName: customerToEdit?.promoterName || (isPromoter ? currentUser.name : undefined),
      createdAt: customerToEdit?.createdAt || new Date().toISOString(),
    };

    try {
      onSave(customer);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar cliente.');
    }
  };

  const handleUseExistingCustomer = () => {
    if (duplicateCustomer) {
      onSave(duplicateCustomer);
      onClose();
    }
  };

  return (
    <Modal
      id="customer-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Editar Cliente' : 'Novo Cliente'}
      subtitle="Os únicos campos obrigatórios são Nome e Telefone"
      maxWidth="xl"
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
                  Deseja utilizar o cadastro existente de <strong>{duplicateCustomer.name}</strong>?
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

        {/* Tipo de Pessoa (Opcional, padrão PF) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Tipo de Pessoa (Opcional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('PF')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                type === 'PF'
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Pessoa Física (PF)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('PJ')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                type === 'PJ'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pessoa Jurídica (PJ / Empresa)</span>
            </button>
          </div>
        </div>

        {/* Name & Phone (Campos OBRIGATÓRIOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              {type === 'PF' ? 'Nome Completo *' : 'Razão Social / Nome Fantasia *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'PF' ? 'Ex: Maria Silva' : 'Ex: Gráfica Express Ltda'}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Telefone / WhatsApp *</span>
            </label>
            <PhoneInput
              id="customer-phone-input"
              required
              value={phone}
              onChange={(masked) => setPhone(masked)}
              placeholder="(11) 99999-9999"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium"
            />
          </div>

          {/* CPF / CNPJ (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {type === 'PF' ? 'CPF (Opcional)' : 'CNPJ (Opcional)'}
            </label>
            <input
              type="text"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder={type === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
            />
          </div>

          {/* E-mail (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              E-mail (Opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Address (Opcional) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Endereço (Opcional)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, complemento e bairro"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="UF (Ex: SP)"
                maxLength={2}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase text-slate-900"
              />
            </div>
            <div>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="CEP"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Notes (Opcional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Observações Internas (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferências, regras comerciais, observações..."
            className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Cliente</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};


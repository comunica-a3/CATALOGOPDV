import { Building2, FileText, MapPin, Phone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Opportunity } from '../../types';
import { formatPhone, isValidPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  onSaved: (savedOpp: Opportunity) => void;
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSaved,
}) => {
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (opportunity) {
        setName(opportunity.name || '');
        setPhone(opportunity.phone || opportunity.whatsapp || '');
        setNeighborhood(opportunity.neighborhood || '');
        setNotes(opportunity.notes || '');
      } else {
        setName('');
        setPhone('');
        setNeighborhood('');
        setNotes('');
      }
    }
  }, [isOpen, opportunity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do contato ou empresa.');
      return;
    }
    if (!isValidPhone(phone, true)) {
      setError('Por favor, informe um WhatsApp / Telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }

    const formattedPhone = formatPhone(phone);

    try {
      const saved = StorageService.saveOpportunity({
        id: opportunity?.id,
        name: name.trim(),
        phone: formattedPhone,
        whatsapp: formattedPhone,
        neighborhood: neighborhood.trim() || undefined,
        notes: notes.trim() || undefined,
        // Status controlado automaticamente pelo sistema: inicia como PARA_CONTATAR ou mantém o atual ao editar
        stage: opportunity?.stage || 'PARA_CONTATAR',
        assignedUserId: opportunity?.assignedUserId || currentUser.id,
        assignedUserName: opportunity?.assignedUserName || currentUser.name,
        origin: opportunity?.origin || 'PROSPECCAO_PRESENCIAL',
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar lead.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={opportunity ? 'Editar Lead' : 'Novo Lead — Captação Ativa'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Nome do Contato / Empresa */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Nome do Contato / Empresa *</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Padaria Central ou Marcos - Padaria Central"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
            autoFocus
            required
          />
        </div>

        {/* 2. WhatsApp / Telefone */}
        <div>
          <PhoneInput
            label="WhatsApp / Telefone"
            value={phone}
            onChange={setPhone}
            required={true}
            showError={false}
          />
        </div>

        {/* 3. Bairro / Região */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Bairro / Região</span>
          </label>
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Ex: Centro, Zona Sul, Av. Principal..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
          />
        </div>

        {/* 4. Observação */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Observação (Opcional)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Fachada precisando de lona nova ou pediu para entrar em contato na quinta-feira"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>{opportunity ? 'Salvar Alterações' : 'Cadastrar Lead'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

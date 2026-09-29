import {
  AlertCircle,
  Building2,
  Check,
  MapPin,
  Phone,
  Search,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import { Customer } from '../../types';
import { formatDocument, formatPhone, normalizePhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onRequestNewCustomer?: () => void;
  title?: string;
}

export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onRequestNewCustomer,
  title = 'Identificar Cliente Cadastrado',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());

  // Recarregar clientes ao abrir o modal
  React.useEffect(() => {
    if (isOpen) {
      setCustomers(StorageService.getCustomers());
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    const termDigits = normalizePhone(term);

    return customers.filter((c) => {
      // Busca por Nome
      const matchName = c.name.toLowerCase().includes(term);

      // Busca por Telefone (comparando formato visual e dígitos normalizados)
      const phoneDigits = normalizePhone(c.phone);
      const matchPhone =
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (termDigits.length > 0 && phoneDigits.includes(termDigits));

      // Busca por Documento (CPF / CNPJ)
      const docDigits = (c.document || '').replace(/\D/g, '');
      const matchDoc =
        (c.document && c.document.toLowerCase().includes(term)) ||
        (termDigits.length > 0 && docDigits.includes(termDigits));

      // Busca por Cidade ou E-mail
      const matchCity = c.city ? c.city.toLowerCase().includes(term) : false;
      const matchEmail = c.email ? c.email.toLowerCase().includes(term) : false;

      return matchName || matchPhone || matchDoc || matchCity || matchEmail;
    });
  }, [customers, searchTerm]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  return (
    <Modal
      id="customer-search-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Pesquise por Nome ou Telefone para localizar e selecionar o cliente cadastrado"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Campo de Pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome do cliente ou Telefone (ex: (11) 99999-9999)..."
            className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none text-slate-900 font-medium transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lista de Resultados Encontrados */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                className="group p-3.5 bg-white hover:bg-blue-50/70 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-600 group-hover:text-blue-700 shrink-0 transition-colors">
                    {c.type === 'PJ' ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-900 truncate">
                        {c.name}
                      </h4>
                      {c.type && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {c.type}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {formatPhone(c.phone)}
                      </span>

                      {c.document && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Doc: {formatDocument(c.document)}
                        </span>
                      )}

                      {c.city && (
                        <span className="text-slate-500 text-[11px] flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {c.city}
                          {c.state ? `/${c.state}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(c);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Selecionar</span>
                </button>
              </div>
            ))
          ) : (
            /* Nenhum cliente encontrado */
            <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                  {customers.length === 0
                    ? 'Nenhum cliente cadastrado no sistema'
                    : 'Cliente não encontrado'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {customers.length === 0
                    ? 'Ainda não há clientes cadastrados na base de dados.'
                    : `Não encontramos nenhum cliente cadastrado com o termo "${searchTerm}".`}
                </p>
              </div>

              {onRequestNewCustomer && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestNewCustomer();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-lg border border-blue-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar Novo Cliente</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            {customers.length} cliente{customers.length === 1 ? '' : 's'} cadastrado{customers.length === 1 ? '' : 's'}
          </span>

          <div className="flex items-center gap-2">
            {onRequestNewCustomer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestNewCustomer();
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Novo Cliente</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

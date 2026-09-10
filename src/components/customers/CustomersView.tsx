import {
  Building2,
  CheckCircle2,
  Download,
  Edit2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Customer } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CustomerModal } from './CustomerModal';

export const CustomersView: React.FC = () => {
  const { isAdmin, isPromotor, currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Promotor can only see their own registered customers
      if (isPromotor && cust.promoterId !== currentUser.id) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const matchSearch =
        cust.name.toLowerCase().includes(term) ||
        (cust.document && cust.document.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.city && cust.city.toLowerCase().includes(term)) ||
        (cust.promoterName && cust.promoterName.toLowerCase().includes(term));

      const matchType = typeFilter === 'TODOS' || cust.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [customers, searchTerm, typeFilter, isPromotor, currentUser.id]);

  const handleRefresh = () => {
    setCustomers(StorageService.getCustomers());
  };

  const handleSaveCustomer = (customer: Customer) => {
    StorageService.saveCustomer(customer);
    handleRefresh();
    setToastMessage('Cliente salvo com sucesso!');
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      StorageService.deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      handleRefresh();
      setToastMessage('Cliente removido com sucesso.');
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleExportCSV = () => {
    StorageService.exportCustomersToCSV(filteredCustomers);
  };

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  return (
    <div id="customers-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Gestão de Clientes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isPromotor
              ? 'Cadastre e consulte seus clientes captados para envio de orçamentos e propostas comerciais.'
              : 'Cadastre, consulte e gerencie clientes pessoas físicas e jurídicas para orçamentos e vendas.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-export-customers-csv"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Exportar clientes para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            id="btn-new-customer"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Promotor Notice Banner */}
      {isPromotor && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Você está conectado como Promotor <strong>{currentUser.name}</strong>. Exibindo apenas os clientes captados e cadastrados por você.
            </span>
          </div>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 uppercase">
            Meus Clientes ({filteredCustomers.length})
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="customer-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ, fone, cidade..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {(
              [
                { id: 'TODOS', label: 'Todos os Clientes' },
                { id: 'PF', label: 'Pessoa Física (PF)' },
                { id: 'PJ', label: 'Pessoa Jurídica (PJ)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-3">Tipo e Documento</th>
                <th className="py-3.5 px-3">Contato</th>
                <th className="py-3.5 px-3">Localização</th>
                <th className="py-3.5 px-3">Observações</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            cust.type === 'PJ'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {cust.type === 'PJ' ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm break-words whitespace-normal leading-snug">
                            {cust.name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">
                              Cadastrado em {new Date(cust.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                            </span>
                            {cust.promoterName && !isPromotor && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                Promotor: {cust.promoterName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Doc */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <Badge variant={cust.type === 'PJ' ? 'purple' : 'primary'} size="sm">
                          {cust.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </Badge>
                        {cust.document && (
                          <span className="font-mono text-[11px] text-slate-600 block">
                            {cust.document}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800 font-semibold">{cust.phone}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(cust.phone)}
                              title="Abrir WhatsApp"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem fone</span>
                        )}
                        {cust.email && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3">
                      {cust.city || cust.state || cust.address ? (
                        <div className="text-slate-700 space-y-0.5">
                          {(cust.city || cust.state) && (
                            <span className="font-medium block">
                              {cust.city ? cust.city : ''}
                              {cust.city && cust.state ? ' - ' : ''}
                              {cust.state ? cust.state : ''}
                            </span>
                          )}
                          {cust.address && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                              {cust.address}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Não informado</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-500 text-[11px] line-clamp-2 max-w-xs">
                        {cust.notes || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer(cust);
                            setIsModalOpen(true);
                          }}
                          title="Editar Cliente"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            title="Excluir Cliente"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Nenhum cliente cadastrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clique em "Novo Cliente" para realizar o primeiro cadastro.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customerToEdit={editingCustomer}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Cliente"
        message={`Deseja excluir o cadastro do cliente "${customerToDelete?.name}"?`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />
    </div>
  );
};

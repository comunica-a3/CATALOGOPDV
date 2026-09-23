import {
  ArrowUpRight,
  Check,
  Edit2,
  ExternalLink,
  Filter,
  Globe,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { OnlineService, OnlineServiceCategory } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

interface OnlineServicesViewProps {
  onAddToCart?: (serviceItem: {
    id: string;
    name: string;
    price: number;
    category: string;
  }) => void;
  onNavigateToPOS?: () => void;
}

const CATEGORIES: (OnlineServiceCategory | 'Todos')[] = [
  'Todos',
  'Governo',
  'Documentos',
  'Serviços Públicos',
  'Consultas',
  'Agendamentos',
  'Outros',
];

export const OnlineServicesView: React.FC<OnlineServicesViewProps> = ({
  onAddToCart,
  onNavigateToPOS,
}) => {
  const { isAdmin, isCollaborator, isSeller } = useAuth();
  const canManage = isAdmin || isCollaborator;

  const [services, setServices] = useState<OnlineService[]>(() => StorageService.getOnlineServices());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [addedServiceId, setAddedServiceId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<OnlineService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<OnlineService | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Governo');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPrice, setFormPrice] = useState('15.00');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  const reloadServices = () => {
    setServices(StorageService.getOnlineServices());
  };

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      // If seller, only show active services
      if (isSeller && !canManage && !svc.active) return false;

      const matchesCat = selectedCategory === 'Todos' || svc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        svc.name.toLowerCase().includes(q) ||
        (svc.description && svc.description.toLowerCase().includes(q)) ||
        svc.category.toLowerCase().includes(q) ||
        svc.url.toLowerCase().includes(q);

      return matchesCat && matchesQuery;
    });
  }, [services, selectedCategory, searchQuery, isSeller, canManage]);

  const handleOpenService = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddServiceToCart = (svc: OnlineService) => {
    if (onAddToCart) {
      onAddToCart({
        id: svc.id,
        name: svc.name,
        price: svc.price || 15.0,
        category: svc.category,
      });
      setAddedServiceId(svc.id);
      setTimeout(() => setAddedServiceId(null), 2000);
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormName('');
    setFormCategory('Governo');
    setFormDescription('');
    setFormUrl('');
    setFormPrice('15.00');
    setFormActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (svc: OnlineService) => {
    setEditingService(svc);
    setFormName(svc.name);
    setFormCategory(svc.category);
    setFormDescription(svc.description || '');
    setFormUrl(svc.url);
    setFormPrice(svc.price !== undefined ? svc.price.toString() : '15.00');
    setFormActive(svc.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteService = (svc: OnlineService) => {
    setServiceToDelete(svc);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Por favor, informe o nome do serviço.');
      return;
    }
    if (!formUrl.trim()) {
      setFormError('Por favor, informe o endereço URL do site.');
      return;
    }

    let validUrl = formUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const priceNum = parseFloat(formPrice.replace(',', '.')) || 0;

    if (editingService) {
      StorageService.updateOnlineService(editingService.id, {
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        url: validUrl,
        price: priceNum,
        active: formActive,
      });
    } else {
      StorageService.addOnlineService({
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        url: validUrl,
        price: priceNum,
        cost: 0,
        active: formActive,
      });
    }

    setIsModalOpen(false);
    reloadServices();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Globe className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Serviços Online e Portais
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acesso rápido a portais de emissão de guias, agendamentos, certidões e serviços públicos para clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToPOS && (
            <button
              type="button"
              onClick={onNavigateToPOS}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-slate-600" />
              <span>Ir para o PDV</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              id="btn-add-online-service"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por serviço, portal, DETRAN, CPF, MEI..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-end sm:self-center">
            {filteredServices.length} {filteredServices.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hidden sm:inline" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum serviço encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Não encontramos serviços correspondentes aos filtros aplicados. Tente buscar por outros termos ou cadastre um novo portal.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Novo Serviço</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`bg-white rounded-xl border transition-all flex flex-col justify-between ${
                svc.active
                  ? 'border-slate-200 hover:border-cyan-300 shadow-xs hover:shadow-sm'
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {svc.category}
                  </span>

                  {!svc.active && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600">
                      Inativo
                    </span>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(svc)}
                        title="Editar Serviço"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc)}
                        title="Excluir Serviço"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {svc.name}
                  </h3>
                  {svc.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate font-mono">
                  <Globe className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate">{svc.url.replace(/^https?:\/\//, '')}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/70 rounded-b-xl flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-700">
                  {svc.price ? (
                    <span>
                      Taxa:{' '}
                      <strong className="text-slate-900 font-bold">
                        R$ {svc.price.toFixed(2).replace('.', ',')}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Sem taxa definida</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Add to PDV Cart Button */}
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => handleAddServiceToCart(svc)}
                      title="Adicionar serviço ao carrinho do PDV"
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        addedServiceId === svc.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {addedServiceId === svc.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Adicionado</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PDV</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Open Portal URL Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenService(svc.url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Abrir serviço</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingService ? 'Editar Serviço Online' : 'Cadastrar Novo Serviço Online'}
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Serviço / Portal *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Emissão de Multas e Débitos (DETRAN)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-slate-900"
                >
                  <option value="Governo">Governo</option>
                  <option value="Documentos">Documentos</option>
                  <option value="Serviços Públicos">Serviços Públicos</option>
                  <option value="Consultas">Consultas</option>
                  <option value="Agendamentos">Agendamentos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxa Sugerida (R$)
                </label>
                <input
                  type="text"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="15.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço URL do Site *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://www.detran.mg.gov.br/"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                O sistema abrirá este link seguro em uma nova aba quando o vendedor clicar em &quot;Abrir serviço&quot;.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição ou Instruções para o Vendedor
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Consultar pelo Renavam e placa do veículo. Imprimir a guia em PDF."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="check-service-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded-sm border-slate-300 focus:ring-cyan-500"
              />
              <label htmlFor="check-service-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Serviço Ativo e disponível no PDV
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-xs"
              >
                {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Service Confirmation */}
      {serviceToDelete && (
        <ConfirmDialog
          isOpen={!!serviceToDelete}
          title="Remover Serviço Online"
          message={`Deseja realmente remover o serviço "${serviceToDelete.name}"? Ele deixará de ser exibido na lista e no catálogo do PDV.`}
          confirmText="Sim, remover"
          cancelText="Cancelar"
          type="danger"
          onConfirm={() => {
            if (serviceToDelete) {
              StorageService.deleteOnlineService(serviceToDelete.id);
              reloadServices();
              setServiceToDelete(null);
            }
          }}
          onCancel={() => setServiceToDelete(null)}
        />
      )}
    </div>
  );
};

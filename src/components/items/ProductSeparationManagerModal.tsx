import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Package,
  FileCode,
  Tag,
  Wrench,
  Sparkles,
  ShoppingBag,
  Palette,
  Printer,
  Smartphone,
  Gift,
  Bookmark,
  Boxes,
  FolderPlus,
  Loader2,
  Info,
  Globe,
} from 'lucide-react';
import { ProductSeparation, Item } from '../../types';
import { StorageService } from '../../services/storage';

interface ProductSeparationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeparationCreatedOrUpdated?: (sep: ProductSeparation) => void;
}

const AVAILABLE_ICONS = [
  { id: 'Package', label: 'Pacote / Caixa', icon: Package },
  { id: 'Layers', label: 'Camadas / Gráfica', icon: Layers },
  { id: 'FileCode', label: 'Serviço / Digital', icon: FileCode },
  { id: 'Tag', label: 'Etiqueta / Tag', icon: Tag },
  { id: 'Wrench', label: 'Ferramenta / Reparo', icon: Wrench },
  { id: 'Sparkles', label: 'Especial / Premium', icon: Sparkles },
  { id: 'ShoppingBag', label: 'Sacola / Varejo', icon: ShoppingBag },
  { id: 'Palette', label: 'Arte / Design', icon: Palette },
  { id: 'Printer', label: 'Impressão', icon: Printer },
  { id: 'Smartphone', label: 'Eletrônicos', icon: Smartphone },
  { id: 'Gift', label: 'Brindes / Presentes', icon: Gift },
  { id: 'Bookmark', label: 'Marcador / Papelaria', icon: Bookmark },
];

export function getSeparationIcon(iconName?: string) {
  switch (iconName) {
    case 'Layers':
      return Layers;
    case 'FileCode':
      return FileCode;
    case 'Tag':
      return Tag;
    case 'Wrench':
      return Wrench;
    case 'Sparkles':
      return Sparkles;
    case 'ShoppingBag':
      return ShoppingBag;
    case 'Palette':
      return Palette;
    case 'Printer':
      return Printer;
    case 'Smartphone':
      return Smartphone;
    case 'Gift':
      return Gift;
    case 'Bookmark':
      return Bookmark;
    case 'Package':
    default:
      return Package;
  }
}

export const ProductSeparationManagerModal: React.FC<ProductSeparationManagerModalProps> = ({
  isOpen,
  onClose,
  onSeparationCreatedOrUpdated,
}) => {
  const [separations, setSeparations] = useState<ProductSeparation[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeparation, setEditingSeparation] = useState<ProductSeparation | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Package');
  const [behavior, setBehavior] = useState<'GRAFICO' | 'FISICO' | 'SERVICO'>('GRAFICO');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Delete modal state
  const [separationToDelete, setSeparationToDelete] = useState<ProductSeparation | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('PRODUTO_FISICO');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    const seps = StorageService.getProductSeparations();
    setSeparations(seps);
    setItems(StorageService.getItems());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsFormOpen(false);
      setEditingSeparation(null);
      setErrorMsg('');
      setSeparationToDelete(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('product-separations-updated', handleUpdate);
    window.addEventListener('items-updated', handleUpdate);
    return () => {
      window.removeEventListener('product-separations-updated', handleUpdate);
      window.removeEventListener('items-updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setEditingSeparation(null);
    setName('');
    setDescription('');
    setIcon('Package');
    setBehavior('GRAFICO');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleEdit = (sep: ProductSeparation) => {
    setEditingSeparation(sep);
    setName(sep.name);
    setDescription(sep.description || '');
    setIcon(sep.icon || 'Package');
    setBehavior(
      sep.behavior ||
      (sep.id === 'PRODUTO_GRAFICO' || sep.id === 'PRODUTO_PERSONALIZADO' || (sep.name && sep.name.toLowerCase().includes('personaliz'))
        ? 'GRAFICO'
        : sep.id === 'SERVICO'
        ? 'SERVICO'
        : 'FISICO')
    );
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome da categoria/separação é obrigatório.');
      return;
    }

    // Check duplicate name
    const cleanName = name.trim();
    const existing = separations.find(
      (s) => s.name.toLowerCase() === cleanName.toLowerCase() && s.id !== editingSeparation?.id
    );
    if (existing) {
      setErrorMsg('Já existe uma categoria/separação cadastrada com este nome.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      let sepId = editingSeparation?.id;
      if (!sepId) {
        // Generate unique id
        const slug = cleanName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_');
        sepId = `sep_${slug}_${Date.now()}`;
      }

      const isSystem = editingSeparation
        ? editingSeparation.isSystem
        : false;

      const saved = await StorageService.saveProductSeparation({
        id: sepId,
        name: cleanName,
        description: description.trim() || undefined,
        icon,
        isSystem,
        behavior,
        sortOrder: editingSeparation?.sortOrder ?? 10,
      });

      setToastMsg(`Separação "${saved.name}" salva com sucesso!`);
      setTimeout(() => setToastMsg(''), 4000);
      setIsFormOpen(false);
      setEditingSeparation(null);
      loadData();
      if (onSeparationCreatedOrUpdated) {
        onSeparationCreatedOrUpdated(saved);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar categoria/separação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitiateDelete = (sep: ProductSeparation) => {
    if (sep.isSystem) {
      alert('As categorias padrão do sistema (Gráficos, Físicos, Serviços) não podem ser excluídas.');
      return;
    }
    const defaultTarget = separations.find((s) => s.id !== sep.id)?.id || 'PRODUTO_FISICO';
    setTransferTargetId(defaultTarget);
    setSeparationToDelete(sep);
  };

  const handleConfirmDelete = async () => {
    if (!separationToDelete) return;
    setIsDeleting(true);
    try {
      const linkedCount = items.filter((i) => i.type === separationToDelete.id).length;
      await StorageService.deleteProductSeparation(
        separationToDelete.id,
        linkedCount > 0 ? transferTargetId : undefined
      );

      setToastMsg(`Separação "${separationToDelete.name}" removida com sucesso!`);
      setTimeout(() => setToastMsg(''), 4000);
      setSeparationToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria/separação.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="product-separations-modal"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Separações e Categorias de Produtos
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie as divisões principais de produtos do sistema (Gráficos, Físicos, Serviços e novas categorias personalizadas).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Toast */}
          {toastMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Action Bar */}
          {!isFormOpen && !separationToDelete && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-700">
                  {separations.length} Separações Ativas
                </span>
              </div>
              <button
                type="button"
                id="btn-new-separation"
                onClick={handleOpenNew}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Separação</span>
              </button>
            </div>
          )}

          {/* Add / Edit Form */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="p-4 bg-slate-50 border border-blue-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {editingSeparation ? `Editar: ${editingSeparation.name}` : 'Cadastrar Nova Separação de Produto'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Separação *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (!editingSeparation) {
                        const low = val.toLowerCase();
                        if (low.includes('personaliz') || low.includes('grafi') || low.includes('brinde') || low.includes('sublima')) {
                          setBehavior('GRAFICO');
                        }
                      }
                    }}
                    placeholder="Ex: Materiais, Insumos, Brindes, Uniformes, Personalizados"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ícone Representativo
                  </label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-900"
                  >
                    {AVAILABLE_ICONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Comportamento e Recursos de Configuração
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBehavior('GRAFICO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      behavior === 'GRAFICO'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Gráficos & Personalizados</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      M², Pacotes, Preço progressivo por faixas, acabamentos e ordem de produção.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehavior('FISICO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      behavior === 'FISICO'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                      <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Físicos & Estoque</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Controle de saldo, grade de variantes e reposição.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehavior('SERVICO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      behavior === 'SERVICO'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Serviços Digitais</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Cobrança avulsa e atendimento rápido.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do tipo de itens contidos nesta separação"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Salvar Separação</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete & Reclassification Dialog */}
          {separationToDelete && (
            <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Excluir Categoria/Separação: {separationToDelete.name}</span>
              </div>

              {(() => {
                const linkedItems = items.filter((i) => i.type === separationToDelete.id);
                const hasLinkedItems = linkedItems.length > 0;

                return (
                  <div className="space-y-3.5 text-xs text-rose-950">
                    {hasLinkedItems ? (
                      <div className="space-y-2">
                        <p className="font-semibold leading-relaxed">
                          Esta separação possui <strong>{linkedItems.length} produto(s)</strong> cadastrado(s). Para não quebrar o cadastro dos produtos nem perder histórico, selecione para qual categoria eles serão transferidos antes da exclusão:
                        </p>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Transferir produtos para:
                          </label>
                          <select
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900"
                          >
                            {separations
                              .filter((s) => s.id !== separationToDelete.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.isSystem ? '(Padrão do Sistema)' : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <p className="leading-relaxed">
                        Nenhum produto está vinculado a esta separação. Tem certeza de que deseja excluí-la permanentemente?
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setSeparationToDelete(null)}
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>{hasLinkedItems ? 'Transferir Produtos e Excluir' : 'Excluir Definitivamente'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* List of Separations */}
          <div className="space-y-3">
            {separations.map((sep) => {
              const IconComp = getSeparationIcon(sep.icon);
              const linkedCount = items.filter((i) => i.type === sep.id).length;

              return (
                <div
                  key={sep.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      sep.id === 'PRODUTO_GRAFICO'
                        ? 'bg-blue-100 text-blue-700'
                        : sep.id === 'PRODUTO_FISICO'
                        ? 'bg-indigo-100 text-indigo-700'
                        : sep.id === 'SERVICO'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{sep.name}</span>
                        {sep.isSystem ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                            Padrão do Sistema
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200">
                            Personalizada
                          </span>
                        )}
                        {sep.behavior === 'GRAFICO' || sep.id === 'PRODUTO_GRAFICO' || sep.id === 'PRODUTO_PERSONALIZADO' || (sep.name && sep.name.toLowerCase().includes('personaliz')) ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>M², Pacotes & Faixas</span>
                          </span>
                        ) : sep.behavior === 'SERVICO' || sep.id === 'SERVICO' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Serviços Digitais</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />
                            <span>Estoque & Variantes</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                          {linkedCount} {linkedCount === 1 ? 'produto' : 'produtos'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sep.description || (
                          sep.id === 'PRODUTO_GRAFICO'
                            ? 'Banners, cartões, panfletos. Gera ordem de produção gráfica.'
                            : sep.id === 'PRODUTO_FISICO'
                            ? 'Produtos com controle de saldo de estoque.'
                            : sep.id === 'SERVICO'
                            ? 'Serviços digitais, digitação e impressão.'
                            : 'Separação de produtos personalizada'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(sep)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar Separação"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!sep.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleInitiateDelete(sep)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Separação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2 text-xs text-blue-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              As separações de produtos organizam os itens no PDV, nos filtros do catálogo, nas listagens e no cadastro de novos itens. Todas as alterações feitas aqui são sincronizadas em tempo real com todos os dispositivos.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PRESET_NICHE_IMAGES } from '../../data/initialCatalogNiches';
import { api } from '../../services/api';
import { StorageService } from '../../services/storage';
import { ProductNicheCard } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface NicheManagementPanelProps {
  onNichesChanged?: () => void;
  onClose?: () => void;
}

export const NicheManagementPanel: React.FC<NicheManagementPanelProps> = ({
  onNichesChanged,
  onClose,
}) => {
  const [niches, setNiches] = useState<ProductNicheCard[]>(() =>
    StorageService.getCatalogNiches()
  );
  const [editingNiche, setEditingNiche] = useState<ProductNicheCard | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [nicheToDelete, setNicheToDelete] = useState<ProductNicheCard | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formId, setFormId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCtaText, setFormCtaText] = useState('Ver produtos');
  const [formBadge, setFormBadge] = useState('Destaque');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formItemTypeMatch, setFormItemTypeMatch] = useState<'PRODUTO_GRAFICO' | 'PRODUTO_FISICO' | 'SERVICO' | 'ALL'>('ALL');
  const [formKeywords, setFormKeywords] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    const onUpdate = () => {
      const updated = StorageService.getCatalogNiches();
      setNiches(updated);
    };
    window.addEventListener('catalog-niches-updated', onUpdate);
    return () => window.removeEventListener('catalog-niches-updated', onUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshList = () => {
    const updated = StorageService.getCatalogNiches();
    setNiches(updated);
    if (onNichesChanged) onNichesChanged();
  };

  const handleStartCreate = () => {
    setEditingNiche(null);
    setIsCreatingNew(true);
    setFormTitle('');
    setFormId('');
    setFormDescription('');
    setFormCtaText('Ver produtos');
    setFormBadge('Novo Nicho');
    setFormImageUrl(PRESET_NICHE_IMAGES[0]?.url || '');
    setFormItemTypeMatch('ALL');
    setFormKeywords('');
    setFormActive(true);
    setFormError('');
  };

  const handleStartEdit = (niche: ProductNicheCard) => {
    setIsCreatingNew(false);
    setEditingNiche(niche);
    setFormTitle(niche.title);
    setFormId(niche.id);
    setFormDescription(niche.description || '');
    setFormCtaText(niche.ctaText || 'Ver produtos');
    setFormBadge(niche.badge || 'Destaque');
    setFormImageUrl(niche.imageUrl || '');
    setFormItemTypeMatch(niche.itemTypeMatch || 'ALL');
    setFormKeywords(
      [...(niche.categoryMatchKeywords || []), ...(niche.customKeywords || [])].join(', ')
    );
    setFormActive(niche.active !== false);
    setFormError('');
  };

  const handleCancelForm = () => {
    setEditingNiche(null);
    setIsCreatingNew(false);
    setFormError('');
  };

  const handleTitleChange = (newTitle: string) => {
    setFormTitle(newTitle);
    if (isCreatingNew && !formId) {
      const generatedSlug = newTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormId(generatedSlug);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setFormError('Formato inválido. Por favor, selecione um arquivo JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('A imagem selecionada deve ter no máximo 15MB.');
      return;
    }

    setFormError('');
    setIsUploadingImage(true);

    try {
      // 1. Compress image client-side to lightweight JPEG
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.85);
      setFormImageUrl(compressedDataUrl);

      // 2. Upload to server to obtain permanent lightweight URL synced across devices
      try {
        const uploadRes = await api.uploadImage(compressedDataUrl, 'niche');
        if (uploadRes && uploadRes.url) {
          setFormImageUrl(uploadRes.url);
        }
      } catch (uploadErr) {
        console.warn('Upload imediato do nicho falhou, persistência direta ocorrerá ao salvar:', uploadErr);
      }
    } catch (err: any) {
      setFormError(err.message || 'Falha ao processar arquivo de imagem.');
    } finally {
      setIsUploadingImage(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('O título do nicho é obrigatório.');
      return;
    }

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const nicheData: Partial<ProductNicheCard> & { title: string } = {
      id: formId.trim() || undefined,
      title: formTitle.trim(),
      description: formDescription.trim(),
      ctaText: formCtaText.trim() || 'Ver produtos',
      badge: formBadge.trim() || 'Destaque',
      imageUrl:
        formImageUrl.trim() ||
        'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800&auto=format&fit=crop&q=80',
      itemTypeMatch: formItemTypeMatch,
      categoryMatchKeywords: keywordsArray,
      active: formActive,
    };

    if (editingNiche) {
      nicheData.order = editingNiche.order;
    }

    setIsSaving(true);
    try {
      await StorageService.saveCatalogNiche(nicheData);
      refreshList();
      handleCancelForm();
      showToast(editingNiche ? 'Nicho sincronizado com sucesso!' : 'Novo nicho sincronizado com sucesso!');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar nicho no servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (niche: ProductNicheCard) => {
    try {
      await StorageService.saveCatalogNiche({
        ...niche,
        active: !niche.active,
      });
      refreshList();
      showToast(`Nicho "${niche.title}" ${!niche.active ? 'ativado' : 'ocultado'}.`);
    } catch (err: any) {
      showToast('Erro ao atualizar status do nicho.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= niches.length) return;

    const newNiches = [...niches];
    const temp = newNiches[index];
    newNiches[index] = newNiches[targetIndex];
    newNiches[targetIndex] = temp;

    const orderedIds = newNiches.map((n) => n.id);
    try {
      const reordered = await StorageService.reorderCatalogNiches(orderedIds);
      setNiches(reordered);
      if (onNichesChanged) onNichesChanged();
      showToast('Ordem dos nichos sincronizada!');
    } catch {
      showToast('Erro ao reordenar nichos.');
    }
  };

  const handleDeleteNiche = async () => {
    if (!nicheToDelete) return;
    try {
      await StorageService.deleteCatalogNiche(nicheToDelete.id);
      setNicheToDelete(null);
      refreshList();
      showToast('Nicho excluído e sincronizado com sucesso.');
    } catch {
      showToast('Erro ao excluir nicho no servidor.');
    }
  };

  const handleResetNiches = async () => {
    try {
      const reset = await StorageService.resetCatalogNiches();
      setNiches(reset);
      setShowResetConfirm(false);
      if (onNichesChanged) onNichesChanged();
      showToast('Nichos restaurados e sincronizados com o servidor.');
    } catch {
      showToast('Erro ao restaurar nichos.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast de notificação */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho do Painel */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Personalização dos Nichos da Vitrine
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Altere títulos, descrições, etiquetas, fotos e botões dos cards da vitrine pública. Adicione novos nichos ou exclua conforme o catálogo da sua loja.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Nicho</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Restaurar nichos padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Criação / Edição */}
      {(isCreatingNew || editingNiche) && (
        <div className="bg-blue-50/50 border-2 border-blue-500/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-md animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                {isCreatingNew ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </span>
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                {isCreatingNew ? 'Adicionar Novo Card de Nicho' : `Editar Nicho: ${editingNiche?.title}`}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveForm} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna de Campos (7 colunas) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Nome / Título */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome / Título do Nicho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Gráfica e Personalizados, Eletrônicos, Sublimação..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* ID / Slug & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Identificador / Slug (único)
                    </label>
                    <input
                      type="text"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="ex: sublimacao-brindes"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Etiqueta / Badge Superior
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="Ex: Gráfica & Impressos, Destaque..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição do Card
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Breve frase explicativa sobre os produtos deste nicho..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Texto do Botão (CTA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Texto da Ação (Botão)
                    </label>
                    <input
                      type="text"
                      value={formCtaText}
                      onChange={(e) => setFormCtaText(e.target.value)}
                      placeholder="Ex: Ver produtos, Ver serviços, Ver ofertas..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vincular ao Tipo de Item
                    </label>
                    <select
                      value={formItemTypeMatch}
                      onChange={(e) =>
                        setFormItemTypeMatch(e.target.value as any)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Qualquer Tipo (Personalizado por palavras-chave)</option>
                      <option value="PRODUTO_GRAFICO">Produtos Gráficos / Impressos</option>
                      <option value="PRODUTO_FISICO">Produtos Físicos / Eletrônicos</option>
                      <option value="SERVICO">Serviços / Serviços Digitais</option>
                    </select>
                  </div>
                </div>

                {/* Palavras-chave para filtro automático */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Palavras-chave de Associação Automática (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="Ex: caneca, camiseta, fone, banner, panfleto, consultoria"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Produtos cujo nome, descrição ou categoria contenham esses termos serão exibidos neste nicho.
                  </span>
                </div>

                {/* Switch Ativo */}
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Exibir este nicho na vitrine pública
                    </span>
                  </label>
                </div>
              </div>

              {/* Coluna de Imagem & Prévia (5 colunas) */}
              <div className="lg:col-span-5 space-y-4">
                <label className="block text-xs font-bold text-slate-700">
                  Imagem do Card
                </label>

                {/* URL Input + Upload */}
                <div className="space-y-2">
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex items-center gap-2">
                    <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors ${
                      isUploadingImage ? 'opacity-60 pointer-events-none' : ''
                    }`}>
                      {isUploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>{isUploadingImage ? 'Otimizando e enviando...' : 'Fazer upload do seu dispositivo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Galeria de Fotos Sugeridas */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Ou escolha uma foto de alta definição:
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_NICHE_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormImageUrl(preset.url)}
                        title={preset.label}
                        className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          formImageUrl === preset.url
                            ? 'border-blue-600 ring-2 ring-blue-400/50 scale-105'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prévia ao vivo do Card */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Prévia em Tempo Real na Vitrine</span>
                  </span>

                  <div className="rounded-2xl border-2 border-blue-600 bg-white shadow-md overflow-hidden max-w-sm mx-auto pointer-events-none">
                    <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                      <img
                        src={formImageUrl || PRESET_NICHE_IMAGES[0].url}
                        alt="Prévia"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-black/20 to-transparent" />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white text-slate-800 shadow-xs">
                          {formBadge || 'Badge'}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-semibold">
                        <span className="bg-black/55 px-2 py-0.5 rounded">Exemplo de item</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-base font-black text-slate-900">
                        {formTitle || 'Nome do Nicho'}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {formDescription || 'Descrição informativa do nicho de produtos'}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-xs font-black text-blue-600 border-t border-slate-100">
                        <span>{formCtaText || 'Ver produtos'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="pt-4 border-t border-blue-200/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Nicho</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Nichos Existentes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Nichos cadastrados ({niches.length})
          </span>
          <span className="text-xs text-slate-400">
            Use as setas para reordenar a prioridade dos cards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {niches.map((niche, index) => {
            const isFirst = index === 0;
            const isLast = index === niches.length - 1;

            return (
              <div
                key={niche.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs ${
                  niche.active === false
                    ? 'border-slate-200 opacity-60 bg-slate-50'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Miniatura da Imagem com Badges */}
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <img
                    src={niche.imageUrl}
                    alt={niche.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-black/20 to-transparent" />

                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/95 text-slate-800 shadow-xs">
                      {niche.badge}
                    </span>
                  </div>

                  {niche.active === false && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                        <EyeOff className="w-3 h-3" />
                        <span>Oculto</span>
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                    <span className="font-mono text-[11px] bg-black/60 px-2 py-0.5 rounded">
                      #{index + 1} • {niche.id}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-900 leading-snug">
                      {niche.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {niche.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Botão: <strong>{niche.ctaText}</strong></span>
                    {niche.itemTypeMatch && niche.itemTypeMatch !== 'ALL' && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">
                        {niche.itemTypeMatch}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Ações Rápidas */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                  {/* Reordenação */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Mover para esquerda/cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Mover para direita/baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editar / Visibilidade / Excluir */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(niche)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg cursor-pointer transition-colors"
                      title={niche.active === false ? 'Exibir na vitrine' : 'Ocultar da vitrine'}
                    >
                      {niche.active === false ? (
                        <Eye className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(niche)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNicheToDelete(niche)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir nicho"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmação de Exclusão de Nicho */}
      {nicheToDelete && (
        <ConfirmDialog
          isOpen={Boolean(nicheToDelete)}
          title="Excluir Nicho da Vitrine?"
          message={`Tem certeza que deseja excluir o nicho "${nicheToDelete.title}"? Os produtos vinculados a ele continuarão no sistema e passarão a ser listados na visualização geral.`}
          confirmText="Sim, Excluir Nicho"
          cancelText="Cancelar"
          isDanger={true}
          onConfirm={handleDeleteNiche}
          onCancel={() => setNicheToDelete(null)}
        />
      )}

      {/* Confirmação de Restauração de Padrões */}
      {showResetConfirm && (
        <ConfirmDialog
          isOpen={showResetConfirm}
          title="Restaurar Nichos Padrão?"
          message="Isso redefinirá a vitrine para os 3 nichos padrão originais (Gráfica e Personalizados, Produtos Eletrônicos e Serviços Digitais). Quaisquer nichos criados serão substituídos."
          confirmText="Restaurar Padrões"
          cancelText="Cancelar"
          isDanger={false}
          onConfirm={handleResetNiches}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
};

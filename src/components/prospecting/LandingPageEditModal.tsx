import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FileText,
  Upload,
  Link,
  Globe,
} from 'lucide-react';
import { CaptureFormConfig, ProductPackage, PublicSegmentPage } from '../../types';
import { StorageService } from '../../services/storage';

interface LandingPageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (page: PublicSegmentPage) => void;
  pageToEdit?: PublicSegmentPage | null;
}

export const LandingPageEditModal: React.FC<LandingPageEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  pageToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [segment, setSegment] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [ctaButtonText, setCtaButtonText] = useState('Solicitar Orçamento');
  const [successMessage, setSuccessMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formId, setFormId] = useState('form-geral');
  const [active, setActive] = useState(true);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  // Available forms and packages
  const [availableForms, setAvailableForms] = useState<CaptureFormConfig[]>([]);
  const [availablePackages, setAvailablePackages] = useState<ProductPackage[]>([]);

  const [activeTab, setActiveTab] = useState<'content' | 'form' | 'packages' | 'appearance'>('content');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      const forms = StorageService.getCaptureForms();
      setAvailableForms(forms);
      const pkgs = StorageService.getPackages().filter((p) => p.active !== false);
      setAvailablePackages(pkgs);

      if (pageToEdit) {
        setTitle(pageToEdit.title || '');
        setHeadline(pageToEdit.headline || '');
        setSubheadline(pageToEdit.subheadline || '');
        setDescription(pageToEdit.description || '');
        setSlug(pageToEdit.slug || '');
        setSegment(pageToEdit.segment || '');
        setBadgeText(pageToEdit.badgeText || '');
        setCtaButtonText(pageToEdit.ctaButtonText || 'Solicitar Orçamento');
        setSuccessMessage(pageToEdit.successMessage || '');
        setImageUrl(pageToEdit.imageUrl || '');
        setFormId(pageToEdit.formId || 'form-geral');
        setActive(pageToEdit.active !== false);
        setBenefits(pageToEdit.benefits ? [...pageToEdit.benefits] : []);
        setSelectedPackageIds(pageToEdit.suggestedPackageIds ? [...pageToEdit.suggestedPackageIds] : []);
      } else {
        setTitle('Soluções Gráficas & Visuais Personalizadas');
        setHeadline('Materiais de alto impacto para destacar o seu negócio');
        setSubheadline('Atendimento ágil, qualidade superior e entrega rápida');
        setDescription('Confira nossos produtos e pacotes desenvolvidos sob medida para atender as necessidades do seu segmento.');
        setSlug(`solucoes-${Date.now().toString().slice(-4)}`);
        setSegment('Geral / Negócios');
        setBadgeText('⭐ Destaque Especial');
        setCtaButtonText('Solicitar Orçamento');
        setSuccessMessage('Recebemos sua solicitação com sucesso! Nossa equipe entrará em contato em instantes.');
        setImageUrl('');
        setFormId(forms[0]?.id || 'form-geral');
        setActive(true);
        setBenefits([
          'Materiais impressos em alta definição e acabamento profissional',
          'Atendimento consultivo e personalização completa da sua arte',
          'Prazos ágeis e condições facilitadas de pagamento',
        ]);
        setSelectedPackageIds(pkgs.slice(0, 2).map((p) => p.id));
      }
      setActiveTab('content');
    }
  }, [isOpen, pageToEdit]);

  if (!isOpen) return null;

  const handleSlugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!pageToEdit && (!slug || slug.startsWith('solucoes-'))) {
      setSlug(handleSlugify(val));
    }
  };

  const handleAddBenefit = () => {
    setBenefits([...benefits, 'Novo diferencial ou benefício']);
  };

  const handleUpdateBenefit = (index: number, val: string) => {
    const updated = [...benefits];
    updated[index] = val;
    setBenefits(updated);
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleTogglePackage = (pkgId: string) => {
    if (selectedPackageIds.includes(pkgId)) {
      setSelectedPackageIds(selectedPackageIds.filter((id) => id !== pkgId));
    } else {
      setSelectedPackageIds([...selectedPackageIds, pkgId]);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o título principal da landing page.');
      setActiveTab('content');
      return;
    }
    if (!slug.trim()) {
      setErrorMsg('Informe o link/slug da landing page.');
      setActiveTab('content');
      return;
    }

    const cleanSlug = handleSlugify(slug);

    const payload: PublicSegmentPage = {
      id: pageToEdit?.id || `seg-${Date.now()}`,
      slug: cleanSlug,
      title: title.trim(),
      headline: headline.trim() || title.trim(),
      subheadline: subheadline.trim() || undefined,
      description: description.trim(),
      segment: segment.trim() || 'Geral',
      badgeText: badgeText.trim() || undefined,
      ctaButtonText: ctaButtonText.trim() || 'Solicitar Orçamento',
      successMessage: successMessage.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      formId: formId || 'form-geral',
      active,
      isDefault: pageToEdit?.isDefault ?? false,
      benefits: benefits.filter((b) => b.trim().length > 0),
      suggestedPackageIds: selectedPackageIds,
      suggestedProductIds: pageToEdit?.suggestedProductIds || [],
      createdAt: pageToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {pageToEdit ? 'Editar Landing Page de Captação' : 'Criar Nova Landing Page'}
              </h2>
              <p className="text-xs text-slate-500">
                Personalize títulos, apresentação, formulário de captura vinculado, imagem e pacotes em destaque.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'content'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Textos & Apresentação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'form'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Formulário & CTA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'packages'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Pacotes em Destaque ({selectedPackageIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Imagem & Diferenciais
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: TEXTOS & APRESENTAÇÃO */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Principal da Landing Page <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Soluções Gráficas para Gastronomia"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aparece em destaque no topo da página.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status da Landing Page
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-3 text-xs font-bold text-slate-700">
                        {active ? 'Ativa (Disponível para clientes)' : 'Inativa (Pausada)'}
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Se inativa, exibe mensagem acolhedora orientando contato direto via WhatsApp.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Segmento / Categoria Comercial
                  </label>
                  <input
                    type="text"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Restaurantes, Bares & Delivery"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ajuda na classificação dos leads captados no seu funil comercial.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identificador de Link (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 text-xs bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500 font-mono">
                      ?view=solucoes&seg=
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(handleSlugify(e.target.value))}
                      placeholder="gastronomia-delivery"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-purple-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Letras minúsculas e hífens. Mantém o link fixo e funcionando.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo / Chamada de Impacto (Headline)
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex: Venda mais todos os dias com cardápios e panfletos de alta conversão"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto de Apresentação
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Materiais gráficos profissionais com qualidade fotográfica e entrega rápida para o seu negócio."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selo de Destaque / Badge
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Ex: ⭐ Soluções para Gastronomia"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: FORMULÁRIO & CTA */}
          {activeTab === 'form' && (
            <div className="space-y-5">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Formulário de Captação Utilizado</span>
                </div>
                <p className="text-xs text-purple-700">
                  Quando o visitante clicar em solicitar orçamento nesta landing page, qual formulário de captação ele irá preencher?
                </p>

                <select
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableForms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.internalName} ({f.fields.length} campos) {f.isDefault ? '— Padrão' : ''} {f.active ? '' : '(Inativo)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto do Botão Principal (CTA)
                </label>
                <input
                  type="text"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                  placeholder="Ex: Solicitar Orçamento para Gastronomia"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Texto que aparece nos botões de ação e no cabeçalho da landing page.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensagem de Sucesso Personalizada (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="Ex: Obrigado pelo interesse! Nossa equipe já recebeu sua cotação e enviará a proposta personalizada no seu WhatsApp."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se preenchido, substitui a mensagem padrão após o envio da solicitação.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PACOTES EM DESTAQUE */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Selecione os Pacotes em Destaque</h3>
                  <p className="text-[11px] text-slate-500">
                    Os pacotes selecionados serão exibidos em cartões promocionais diretamente na landing page.
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">
                  {selectedPackageIds.length} selecionado(s)
                </span>
              </div>

              {availablePackages.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  Nenhum pacote promocional cadastrado no sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {availablePackages.map((pkg) => {
                    const isSelected = selectedPackageIds.includes(pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handleTogglePackage(pkg.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-purple-50/70 border-purple-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{pkg.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{pkg.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-extrabold text-emerald-600">
                              R$ {pkg.packagePrice.toFixed(2)}
                            </span>
                            {pkg.discountPercent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                -{pkg.discountPercent}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMAGEM & DIFERENCIAIS */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Image Configuration */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Imagem de Destaque / Banner
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem-banner.jpg"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      Cole um link direto da imagem ou envie um arquivo do seu computador:
                    </p>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carregar Arquivo de Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Preview Box */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 min-h-[120px] flex items-center justify-center relative">
                    {imageUrl ? (
                      <div className="relative w-full h-32 group">
                        <img
                          src={imageUrl}
                          alt="Prévia"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-md text-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-xs">Sem imagem configurada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Diferenciais / Benefícios em Tópicos
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Tópico</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {benefits.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-purple-600 font-bold">✓</span>
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                        placeholder="Descreva um diferencial..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Landing Page</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

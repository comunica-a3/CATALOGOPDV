import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  Layers,
  LayoutGrid,
  List,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Zap,
  Power,
  FileText,
  CheckCheck,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  ApproachMessageTemplate,
  CaptureFormConfig,
  CompanySettings,
  ComplementaryProductRule,
  Opportunity,
  OpportunityStage,
  ProductPackage,
  PublicSegmentPage,
} from '../../types';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/whatsappMessages';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ApproachTemplateModal } from './ApproachTemplateModal';
import { CaptureFormEditModal } from './CaptureFormEditModal';
import { LandingPageEditModal } from './LandingPageEditModal';
import { OpportunityDetailModal } from './OpportunityDetailModal';
import { OpportunityModal } from './OpportunityModal';
import { PackageModal } from './PackageModal';
import { EditSectionTitlesModal } from './EditSectionTitlesModal';

type ProspectingTab =
  | 'oportunidades'
  | 'funil'
  | 'hoje'
  | 'retorno'
  | 'pacotes'
  | 'abordagens'
  | 'links'
  | 'regras';

interface ProspectingViewProps {
  companySettings: CompanySettings;
  onCreateBudgetForOpp?: (opp: Opportunity) => void;
  onOpenPublicLanding?: (slug: string) => void;
  onOpenPublicQuoteForm?: () => void;
}

const KANBAN_STAGES: {
  key: OpportunityStage;
  label: string;
  dotColor: string;
  badgeVariant: 'warning' | 'primary' | 'success' | 'danger' | 'secondary';
  bgCol: string;
}[] = [
  { key: 'IDENTIFICADO', label: 'Identificado', dotColor: 'bg-rose-500', badgeVariant: 'danger', bgCol: 'bg-rose-50/50' },
  { key: 'A_CONTATAR', label: 'A Contatar', dotColor: 'bg-amber-500', badgeVariant: 'warning', bgCol: 'bg-amber-50/50' },
  { key: 'CONTATADO', label: 'Contatado', dotColor: 'bg-yellow-500', badgeVariant: 'warning', bgCol: 'bg-yellow-50/50' },
  { key: 'INTERESSADO', label: 'Interessado', dotColor: 'bg-blue-500', badgeVariant: 'primary', bgCol: 'bg-blue-50/50' },
  { key: 'ORCAMENTO', label: 'Em Orçamento', dotColor: 'bg-purple-500', badgeVariant: 'secondary', bgCol: 'bg-purple-50/50' },
  { key: 'CONVERTIDO', label: 'Convertido', dotColor: 'bg-emerald-500', badgeVariant: 'success', bgCol: 'bg-emerald-50/50' },
  { key: 'NAO_CONVERTEU', label: 'Não Converteu', dotColor: 'bg-slate-400', badgeVariant: 'secondary', bgCol: 'bg-slate-50' },
];

export const ProspectingView: React.FC<ProspectingViewProps> = ({
  companySettings,
  onCreateBudgetForOpp,
  onOpenPublicLanding,
  onOpenPublicQuoteForm,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<ProspectingTab>('funil');

  // Dados
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [templates, setTemplates] = useState<ApproachMessageTemplate[]>([]);
  const [publicPages, setPublicPages] = useState<PublicSegmentPage[]>([]);
  const [captureForms, setCaptureForms] = useState<CaptureFormConfig[]>([]);
  const [compRules, setCompRules] = useState<ComplementaryProductRule[]>([]);

  // Filtros de Oportunidades
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('TODOS');
  const [filterSegment, setFilterSegment] = useState<string>('TODOS');
  const [filterSeller, setFilterSeller] = useState<string>('TODOS');

  // Modais
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ProductPackage | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ApproachMessageTemplate | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Modais e Filtros de Captação Direta / Landing Pages
  const [isCaptureFormModalOpen, setIsCaptureFormModalOpen] = useState(false);
  const [editingCaptureForm, setEditingCaptureForm] = useState<CaptureFormConfig | null>(null);

  const [isLandingPageModalOpen, setIsLandingPageModalOpen] = useState(false);
  const [editingLandingPage, setEditingLandingPage] = useState<PublicSegmentPage | null>(null);

  const [linksSubTab, setLinksSubTab] = useState<'all' | 'forms' | 'landings'>('all');

  // Modal de Confirmação Segura de Exclusão / Desativação
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: 'form' | 'landing';
    id: string;
    title: string;
    leadsCount: number;
    pagesCount?: number;
  } | null>(null);

  const [copiedLinkToast, setCopiedLinkToast] = useState<string | null>(null);
  const [isEditTitlesModalOpen, setIsEditTitlesModalOpen] = useState(false);

  const loadAllData = () => {
    setOpportunities(StorageService.getOpportunities());
    setPackages(StorageService.getPackages());
    setTemplates(StorageService.getApproachTemplates());
    setPublicPages(StorageService.getPublicSegmentPages());
    setCaptureForms(StorageService.getCaptureForms());
    setCompRules(StorageService.getComplementaryRules());
  };

  useEffect(() => {
    loadAllData();

    // Sincroniza dados compartilhados com o servidor/rede
    StorageService.syncWithServer().then(() => {
      loadAllData();
    });

    StorageService.loadApproachTemplatesAsync().then((tpls) => {
      if (tpls && tpls.length > 0) setTemplates(tpls);
    });

    const handleUpdate = () => {
      loadAllData();
    };

    window.addEventListener('storage-sync-completed', handleUpdate);
    window.addEventListener('approach-templates-updated', handleUpdate);
    window.addEventListener('opportunity-activities-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('storage-sync-completed', handleUpdate);
      window.removeEventListener('approach-templates-updated', handleUpdate);
      window.removeEventListener('opportunity-activities-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Dados filtrados
  const filteredOpps = (opportunities || []).filter((opp) => {
    if (!opp) return false;
    const term = (searchTerm || '').toLowerCase();
    const name = String(opp.name ?? '').toLowerCase();
    const contactName = String(opp.contactName ?? '').toLowerCase();
    const phone = String(opp.phone ?? '').toLowerCase();
    const segment = String(opp.segment ?? '').toLowerCase();
    const neighborhood = String(opp.neighborhood ?? '').toLowerCase();

    const matchSearch =
      name.includes(term) ||
      contactName.includes(term) ||
      phone.includes(term) ||
      segment.includes(term) ||
      neighborhood.includes(term);

    const matchStage = filterStage === 'TODOS' || opp.stage === filterStage;
    const matchSegment = filterSegment === 'TODOS' || opp.segment === filterSegment;
    const matchSeller =
      filterSeller === 'TODOS' ||
      opp.assignedUserId === filterSeller ||
      opp.assignedUserName === filterSeller;

    return matchSearch && matchStage && matchSegment && matchSeller;
  });

  // Métricas rápidas
  const todayTasks = StorageService.getTodayProspectingTasks(isAdmin ? undefined : currentUser?.id);
  const needingReturn = StorageService.getOpportunitiesNeedingReturn();
  const totalConverted = (opportunities || []).filter((o) => o?.stage === 'CONVERTIDO').length;
  const inPipeline = (opportunities || []).filter((o) => o?.stage !== 'CONVERTIDO' && o?.stage !== 'NAO_CONVERTEU').length;

  const handleOpenNewOpp = () => {
    setEditingOpp(null);
    setIsOppModalOpen(true);
  };

  const handleEditOpp = (opp: Opportunity) => {
    setDetailOpp(null);
    setEditingOpp(opp);
    setIsOppModalOpen(true);
  };

  const handleOpenDetail = (opp: Opportunity) => {
    setDetailOpp(opp);
  };

  const handleQuickWhatsApp = (opp: Opportunity, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!opp) return;
    const cleanPhone = (opp.whatsapp || opp.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Telefone do cliente não cadastrado.');
      return;
    }

    const tpl = (templates || []).find((t) => t?.targetStage === opp.stage) || templates?.[0];
    const text = tpl
      ? StorageService.buildApproachMessage(tpl.templateText, opp, currentUser?.name || 'Atendente', companySettings?.name || 'Empresa')
      : `Olá ${opp.contactName || opp.name || 'Cliente'}, tudo bem? Sou da ${companySettings?.name || 'Empresa'}...`;

    // Registra atividade
    StorageService.addOpportunityActivity({
      opportunityId: opp.id || '',
      type: 'WHATSAPP',
      description: `Disparo de WhatsApp para ${formatPhone(cleanPhone)}`,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    });

    if (opp.stage === 'IDENTIFICADO' || opp.stage === 'A_CONTATAR') {
      StorageService.updateOpportunityStage(opp.id, 'CONTATADO');
    }

    loadAllData();
    openWhatsApp(cleanPhone, text);
  };

  const handleMoveStage = (oppId: string, newStage: OpportunityStage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    StorageService.updateOpportunityStage(oppId, newStage);
    loadAllData();
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkToast(id);
    setTimeout(() => setCopiedLinkToast(null), 3000);
  };

  // Handlers de Formulários de Captação
  const handleSaveCaptureForm = (form: CaptureFormConfig) => {
    StorageService.saveCaptureForm(form);
    loadAllData();
  };

  const handleDuplicateCaptureForm = (formId: string) => {
    StorageService.duplicateCaptureForm(formId);
    loadAllData();
  };

  const handleToggleCaptureFormActive = (formId: string) => {
    StorageService.toggleCaptureFormActive(formId);
    loadAllData();
  };

  const handleRequestDeleteForm = (form: CaptureFormConfig) => {
    const linkedLeads = opportunities.filter((o) => o.sourceFormId === form.id);
    const linkedPages = publicPages.filter((p) => p.formId === form.id);

    setDeleteConfirmItem({
      type: 'form',
      id: form.id,
      title: form.internalName || form.title,
      leadsCount: linkedLeads.length,
      pagesCount: linkedPages.length,
    });
  };

  // Handlers de Landing Pages
  const handleSaveLandingPage = (page: PublicSegmentPage) => {
    StorageService.savePublicSegmentPage(page);
    loadAllData();
  };

  const handleDuplicateLandingPage = (pageId: string) => {
    StorageService.duplicatePublicSegmentPage(pageId);
    loadAllData();
  };

  const handleToggleLandingPageActive = (pageId: string) => {
    StorageService.togglePublicSegmentPageActive(pageId);
    loadAllData();
  };

  const handleRequestDeleteLandingPage = (page: PublicSegmentPage) => {
    const linkedLeads = opportunities.filter((o) => o.sourcePageId === page.id);

    setDeleteConfirmItem({
      type: 'landing',
      id: page.id,
      title: page.title,
      leadsCount: linkedLeads.length,
    });
  };

  const handleExecuteSafetyAction = (action: 'deactivate' | 'delete') => {
    if (!deleteConfirmItem) return;
    if (action === 'deactivate') {
      if (deleteConfirmItem.type === 'form') {
        const form = captureForms.find((f) => f.id === deleteConfirmItem.id);
        if (form && form.active !== false) {
          StorageService.toggleCaptureFormActive(form.id);
        }
      } else {
        const page = publicPages.find((p) => p.id === deleteConfirmItem.id);
        if (page && page.active !== false) {
          StorageService.togglePublicSegmentPageActive(page.id);
        }
      }
    } else if (action === 'delete') {
      if (deleteConfirmItem.type === 'form') {
        StorageService.deleteCaptureForm(deleteConfirmItem.id);
      } else {
        StorageService.deletePublicSegmentPage(deleteConfirmItem.id);
      }
    }
    loadAllData();
    setDeleteConfirmItem(null);
  };

  const segmentsList = Array.from(new Set((opportunities || []).map((o) => o?.segment).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* HEADER & TÍTULO PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {companySettings.prospectingTexts?.mainTitle || 'Captação Ativa & Prospecção Comercial'}
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Aumento de Vendas</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {companySettings.prospectingTexts?.mainSubtitle || 'Gestão de novos contatos, funil de conversão, modelos de abordagem e pacotes de produtos prontos.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditTitlesModalOpen(true)}
              className="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Editar Títulos e Descrições"
            >
              <Edit className="w-4 h-4 text-slate-600" />
              <span>Editar Títulos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingPackage(null);
              setIsPackageModalOpen(true);
            }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Novo Pacote</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewOpp}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setCurrentTab('hoje')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            currentTab === 'hoje'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Tarefas de Hoje</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{todayTasks.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Leads para contatar</div>
        </div>

        <div
          onClick={() => setCurrentTab('retorno')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            currentTab === 'retorno'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Precisam de Retorno</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{needingReturn.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">&gt; 3 dias sem contato</div>
        </div>

        <div
          onClick={() => setCurrentTab('funil')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            currentTab === 'funil'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Em Negociação</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{inPipeline}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Oportunidades no funil</div>
        </div>

        <div
          onClick={() => {
            setFilterStage('CONVERTIDO');
            setCurrentTab('oportunidades');
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            currentTab === 'oportunidades' && filterStage === 'CONVERTIDO'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Convertidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalConverted}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Clientes conquistados</div>
        </div>
      </div>

      {/* ABAS / SUBMENUS */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'funil', label: '🔥 Funil Comercial', count: inPipeline },
          { key: 'oportunidades', label: '🎯 Oportunidades', count: opportunities.length },
          { key: 'hoje', label: '📅 Minhas Prospecções (Hoje)', count: todayTasks.length },
          { key: 'retorno', label: '⚠️ Precisam de Retorno', count: needingReturn.length },
          { key: 'pacotes', label: '📦 Pacotes e Soluções', count: packages.length },
          { key: 'abordagens', label: '💬 Modelos de Abordagem', count: templates.length },
          { key: 'links', label: '🌐 Formulário e Links Públicos', count: publicPages.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCurrentTab(tab.key as ProspectingTab)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              currentTab === tab.key
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  currentTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. FUNIL COMERCIAL (KANBAN INTERATIVO) */}
      {currentTab === 'funil' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no funil por nome, telefone, segmento..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="TODOS">Todos os Segmentos</option>
                {segmentsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {opportunities.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm space-y-4 my-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Nenhum lead cadastrado na Captação Ativa</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O sistema não gera leads fictícios automaticamente. O funil está limpo e pronto para o cadastro das suas oportunidades comerciais reais.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewOpp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Lead / Oportunidade</span>
              </button>
            </div>
          )}

          {/* COLUNAS KANBAN */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 overflow-x-auto min-h-[500px]">
            {KANBAN_STAGES.map((col) => {
              const stageOpps = filteredOpps.filter((o) => o.stage === col.key);
              return (
                <div
                  key={col.key}
                  className={`rounded-xl border border-slate-200 p-3 flex flex-col ${col.bgCol}`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <span className="text-xs font-bold text-slate-800 truncate">{col.label}</span>
                    </div>
                    <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      {stageOpps.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                    {stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        onClick={() => handleOpenDetail(opp)}
                        className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-3 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{opp.name}</h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            #{String(opp.opportunityNumber ?? '').slice(-3) || ''}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium truncate">
                            {opp.segment}
                          </span>
                          {opp.neighborhood && <span className="truncate">📍 {opp.neighborhood}</span>}
                        </div>

                        {opp.needs && opp.needs.length > 0 && (
                          <div className="text-[11px] text-blue-700 line-clamp-1 bg-blue-50/80 px-1.5 py-0.5 rounded">
                            ✨ {opp.needs[0]}
                          </div>
                        )}

                        {opp.nextAction && !opp.nextAction.completed && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Retorno: {opp.nextAction.date}</span>
                          </div>
                        )}

                        {/* BOTÕES RÁPIDOS NO CARD */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => handleQuickWhatsApp(opp, e)}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold flex items-center gap-1"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          {/* AVANÇAR ETAPA */}
                          {col.key !== 'CONVERTIDO' && col.key !== 'NAO_CONVERTEU' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                const nextIndex = KANBAN_STAGES.findIndex((s) => s.key === col.key) + 1;
                                if (nextIndex < KANBAN_STAGES.length) {
                                  handleMoveStage(opp.id, KANBAN_STAGES[nextIndex].key, e);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Avançar para próxima etapa"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageOpps.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs italic">
                        Nenhuma nesta etapa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. OPORTUNIDADES (TABELA / LISTA DETALHADA) */}
      {currentTab === 'oportunidades' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, contato, telefone, segmento, bairro..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="TODOS">Todas as Etapas</option>
                {KANBAN_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>

              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="TODOS">Todos os Segmentos</option>
                {segmentsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Oportunidade / Negócio</th>
                    <th className="p-3">Contato & Telefone</th>
                    <th className="p-3">Segmento</th>
                    <th className="p-3">Necessidade / Solução</th>
                    <th className="p-3">Etapa Atual</th>
                    <th className="p-3">Próxima Ação</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpps.map((opp) => {
                    const st = KANBAN_STAGES.find((s) => s.key === opp.stage) || KANBAN_STAGES[0];
                    return (
                      <tr
                        key={opp.id}
                        onClick={() => handleOpenDetail(opp)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-semibold text-slate-800">
                          <div className="break-words whitespace-normal leading-snug">{opp.name}</div>
                          {opp.neighborhood && (
                            <div className="text-[11px] text-slate-400 font-normal">
                              📍 {opp.neighborhood}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-slate-600">
                          <div className="break-words whitespace-normal">{opp.contactName || '—'}</div>
                          <div className="font-mono text-slate-500">{formatPhone(opp.phone)}</div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[11px] inline-block">
                            {opp.segment}
                          </span>
                        </td>

                        <td className="p-3 text-slate-700">
                          {opp.needs && opp.needs.length > 0 ? (
                            <span className="text-blue-700 font-medium break-words whitespace-normal leading-tight block">{opp.needs[0]}</span>
                          ) : (
                            <span className="text-slate-400 italic">Nenhuma informada</span>
                          )}
                        </td>

                        <td className="p-3">
                          <Badge variant={st.badgeVariant} size="sm">
                            {st.label}
                          </Badge>
                        </td>

                        <td className="p-3 text-slate-600">
                          {opp.nextAction && !opp.nextAction.completed ? (
                            <div className="flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>{opp.nextAction.date}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleQuickWhatsApp(opp, e)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditOpp(opp)}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOpps.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
                        {opportunities.length === 0 ? (
                          <div className="max-w-md mx-auto space-y-3 py-4">
                            <p className="text-sm font-bold text-slate-700">Nenhum lead cadastrado na Captação Ativa</p>
                            <p className="text-xs text-slate-400">
                              O sistema não cria leads fictícios automaticamente. Inicie registrando suas oportunidades reais.
                            </p>
                            <button
                              type="button"
                              onClick={handleOpenNewOpp}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 mt-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Novo Lead / Oportunidade</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Nenhuma oportunidade encontrada com os filtros selecionados.
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MINHAS PROSPECÇÕES / HOJE */}
      {currentTab === 'hoje' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 text-sm font-bold">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>Plano de Ação para Hoje: {todayTasks.length} Contatos Programados</span>
            </div>
            <span className="text-xs text-amber-700">
              Faça a abordagem agora e marque como contatado com 1 clique!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayTasks.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 hover:border-amber-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{opp.name}</h3>
                    <div className="text-xs text-slate-500">
                      {opp.contactName ? `Contato: ${opp.contactName} • ` : ''}
                      {opp.segment} • {formatPhone(opp.phone)}
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">
                    {StorageService.getStageLabel(opp.stage)}
                  </Badge>
                </div>

                {opp.nextAction && (
                  <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <strong>Ação:</strong> {opp.nextAction.note || 'Fazer contato comercial'}
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      Horário sugerido: {opp.nextAction.time || '14:00'}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(opp)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Ver Histórico Completo
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickWhatsApp(opp)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Falar no WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {todayTasks.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white border border-slate-200 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800">Tudo em dia para hoje!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Nenhuma prospecção atrasada ou agendada para hoje. Aproveite para cadastrar novos negócios!
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewOpp}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  + Cadastrar Nova Oportunidade
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PRECISAM DE RETORNO */}
      {currentTab === 'retorno' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 text-sm font-bold">
              <Clock className="w-5 h-5 text-rose-600" />
              <span>Oportunidades que Precisam de Follow-up ({needingReturn.length})</span>
            </div>
            <span className="text-xs text-rose-700">
              Clientes que receberam orçamento ou demonstraram interesse e estão sem contato há mais de 3 dias
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needingReturn.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 hover:border-rose-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{opp.name}</h3>
                    <div className="text-xs text-slate-500">
                      {opp.segment} • {formatPhone(opp.phone)}
                    </div>
                  </div>
                  <Badge variant="danger" size="sm">
                    {StorageService.getStageLabel(opp.stage)}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {opp.needs && opp.needs.length > 0 ? (
                    <div><strong>Interesse:</strong> {opp.needs.join(', ')}</div>
                  ) : null}
                  <div className="text-[11px] text-slate-400 mt-1">
                    Última atualização: {new Date(opp.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(opp)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Ver Detalhes
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickWhatsApp(opp)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Follow-up WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}

            {needingReturn.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white border border-slate-200 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800">Nenhum cliente esquecido!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Todos os orçamentos e contatos recentes estão devidamente atualizados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PACOTES E SOLUÇÕES */}
      {currentTab === 'pacotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pacotes & Combos Prontos para Venda
              </h3>
              <p className="text-xs text-slate-500">
                Kits estruturados para oferecer soluções completas e aumentar o ticket médio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingPackage(null);
                setIsPackageModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Pacote</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-800">{pkg.name}</h4>
                    {pkg.discountPercent ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">
                        {pkg.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <span className="inline-block mt-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    {pkg.targetSegment || 'Geral'}
                  </span>

                  <p className="text-xs text-slate-600 mt-2">{pkg.description}</p>

                  {/* ITENS */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {(pkg.items || []).length} Itens no Pacote:
                    </div>
                    {(pkg.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-700">
                        <span>• {it.quantity}x {it.itemName}</span>
                        <span className="font-medium">{formatCurrency(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 line-through">
                      De: {formatCurrency(pkg.originalTotal)}
                    </div>
                    <div className="text-lg font-black text-emerald-600">
                      Por: {formatCurrency(pkg.packagePrice)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsPackageModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs"
                      title="Editar Pacote"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Excluir Pacote',
                          message: `Deseja realmente excluir o pacote de produtos "${pkg.name}"?`,
                          onConfirm: () => {
                            StorageService.deletePackage(pkg.id);
                            loadAllData();
                            setConfirmDialog(null);
                          },
                        });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                      title="Excluir Pacote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODELOS DE ABORDAGEM WHATSAPP */}
      {currentTab === 'abordagens' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Modelos de Abordagem para WhatsApp & Contato Rápido
              </h3>
              <p className="text-xs text-slate-500">
                Textos pré-formatados com variáveis dinâmicas [NOME], [VENDEDOR], [EMPRESA], [NECESSIDADE]...
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Modelo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-800">{tpl.title}</h4>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold">
                      {tpl.category}
                    </span>
                  </div>

                  <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                    {tpl.templateText}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    Etapa: <strong>{tpl.targetStage === 'ALL' ? 'Todas' : tpl.targetStage}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setIsTemplateModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Excluir Modelo de Abordagem',
                          message: `Deseja realmente excluir o modelo de abordagem "${tpl.title}"?`,
                          onConfirm: () => {
                            StorageService.deleteApproachTemplate(tpl.id);
                            loadAllData();
                            setConfirmDialog(null);
                          },
                        });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      title="Excluir Modelo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. LINKS E FORMULÁRIOS PÚBLICOS DE CAPTAÇÃO */}
      {currentTab === 'links' && (
        <div className="space-y-6">
          {/* BANNER PRINCIPAL COM BOTÕES DE AÇÃO */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-300" />
                  <h3 className="text-lg font-bold">Links de Captação Direta & Landing Pages</h3>
                </div>
                <p className="text-xs text-blue-100 max-w-2xl mt-1 leading-relaxed">
                  Crie, edite, duplique e gerencie seus formulários de orçamento e landing pages de conversão.
                  Todos os contatos captados caem <strong>automaticamente no seu funil comercial</strong>,
                  preservando o histórico e dados de cada lead!
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCaptureForm(null);
                    setIsCaptureFormModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Formulário</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingLandingPage(null);
                    setIsLandingPageModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Landing Page</span>
                </button>
              </div>
            </div>

            {/* FILTRO DE VISUALIZAÇÃO E MÉTRICAS */}
            <div className="pt-3 border-t border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLinksSubTab('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    linksSubTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Todos ({captureForms.length + publicPages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLinksSubTab('forms')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    linksSubTab === 'forms'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Formulários ({captureForms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLinksSubTab('landings')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    linksSubTab === 'landings'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Landing Pages ({publicPages.length})
                </button>
              </div>

              <div className="flex items-center gap-4 text-blue-200 text-[11px]">
                <span>
                  🟢 Ativos:{' '}
                  <strong className="text-white">
                    {captureForms.filter((f) => f.active !== false).length +
                      publicPages.filter((p) => p.active !== false).length}
                  </strong>
                </span>
                <span>
                  🟡 Pausados:{' '}
                  <strong className="text-white">
                    {captureForms.filter((f) => f.active === false).length +
                      publicPages.filter((p) => p.active === false).length}
                  </strong>
                </span>
                <span>
                  📈 Leads Captados:{' '}
                  <strong className="text-emerald-400">
                    {
                      opportunities.filter(
                        (o) =>
                          o.sourceType === 'FORMULARIO_PUBLICO' ||
                          o.sourceType === 'LANDING_PAGE' ||
                          o.sourceFormId ||
                          o.sourcePageId
                      ).length
                    }
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: FORMULÁRIOS DE CAPTAÇÃO */}
          {(linksSubTab === 'all' || linksSubTab === 'forms') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Formulários de Captação Online ({captureForms.length})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Formulários diretos para clientes solicitarem orçamentos com campos e perguntas personalizáveis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCaptureForm(null);
                    setIsCaptureFormModalOpen(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Formulário</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {captureForms.map((form) => {
                  const url =
                    form.isDefault && form.id === 'form-geral'
                      ? `${window.location.origin}/?view=orcamento`
                      : `${window.location.origin}/?view=orcamento&form=${form.id}`;

                  const leadsCount = opportunities.filter(
                    (o) => o.sourceFormId === form.id
                  ).length;

                  return (
                    <div
                      key={form.id}
                      className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                        form.active === false
                          ? 'border-slate-200 opacity-80 bg-slate-50/50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-sm text-slate-800">
                                {form.internalName}
                              </h5>
                              {form.isDefault && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                                  Padrão
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  form.active === false
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    form.active === false ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                                {form.active === false ? 'Pausado' : 'Ativo'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-1 font-medium">
                              {form.title}
                            </p>
                            {form.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {form.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* METADADOS DO FORMULÁRIO */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            📋 {form.fields.length} campos configurados
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                            🎯 {leadsCount} lead(s) captado(s)
                          </span>
                        </div>

                        {/* LINK URL */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 truncate select-all">
                          {url}
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÕES */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(url, form.id)}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Copiar Link para Área de Transferência"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedLinkToast === form.id ? 'Copiado!' : 'Copiar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenPublicQuoteForm) {
                                onOpenPublicQuoteForm();
                              } else {
                                window.open(url, '_blank');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Visualizar tela do formulário"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCaptureForm(form);
                              setIsCaptureFormModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Editar formulário e campos"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateCaptureForm(form.id)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Duplicar / Clonar formulário"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Clonar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCaptureFormActive(form.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                              form.active === false
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                            title={form.active === false ? 'Ativar formulário' : 'Pausar formulário'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {form.active === false ? 'Ativar' : 'Pausar'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteForm(form)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                            title="Excluir formulário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: LANDING PAGES POR SEGMENTO */}
          {(linksSubTab === 'all' || linksSubTab === 'landings') && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>Landing Pages por Segmento ({publicPages.length})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Páginas comerciais completas com título persuasivo, kits em destaque e formulário integrado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingLandingPage(null);
                    setIsLandingPageModalOpen(true);
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Landing Page</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicPages.map((page) => {
                  const url = `${window.location.origin}/?view=solucoes&seg=${page.slug}`;
                  const leadsCount = opportunities.filter(
                    (o) => o.sourcePageId === page.id
                  ).length;
                  const linkedForm = captureForms.find((f) => f.id === page.formId);

                  return (
                    <div
                      key={page.id}
                      className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                        page.active === false
                          ? 'border-slate-200 opacity-80 bg-slate-50/50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-sm text-slate-800">
                                {page.title}
                              </h5>
                              {page.isDefault && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                                  Padrão
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  page.active === false
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    page.active === false ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                                {page.active === false ? 'Pausada' : 'Ativa'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-1">
                              Segmento: <strong>{page.segmentName || page.segment}</strong>
                            </p>
                            {page.headline && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {page.headline}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* METADADOS DA LANDING */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">
                            📝 Form: {linkedForm?.internalName || 'Formulário Geral'}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            📦 {(page.suggestedPackageIds || []).length} pacotes
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                            🎯 {leadsCount} lead(s)
                          </span>
                        </div>

                        {/* LINK URL */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 truncate select-all">
                          {url}
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÕES */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(url, page.id)}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Copiar Link para Área de Transferência"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedLinkToast === page.id ? 'Copiado!' : 'Copiar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenPublicLanding) {
                                onOpenPublicLanding(page.slug);
                              } else {
                                window.open(url, '_blank');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Abrir landing page no navegador"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLandingPage(page);
                              setIsLandingPageModalOpen(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Editar textos, imagem e pacotes"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateLandingPage(page.id)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Duplicar / Clonar landing page"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Clonar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLandingPageActive(page.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                              page.active === false
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                            title={page.active === false ? 'Ativar landing page' : 'Pausar landing page'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {page.active === false ? 'Ativar' : 'Pausar'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteLandingPage(page)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                            title="Excluir landing page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DIÁLOGO DE SEGURANÇA PARA EXCLUSÃO OU DESATIVAÇÃO */}
          {deleteConfirmItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Excluir {deleteConfirmItem.type === 'form' ? 'Formulário' : 'Landing Page'}?
                    </h3>
                    <p className="text-xs text-slate-500">"{deleteConfirmItem.title}"</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 leading-relaxed">
                  {deleteConfirmItem.leadsCount > 0 ? (
                    <p>
                      ⚠️ <strong>Atenção:</strong> Existem{' '}
                      <strong>{deleteConfirmItem.leadsCount} lead(s)</strong> captados associados a este item.
                    </p>
                  ) : (
                    <p>Você tem certeza de que deseja prosseguir com esta ação?</p>
                  )}

                  {deleteConfirmItem.pagesCount && deleteConfirmItem.pagesCount > 0 ? (
                    <p>
                      📌 Este formulário está em uso por{' '}
                      <strong>{deleteConfirmItem.pagesCount} landing page(s)</strong>.
                    </p>
                  ) : null}

                  <p className="text-slate-600">
                    <strong>Recomendação:</strong> Para manter links já compartilhados funcionando e preservar
                    o histórico de conversão, você pode <strong>Desativar/Pausar</strong> o item em vez de apagá-lo.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem(null)}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteSafetyAction('deactivate')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                  >
                    Pausar / Desativar (Recomendado)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteSafetyAction('delete')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO DE OPORTUNIDADE */}
      <OpportunityModal
        isOpen={isOppModalOpen}
        onClose={() => setIsOppModalOpen(false)}
        opportunity={editingOpp}
        onSaved={() => {
          loadAllData();
          setIsOppModalOpen(false);
        }}
      />

      {/* MODAL DETALHE DA OPORTUNIDADE (HISTÓRICO, ETAPAS, WHATSAPP) */}
      <OpportunityDetailModal
        isOpen={!!detailOpp}
        onClose={() => setDetailOpp(null)}
        opportunity={detailOpp}
        companySettings={companySettings}
        onEdit={(opp) => {
          setDetailOpp(null);
          setEditingOpp(opp);
          setIsOppModalOpen(true);
        }}
        onRefresh={() => {
          loadAllData();
          if (detailOpp) {
            setDetailOpp(StorageService.getOpportunityById(detailOpp.id) || null);
          }
        }}
        onCreateBudget={onCreateBudgetForOpp}
      />

      {/* MODAL DE PACOTE */}
      <PackageModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        pkg={editingPackage}
        onSaved={() => {
          loadAllData();
          setIsPackageModalOpen(false);
        }}
      />

      {/* MODAL DE MODELO DE ABORDAGEM */}
      <ApproachTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        template={editingTemplate}
        onSaved={() => {
          loadAllData();
          setIsTemplateModalOpen(false);
        }}
      />

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE FORMULÁRIO DE CAPTAÇÃO */}
      <CaptureFormEditModal
        isOpen={isCaptureFormModalOpen}
        onClose={() => {
          setIsCaptureFormModalOpen(false);
          setEditingCaptureForm(null);
        }}
        formConfig={editingCaptureForm}
        onSave={handleSaveCaptureForm}
      />

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE LANDING PAGE */}
      <LandingPageEditModal
        isOpen={isLandingPageModalOpen}
        onClose={() => {
          setIsLandingPageModalOpen(false);
          setEditingLandingPage(null);
        }}
        landingPage={editingLandingPage}
        availablePackages={packages}
        availableForms={captureForms}
        onSave={handleSaveLandingPage}
      />

      {/* MODAL DE EDIÇÃO DE TÍTULOS E DESCRIÇÕES */}
      <EditSectionTitlesModal
        isOpen={isEditTitlesModalOpen}
        onClose={() => setIsEditTitlesModalOpen(false)}
        titles={{
          mainTitle: companySettings.prospectingTexts?.mainTitle || 'Captação Ativa & Prospecção Comercial',
          mainSubtitle: companySettings.prospectingTexts?.mainSubtitle || 'Gestão de novos contatos, funil de conversão, modelos de abordagem e pacotes de produtos prontos.',
          funilTitle: companySettings.prospectingTexts?.funilTitle || 'Funil Comercial',
          funilDesc: companySettings.prospectingTexts?.funilDesc || 'Funil de negociação',
        }}
        onSave={(newTexts) => {
          const updated = {
            ...companySettings,
            prospectingTexts: newTexts,
          };
          StorageService.saveCompanySettings(updated);
          window.location.reload();
        }}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Confirmar Exclusão"
          cancelText="Cancelar"
          type="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

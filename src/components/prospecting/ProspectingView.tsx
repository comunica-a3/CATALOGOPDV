import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Edit,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import {
  CompanySettings,
  DEFAULT_CATALOG_WHATSAPP_MESSAGE,
  DEFAULT_PERMISSION_WHATSAPP_MESSAGE,
  Opportunity,
  OpportunityStage,
} from '../../types';
import { formatPhone } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/whatsappMessages';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { GoogleMapsLeadModal } from './GoogleMapsLeadModal';
import { OpportunityModal } from './OpportunityModal';

interface ProspectingViewProps {
  companySettings: CompanySettings;
  onCreateBudgetForOpp?: (opp: Opportunity) => void;
  onOpenPublicLanding?: (slug: string) => void;
  onOpenPublicQuoteForm?: () => void;
}

const KANBAN_COLUMNS: {
  key: OpportunityStage;
  label: string;
  subtitle: string;
  dotColor: string;
  headerBg: string;
  borderColor: string;
  badgeStyle: string;
  counterBadgeStyle: string;
}[] = [
  {
    key: 'PARA_CONTATAR',
    label: 'Para Contatar',
    subtitle: 'Aguardando primeira abordagem',
    dotColor: 'bg-amber-500',
    headerBg: 'bg-amber-50/80 border-amber-200',
    borderColor: 'border-amber-200',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
    counterBadgeStyle: 'bg-amber-600 text-white border-amber-600',
  },
  {
    key: 'CATALOGO_ENVIADO',
    label: 'Catálogo Enviado',
    subtitle: 'Autorizou e recebeu o link',
    dotColor: 'bg-blue-500',
    headerBg: 'bg-blue-50/80 border-blue-200',
    borderColor: 'border-blue-200',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200',
    counterBadgeStyle: 'bg-blue-600 text-white border-blue-600',
  },
  {
    key: 'INTERESSADO_ORCAMENTO',
    label: 'Interessado / Em Orçamento',
    subtitle: 'Demonstrou interesse em orçar',
    dotColor: 'bg-purple-500',
    headerBg: 'bg-purple-50/80 border-purple-200',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200',
    counterBadgeStyle: 'bg-purple-600 text-white border-purple-600',
  },
  {
    key: 'FECHADO_SUCESSO',
    label: 'Bem Sucedido',
    subtitle: 'Contatação bem sucedida / fechado',
    dotColor: 'bg-emerald-500',
    headerBg: 'bg-emerald-50/90 border-emerald-200',
    borderColor: 'border-emerald-200',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    counterBadgeStyle: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    key: 'SEM_RETORNO_FECHADO',
    label: 'Sem Retorno / Recusado',
    subtitle: 'Não respondeu ou recusou contato',
    dotColor: 'bg-rose-400',
    headerBg: 'bg-slate-100/90 border-slate-200',
    borderColor: 'border-slate-200',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    counterBadgeStyle: 'bg-slate-600 text-white border-slate-600',
  },
];

export const ProspectingView: React.FC<ProspectingViewProps> = ({
  companySettings,
  onCreateBudgetForOpp,
}) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('TODOS');
  const [mobileActiveStage, setMobileActiveStage] = useState<OpportunityStage | 'TODOS'>('TODOS');

  // Modais de Cadastro e Edição
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [isGoogleMapsModalOpen, setIsGoogleMapsModalOpen] = useState(false);

  // Modal de Exclusão
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);

  // Drag and Drop state
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OpportunityStage | null>(null);

  // Mensagens padrão configuráveis
  const [defaultMessages, setDefaultMessages] = useState(() =>
    StorageService.getProspectingMessages()
  );
  const [isConfigMessagesOpen, setIsConfigMessagesOpen] = useState(false);
  const [draftPermissionMsg, setDraftPermissionMsg] = useState('');
  const [draftCatalogMsg, setDraftCatalogMsg] = useState('');

  // Modal de Ação WhatsApp (permite revisar/alterar a mensagem previamente e confirmar envio do catálogo)
  const [whatsAppActionState, setWhatsAppActionState] = useState<{
    opp: Opportunity;
    actionType: 'PERMISSION' | 'CATALOG';
    messageText: string;
    hasOpenedWhatsApp: boolean;
  } | null>(null);

  const loadOpportunities = () => {
    setOpportunities(StorageService.getOpportunities());
    setDefaultMessages(StorageService.getProspectingMessages());
  };

  useEffect(() => {
    loadOpportunities();

    StorageService.syncWithServer()
      .then(() => {
        loadOpportunities();
      })
      .catch(() => {});

    const handleUpdate = () => {
      loadOpportunities();
    };

    window.addEventListener('opportunities-updated', handleUpdate);
    window.addEventListener('storage-sync-completed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('opportunities-updated', handleUpdate);
      window.removeEventListener('storage-sync-completed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Lista única de bairros para filtro rápido
  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      if (o.neighborhood && o.neighborhood.trim()) {
        set.add(o.neighborhood.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [opportunities]);

  // Filtro de busca e bairro
  const filteredOpportunities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return opportunities.filter((opp) => {
      if (!opp) return false;
      if (neighborhoodFilter !== 'TODOS') {
        if ((opp.neighborhood || '').trim() !== neighborhoodFilter) return false;
      }
      if (!term) return true;
      const nameMatch = (opp.name || '').toLowerCase().includes(term);
      const phoneMatch = (opp.phone || opp.whatsapp || '').toLowerCase().includes(term);
      const neighMatch = (opp.neighborhood || '').toLowerCase().includes(term);
      const notesMatch = (opp.notes || '').toLowerCase().includes(term);
      return nameMatch || phoneMatch || neighMatch || notesMatch;
    });
  }, [opportunities, searchTerm, neighborhoodFilter]);

  const handleStageChange = (oppId: string, newStage: OpportunityStage) => {
    StorageService.updateOpportunityStage(oppId, newStage);
    setOpportunities(StorageService.getOpportunities());
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    setDraggedOppId(oppId);
    e.dataTransfer.setData('text/plain', oppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: OpportunityStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageKey) {
      setDragOverColumn(stageKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: OpportunityStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    const oppId = e.dataTransfer.getData('text/plain') || draggedOppId;
    setDraggedOppId(null);
    if (!oppId) return;
    const opp = opportunities.find((o) => o.id === oppId);
    if (opp && opp.stage !== targetStage) {
      handleStageChange(oppId, targetStage);
    }
  };

  // Ação 1: Solicitar autorização
  const handleOpenPermissionAction = (opp: Opportunity) => {
    const msgs = StorageService.getProspectingMessages();
    setWhatsAppActionState({
      opp,
      actionType: 'PERMISSION',
      messageText: msgs.requestPermissionMessage,
      hasOpenedWhatsApp: false,
    });
  };

  // Ação 2: Enviar catálogo
  const handleOpenCatalogAction = (opp: Opportunity) => {
    const msgs = StorageService.getProspectingMessages();
    setWhatsAppActionState({
      opp,
      actionType: 'CATALOG',
      messageText: msgs.sendCatalogMessage,
      hasOpenedWhatsApp: false,
    });
  };

  // Executa abertura manual do WhatsApp
  const handleTriggerWhatsApp = () => {
    if (!whatsAppActionState) return;
    const { opp, messageText, actionType } = whatsAppActionState;
    const rawPhone = opp.whatsapp || opp.phone || '';
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) {
      alert('Este lead não possui um número de WhatsApp válido.');
      return;
    }

    openWhatsApp(digits, messageText);

    if (actionType === 'PERMISSION') {
      // Permanece aberto ou fecha após abrir o WhatsApp
      setWhatsAppActionState(null);
    } else {
      // Na ação de Enviar Catálogo, solicita confirmação do usuário para mover para "Catálogo Enviado"
      setWhatsAppActionState({
        ...whatsAppActionState,
        hasOpenedWhatsApp: true,
      });
    }
  };

  // Confirma que enviou o catálogo e atualiza status para CATALOGO_ENVIADO
  const handleConfirmCatalogSent = () => {
    if (!whatsAppActionState) return;
    handleStageChange(whatsAppActionState.opp.id, 'CATALOGO_ENVIADO');
    setWhatsAppActionState(null);
  };

  // Ação 3: Direcionar para Orçamento
  const handleDirectToBudget = (opp: Opportunity) => {
    if (opp.stage !== 'INTERESSADO_ORCAMENTO') {
      handleStageChange(opp.id, 'INTERESSADO_ORCAMENTO');
    }
    if (onCreateBudgetForOpp) {
      onCreateBudgetForOpp({
        ...opp,
        stage: 'INTERESSADO_ORCAMENTO',
      });
    }
  };

  // Configuração global das mensagens padrão
  const handleOpenConfigMessages = () => {
    const current = StorageService.getProspectingMessages();
    setDraftPermissionMsg(current.requestPermissionMessage);
    setDraftCatalogMsg(current.sendCatalogMessage);
    setIsConfigMessagesOpen(true);
  };

  const handleSaveConfigMessages = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      requestPermissionMessage: draftPermissionMsg.trim() || DEFAULT_PERMISSION_WHATSAPP_MESSAGE,
      sendCatalogMessage: draftCatalogMsg.trim() || DEFAULT_CATALOG_WHATSAPP_MESSAGE,
    };
    StorageService.saveProspectingMessages(updated);
    setDefaultMessages(updated);
    setIsConfigMessagesOpen(false);
  };

  const handleResetDefaultMessages = () => {
    setDraftPermissionMsg(DEFAULT_PERMISSION_WHATSAPP_MESSAGE);
    setDraftCatalogMsg(DEFAULT_CATALOG_WHATSAPP_MESSAGE);
  };

  return (
    <div className="space-y-5">
      {/* CABEÇALHO SIMPLES E DIRETO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Captação Ativa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700">1. Mapear contato</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">2. Pedir permissão para enviar o catálogo</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">3. Direcionar para orçamento</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={handleOpenConfigMessages}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
            title="Alterar textos padrão das mensagens de WhatsApp"
          >
            <Settings2 className="w-4 h-4 text-slate-500" />
            <span>Mensagens Padrão</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGoogleMapsModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
            title="Buscar empresas por segmento e bairro direto no Google Maps"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Buscar no Maps</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingOpp(null);
              setIsOppModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA E FILTRO POR BAIRRO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, empresa, WhatsApp, bairro ou observação..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {neighborhoods.length > 0 && (
          <div className="flex items-center gap-2 sm:w-64">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={neighborhoodFilter}
              onChange={(e) => setNeighborhoodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os bairros / regiões</option>
              {neighborhoods.map((nb) => (
                <option key={nb} value={nb}>
                  {nb}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* PAINEL DE CONTADORES DE CONTATOS FORA DA TABELA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setMobileActiveStage('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-colors ${
                mobileActiveStage === 'TODOS'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>Total de Contatos</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-current">
                {filteredOpportunities.length}
              </span>
            </button>

            {KANBAN_COLUMNS.map((col) => {
              const count = filteredOpportunities.filter((o) => o.stage === col.key).length;
              const isSelected = mobileActiveStage === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() =>
                    setMobileActiveStage((prev) => (prev === col.key ? 'TODOS' : col.key))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Clique para filtrar por esta etapa"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
                  <span>{col.label}:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isSelected ? 'bg-white text-blue-700' : col.badgeStyle
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUADRO KANBAN (5 COLUNAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
        {KANBAN_COLUMNS.filter(
          (col) => mobileActiveStage === 'TODOS' || mobileActiveStage === col.key
        ).map((column) => {
          const columnOpps = filteredOpportunities.filter((o) => o.stage === column.key);
          const isDragOver = dragOverColumn === column.key;

          return (
            <div
              key={column.key}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
              className={`rounded-2xl border bg-slate-50/70 flex flex-col min-h-[420px] transition-all ${
                isDragOver
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
                  : 'border-slate-200'
              }`}
            >
              {/* Cabeçalho da Coluna (sem contador para ocupar menos espaço na linha do nome) */}
              <div className={`p-3.5 rounded-t-2xl border-b ${column.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${column.dotColor}`} />
                  <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {column.label}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {column.subtitle}
                </p>
              </div>

              {/* Lista de Cartões da Coluna */}
              <div className="p-3 space-y-3 flex-1">
                {columnOpps.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs font-semibold text-slate-400">
                      Nenhum lead em "{column.label}"
                    </p>
                    {column.key === 'PARA_CONTATAR' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOpp(null);
                          setIsOppModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar primeiro lead</span>
                      </button>
                    )}
                  </div>
                ) : (
                  columnOpps.map((opp) => (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-2xs hover:shadow-sm transition-all space-y-3 cursor-grab active:cursor-grabbing"
                    >
                      {/* Topo do Cartão: Nome + Botões Editar/Excluir */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug break-words flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{opp.name}</span>
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOpp(opp);
                              setIsOppModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar dados e observação"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOppToDelete(opp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dados Principais: WhatsApp, Bairro e Observação */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{formatPhone(opp.whatsapp || opp.phone)}</span>
                        </div>

                        {opp.neighborhood && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{opp.neighborhood}</span>
                          </div>
                        )}

                        {opp.notes && (
                          <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 text-xs leading-relaxed flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="break-words whitespace-pre-wrap">{opp.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Atual (Seletor Rápido de Status no Próprio Cartão) */}
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Status Atual
                        </label>
                        <select
                          value={opp.stage}
                          onChange={(e) =>
                            handleStageChange(opp.id, e.target.value as OpportunityStage)
                          }
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer focus:ring-2 focus:ring-blue-500 ${column.badgeStyle}`}
                        >
                          {KANBAN_COLUMNS.map((st) => (
                            <option key={st.key} value={st.key} className="bg-white text-slate-800">
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* AÇÕES DE WHATSAPP E FLUXO COMERCIAL */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        {/* Ação 1 — Pedir permissão ("Solicitar autorização") */}
                        <button
                          type="button"
                          onClick={() => handleOpenPermissionAction(opp)}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            opp.stage === 'PARA_CONTATAR'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Solicitar autorização</span>
                        </button>

                        {/* Ação 2 — Enviar catálogo */}
                        <button
                          type="button"
                          onClick={() => handleOpenCatalogAction(opp)}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            opp.stage === 'CATALOGO_ENVIADO'
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span>Enviar catálogo</span>
                        </button>

                        {/* Ação 3 — Direcionar para orçamento */}
                        <button
                          type="button"
                          onClick={() => handleDirectToBudget(opp)}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            opp.stage === 'INTERESSADO_ORCAMENTO'
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {opp.stage === 'INTERESSADO_ORCAMENTO'
                              ? 'Abrir Orçamentos'
                              : 'Interessado / Orçamento'}
                          </span>
                        </button>

                        {/* Ações rápidas para classificar desfecho: Bem Sucedido vs Sem Retorno / Recusado */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {opp.stage !== 'FECHADO_SUCESSO' && (
                            <button
                              type="button"
                              onClick={() => handleStageChange(opp.id, 'FECHADO_SUCESSO')}
                              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1 transition-colors ${
                                opp.stage === 'SEM_RETORNO_FECHADO' ? 'col-span-2' : ''
                              }`}
                              title="Mover para Bem Sucedido"
                            >
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">Bem Sucedido</span>
                            </button>
                          )}
                          {opp.stage !== 'SEM_RETORNO_FECHADO' && (
                            <button
                              type="button"
                              onClick={() => handleStageChange(opp.id, 'SEM_RETORNO_FECHADO')}
                              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1 transition-colors ${
                                opp.stage === 'FECHADO_SUCESSO' ? 'col-span-2' : ''
                              }`}
                              title="Mover para Sem Retorno / Recusado"
                            >
                              <XCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate">Recusado / S. Retorno</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE LEAD (4 CAMPOS) */}
      <OpportunityModal
        isOpen={isOppModalOpen}
        onClose={() => {
          setIsOppModalOpen(false);
          setEditingOpp(null);
        }}
        opportunity={editingOpp}
        onSaved={() => {
          loadOpportunities();
        }}
      />

      {/* MODAL DE REVISÃO E ENVIO MANUAL PELO WHATSAPP */}
      {whatsAppActionState && (
        <Modal
          isOpen={true}
          onClose={() => setWhatsAppActionState(null)}
          title={
            whatsAppActionState.actionType === 'PERMISSION'
              ? `Solicitar Autorização — ${whatsAppActionState.opp.name}`
              : `Enviar Catálogo — ${whatsAppActionState.opp.name}`
          }
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Contato: </span>
                <strong className="text-slate-900">{whatsAppActionState.opp.name}</strong>
              </div>
              <div className="font-bold text-emerald-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {formatPhone(
                    whatsAppActionState.opp.whatsapp || whatsAppActionState.opp.phone
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mensagem que será preenchida no WhatsApp (editável antes de abrir):
              </label>
              <textarea
                rows={5}
                value={whatsAppActionState.messageText}
                onChange={(e) =>
                  setWhatsAppActionState({
                    ...whatsAppActionState,
                    messageText: e.target.value,
                  })
                }
                className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-900 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                O WhatsApp será aberto com este texto preenchido para você revisar e enviar manualmente.
              </p>
            </div>

            {/* Confirmação pós-abertura do WhatsApp na Ação 2 (Enviar Catálogo) */}
            {whatsAppActionState.actionType === 'CATALOG' && (
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  whatsAppActionState.hasOpenedWhatsApp
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900">
                      Atualizar status para "Catálogo Enviado"?
                    </strong>
                    <span>
                      Confirme após enviar a mensagem manualmente no WhatsApp.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmCatalogSent}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Catálogo Enviado</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setWhatsAppActionState(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleTriggerWhatsApp}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PARA ALTERAR PREVIAMENTE AS MENSAGENS PADRÃO */}
      <Modal
        isOpen={isConfigMessagesOpen}
        onClose={() => setIsConfigMessagesOpen(false)}
        title="Mensagens Padrão de Abordagem (WhatsApp)"
        size="lg"
      >
        <form onSubmit={handleSaveConfigMessages} className="space-y-4">
          <p className="text-xs text-slate-600">
            Personalize os textos padrão utilizados nas ações de <strong>Solicitar autorização</strong> e <strong>Enviar catálogo</strong>. Você também poderá editá-los antes de cada envio individual.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ação 1 — Mensagem de Solicitar Autorização
            </label>
            <textarea
              rows={4}
              value={draftPermissionMsg}
              onChange={(e) => setDraftPermissionMsg(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-900 leading-relaxed focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ação 2 — Mensagem de Enviar Catálogo
            </label>
            <textarea
              rows={5}
              value={draftCatalogMsg}
              onChange={(e) => setDraftCatalogMsg(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-900 leading-relaxed focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetDefaultMessages}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão Dumorro</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfigMessagesOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
              >
                Salvar Mensagens
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DE BUSCA DE LEADS NO GOOGLE MAPS */}
      <GoogleMapsLeadModal
        isOpen={isGoogleMapsModalOpen}
        onClose={() => setIsGoogleMapsModalOpen(false)}
        companySettings={companySettings}
        existingOpportunities={opportunities}
        existingNeighborhoods={neighborhoods}
        onImported={() => {
          loadOpportunities();
        }}
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO MANUAL */}
      <ConfirmDialog
        isOpen={!!oppToDelete}
        title="Excluir Lead"
        message={
          oppToDelete
            ? `Tem certeza que deseja excluir "${oppToDelete.name}"? Se o contato apenas não respondeu ou recusou, recomenda-se movê-lo para "Sem Retorno / Recusado".`
            : ''
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (oppToDelete) {
            StorageService.deleteOpportunity(oppToDelete.id);
            loadOpportunities();
            setOppToDelete(null);
          }
        }}
        onCancel={() => setOppToDelete(null)}
      />
    </div>
  );
};

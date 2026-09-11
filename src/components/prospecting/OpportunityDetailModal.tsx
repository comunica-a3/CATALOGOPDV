import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  ApproachMessageTemplate,
  CompanySettings,
  Opportunity,
  OpportunityActivity,
  OpportunityNextActionType,
  OpportunityStage,
  ProductPackage,
} from '../../types';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  companySettings: CompanySettings;
  onEdit: (opp: Opportunity) => void;
  onRefresh: () => void;
  onCreateBudget?: (opp: Opportunity) => void;
}

const STAGES: { key: OpportunityStage; label: string; color: string; badgeVariant: 'warning' | 'primary' | 'success' | 'danger' | 'secondary' }[] = [
  { key: 'IDENTIFICADO', label: 'Identificado', color: 'text-rose-600 border-rose-300 bg-rose-50', badgeVariant: 'danger' },
  { key: 'A_CONTATAR', label: 'A Contatar', color: 'text-amber-600 border-amber-300 bg-amber-50', badgeVariant: 'warning' },
  { key: 'CONTATADO', label: 'Contatado', color: 'text-yellow-600 border-yellow-300 bg-yellow-50', badgeVariant: 'warning' },
  { key: 'INTERESSADO', label: 'Interessado', color: 'text-blue-600 border-blue-300 bg-blue-50', badgeVariant: 'primary' },
  { key: 'ORCAMENTO', label: 'Em Orçamento', color: 'text-purple-600 border-purple-300 bg-purple-50', badgeVariant: 'secondary' },
  { key: 'CONVERTIDO', label: 'Convertido em Cliente', color: 'text-emerald-600 border-emerald-300 bg-emerald-50', badgeVariant: 'success' },
  { key: 'NAO_CONVERTEU', label: 'Não Converteu', color: 'text-slate-600 border-slate-300 bg-slate-50', badgeVariant: 'secondary' },
];

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  companySettings,
  onEdit,
  onRefresh,
  onCreateBudget,
}) => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<OpportunityActivity[]>([]);
  const [templates, setTemplates] = useState<ApproachMessageTemplate[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState(false);
  const lastOpportunityIdRef = useRef<string | null>(null);

  // Nova anotação/atividade rápida
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<OpportunityActivity['type']>('OBSERVACAO');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Feedback de conversão
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !opportunity) {
      lastOpportunityIdRef.current = null;
      return;
    }

    const acts = StorageService.getOpportunityActivities(opportunity.id);
    const tpls = StorageService.getApproachTemplates();
    const pkgs = StorageService.getPackages();
    setActivities(acts);
    setTemplates(tpls);
    setPackages(pkgs);
    setConversionSuccess(null);
    setNewNoteText('');

    // Carrega ações executadas e modelos atualizados do servidor/rede
    StorageService.loadOpportunityActivitiesAsync(opportunity.id).then((remoteActs) => {
      if (remoteActs && remoteActs.length > 0) {
        setActivities(remoteActs.filter((a) => a.opportunityId === opportunity.id));
      }
    });
    StorageService.loadApproachTemplatesAsync().then((remoteTpls) => {
      if (remoteTpls && remoteTpls.length > 0) {
        setTemplates(remoteTpls);
      }
    });

    // Seleciona template apenas na abertura inicial de uma nova oportunidade, preservando a escolha do usuário
    if (lastOpportunityIdRef.current !== opportunity.id) {
      lastOpportunityIdRef.current = opportunity.id;
      const matched =
        (opportunity.selectedTemplateId ? tpls.find((t) => t.id === opportunity.selectedTemplateId) : null) ||
        tpls.find((t) => t.targetStage === opportunity.stage) ||
        tpls[0];

      if (matched) {
        setSelectedTemplateId(matched.id);
        if (opportunity.customApproachMessage) {
          setCustomMessage(opportunity.customApproachMessage);
        } else {
          const pkgName = opportunity.suggestedPackageIds && opportunity.suggestedPackageIds.length > 0
            ? pkgs.find((p) => p.id === opportunity.suggestedPackageIds![0])?.name
            : undefined;
          const built = StorageService.buildApproachMessage(
            matched.templateText,
            opportunity,
            currentUser.name,
            companySettings.name,
            pkgName
          );
          setCustomMessage(built);
        }
      }
    }

    const handleActivitiesUpdated = (e: any) => {
      if (opportunity && (!e.detail?.opportunityId || e.detail.opportunityId === opportunity.id)) {
        setActivities(StorageService.getOpportunityActivities(opportunity.id));
      }
    };
    const handleTemplatesUpdated = () => {
      setTemplates(StorageService.getApproachTemplates());
    };

    window.addEventListener('opportunity-activities-updated', handleActivitiesUpdated);
    window.addEventListener('approach-templates-updated', handleTemplatesUpdated);
    return () => {
      window.removeEventListener('opportunity-activities-updated', handleActivitiesUpdated);
      window.removeEventListener('approach-templates-updated', handleTemplatesUpdated);
    };
  }, [isOpen, opportunity?.id, currentUser?.name, companySettings?.name]);

  if (!opportunity) return null;

  const currentStageObj = STAGES.find((s) => s.key === opportunity.stage) || STAGES[0];

  const handleStageChange = (newStage: OpportunityStage) => {
    StorageService.updateOpportunityStage(opportunity.id, newStage);
    onRefresh();
  };

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      const pkgName = opportunity.suggestedPackageIds && opportunity.suggestedPackageIds.length > 0
        ? packages.find((p) => p.id === opportunity.suggestedPackageIds![0])?.name
        : undefined;
      const built = StorageService.buildApproachMessage(
        tpl.templateText,
        opportunity,
        currentUser.name,
        companySettings.name,
        pkgName
      );
      setCustomMessage(built);

      // Persiste a escolha do modelo e a mensagem gerada na oportunidade
      try {
        const updatedOpp: Opportunity = {
          ...opportunity,
          selectedTemplateId: tplId,
          customApproachMessage: built,
        };
        StorageService.saveOpportunity(updatedOpp);
      } catch (e) {
        console.debug('Aviso ao persistir modelo na oportunidade:', e);
      }
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (opportunity.whatsapp || opportunity.phone).replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Telefone do cliente inválido ou não informado.');
      return;
    }

    // Registra atividade de envio de WhatsApp
    StorageService.addOpportunityActivity({
      opportunityId: opportunity.id,
      type: 'WHATSAPP',
      description: `Mensagem enviada via WhatsApp para (${formatPhone(cleanPhone)})`,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    // Se estiver em 'A_CONTATAR', avança automaticamente para 'CONTATADO'
    if (opportunity.stage === 'A_CONTATAR' || opportunity.stage === 'IDENTIFICADO') {
      StorageService.updateOpportunityStage(opportunity.id, 'CONTATADO');
    }

    onRefresh();

    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    StorageService.addOpportunityActivity({
      opportunityId: opportunity.id,
      type: newNoteType,
      description: newNoteText.trim(),
      userId: currentUser.id,
      userName: currentUser.name,
    });

    setNewNoteText('');
    setIsAddingNote(false);
    onRefresh();
    setActivities(StorageService.getOpportunityActivities(opportunity.id));
  };

  const handleDeleteActivity = (actId: string) => {
    if (confirm('Deseja excluir esta ação/anotação executada?')) {
      StorageService.deleteOpportunityActivity(actId);
      if (opportunity) {
        setActivities(StorageService.getOpportunityActivities(opportunity.id));
      }
      onRefresh();
    }
  };

  const handleConvertToCustomer = () => {
    try {
      const res = StorageService.convertOpportunityToCustomer(opportunity.id);
      setConversionSuccess(`Convertido com sucesso no cliente "${res.customer.name}"!`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao converter oportunidade.');
    }
  };

  const suggestedPackages = packages.filter((p) => opportunity.suggestedPackageIds?.includes(p.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Oportunidade #${opportunity.opportunityNumber || ''} — ${opportunity.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* HEADER DE STATUS & AÇÕES RÁPIDAS */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800">{opportunity.name}</h3>
              <Badge variant={currentStageObj.badgeVariant} size="sm">
                {currentStageObj.label}
              </Badge>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                {opportunity.segment}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              {opportunity.contactName && (
                <span>👤 Contato: <strong>{opportunity.contactName}</strong></span>
              )}
              <span>📞 {formatPhone(opportunity.phone)}</span>
              {opportunity.neighborhood && <span>📍 {opportunity.neighborhood}</span>}
              <span>👤 Resp: <strong>{opportunity.assignedUserName || 'Geral'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onEdit(opportunity)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar</span>
            </button>

            {opportunity.stage !== 'CONVERTIDO' ? (
              <button
                type="button"
                onClick={handleConvertToCustomer}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Converter em Cliente</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cliente Ativo
              </span>
            )}

            {onCreateBudget && (
              <button
                type="button"
                onClick={() => onCreateBudget(opportunity)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Criar Orçamento</span>
              </button>
            )}
          </div>
        </div>

        {conversionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
            <span>🎉</span>
            <span>{conversionSuccess}</span>
          </div>
        )}

        {/* ORIGEM DO LEAD (FORMULÁRIO / LANDING PAGE) */}
        {(opportunity.sourceFormTitle || opportunity.sourcePageTitle || opportunity.sourceType === 'FORMULARIO_PUBLICO' || opportunity.sourceType === 'LANDING_PAGE') && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-900 block">
                  Captado via {opportunity.sourcePageTitle ? `Landing Page: "${opportunity.sourcePageTitle}"` : opportunity.sourceFormTitle ? `Formulário: "${opportunity.sourceFormTitle}"` : 'Link de Captação Online'}
                </span>
                <span className="text-indigo-700 text-[11px]">
                  Origem do cadastro: {opportunity.sourceFormTitle ? `Formulário: ${opportunity.sourceFormTitle}` : 'Formulário Online'}
                </span>
              </div>
            </div>
            {opportunity.formResponses && Object.keys(opportunity.formResponses).length > 0 && (
              <span className="text-[11px] bg-indigo-200/60 text-indigo-900 font-semibold px-2.5 py-1 rounded-lg shrink-0">
                {Object.keys(opportunity.formResponses).length} campos preenchidos
              </span>
            )}
          </div>
        )}

        {/* 1. MUDANÇA RÁPIDA DE ETAPA (PIPELINE) */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Mover Etapa no Funil:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {STAGES.map((s) => {
              const isCurrent = opportunity.stage === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleStageChange(s.key)}
                  className={`p-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate">{s.label}</div>
                  {isCurrent && <div className="text-[10px] opacity-90">Etapa Atual</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. ABORDAGEM & MENSAGEM WHATSAPP */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Abordagem Rápida via WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-800 font-medium">Modelo:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="text-xs border border-emerald-300 rounded px-2 py-1 bg-white text-slate-800 font-medium"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            onBlur={() => {
              if (opportunity && customMessage) {
                try {
                  StorageService.saveOpportunity({
                    ...opportunity,
                    selectedTemplateId,
                    customApproachMessage: customMessage,
                  });
                } catch (e) {
                  console.debug('Aviso ao salvar mensagem editada:', e);
                }
              }
            }}
            rows={5}
            className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Mensagem para o cliente..."
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-emerald-700">
              💡 As tags como [NOME] e [VENDEDOR] já foram personalizadas para este cliente.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copiedToast ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp ({formatPhone(opportunity.whatsapp || opportunity.phone)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. INFORMAÇÕES DE NECESSIDADES & PACOTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Necessidades Identificadas</span>
            </div>
            {opportunity.needs && opportunity.needs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {opportunity.needs.map((n) => (
                  <span
                    key={n}
                    className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-xs font-medium"
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhuma necessidade marcada.</p>
            )}

            {opportunity.needsDescription && (
              <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                <strong>Observações:</strong> {opportunity.needsDescription}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pacotes Sugeridos</span>
            </div>
            {suggestedPackages.length > 0 ? (
              <div className="space-y-2">
                {suggestedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{pkg.name}</div>
                      <div className="text-[11px] text-slate-500">{pkg.items.length} produtos inclusos</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600">
                      R$ {pkg.packagePrice.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum pacote vinculado.</p>
            )}
          </div>
        </div>

        {/* 4. HISTÓRICO DE ATIVIDADES & NOTAS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Histórico de Atividades & Contatos ({activities.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNote ? 'Cancelar' : 'Adicionar Anotação'}</span>
            </button>
          </div>

          {isAddingNote && (
            <form onSubmit={handleAddNote} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as any)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="OBSERVACAO">📝 Anotação</option>
                  <option value="WHATSAPP">💬 Mensagem WhatsApp</option>
                  <option value="LIGACAO">📞 Ligação Telefônica</option>
                  <option value="VISITA">🚶 Visita Presencial</option>
                  <option value="REUNIAO">🤝 Reunião</option>
                </select>
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Descreva o que foi conversado..."
                  className="flex-1 px-3 py-1 text-xs border border-slate-300 rounded"
                  required
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start gap-2.5"
                >
                  <div className="p-1 rounded bg-white border border-slate-200 text-slate-600 mt-0.5">
                    {act.type === 'WHATSAPP' && <MessageCircle className="w-3 h-3 text-emerald-600" />}
                    {act.type === 'LIGACAO' && <Phone className="w-3 h-3 text-blue-600" />}
                    {act.type === 'CONVERSAO' && <UserCheck className="w-3 h-3 text-emerald-600" />}
                    {act.type === 'MUDANCA_ETAPA' && <Layers className="w-3 h-3 text-indigo-600" />}
                    {act.type === 'OBSERVACAO' && <Edit className="w-3 h-3 text-slate-500" />}
                    {act.type === 'VISITA' && <MapPin className="w-3 h-3 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{act.userName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                          {new Date(act.createdAt).toLocaleString('pt-BR')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.id)}
                          title="Excluir anotação"
                          className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{act.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma atividade registrada ainda.</p>
            )}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

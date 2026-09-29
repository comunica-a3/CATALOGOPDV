import {
  Building2,
  Calendar,
  Clock,
  HelpCircle,
  Layers,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Sparkles,
  Tag,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import {
  Opportunity,
  OpportunityNextActionType,
  OpportunityOrigin,
  OpportunityStage,
  ProductPackage,
  User as UserType,
} from '../../types';
import { extractPhoneDigits, formatPhone, isValidPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';

const SEGMENTS_LIST = [
  'Salão de Beleza & Estética',
  'Restaurante, Bar & Lanchonete',
  'Comércio & Varejo',
  'Consultório & Saúde',
  'Oficina & Automotivo',
  'Eventos, Festas & Shows',
  'Escola & Cursos',
  'Igreja & Associação',
  'Profissional Autônomo',
  'Indústria & Logística',
  'Outro',
];

const COMMON_NEEDS = [
  'Melhorar a divulgação',
  'Precisa de material gráfico',
  'Vai realizar um evento',
  'Precisa de impressão',
  'Precisa de cartões de visita',
  'Precisa de banners ou faixas',
  'Precisa de comunicação visual',
  'Precisa organizar documentos / talões',
  'Possui negócio novo / inauguração',
  'Precisa atualizar materiais antigos',
];

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
  const { currentUser, sellers, promoters, isAdmin } = useAuth();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [segment, setSegment] = useState('Comércio & Varejo');
  const [customSegment, setCustomSegment] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [needsDescription, setNeedsDescription] = useState('');
  const [origin, setOrigin] = useState<OpportunityOrigin>('PROSPECCAO_PRESENCIAL');
  const [originDetails, setOriginDetails] = useState('');
  const [stage, setStage] = useState<OpportunityStage>('A_CONTATAR');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  // Próxima ação
  const [hasNextAction, setHasNextAction] = useState(true);
  const [nextActionType, setNextActionType] = useState<OpportunityNextActionType>('WHATSAPP');
  const [nextActionDate, setNextActionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [nextActionTime, setNextActionTime] = useState('14:00');
  const [nextActionNote, setNextActionNote] = useState('');

  const [availablePackages, setAvailablePackages] = useState<ProductPackage[]>([]);
  const [error, setError] = useState('');

  const commercialUsers: UserType[] = React.useMemo(() => {
    const all = StorageService.getUsers();
    return all.filter((u) => u.role === 'VENDEDOR' || u.role === 'PROMOTOR' || u.role === 'COLABORADOR' || u.role === 'ADMINISTRADOR');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAvailablePackages(StorageService.getPackages());
      setError('');

      if (opportunity) {
        setName(opportunity.name || '');
        setContactName(opportunity.contactName || '');
        if (SEGMENTS_LIST.includes(opportunity.segment)) {
          setSegment(opportunity.segment);
          setCustomSegment('');
        } else {
          setSegment('Outro');
          setCustomSegment(opportunity.segment);
        }
        setNeighborhood(opportunity.neighborhood || '');
        setCity(opportunity.city || '');
        setPhone(opportunity.phone || '');
        setWhatsapp(opportunity.whatsapp || '');
        setInstagram(opportunity.instagram || '');
        setSelectedNeeds(opportunity.needs || []);
        setNeedsDescription(opportunity.needsDescription || '');
        setOrigin(opportunity.origin || 'PROSPECCAO_PRESENCIAL');
        setOriginDetails(opportunity.originDetails || '');
        setStage(opportunity.stage || 'IDENTIFICADO');
        setAssignedUserId(opportunity.assignedUserId || currentUser.id);
        setNotes(opportunity.notes || '');
        setSelectedPackageIds(opportunity.suggestedPackageIds || []);

        if (opportunity.nextAction) {
          setHasNextAction(true);
          setNextActionType(opportunity.nextAction.type);
          setNextActionDate(opportunity.nextAction.date || new Date().toISOString().split('T')[0]);
          setNextActionTime(opportunity.nextAction.time || '14:00');
          setNextActionNote(opportunity.nextAction.note || '');
        } else {
          setHasNextAction(false);
        }
      } else {
        // Novo cadastro
        setName('');
        setContactName('');
        setSegment('Comércio & Varejo');
        setCustomSegment('');
        setNeighborhood('');
        setCity('São Paulo');
        setPhone('');
        setWhatsapp('');
        setInstagram('');
        setSelectedNeeds(['Melhorar a divulgação']);
        setNeedsDescription('');
        setOrigin('PROSPECCAO_PRESENCIAL');
        setOriginDetails('');
        setStage('A_CONTATAR');
        setAssignedUserId(currentUser.id);
        setNotes('');
        setSelectedPackageIds([]);
        setHasNextAction(true);
        setNextActionType('WHATSAPP');
        setNextActionDate(new Date().toISOString().split('T')[0]);
        setNextActionTime('14:00');
        setNextActionNote('Fazer primeira abordagem de apresentação');
      }
    }
  }, [isOpen, opportunity, currentUser]);

  const handleToggleNeed = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleTogglePackage = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((p) => p !== pkgId) : [...prev, pkgId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do cliente ou negócio.');
      return;
    }
    if (!isValidPhone(phone, true)) {
      setError('Por favor, informe um telefone/WhatsApp válido com DDD (10 ou 11 dígitos).');
      return;
    }

    const finalSegment = segment === 'Outro' ? (customSegment.trim() || 'Geral') : segment;
    const assignedUser = commercialUsers.find((u) => u.id === assignedUserId) || currentUser;

    try {
      const saved = StorageService.saveOpportunity({
        id: opportunity?.id,
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        segment: finalSegment,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        phone: formatPhone(phone),
        whatsapp: formatPhone(whatsapp || phone),
        instagram: instagram.trim() || undefined,
        needs: selectedNeeds,
        needsDescription: needsDescription.trim() || undefined,
        origin,
        originDetails: originDetails.trim() || undefined,
        stage,
        assignedUserId: assignedUser.id,
        assignedUserName: assignedUser.name,
        notes: notes.trim() || undefined,
        suggestedPackageIds: selectedPackageIds,
        nextAction: hasNextAction
          ? {
              type: nextActionType,
              date: nextActionDate,
              time: nextActionTime,
              responsibleId: assignedUser.id,
              responsibleName: assignedUser.name,
              note: nextActionNote.trim() || undefined,
              completed: false,
            }
          : undefined,
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar oportunidade.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={opportunity ? `Editar Oportunidade: ${opportunity.name}` : 'Cadastrar Nova Oportunidade de Venda'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. DADOS DO NEGÓCIO / CLIENTE */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm border-b border-slate-200 pb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Dados da Pessoa ou Empresa Prospectada</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Negócio ou Cliente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salão Bella Vista, Padaria Central, Dr. Carlos..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Responsável / Contato
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: Juliana (Gerente), Marcos (Dono)..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Segmento de Atuação
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SEGMENTS_LIST.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
            </div>

            {segment === 'Outro' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Especifique o Segmento
                </label>
                <input
                  type="text"
                  value={customSegment}
                  onChange={(e) => setCustomSegment(e.target.value)}
                  placeholder="Ex: Pet Shop, Imobiliária..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Telefone / WhatsApp *
              </label>
              <PhoneInput
                id="opp-phone-input"
                value={phone}
                onChange={(masked) => {
                  setPhone(masked);
                  if (!whatsapp) setWhatsapp(masked);
                }}
                showIcon={true}
                placeholder="(11) 99999-9999"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Instagram / Redes
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@nomedonegocio"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bairro / Região
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Centro, Vila Mariana, Av. Principal..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. NECESSIDADES & OPORTUNIDADE DE VENDA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm border-b border-slate-200 pb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Identificação de Necessidades & Soluções</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Selecione o que o cliente precisa ou demonstrou interesse:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_NEEDS.map((need) => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => handleToggleNeed(need)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{need}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Detalhes das Necessidades / O que foi conversado
            </label>
            <textarea
              value={needsDescription}
              onChange={(e) => setNeedsDescription(e.target.value)}
              rows={2}
              placeholder="Ex: Cliente quer fazer 1000 panfletos e 2 banners para a inauguração no dia 15..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {availablePackages.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                📦 Sugerir Pacote ou Solução Pronta:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePackages.map((pkg) => {
                  const isSelected = selectedPackageIds.includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleTogglePackage(pkg.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{pkg.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{pkg.description}</div>
                        <div className="text-xs font-semibold text-emerald-600 mt-1">
                          R$ {pkg.packagePrice.toFixed(2)} {pkg.discountPercent ? `(-${pkg.discountPercent}%)` : ''}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-blue-600 mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. ETAPA DO FUNIL & ATRIBUIÇÃO */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm border-b border-slate-200 pb-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Etapa do Funil & Responsável Comercial</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Etapa Atual no Funil
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OpportunityStage)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="IDENTIFICADO">🔴 Identificado</option>
                <option value="A_CONTATAR">🟠 A Contatar</option>
                <option value="CONTATADO">🟡 Contatado</option>
                <option value="INTERESSADO">🔵 Interessado</option>
                <option value="ORCAMENTO">🟣 Em Orçamento</option>
                <option value="CONVERTIDO">🟢 Convertido em Cliente</option>
                <option value="NAO_CONVERTEU">⚫ Não Converteu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Origem do Lead
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value as OpportunityOrigin)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="PROSPECCAO_PRESENCIAL">Prospecção Presencial / Rua</option>
                <option value="PESQUISA_PROPRIA">Pesquisa Própria / Google / Maps</option>
                <option value="WHATSAPP">WhatsApp Direto</option>
                <option value="INSTAGRAM">Instagram / Redes Sociais</option>
                <option value="ATENDIMENTO_PRESENCIAL">Balcão / Loja Física</option>
                <option value="EVENTO">Evento / Feira Comercial</option>
                <option value="FORMULARIO_PUBLICO">Site / Formulário Público</option>
                <option value="VENDEDOR_EXTERNO">Vendedor Externo / Promotor</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vendedor / Responsável
              </label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {commercialUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. PRÓXIMA AÇÃO PROGRAMADA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Próxima Ação de Retorno / Acompanhamento</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasNextAction}
                onChange={(e) => setHasNextAction(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Agendar próxima ação</span>
            </label>
          </div>

          {hasNextAction && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Ação
                </label>
                <select
                  value={nextActionType}
                  onChange={(e) => setNextActionType(e.target.value as OpportunityNextActionType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="WHATSAPP">💬 Mensagem no WhatsApp</option>
                  <option value="LIGACAO">📞 Ligação Telefônica</option>
                  <option value="VISITA">🚶 Visita Presencial</option>
                  <option value="ENVIAR_ORCAMENTO">📄 Enviar Orçamento</option>
                  <option value="RETOMAR_NEGOCIACAO">🔄 Retomar Negociação</option>
                  <option value="REUNIAO">🤝 Reunião</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Data do Retorno
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required={hasNextAction}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Horário Sugerido
                </label>
                <input
                  type="time"
                  value={nextActionTime}
                  onChange={(e) => setNextActionTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observação da Ação
                </label>
                <input
                  type="text"
                  value={nextActionNote}
                  onChange={(e) => setNextActionNote(e.target.value)}
                  placeholder="Ex: Enviar proposta de 1000 cartões e tabela de preços de banners..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
          >
            <span>{opportunity ? 'Salvar Alterações' : 'Salvar Oportunidade'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

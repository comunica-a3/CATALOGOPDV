import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  Filter,
  Globe,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Square,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StorageService } from '../../services/storage';
import { CompanySettings, Opportunity, OpportunityStage } from '../../types';
import { formatPhone, isValidPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface GoogleMapsPlaceResult {
  placeId: string;
  name: string;
  phone: string;
  neighborhood: string;
  city: string;
  address: string;
  category: string;
  rating?: number;
  userRatingCount?: number;
  website?: string;
  googleMapsUrl?: string;
}

interface GoogleMapsLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
  existingOpportunities: Opportunity[];
  existingNeighborhoods: string[];
  onImported: (importedCount: number, neighborhood?: string) => void;
}

const QUICK_SEGMENTS = [
  'Padarias',
  'Restaurantes',
  'Hamburguerias',
  'Pizzarias',
  'Mercados',
  'Clínicas Odontológicas',
  'Salões de Beleza',
  'Academias',
  'Imobiliárias',
  'Oficinas Mecânicas',
  'Pet Shops',
  'Lojas de Roupas',
];

const STAGE_LABELS: Record<OpportunityStage, string> = {
  PARA_CONTATAR: 'Para Contatar',
  CATALOGO_ENVIADO: 'Catálogo Enviado',
  INTERESSADO_ORCAMENTO: 'Interessado / Orçamento',
  FECHADO_SUCESSO: 'Bem Sucedido',
  SEM_RETORNO_FECHADO: 'Sem Retorno / Recusado',
};

const LAST_CITY_STORAGE_KEY = 'dumorro_gmaps_last_city';
const LAST_NEIGHBORHOOD_STORAGE_KEY = 'dumorro_gmaps_last_neighborhood';
const LOCAL_GMAPS_API_KEY_STORAGE = 'dumorro_gmaps_api_key';

function maskKeyClient(key: string): string {
  if (!key || key.length < 10) return '';
  return `${key.slice(0, 6)}••••••••••••${key.slice(-4)}`;
}

async function searchPlacesDirectlyFromClient(params: {
  apiKey: string;
  query: string;
  neighborhood?: string;
  city?: string;
  pageToken?: string;
}): Promise<{
  query: string;
  places: GoogleMapsPlaceResult[];
  nextPageToken?: string;
}> {
  const cleanQuery = params.query.trim();
  const cleanNeighborhood = (params.neighborhood || '').trim();
  const cleanCity = (params.city || '').trim();
  const locationParts = [cleanNeighborhood, cleanCity].filter(Boolean).join(', ');
  const fullTextQuery = locationParts ? `${cleanQuery} em ${locationParts}` : cleanQuery;

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.shortFormattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.addressComponents',
    'places.primaryTypeDisplayName',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.rating',
    'places.userRatingCount',
    'places.businessStatus',
    'nextPageToken',
  ].join(',');

  const body: Record<string, any> = {
    textQuery: fullTextQuery,
    languageCode: 'pt-BR',
    regionCode: 'BR',
    pageSize: 20,
  };
  if (params.pageToken) {
    body.pageToken = params.pageToken;
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': params.apiKey.trim(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errPayload: any = await response.json().catch(() => ({}));
    const googleMessage =
      errPayload?.error?.message ||
      errPayload?.error_message ||
      `Erro HTTP ${response.status} ao consultar Google Places API.`;

    if (response.status === 403 || response.status === 401) {
      throw new Error(
        `Acesso recusado pela API do Google Maps: verifique se a "Places API (New)" está ativada no Google Cloud e se a chave está correta. (${googleMessage})`
      );
    }
    throw new Error(`Não foi possível realizar a busca no Google Maps: ${googleMessage}`);
  }

  const data: any = await response.json();
  const rawPlaces: any[] = Array.isArray(data.places) ? data.places : [];

  const places: GoogleMapsPlaceResult[] = rawPlaces
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((p) => {
      const components: any[] = Array.isArray(p.addressComponents) ? p.addressComponents : [];
      const findComp = (types: string[]) =>
        components.find((c) => Array.isArray(c.types) && types.some((t) => c.types.includes(t)));

      const sublocalityComp = findComp([
        'sublocality_level_1',
        'sublocality',
        'neighborhood',
        'sublocality_level_2',
      ]);
      const cityComp = findComp(['administrative_area_level_2', 'locality']);

      const extractedNeighborhood =
        sublocalityComp?.longText || sublocalityComp?.shortText || cleanNeighborhood || '';
      const extractedCity = cityComp?.longText || cityComp?.shortText || cleanCity || '';

      let rawPhone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
      if (rawPhone.startsWith('+55')) {
        rawPhone = rawPhone.replace(/^\+55\s*/, '');
      }

      return {
        placeId: p.id,
        name: p.displayName?.text || 'Estabelecimento',
        phone: rawPhone.trim(),
        neighborhood: extractedNeighborhood.trim(),
        city: extractedCity.trim(),
        address: p.shortFormattedAddress || p.formattedAddress || '',
        category: p.primaryTypeDisplayName?.text || cleanQuery,
        rating: typeof p.rating === 'number' ? p.rating : undefined,
        userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
        website: p.websiteUri || undefined,
        googleMapsUrl: p.googleMapsUri || undefined,
      };
    });

  return {
    query: fullTextQuery,
    places,
    nextPageToken: data.nextPageToken || undefined,
  };
}

function normalizePhoneCompareKey(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  // Compara pelos últimos 8 dígitos (ignora DDD ou nono dígito divergente entre fixo/WhatsApp)
  return digits.slice(-8);
}

function normalizeNameCompareKey(name?: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export const GoogleMapsLeadModal: React.FC<GoogleMapsLeadModalProps> = ({
  isOpen,
  onClose,
  companySettings,
  existingOpportunities,
  existingNeighborhoods,
  onImported,
}) => {
  const { currentUser } = useAuth();

  // Configuração da chave da API
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string>('');
  const [keySource, setKeySource] = useState<'env' | 'settings' | 'none'>('none');
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campos de busca
  const [query, setQuery] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [city, setCity] = useState<string>('');

  // Estado dos resultados
  const [results, setResults] = useState<GoogleMapsPlaceResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Edições locais antes de importar (telefone / bairro por placeId)
  const [editedPhones, setEditedPhones] = useState<Record<string, string>>({});
  const [editedNeighborhoods, setEditedNeighborhoods] = useState<Record<string, string>>({});

  // Seleção e filtros
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [onlyWithPhone, setOnlyWithPhone] = useState<boolean>(true);
  const [hideAlreadyRegistered, setHideAlreadyRegistered] = useState<boolean>(false);

  // Carrega status da chave ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    setSearchError('');
    setConfigFeedback(null);

    const savedCity = localStorage.getItem(LAST_CITY_STORAGE_KEY);
    const savedNeighborhood = localStorage.getItem(LAST_NEIGHBORHOOD_STORAGE_KEY);
    const defaultCompanyCity = [companySettings?.city, companySettings?.state]
      .filter(Boolean)
      .join(' - ');

    if (!city) {
      setCity(savedCity || defaultCompanyCity || '');
    }
    if (!neighborhood && savedNeighborhood) {
      setNeighborhood(savedNeighborhood);
    }

    const localKey = (localStorage.getItem(LOCAL_GMAPS_API_KEY_STORAGE) || '').trim();
    if (localKey) {
      setIsKeyConfigured(true);
      setMaskedKey(maskKeyClient(localKey));
      setKeySource('settings');
    }

    api
      .getGoogleMapsConfig()
      .then((cfg) => {
        if (cfg.configured) {
          setIsKeyConfigured(true);
          setMaskedKey(cfg.maskedKey || '');
          setKeySource(cfg.source);
        } else if (localKey) {
          // Sincroniza chave local com o servidor automaticamente
          api.saveGoogleMapsConfig(localKey).catch(() => {});
          setIsKeyConfigured(true);
          setMaskedKey(maskKeyClient(localKey));
          setKeySource('settings');
        } else {
          setIsKeyConfigured(false);
          setMaskedKey('');
          setKeySource('none');
          setIsConfigOpen(true);
        }
        if (!city && !savedCity && cfg.defaultCity) {
          setCity(cfg.defaultCity);
        }
      })
      .catch(() => {
        if (!localKey) {
          setIsConfigOpen(true);
        }
      });
  }, [isOpen, companySettings]);

  // Mapa rápido de duplicidade com oportunidades já existentes no Kanban
  const existingMap = useMemo(() => {
    const byPhone = new Map<string, Opportunity>();
    const byName = new Map<string, Opportunity>();

    existingOpportunities.forEach((opp) => {
      const pKey = normalizePhoneCompareKey(opp.phone || opp.whatsapp);
      if (pKey) {
        byPhone.set(pKey, opp);
      }
      const nKey = normalizeNameCompareKey(opp.name);
      if (nKey && nKey.length >= 4) {
        byName.set(nKey, opp);
      }
    });

    return { byPhone, byName };
  }, [existingOpportunities]);

  const findDuplicateOpportunity = (place: GoogleMapsPlaceResult): Opportunity | undefined => {
    const effectivePhone = editedPhones[place.placeId] !== undefined ? editedPhones[place.placeId] : place.phone;
    const pKey = normalizePhoneCompareKey(effectivePhone);
    if (pKey && existingMap.byPhone.has(pKey)) {
      return existingMap.byPhone.get(pKey);
    }
    const nKey = normalizeNameCompareKey(place.name);
    if (nKey && existingMap.byName.has(nKey)) {
      return existingMap.byName.get(nKey);
    }
    return undefined;
  };

  const getEffectivePhone = (place: GoogleMapsPlaceResult): string => {
    const raw = editedPhones[place.placeId] !== undefined ? editedPhones[place.placeId] : place.phone;
    return formatPhone(raw || '');
  };

  const getEffectiveNeighborhood = (place: GoogleMapsPlaceResult): string => {
    if (editedNeighborhoods[place.placeId] !== undefined) {
      return editedNeighborhoods[place.placeId];
    }
    return place.neighborhood || neighborhood.trim() || '';
  };

  // Resultados filtrados para exibição
  const visibleResults = useMemo(() => {
    return results.filter((place) => {
      const phoneVal = getEffectivePhone(place);
      const hasValidPhone = isValidPhone(phoneVal, true);
      const duplicateOpp = findDuplicateOpportunity(place);

      if (onlyWithPhone && !hasValidPhone && editedPhones[place.placeId] === undefined) {
        return false;
      }
      if (hideAlreadyRegistered && duplicateOpp) {
        return false;
      }
      return true;
    });
  }, [results, onlyWithPhone, hideAlreadyRegistered, editedPhones, existingMap]);

  // Salvar chave da API
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setConfigFeedback({ type: 'error', text: 'Cole uma chave de API válida antes de salvar.' });
      return;
    }
    setIsSavingKey(true);
    setConfigFeedback(null);

    // Salva localmente imediatamente e sincroniza com o servidor se a rota estiver ativa
    localStorage.setItem(LOCAL_GMAPS_API_KEY_STORAGE, cleanKey);

    try {
      const res = await api.saveGoogleMapsConfig(cleanKey);
      setIsKeyConfigured(res.configured);
      setMaskedKey(res.maskedKey || maskKeyClient(cleanKey));
      setKeySource(res.source);
    } catch {
      // Fallback caso o servidor ainda não tenha sido reiniciado (404)
      setIsKeyConfigured(true);
      setMaskedKey(maskKeyClient(cleanKey));
      setKeySource('settings');
    } finally {
      setApiKeyInput('');
      setConfigFeedback({
        type: 'success',
        text: 'Chave da API do Google Maps salva com sucesso!',
      });
      setIsSavingKey(false);
      setTimeout(() => {
        setIsConfigOpen(false);
        setConfigFeedback(null);
      }, 1000);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsSavingKey(true);
    setConfigFeedback(null);
    localStorage.removeItem(LOCAL_GMAPS_API_KEY_STORAGE);
    try {
      const res = await api.saveGoogleMapsConfig('');
      setIsKeyConfigured(res.configured);
      setMaskedKey(res.maskedKey || '');
      setKeySource(res.source);
    } catch {
      setIsKeyConfigured(false);
      setMaskedKey('');
      setKeySource('none');
    } finally {
      setConfigFeedback({
        type: 'success',
        text: 'Chave removida das configurações.',
      });
      setIsSavingKey(false);
    }
  };

  // Executar busca no Google Maps
  const executeSearch = async (pageTokenToUse?: string) => {
    if (!query.trim()) {
      setSearchError('Digite o segmento que deseja buscar (ex: Padarias, Clínicas, Mercados).');
      return;
    }

    setSearchError('');
    if (pageTokenToUse) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setHasSearched(true);
    }

    if (city.trim()) {
      localStorage.setItem(LAST_CITY_STORAGE_KEY, city.trim());
    }
    if (neighborhood.trim()) {
      localStorage.setItem(LAST_NEIGHBORHOOD_STORAGE_KEY, neighborhood.trim());
    }

    const localKey = (localStorage.getItem(LOCAL_GMAPS_API_KEY_STORAGE) || '').trim();

    try {
      let response: {
        query: string;
        places: GoogleMapsPlaceResult[];
        nextPageToken?: string;
      };

      try {
        response = await api.searchGoogleMapsLeads({
          query: query.trim(),
          neighborhood: neighborhood.trim() || undefined,
          city: city.trim() || undefined,
          pageToken: pageTokenToUse,
          apiKey: localKey || undefined,
        });
      } catch (backendErr: any) {
        const msg = String(backendErr?.message || '');
        if (msg.includes('404') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          if (!localKey) {
            throw new Error(
              'Chave da API do Google Maps não configurada. Clique em "Configurar Chave API" para adicionar sua chave.'
            );
          }
          response = await searchPlacesDirectlyFromClient({
            apiKey: localKey,
            query: query.trim(),
            neighborhood: neighborhood.trim() || undefined,
            city: city.trim() || undefined,
            pageToken: pageTokenToUse,
          });
        } else {
          throw backendErr;
        }
      }

      const incoming = response.places || [];
      const mergedResults = pageTokenToUse
        ? [
            ...results,
            ...incoming.filter((inc) => !results.some((r) => r.placeId === inc.placeId)),
          ]
        : incoming;

      setResults(mergedResults);
      setNextPageToken(response.nextPageToken);

      // Auto-seleciona os novos itens válidos e ainda não cadastrados no Kanban
      setSelectedIds((prev) => {
        const nextSet = pageTokenToUse ? new Set(prev) : new Set<string>();
        incoming.forEach((place) => {
          const formatted = formatPhone(place.phone || '');
          const isDup = Boolean(findDuplicateOpportunity(place));
          if (!isDup && isValidPhone(formatted, true)) {
            nextSet.add(place.placeId);
          }
        });
        return nextSet;
      });
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao consultar o Google Maps.');
      if (err.message && err.message.includes('Chave da API')) {
        setIsConfigOpen(true);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const toggleSelectPlace = (place: GoogleMapsPlaceResult) => {
    const phoneVal = getEffectivePhone(place);
    if (!isValidPhone(phoneVal, true)) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(place.placeId)) {
        next.delete(place.placeId);
      } else {
        next.add(place.placeId);
      }
      return next;
    });
  };

  const handleSelectAllAvailable = () => {
    const next = new Set<string>();
    visibleResults.forEach((place) => {
      const dup = findDuplicateOpportunity(place);
      const phoneVal = getEffectivePhone(place);
      if (!dup && isValidPhone(phoneVal, true)) {
        next.add(place.placeId);
      }
    });
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Importar selecionados para "Para Contatar"
  const handleImportSelected = () => {
    const selectedPlaces = results.filter((p) => selectedIds.has(p.placeId));
    if (selectedPlaces.length === 0) return;

    const batchPayload = selectedPlaces
      .map((place) => {
        const formattedPhone = getEffectivePhone(place);
        if (!isValidPhone(formattedPhone, true)) return null;

        const targetNeighborhood = getEffectiveNeighborhood(place);
        const notesParts: string[] = [];
        if (place.category) notesParts.push(`Segmento: ${place.category}`);
        if (place.address) notesParts.push(`Endereço: ${place.address}`);
        if (place.rating) {
          notesParts.push(
            `Avaliação Google: ⭐ ${place.rating}${
              place.userRatingCount ? ` (${place.userRatingCount} avaliações)` : ''
            }`
          );
        }
        if (place.website) notesParts.push(`Site: ${place.website}`);

        return {
          name: place.name.trim(),
          phone: formattedPhone,
          whatsapp: formattedPhone,
          neighborhood: targetNeighborhood.trim() || undefined,
          city: place.city || city.trim() || undefined,
          segment: place.category || query.trim() || undefined,
          notes: notesParts.join(' | ') || undefined,
          stage: 'PARA_CONTATAR' as OpportunityStage,
          origin: 'PESQUISA_PROPRIA' as const,
          assignedUserId: currentUser?.id,
          assignedUserName: currentUser?.name,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (batchPayload.length === 0) {
      setSearchError('Nenhum dos itens selecionados possui um número de telefone válido com DDD.');
      return;
    }

    const created = StorageService.saveOpportunitiesBatch(batchPayload);
    onImported(created.length, neighborhood.trim() || undefined);
    onClose();
  };

  // Estatísticas rápidas da busca atual
  const stats = useMemo(() => {
    let withPhone = 0;
    let alreadyInKanban = 0;
    results.forEach((p) => {
      if (isValidPhone(getEffectivePhone(p), true)) withPhone++;
      if (findDuplicateOpportunity(p)) alreadyInKanban++;
    });
    return {
      total: results.length,
      withPhone,
      alreadyInKanban,
    };
  }, [results, editedPhones, existingMap]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buscar Empresas no Google Maps — Captação Ativa"
      size="xl"
    >
      <div className="space-y-4">
        {/* BARRA SUPERIOR DE STATUS DA CHAVE GOOGLE MAPS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isKeyConfigured
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800">
                  Integração Google Places API
                </span>
                {isKeyConfigured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Conectada {maskedKey ? `(${maskedKey})` : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                    Chave Pendente
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Busca estabelecimentos reais com telefone, endereço e bairro direto para a fila &ldquo;Para Contatar&rdquo;.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigOpen((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors self-start sm:self-auto shrink-0"
          >
            {isConfigOpen ? 'Fechar Configuração' : isKeyConfigured ? 'Alterar Chave API' : 'Configurar Chave API'}
          </button>
        </div>

        {/* PAINEL EXPANSÍVEL DE CONFIGURAÇÃO DA CHAVE */}
        {isConfigOpen && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">
                  Configuração da Chave Google Maps Platform
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  A chave fica salva apenas no banco de dados do seu servidor local e nunca é exposta no catálogo público.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Cole aqui sua API Key (ex: AIzaSy...)"
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSavingKey}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Salvar Chave</span>
              </button>
              {isKeyConfigured && keySource === 'settings' && (
                <button
                  type="button"
                  onClick={handleRemoveApiKey}
                  disabled={isSavingKey}
                  className="px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-1 transition-colors shrink-0"
                  title="Remover chave salva"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              )}
            </form>

            {configFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  configFeedback.type === 'success'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <span>{configFeedback.text}</span>
              </div>
            )}

            <div className="bg-white/90 border border-blue-100 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Como gerar sua chave gratuita em 1 minuto:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>
                  Acesse o{' '}
                  <a
                    href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console — Places API (New)
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  e clique em <strong>Ativar (Enable)</strong>.
                </li>
                <li>
                  No menu <strong>Credenciais (Credentials)</strong>, clique em <strong>Criar Credenciais &rarr; Chave de API</strong>.
                </li>
                <li>
                  Cole a chave gerada (`AIza...`) no campo acima e clique em <strong>Salvar Chave</strong>.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* FORMULÁRIO DE BUSCA POR SEGMENTO + BAIRRO + CIDADE */}
        <form onSubmit={handleSearchSubmit} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* 1. Segmento */}
            <div className="sm:col-span-5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Segmento / Tipo de Empresa *</span>
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Padarias, Clínicas, Restaurantes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                autoFocus
              />
            </div>

            {/* 2. Bairro */}
            <div className="sm:col-span-4">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Bairro / Região</span>
              </label>
              <input
                type="text"
                list="gmaps-neighborhood-suggestions"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Centro, Vila Mariana..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
              <datalist id="gmaps-neighborhood-suggestions">
                {existingNeighborhoods.map((nb) => (
                  <option key={nb} value={nb} />
                ))}
              </datalist>
            </div>

            {/* 3. Cidade / UF */}
            <div className="sm:col-span-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cidade / UF</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo - SP"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Sugestões rápidas de nichos */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sugestões:
            </span>
            {QUICK_SEGMENTS.map((seg) => {
              const active = query.trim().toLowerCase() === seg.toLowerCase();
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setQuery(seg)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {seg}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando no Google Maps...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Buscar Empresas</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* MENSAGEM DE ERRO */}
        {searchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* BARRA DE FILTROS E SELEÇÃO DOS RESULTADOS */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-slate-800">
                  {stats.total} encontradas
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-emerald-700">
                  {stats.withPhone} com telefone
                </span>
                {stats.alreadyInKanban > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-amber-700">
                      {stats.alreadyInKanban} já no Kanban
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWithPhone}
                    onChange={(e) => setOnlyWithPhone(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Apenas com telefone</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideAlreadyRegistered}
                    onChange={(e) => setHideAlreadyRegistered(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ocultar já cadastradas</span>
                </label>

                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
                  >
                    Marcar Disponíveis
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 transition-colors"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>
            </div>

            {/* LISTA DE EMPRESAS ENCONTRADAS */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {visibleResults.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  Nenhuma empresa corresponde aos filtros marcados acima. Desmarque &ldquo;Apenas com telefone&rdquo; ou &ldquo;Ocultar já cadastradas&rdquo; para ver todos os resultados.
                </div>
              ) : (
                visibleResults.map((place) => {
                  const duplicateOpp = findDuplicateOpportunity(place);
                  const effectivePhone = getEffectivePhone(place);
                  const hasValidPhone = isValidPhone(effectivePhone, true);
                  const effectiveNeighborhood = getEffectiveNeighborhood(place);
                  const isSelected = selectedIds.has(place.placeId);

                  return (
                    <div
                      key={place.placeId}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        duplicateOpp
                          ? 'bg-slate-50/80 border-slate-200 opacity-75'
                          : isSelected
                          ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelectPlace(place)}
                          disabled={!hasValidPhone}
                          className={`mt-0.5 shrink-0 ${
                            !hasValidPhone
                              ? 'text-slate-300 cursor-not-allowed'
                              : isSelected
                              ? 'text-blue-600'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={
                            !hasValidPhone
                              ? 'Informe um telefone válido com DDD ao lado para selecionar'
                              : isSelected
                              ? 'Desmarcar empresa'
                              : 'Selecionar para importação'
                          }
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {place.name}
                            </span>

                            {place.category && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {place.category}
                              </span>
                            )}

                            {place.rating && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                {place.rating}
                                {place.userRatingCount ? ` (${place.userRatingCount})` : ''}
                              </span>
                            )}

                            {duplicateOpp && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold">
                                Já no Kanban ({STAGE_LABELS[duplicateOpp.stage] || duplicateOpp.stage})
                              </span>
                            )}

                            {place.googleMapsUrl && (
                              <a
                                href={place.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-600 inline-flex items-center gap-0.5 text-[11px]"
                                title="Abrir no Google Maps"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {place.address && (
                            <p className="text-xs text-slate-500 truncate">{place.address}</p>
                          )}
                        </div>
                      </div>

                      {/* Campos rápidos editáveis: Telefone e Bairro */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <div className="relative">
                          <Phone
                            className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                              hasValidPhone ? 'text-emerald-600' : 'text-rose-400'
                            }`}
                          />
                          <input
                            type="text"
                            value={effectivePhone}
                            onChange={(e) => {
                              const formatted = formatPhone(e.target.value);
                              setEditedPhones((prev) => ({
                                ...prev,
                                [place.placeId]: formatted,
                              }));
                              if (isValidPhone(formatted, true) && !duplicateOpp) {
                                setSelectedIds((prev) => new Set(prev).add(place.placeId));
                              }
                            }}
                            placeholder="Sem telefone (digite)"
                            className={`w-full sm:w-40 pl-8 pr-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                              hasValidPhone
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                                : 'border-rose-200 bg-rose-50/40 text-rose-700 placeholder:text-rose-400'
                            }`}
                          />
                        </div>

                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={effectiveNeighborhood}
                            onChange={(e) =>
                              setEditedNeighborhoods((prev) => ({
                                ...prev,
                                [place.placeId]: e.target.value,
                              }))
                            }
                            placeholder="Bairro..."
                            className="w-full sm:w-36 pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* BOTÃO CARREGAR MAIS PÁGINAS DO GOOGLE PLACES */}
            {nextPageToken && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => executeSearch(nextPageToken)}
                  disabled={isLoadingMore}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Carregando mais empresas...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Carregar mais resultados (+20)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ESTADO VAZIO APÓS BUSCA SEM RESULTADOS */}
        {hasSearched && !isSearching && results.length === 0 && !searchError && (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
            <Filter className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Nenhum estabelecimento encontrado para essa busca.
            </p>
            <p className="text-xs text-slate-500">
              Tente outro termo (ex: &ldquo;Restaurantes&rdquo;, &ldquo;Mercados&rdquo;) ou verifique o nome do bairro/cidade.
            </p>
          </div>
        )}

        {/* RODAPÉ DE AÇÃO EM LOTE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            <span className="font-extrabold text-slate-900">{selectedIds.size}</span>{' '}
            {selectedIds.size === 1 ? 'empresa selecionada' : 'empresas selecionadas'} para entrar na etapa{' '}
            <span className="font-bold text-amber-700">&ldquo;Para Contatar&rdquo;</span>.
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedIds.size === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Importar {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}para &ldquo;Para Contatar&rdquo;
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

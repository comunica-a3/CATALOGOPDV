import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Package,
  Phone,
  Send,
  Sparkles,
  Star,
  Users,
  AlertTriangle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../../services/storage';
import { CompanySettings, PublicSegmentPage } from '../../types';
import { formatCurrency, formatWhatsAppLink } from '../../utils/formatters';
import { buildSegmentLandingWhatsAppMessage } from '../../utils/whatsappMessages';
import { PublicQuoteFormView } from './PublicQuoteFormView';

interface PublicSegmentLandingViewProps {
  page?: PublicSegmentPage;
  segmentSlug?: string;
  companySettings: CompanySettings;
  onBackToCatalog?: () => void;
  onRequestQuote?: (packageId?: string) => void;
}

export const PublicSegmentLandingView: React.FC<PublicSegmentLandingViewProps> = ({
  page: pageProp,
  segmentSlug,
  companySettings,
  onBackToCatalog,
  onRequestQuote,
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(undefined);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Resolve page data safely from props, slug lookup, or standard fallback
  const resolvedPage = useMemo<PublicSegmentPage>(() => {
    if (pageProp) return pageProp;

    const allPages = StorageService.getPublicSegmentPages();
    if (segmentSlug && segmentSlug !== 'todos') {
      const match = allPages.find(
        (p) => (p.slug?.toLowerCase() === segmentSlug.toLowerCase() || p.id === segmentSlug)
      );
      if (match) return match;
    }

    if (allPages.length > 0) {
      return allPages[0];
    }

    return {
      id: 'default-segment',
      slug: 'solucoes-comerciais',
      segment: 'Empresas & Negócios',
      segmentName: 'Empresas & Negócios',
      title: 'Soluções Gráficas e Visuais para Empresas & Negócios',
      headline: 'Materiais Gráficos & Visual Profissional para seu Estabelecimento',
      subheadline:
        'Aumente suas vendas e encante seus clientes com produtos desenvolvidos sob medida para o seu setor.',
      description:
        'Aumente suas vendas e encante seus clientes com produtos desenvolvidos sob medida para o seu setor.',
      badgeText: '⭐ Destaque Comercial',
      heroBadge: '⭐ Destaque Comercial',
      ctaButtonText: 'Solicitar Orçamento',
      suggestedProductIds: [],
      suggestedPackageIds: [],
      featuredPackageIds: [],
      active: true,
    };
  }, [pageProp, segmentSlug]);

  const segmentDisplayName =
    resolvedPage.segmentName || resolvedPage.segment || 'Empresas & Negócios';

  const headline =
    resolvedPage.headline ||
    resolvedPage.title ||
    `Materiais Gráficos & Visual Profissional para ${segmentDisplayName}`;

  const subheadline =
    resolvedPage.subheadline ||
    resolvedPage.description ||
    'Aumente suas vendas e encante seus clientes com produtos desenvolvidos sob medida para o seu setor.';

  const badgeText =
    resolvedPage.badgeText ||
    resolvedPage.heroBadge ||
    `⭐ Soluções para ${segmentDisplayName}`;

  const defaultBenefits = [
    'Materiais de alto impacto visual que aceleram a decisão de compra',
    'Acabamentos de excelência técnica e alta durabilidade para o dia a dia',
    'Produção rápida com atendimento consultivo e suporte no layout',
  ];

  const benefits =
    resolvedPage.benefits && resolvedPage.benefits.length > 0
      ? resolvedPage.benefits
      : defaultBenefits;

  // Filter packages safely
  const allowedPackageIds = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(resolvedPage.suggestedPackageIds)) {
      list.push(...resolvedPage.suggestedPackageIds);
    }
    if (Array.isArray(resolvedPage.featuredPackageIds)) {
      list.push(...resolvedPage.featuredPackageIds);
    }
    return Array.from(new Set(list));
  }, [resolvedPage]);

  const packages = useMemo(() => {
    const all = StorageService.getPackages().filter((p) => p.active !== false);
    if (allowedPackageIds.length > 0) {
      const filtered = all.filter((p) => allowedPackageIds.includes(p.id));
      if (filtered.length > 0) return filtered;
    }
    return all.slice(0, 4);
  }, [allowedPackageIds]);

  const handleSelectPackageForQuote = (pkgId: string) => {
    if (onRequestQuote) {
      onRequestQuote(pkgId);
    } else {
      setSelectedPackageId(pkgId);
      setShowQuoteForm(true);
    }
  };

  const handleOpenGeneralQuote = () => {
    if (onRequestQuote) {
      onRequestQuote();
    } else {
      setSelectedPackageId(undefined);
      setShowQuoteForm(true);
    }
  };

  const cleanWhatsapp = (companySettings.whatsapp || companySettings.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanWhatsapp
    ? formatWhatsAppLink(
        cleanWhatsapp,
        `Olá! Vim através da página de soluções para *${segmentDisplayName}* no site da ${companySettings.name} e gostaria de solicitar um orçamento.`
      )
    : '';

  // INACTIVE / PAUSED PAGE
  if (resolvedPage.active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Página Temporariamente Pausada</h2>
            <p className="text-xs text-slate-600 mt-2">
              A página de {segmentDisplayName} está temporariamente em manutenção para atualização de catálogo e ofertas.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Mas não se preocupe! Nosso atendimento segue normal e você pode solicitar seu orçamento agora pelo WhatsApp.
          </p>
          {cleanWhatsapp && (
            <a
              href={formatWhatsAppLink(cleanWhatsapp, buildSegmentLandingWhatsAppMessage(segmentDisplayName))}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Chamar no WhatsApp da Gráfica</span>
            </a>
          )}
          {onBackToCatalog && (
            <button
              type="button"
              onClick={onBackToCatalog}
              className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors"
            >
              Ver Catálogo Geral
            </button>
          )}
        </div>
      </div>
    );
  }

  // SHOW DYNAMIC QUOTE FORM
  if (showQuoteForm) {
    return (
      <PublicQuoteFormView
        companySettings={companySettings}
        formId={resolvedPage.formId || 'form-geral'}
        pageId={resolvedPage.id}
        pageTitle={resolvedPage.title}
        customSuccessMessage={resolvedPage.successMessage}
        packageId={selectedPackageId}
        onBackToCatalog={() => setShowQuoteForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAVEGAÇÃO DE TOPO */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToCatalog && (
              <button
                type="button"
                onClick={onBackToCatalog}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Catálogo Geral</span>
              </button>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-800">{companySettings.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Falar no WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* HERO SECTION DA LANDING PAGE */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {headline}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {subheadline}
          </p>

          {/* Optional Featured Image */}
          {resolvedPage.imageUrl && (
            <div className="pt-2 max-w-lg mx-auto">
              <img
                src={resolvedPage.imageUrl}
                alt={headline}
                className="w-full max-h-64 object-cover rounded-2xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenGeneralQuote}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{resolvedPage.ctaButtonText || 'Solicitar Orçamento'}</span>
            </button>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-xs border border-white/20 transition-all text-sm flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* DIFERENCIAIS & BENEFÍCIOS */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-center text-lg font-bold text-slate-800 mb-6">
          Por que escolher nossas soluções para {segmentDisplayName}?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-700 font-medium leading-relaxed">
                {benefit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PACOTES E KITS EM DESTAQUE */}
      {packages.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">
              Kits Prontos com Desconto Especial
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Combinações completas pensadas para as necessidades do seu estabelecimento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-800">{pkg.name}</h3>
                    {pkg.discountPercent ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shrink-0">
                        {pkg.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-600 mt-2">{pkg.description}</p>

                  {Array.isArray(pkg.items) && pkg.items.length > 0 && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                        O que vem incluso no Kit:
                      </div>
                      {pkg.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700">
                          <span>{it.itemName}</span>
                          <span className="font-semibold text-slate-500">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 line-through block">
                      De {formatCurrency(pkg.originalTotal)}
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600">
                      Por {formatCurrency(pkg.packagePrice)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPackageForQuote(pkg.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Pedir este Pacote</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-700">
          {companySettings.name} — Atendimento Gráfico Personalizado
        </p>
        <p>Preços, prazos e condições sob consulta comercial.</p>
      </div>
    </div>
  );
};

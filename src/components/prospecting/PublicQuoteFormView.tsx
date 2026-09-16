import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  Package,
  Phone,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage';
import {
  CaptureFormConfig,
  CaptureFormField,
  CompanySettings,
  Opportunity,
  ProductPackage,
} from '../../types';
import { formatCurrency, formatPhone, isValidPhone } from '../../utils/formatters';
import { PhoneInput } from '../common/PhoneInput';
import { BrandLogo } from '../common/BrandLogo';

interface PublicQuoteFormViewProps {
  companySettings: CompanySettings;
  packageId?: string;
  formId?: string;
  pageId?: string;
  pageTitle?: string;
  customSuccessMessage?: string;
  onBackToCatalog?: () => void;
}

export const PublicQuoteFormView: React.FC<PublicQuoteFormViewProps> = ({
  companySettings,
  packageId,
  formId,
  pageId,
  pageTitle,
  customSuccessMessage,
  onBackToCatalog,
}) => {
  const [formConfig, setFormConfig] = useState<CaptureFormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedPackage, setSelectedPackage] = useState<ProductPackage | null>(null);
  const [submittedOpp, setSubmittedOpp] = useState<Opportunity | null>(null);
  const [error, setError] = useState('');

  // Load Form Config and Package
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resolvedFormId =
      formId || urlParams.get('form') || urlParams.get('formId') || 'form-geral';
    const loadedForm =
      StorageService.getCaptureFormById(resolvedFormId) ||
      StorageService.getDefaultCaptureForm();
    setFormConfig(loadedForm);

    // Initialize form fields state
    const initialData: Record<string, any> = {};
    (loadedForm?.fields || []).forEach((f) => {
      initialData[f.name] = f.defaultValue || '';
    });
    setFormData(initialData);

    const resolvedPkgId = packageId || urlParams.get('pkg') || urlParams.get('packageId');
    if (resolvedPkgId) {
      const pkg = StorageService.getPackageById(resolvedPkgId);
      if (pkg) {
        setSelectedPackage(pkg);
        initialData['need'] = `Pacote: ${pkg.name}`;
        initialData['description'] = `Tenho interesse em adquirir o ${pkg.name} (${formatCurrency(pkg.packagePrice)}).`;
        setFormData({ ...initialData });
      }
    }
  }, [formId, packageId]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleToggleMultiSelectOption = (fieldName: string, option: string) => {
    const current = Array.isArray(formData[fieldName]) ? formData[fieldName] : [];
    if (current.includes(option)) {
      handleFieldChange(
        fieldName,
        current.filter((item: string) => item !== option)
      );
    } else {
      handleFieldChange(fieldName, [...current, option]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formConfig) return;

    // Validate fields
    for (const field of formConfig.fields) {
      const val = formData[field.name];
      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setError(`Por favor, preencha o campo obrigatório: "${field.label}".`);
          return;
        }
      }

      // Phone / WhatsApp validation
      if ((field.type === 'whatsapp' || field.type === 'phone') && val) {
        if (!isValidPhone(val, true)) {
          setError(`Por favor, informe um número de telefone/WhatsApp válido com DDD em "${field.label}".`);
          return;
        }
      }
    }

    // Determine primary identifiers
    const nameField =
      formConfig.fields.find((f) => f.type === 'name') ||
      formConfig.fields.find((f) => f.name.toLowerCase().includes('nome')) ||
      formConfig.fields[0];

    const phoneField =
      formConfig.fields.find((f) => f.type === 'whatsapp') ||
      formConfig.fields.find((f) => f.type === 'phone') ||
      formConfig.fields.find((f) => f.name.toLowerCase().includes('whats') || f.name.toLowerCase().includes('fone'));

    const emailField = formConfig.fields.find((f) => f.type === 'email');
    const needField = formConfig.fields.find((f) => f.name === 'need') || formConfig.fields.find((f) => f.type === 'select');
    const descField = formConfig.fields.find((f) => f.name === 'description') || formConfig.fields.find((f) => f.type === 'textarea');
    const segmentField = formConfig.fields.find((f) => f.name === 'segment');
    const contactField = formConfig.fields.find((f) => f.name === 'contactName');
    const quantityField = formConfig.fields.find((f) => f.name === 'quantity');
    const deadlineField = formConfig.fields.find((f) => f.name === 'deadline');

    const primaryName = (nameField ? formData[nameField.name] : '') || 'Cliente do Formulário';
    const primaryPhone = (phoneField ? formData[phoneField.name] : '') || '(00) 00000-0000';
    const primaryEmail = emailField ? formData[emailField.name] : undefined;
    const primaryNeed = needField ? (Array.isArray(formData[needField.name]) ? formData[needField.name].join(', ') : formData[needField.name]) : 'Orçamento Geral';
    const primaryDesc = descField ? formData[descField.name] : '';
    const primarySegment = segmentField ? formData[segmentField.name] : undefined;
    const primaryContact = contactField ? formData[contactField.name] : undefined;
    const primaryQty = quantityField ? String(formData[quantityField.name]) : undefined;
    const primaryDeadline = deadlineField ? formData[deadlineField.name] : undefined;

    try {
      const opp = StorageService.createPublicQuoteOpportunity({
        name: String(primaryName).trim(),
        contactName: primaryContact ? String(primaryContact).trim() : undefined,
        phone: formatPhone(String(primaryPhone)),
        email: primaryEmail ? String(primaryEmail).trim() : undefined,
        segment: primarySegment ? String(primarySegment).trim() : undefined,
        need: String(primaryNeed || 'Orçamento'),
        description: primaryDesc ? String(primaryDesc).trim() : 'Solicitação enviada pelo formulário online.',
        quantity: primaryQty,
        deadline: primaryDeadline,
        packageId: selectedPackage?.id,
        sourceFormId: formConfig.id,
        sourceFormTitle: formConfig.internalName || formConfig.title,
        sourcePageId: pageId,
        sourcePageTitle: pageTitle,
        formResponses: formData,
      });

      setSubmittedOpp(opp);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação de orçamento.');
    }
  };

  const handleOpenWhatsAppConfirmation = () => {
    const cleanCompanyPhone = (companySettings.whatsapp || companySettings.phone || '').replace(/\D/g, '');
    const clientName = submittedOpp?.name || 'Cliente';
    const need = submittedOpp?.needs?.[0] || 'Orçamento Gráfico';
    const clientPhone = submittedOpp?.phone || '';
    const msg = `Olá! Acabei de enviar uma solicitação de orçamento pelo site da *${companySettings.name}*.\nCliente: *${clientName}*\nDemanda: *${need}*\nContato: *${clientPhone}*`;
    const encoded = encodeURIComponent(msg);
    if (cleanCompanyPhone) {
      window.open(`https://wa.me/55${cleanCompanyPhone}?text=${encoded}`, '_blank');
    }
  };

  // If the form is paused/inactive
  if (formConfig && formConfig.active === false) {
    const cleanCompanyPhone = (companySettings.whatsapp || companySettings.phone || '').replace(/\D/g, '');
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Formulário Temporariamente Pausado</h2>
            <p className="text-xs text-slate-600 mt-2">
              Este canal de envio automático está temporariamente suspenso para manutenção ou atualização de catálogo.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Nossa equipe de atendimento continua ativa! Entre em contato conosco diretamente pelo WhatsApp para receber seu orçamento com rapidez.
          </p>
          {cleanCompanyPhone && (
            <a
              href={`https://wa.me/55${cleanCompanyPhone}?text=${encodeURIComponent('Olá! Gostaria de solicitar um orçamento diretamente pelo WhatsApp.')}`}
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
              Voltar ao Catálogo de Produtos
            </button>
          )}
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (submittedOpp) {
    const finalSuccessMsg =
      customSuccessMessage ||
      formConfig?.successMessage ||
      'Recebemos sua solicitação de orçamento com sucesso! Nossa equipe entrará em contato em breve via WhatsApp.';

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">Solicitação Enviada com Sucesso!</h2>
            <p className="text-sm text-slate-600 mt-2">
              Protocolo de Atendimento Registrado:
              <strong className="block text-base text-blue-600 mt-1 font-mono">
                #{submittedOpp.opportunityNumber || 'OPP-001'}
              </strong>
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed">
            {finalSuccessMsg}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-1.5 text-slate-700">
            <div>
              <strong>Cliente / Empresa:</strong> {submittedOpp.name}
            </div>
            {submittedOpp.needs?.[0] && (
              <div>
                <strong>Demanda:</strong> {submittedOpp.needs[0]}
              </div>
            )}
            <div>
              <strong>WhatsApp Informado:</strong> {formatPhone(submittedOpp.phone)}
            </div>
          </div>

          <div className="space-y-2">
            {companySettings.whatsapp && (
              <button
                type="button"
                onClick={handleOpenWhatsAppConfirmation}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Acelerar Atendimento pelo WhatsApp</span>
              </button>
            )}

            {onBackToCatalog && (
              <button
                type="button"
                onClick={onBackToCatalog}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors"
              >
                Voltar para o Catálogo de Produtos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 my-6">
      {onBackToCatalog && (
        <button
          type="button"
          onClick={onBackToCatalog}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo de Produtos</span>
        </button>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white">
          <div className="flex items-center gap-3">
            {companySettings.logoUrl || companySettings.logoDriveFileId ? (
              <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden">
                <BrandLogo
                  logoUrl={companySettings.logoUrl}
                  logoDriveFileId={companySettings.logoDriveFileId}
                  alt={companySettings.name}
                  className="max-h-full max-w-full object-contain"
                  fallback={<span className="text-xl">🖨️</span>}
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-xl font-bold">
                🖨️
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{companySettings.name}</h1>
              <p className="text-xs text-blue-100">
                {formConfig?.title || 'Solicitação Rápida de Orçamento & Soluções Gráficas'}
              </p>
            </div>
          </div>
        </div>

        {/* PACKAGE BANNER (IF SELECTED) */}
        {selectedPackage && (
          <div className="bg-purple-50 border-b border-purple-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  Pacote Selecionado
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-0.5">{selectedPackage.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{selectedPackage.description}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 line-through block">
                R$ {selectedPackage.originalTotal.toFixed(2)}
              </span>
              <span className="text-base font-extrabold text-purple-700">
                R$ {selectedPackage.packagePrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {formConfig?.description && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {formConfig.description}
            </p>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DYNAMIC FORM FIELDS */}
          <div className="space-y-4">
            {(formConfig?.fields || []).map((field) => {
              const value = formData[field.name] ?? '';

              return (
                <div key={field.id} className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>

                  {/* FIELD TYPE: NAME / TEXT */}
                  {field.type === 'name' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required={field.required}
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder || 'Nome ou Razão Social'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {/* FIELD TYPE: EMAIL */}
                  {field.type === 'email' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required={field.required}
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder || 'seuemail@empresa.com'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {/* FIELD TYPE: WHATSAPP / PHONE */}
                  {(field.type === 'whatsapp' || field.type === 'phone') && (
                    <PhoneInput
                      value={value}
                      onChange={(val) => handleFieldChange(field.name, val)}
                      required={field.required}
                      placeholder={field.placeholder || '(00) 00000-0000'}
                    />
                  )}

                  {/* FIELD TYPE: TEXT SIMPLE */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      value={value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}

                  {/* FIELD TYPE: TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      required={field.required}
                      value={value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder || 'Descreva detalhes do pedido...'}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}

                  {/* FIELD TYPE: NUMBER */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      required={field.required}
                      value={value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder || '0'}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}

                  {/* FIELD TYPE: SELECT */}
                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">{field.placeholder || 'Selecione uma opção...'}</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* FIELD TYPE: MULTISELECT (TAGS / PILLS) */}
                  {field.type === 'multiselect' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(field.options || []).map((opt) => {
                        const isSelected = Array.isArray(value) && value.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleToggleMultiSelectOption(field.name, opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: DATE */}
                  {field.type === 'date' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required={field.required}
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Send className="w-4 h-4" />
            <span>{formConfig?.submitButtonText || 'Enviar Solicitação de Orçamento'}</span>
          </button>

          <p className="text-[11px] text-center text-slate-400">
            🔒 Seus dados são confidenciais e utilizados exclusivamente para elaborar o orçamento solicitado.
          </p>
        </form>
      </div>
    </div>
  );
};

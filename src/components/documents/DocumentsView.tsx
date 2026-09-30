import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit,
  Eye,
  FileDown,
  FileEdit,
  FilePlus,
  FileText,
  Filter,
  History,
  Layers,
  LayoutTemplate,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StorageService } from '../../services/storage';
import {
  Customer,
  DocumentCategory,
  DocumentField,
  DocumentTemplate,
  GeneratedDocument,
} from '../../types';
import {
  compileDocumentTemplate,
  downloadDocumentFile,
  formatDocumentToHtml,
  normalizeTemplateFieldInstances,
} from '../../utils/documentGenerator';
import { downloadCustomDocumentPDF } from '../../utils/pdfReceipt';
import { downloadDocumentAsPDF } from '../../utils/pdfDocumentExporter';
import { downloadDocumentAsDocx } from '../../utils/docxExporter';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { DocumentTemplateModal } from './DocumentTemplateModal';
import { DocumentVisualEditor } from './DocumentVisualEditor';

interface DocumentsViewProps {
  onAddToCart?: (docItem: {
    id: string;
    name: string;
    price: number;
    category: string;
    documentContent?: string;
  }) => void;
  onNavigateToPOS?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onAddToCart,
  onNavigateToPOS,
}) => {
  const { currentUser, isAdmin, isCollaborator, isSeller } = useAuth();
  const canManageTemplates = isAdmin || isCollaborator;

  // Global State
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'templates'>('generate');
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => StorageService.getDocumentTemplates());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>(() =>
    StorageService.getGeneratedDocuments(currentUser.id, isAdmin || isCollaborator)
  );

  // Generation Wizard State
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isEditingContent, setIsEditingContent] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');
  const [addedToCartSuccess, setAddedToCartSuccess] = useState<boolean>(false);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState<string>('Todos');

  // Template Filter
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<string>('Todos');

  // Viewing/Editing History Item Modal
  const [viewingHistoryDoc, setViewingHistoryDoc] = useState<GeneratedDocument | null>(null);

  // Template Management Modal (Admin/Collab)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  // In-UI Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Reload helpers
  const reloadTemplates = async () => {
    let list: DocumentTemplate[] = [];
    try {
      const remote = await api.getDocumentTemplates();
      if (Array.isArray(remote) && remote.length > 0) {
        StorageService.saveDocumentTemplates(remote);
        setTemplates(remote);
        list = remote;
      }
    } catch {}
    if (list.length === 0) {
      list = StorageService.getDocumentTemplates();
      setTemplates(list);
    }

    // Keep selectedTemplate in sync if it was updated
    setSelectedTemplate((current) => {
      if (!current) return null;
      const updated = list.find((t) => t.id === current.id);
      if (!updated) return current;
      const normalized = normalizeTemplateFieldInstances(updated.templateBody, updated.fields);
      const rawPrice = (updated as any).defaultPrice !== undefined ? (updated as any).defaultPrice : (updated as any).default_price;
      const numPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : (parseFloat(String(rawPrice || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0);
      return {
        ...updated,
        defaultPrice: numPrice,
        templateBody: normalized.templateBody,
        fields: normalized.fields,
      };
    });
  };

  useEffect(() => {
    reloadTemplates();

    const handleTemplatesUpdated = (e: any) => {
      const updatedTemplates = e?.detail && Array.isArray(e.detail) ? e.detail : StorageService.getDocumentTemplates();
      setTemplates(updatedTemplates);
      setSelectedTemplate((current) => {
        if (!current) return null;
        const matching = updatedTemplates.find((t: DocumentTemplate) => t.id === current.id);
        if (!matching) return current;
        const normalized = normalizeTemplateFieldInstances(matching.templateBody, matching.fields);
        const rawPrice = (matching as any).defaultPrice !== undefined ? (matching as any).defaultPrice : (matching as any).default_price;
        const numPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : (parseFloat(String(rawPrice || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0);
        return {
          ...matching,
          defaultPrice: numPrice,
          templateBody: normalized.templateBody,
          fields: normalized.fields,
        };
      });
    };

    window.addEventListener('document-templates-updated', handleTemplatesUpdated);
    window.addEventListener('storage-sync-completed', reloadTemplates);

    return () => {
      window.removeEventListener('document-templates-updated', handleTemplatesUpdated);
      window.removeEventListener('storage-sync-completed', reloadTemplates);
    };
  }, []);

  const reloadGeneratedDocs = () => {
    setGeneratedDocs(StorageService.getGeneratedDocuments(currentUser.id, isAdmin || isCollaborator));
  };

  // Category list
  const categories: (DocumentCategory | 'Todos')[] = [
    'Todos',
    'Currículos',
    'Contratos',
    'Declarações',
    'Procurações',
    'Requerimentos',
    'Cartas',
    'Recibos',
    'Outros',
  ];

  // Select Template Handler
  const handleSelectTemplate = (tmpl: DocumentTemplate) => {
    const normalized = normalizeTemplateFieldInstances(tmpl.templateBody, tmpl.fields);
    const rawPrice = (tmpl as any).defaultPrice !== undefined ? (tmpl as any).defaultPrice : (tmpl as any).default_price;
    const numPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : (parseFloat(String(rawPrice || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0);

    const effectiveTemplate: DocumentTemplate = {
      ...tmpl,
      defaultPrice: numPrice,
      templateBody: normalized.templateBody,
      fields: normalized.fields,
    };
    setSelectedTemplate(effectiveTemplate);
    setIsGenerated(false);
    setIsEditingContent(false);
    setSavedSuccessMsg('');
    setAddedToCartSuccess(false);

    // Initial form state with default values or customer values
    const initialValues: Record<string, string> = {};
    effectiveTemplate.fields.forEach((f) => {
      if (selectedCustomer && f.customerFieldMapping) {
        if (f.customerFieldMapping === 'name') initialValues[f.id] = selectedCustomer.name || '';
        if (f.customerFieldMapping === 'document') initialValues[f.id] = selectedCustomer.document || '';
        if (f.customerFieldMapping === 'phone') initialValues[f.id] = selectedCustomer.phone || '';
        if (f.customerFieldMapping === 'email') initialValues[f.id] = selectedCustomer.email || '';
        if (f.customerFieldMapping === 'address') initialValues[f.id] = selectedCustomer.address || '';
        if (f.customerFieldMapping === 'city') initialValues[f.id] = `${selectedCustomer.city || ''} - ${selectedCustomer.state || ''}`.replace(/^ - | - $/g, '');
      } else {
        initialValues[f.id] = f.defaultValue || '';
      }
    });

    setFormData(initialValues);
    setDocumentTitle(`${tmpl.title} - ${selectedCustomer?.name || 'Sem Identificação'}`);
  };

  // Customer Select Handler
  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (!selectedTemplate) return;

    if (customer) {
      setFormData((prev) => {
        const next = { ...prev };
        selectedTemplate.fields.forEach((f) => {
          if (f.customerFieldMapping === 'name' && customer.name) next[f.id] = customer.name;
          if (f.customerFieldMapping === 'document' && customer.document) next[f.id] = customer.document;
          if (f.customerFieldMapping === 'phone' && customer.phone) next[f.id] = customer.phone;
          if (f.customerFieldMapping === 'email' && customer.email) next[f.id] = customer.email;
          if (f.customerFieldMapping === 'address' && customer.address) next[f.id] = customer.address;
          if (f.customerFieldMapping === 'city' && customer.city) {
            next[f.id] = `${customer.city} - ${customer.state || ''}`.trim();
          }
        });
        return next;
      });
      setDocumentTitle(`${selectedTemplate.title} - ${customer.name}`);
    }
  };

  // Generate Document
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const compiled = compileDocumentTemplate(
      selectedTemplate.templateBody,
      formData,
      selectedTemplate.fields
    );

    setGeneratedContent(compiled);
    setIsGenerated(true);
    setIsEditingContent(false);
    setSavedSuccessMsg('');
    setAddedToCartSuccess(false);
  };

  const [isExporting, setIsExporting] = useState(false);

  // Actions on Generated Document
  const handleDownloadPDF = async () => {
    if (!generatedContent) return;
    try {
      setIsExporting(true);
      await downloadDocumentAsPDF(documentTitle || 'Documento', generatedContent);
    } catch (err) {
      console.error('Erro ao gerar PDF via canvas/HTML, usando gerador alternativo:', err);
      const settings = StorageService.getCompanySettings();
      downloadCustomDocumentPDF(documentTitle || 'Documento', generatedContent, settings);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDoc = async () => {
    if (!generatedContent) return;
    try {
      setIsExporting(true);
      await downloadDocumentAsDocx(documentTitle || 'documento', generatedContent);
    } catch (err) {
      console.error('Erro ao gerar DOCX, usando fallback:', err);
      downloadDocumentFile(documentTitle || 'documento', generatedContent, 'doc');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!generatedContent) return;
    downloadDocumentFile(documentTitle || 'documento', generatedContent, 'txt');
  };

  const handleSaveToHistory = () => {
    if (!selectedTemplate || !generatedContent) return;

    const templatePrice = typeof selectedTemplate.defaultPrice === 'number' && !isNaN(selectedTemplate.defaultPrice)
      ? selectedTemplate.defaultPrice
      : 0;

    const newDoc = StorageService.addGeneratedDocument({
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      category: selectedTemplate.category,
      title: documentTitle || `${selectedTemplate.title} - ${new Date().toLocaleDateString('pt-BR')}`,
      content: generatedContent,
      formData,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || formData['nome_completo'] || formData['contratante_nome'] || formData['requerente_nome'] || 'Cliente',
      customerPhone: selectedCustomer?.phone || formData['contato_telefone'],
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      priceCharged: templatePrice,
    });

    reloadGeneratedDocs();
    setSavedSuccessMsg('Documento salvo no histórico com sucesso!');
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  const handleAddToCart = () => {
    if (!selectedTemplate || !onAddToCart) return;

    const templatePrice = typeof selectedTemplate.defaultPrice === 'number' && !isNaN(selectedTemplate.defaultPrice)
      ? selectedTemplate.defaultPrice
      : 0;

    onAddToCart({
      id: selectedTemplate.id,
      name: `Doc: ${selectedTemplate.title}`,
      price: templatePrice,
      category: selectedTemplate.category,
      documentContent: generatedContent,
    });

    setAddedToCartSuccess(true);
    setTimeout(() => setAddedToCartSuccess(false), 2500);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return generatedDocs.filter((doc) => {
      const matchesCat = historyCategory === 'Todos' || doc.category === historyCategory;
      const q = (historySearch || '').toLowerCase().trim();
      const matchesQuery =
        !q ||
        String(doc.title || '').toLowerCase().includes(q) ||
        (doc.customerName ? doc.customerName.toLowerCase().includes(q) : false) ||
        String(doc.templateTitle || '').toLowerCase().includes(q) ||
        String(doc.sellerName || '').toLowerCase().includes(q);

      return matchesCat && matchesQuery;
    });
  }, [generatedDocs, historyCategory, historySearch]);

  // Filtered Templates for Admin/Collab Management
  const filteredManageTemplates = useMemo(() => {
    return templates.filter((tmpl) => {
      const matchesCat = templateCategory === 'Todos' || tmpl.category === templateCategory;
      const q = (templateSearch || '').toLowerCase().trim();
      const matchesQuery =
        !q ||
        String(tmpl.title || '').toLowerCase().includes(q) ||
        (tmpl.description ? tmpl.description.toLowerCase().includes(q) : false) ||
        (tmpl.category ? tmpl.category.toLowerCase().includes(q) : false);

      return matchesCat && matchesQuery;
    });
  }, [templates, templateCategory, templateSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <FileEdit className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Geração de Documentos e Modelos
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Geração estruturada de currículos, contratos, declarações, procurações e recibos prontos para editar, imprimir ou exportar em PDF.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            <span>Gerar Documento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico ({generatedDocs.length})</span>
          </button>

          {canManageTemplates && (
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Modelos ({templates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: GENERATE DOCUMENT WIZARD ================= */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {!isGenerated ? (
            /* WIZARD STEP 1 & 2: TEMPLATE PICKER & DYNAMIC FORM */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Template Selection & Customer Pre-fill (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Customer Linkage Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-violet-600" />
                      <span>Vincular Cliente (Opcional)</span>
                    </label>
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(null)}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const c = customers.find((cust) => cust.id === e.target.value) || null;
                      handleSelectCustomer(c);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:bg-white text-slate-900"
                  >
                    <option value="">-- Preenchimento manual / Cliente avulso --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.document ? `(${c.document})` : ''}
                      </option>
                    ))}
                  </select>

                  {selectedCustomer && (
                    <div className="p-2.5 rounded-lg bg-violet-50/60 border border-violet-100 text-[11px] text-slate-700 space-y-0.5">
                      <p className="font-bold text-violet-900">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && <p>📱 {selectedCustomer.phone}</p>}
                      {selectedCustomer.document && <p>📄 CPF/CNPJ: {selectedCustomer.document}</p>}
                      {selectedCustomer.city && <p>📍 {selectedCustomer.city} - {selectedCustomer.state}</p>}
                    </div>
                  )}
                </div>

                {/* Templates Selector List */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <LayoutTemplate className="w-3.5 h-3.5 text-violet-600" />
                      <span>Escolher Modelo</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {templates.filter((t) => t.active).length} disponíveis
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {templates.filter((t) => t.active).length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                        <LayoutTemplate className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">Nenhum modelo cadastrado</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Crie seus próprios modelos de documento para começar a gerar e preencher.
                        </p>
                        {canManageTemplates && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplate(null);
                              setIsTemplateModalOpen(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Criar Novo Modelo</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      templates
                        .filter((t) => t.active)
                        .map((tmpl) => (
                          <div
                            key={tmpl.id}
                            onClick={() => handleSelectTemplate(tmpl)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              selectedTemplate?.id === tmpl.id
                                ? 'bg-violet-50 border-violet-500 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {tmpl.category}
                              </span>
                              <span className="text-xs font-bold text-emerald-700">
                                R$ {tmpl.defaultPrice.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 mt-1.5">
                              {tmpl.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {tmpl.description}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Form Fields (8 cols) */}
              <div className="lg:col-span-8">
                {selectedTemplate ? (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-violet-100 text-violet-800">
                            {selectedTemplate.category}
                          </span>
                          <h2 className="text-base font-bold text-slate-900">
                            {selectedTemplate.title}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedTemplate.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <label className="text-[11px] font-medium text-slate-500 block">Preço de Serviço</label>
                          <div className="inline-flex items-center mt-0.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="text-xs font-bold">
                              R$ {(selectedTemplate.defaultPrice || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Title Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título do Documento / Identificação
                      </label>
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="Ex: Currículo - Carlos Oliveira"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:bg-white text-slate-900 font-medium"
                      />
                    </div>

                    {/* Dynamic Fields Form */}
                    <form onSubmit={handleGenerate} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedTemplate.fields.map((field, idx) => {
                          const sameLabelCount = selectedTemplate.fields.filter(
                            (f) => f.label.toLowerCase() === field.label.toLowerCase()
                          ).length;
                          let instanceLabel = field.label;
                          if (sameLabelCount > 1) {
                            const occIndex = selectedTemplate.fields
                              .slice(0, idx + 1)
                              .filter((f) => f.label.toLowerCase() === field.label.toLowerCase()).length;
                            instanceLabel = `${field.label} (${occIndex}ª ocorrência)`;
                          }

                          const isFullWidth =
                            field.type === 'textarea' ||
                            field.id.includes('endereco') ||
                            field.id.includes('objeto') ||
                            field.id.includes('poderes');

                          return (
                            <div
                              key={field.id}
                              className={isFullWidth ? 'sm:col-span-2 space-y-1' : 'space-y-1'}
                            >
                              <label className="block text-xs font-semibold text-slate-700">
                                {instanceLabel} {field.required && <span className="text-red-500">*</span>}
                              </label>

                              {field.type === 'textarea' ? (
                                <textarea
                                  rows={field.id.includes('experiencia') || field.id.includes('objeto') ? 4 : 2}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={formData[field.id] || ''}
                                  onChange={(e) =>
                                    setFormData({ ...formData, [field.id]: e.target.value })
                                  }
                                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-hidden text-slate-900 leading-relaxed"
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  required={field.required}
                                  value={formData[field.id] || ''}
                                  onChange={(e) =>
                                    setFormData({ ...formData, [field.id]: e.target.value })
                                  }
                                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-hidden text-slate-900"
                                >
                                  <option value="">Selecione uma opção...</option>
                                  {(field.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={formData[field.id] || ''}
                                  onChange={(e) =>
                                    setFormData({ ...formData, [field.id]: e.target.value })
                                  }
                                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-hidden text-slate-900"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Preenchimento automático com suporte a edição antes da impressão.
                        </span>

                        <button
                          type="submit"
                          id="btn-generate-document"
                          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-xs cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Gerar Documento</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
                    <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">
                      Selecione um Modelo de Documento
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Escolha um modelo ao lado ou crie um novo modelo para abrir o formulário dinâmico e preencher.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* WIZARD STEP 3 & 4: DOCUMENT WORKSPACE & REVIEW */
            <div className="space-y-4">
              {/* Notification Banner */}
              {savedSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{savedSuccessMsg}</span>
                </div>
              )}

              {/* Action Toolbar Header */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGenerated(false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao Formulário</span>
                  </button>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{documentTitle}</h3>
                    <span className="text-[11px] text-slate-500">
                      {selectedTemplate?.title} • Taxa: R$ {(selectedTemplate?.defaultPrice || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Primary Output Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Download PDF */}
                  <button
                    type="button"
                    id="btn-download-doc-pdf"
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isExporting ? 'Gerando...' : 'Baixar PDF'}</span>
                  </button>

                  {/* Download DOCX (Word) */}
                  <button
                    type="button"
                    id="btn-download-doc-docx"
                    onClick={handleDownloadDoc}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                    title="Baixar em formato Word (.docx) com estilos preservados"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Baixar DOCX (Word)</span>
                  </button>

                  {/* Save to History */}
                  <button
                    type="button"
                    onClick={handleSaveToHistory}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar no Histórico</span>
                  </button>

                  {/* Add to PDV Cart Button */}
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                        addedToCartSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {addedToCartSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Adicionado ao Atendimento!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Adicionar ao PDV (R$ {(selectedTemplate?.defaultPrice || 0).toFixed(2).replace('.', ',')})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Document Visual Sheet / Editor */}
              <div className="w-full flex justify-center">
                <DocumentVisualEditor
                  initialContent={generatedContent}
                  onChange={(html) => setGeneratedContent(html)}
                  availableFields={selectedTemplate?.fields || []}
                  minHeight="850px"
                  id="generated-doc-editor"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: GENERATED DOCUMENTS HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por título, cliente, modelo ou vendedor..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHistoryCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    historyCategory === cat
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">Nenhum documento encontrado no histórico</h4>
              <p className="text-xs text-slate-500">
                Gere documentos pela aba &quot;Gerar Documento&quot; e clique em &quot;Salvar no Histórico&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-violet-300 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700">
                        {doc.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">
                      {doc.title}
                    </h4>

                    {doc.customerName && (
                      <p className="text-[11px] text-slate-600 flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span>Cliente: <strong>{doc.customerName}</strong></span>
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400">
                      Gerado por {doc.sellerName}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setViewingHistoryDoc(doc)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const settings = StorageService.getCompanySettings();
                          downloadCustomDocumentPDF(doc.title, doc.content, settings);
                        }}
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        title="Baixar PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadDocumentFile(doc.title, doc.content, 'doc')}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Baixar Word"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>

                      {(isAdmin || isCollaborator || doc.sellerId === currentUser.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Excluir do Histórico',
                              message: `Tem certeza que deseja excluir o documento "${doc.title}" do histórico? Esta ação não pode ser desfeita.`,
                              onConfirm: () => {
                                StorageService.deleteGeneratedDocument(doc.id);
                                reloadGeneratedDocs();
                                setConfirmDialog(null);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: TEMPLATES MANAGEMENT (Admin / Collab) ================= */}
      {activeTab === 'templates' && canManageTemplates && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>Cadastro e Personalização de Modelos</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie, edite, duplique e configure modelos com campos dinâmicos e preenchimento automático.
              </p>
            </div>

            <button
              type="button"
              id="btn-add-document-template"
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Modelo</span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar modelo por título, descrição ou categoria..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:bg-white text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    templateCategory === cat
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredManageTemplates.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">Nenhum modelo encontrado</h4>
              <p className="text-xs text-slate-500">
                Ajuste os filtros de busca ou clique em &quot;Novo Modelo&quot; para cadastrar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredManageTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                    tmpl.active !== false
                      ? 'border-slate-200 hover:border-violet-300'
                      : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700">
                          {tmpl.category}
                        </span>
                        {tmpl.active === false && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            Inativo
                          </span>
                        )}
                      </div>
                      <strong className="text-xs font-bold text-emerald-700">
                        R$ {tmpl.defaultPrice.toFixed(2).replace('.', ',')}
                      </strong>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-2">{tmpl.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {tmpl.description || 'Sem descrição cadastrada.'}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                      <span>{tmpl.fields?.length || 0} campos configurados</span>
                      <span className="text-slate-400">
                        {tmpl.active !== false ? '● Ativo no PDV' : '○ Oculto'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.toggleDocumentTemplateActive(tmpl.id);
                        reloadTemplates();
                      }}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        tmpl.active !== false
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                      }`}
                      title={tmpl.active !== false ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      {tmpl.active !== false ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                          <span>Inativo</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const dup = StorageService.duplicateDocumentTemplate(tmpl.id);
                          if (dup) {
                            try {
                              await api.saveDocumentTemplate(dup);
                            } catch (e) {
                              console.error('Erro ao salvar cópia no servidor:', e);
                            }
                            reloadTemplates();
                            setSavedSuccessMsg(`Modelo "${tmpl.title}" duplicado com sucesso!`);
                            setTimeout(() => setSavedSuccessMsg(''), 3000);
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors cursor-pointer"
                        title="Duplicar Modelo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplate(tmpl);
                          setIsTemplateModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Editar Modelo"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Excluir Modelo de Documento',
                            message: `Deseja realmente excluir permanentemente o modelo "${tmpl.title}"? Esta ação removerá o modelo do catálogo.`,
                            onConfirm: async () => {
                              StorageService.deleteDocumentTemplate(tmpl.id);
                              try {
                                await api.deleteDocumentTemplate(tmpl.id);
                              } catch (e) {
                                console.error('Erro ao excluir modelo no servidor:', e);
                              }
                              reloadTemplates();
                              setConfirmDialog(null);
                            },
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Excluir Modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: View History Document */}
      {viewingHistoryDoc && (
        <Modal
          isOpen={!!viewingHistoryDoc}
          onClose={() => setViewingHistoryDoc(null)}
          title={viewingHistoryDoc.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span>Cliente: <strong>{viewingHistoryDoc.customerName || 'N/A'}</strong></span>
              <span>Data: {new Date(viewingHistoryDoc.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>

            <DocumentVisualEditor
              initialContent={viewingHistoryDoc.content}
              readOnly={true}
              minHeight="550px"
              id="history-doc-preview"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                id="btn-history-doc-pdf"
                onClick={async () => {
                  try {
                    await downloadDocumentAsPDF(viewingHistoryDoc.title, viewingHistoryDoc.content);
                  } catch (e) {
                    const settings = StorageService.getCompanySettings();
                    downloadCustomDocumentPDF(viewingHistoryDoc.title, viewingHistoryDoc.content, settings);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Baixar PDF</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadDocumentAsDocx(viewingHistoryDoc.title, viewingHistoryDoc.content);
                  } catch (e) {
                    downloadDocumentFile(viewingHistoryDoc.title, viewingHistoryDoc.content, 'doc');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                title="Baixar em formato Word (.docx) preservando formatação"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Baixar DOCX (Word)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingHistoryDoc(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Full-Featured Document Template Editor */}
      {isTemplateModalOpen && (
        <DocumentTemplateModal
          key={editingTemplate?.id || 'new'}
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          template={editingTemplate}
          onSave={reloadTemplates}
        />
      )}

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

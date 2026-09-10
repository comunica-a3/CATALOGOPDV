import {
  AlertCircle,
  BookOpen,
  Check,
  Code,
  Copy,
  Eye,
  FileText,
  Layers,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage';
import {
  DocumentCategory,
  DocumentField,
  DocumentFieldType,
  DocumentSystemMapping,
  DocumentTemplate,
} from '../../types';
import { compileDocumentTemplate, formatDocumentToHtml } from '../../utils/documentGenerator';
import { Modal } from '../common/Modal';
import { DocumentVisualEditor } from './DocumentVisualEditor';

interface DocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  onSave: () => void;
}

export const DocumentTemplateModal: React.FC<DocumentTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'fields' | 'layout' | 'preview'>('info');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Declarações');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('30.00');
  const [templateBody, setTemplateBody] = useState('');
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [active, setActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Field editing mini-form state
  const [fieldId, setFieldId] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<DocumentFieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldMapping, setFieldMapping] = useState<DocumentSystemMapping | ''>('');
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');

  // Global Library state
  const [globalFields, setGlobalFields] = useState<DocumentField[]>([]);
  const [isGlobalLibraryOpen, setIsGlobalLibraryOpen] = useState(false);
  const [globalFieldSearch, setGlobalFieldSearch] = useState('');

  // Session tracking to ensure complete state rehydration on modal open or template change
  const lastLoadedSessionRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastLoadedSessionRef.current = null;
      return;
    }

    const currentKey = template ? template.id : 'new';
    if (lastLoadedSessionRef.current !== currentKey) {
      // Retrieve fresh snapshot of Global Library
      const allGlobals = StorageService.getGlobalDocumentFields();
      setGlobalFields(allGlobals);

      const globalMap = new Map<string, DocumentField>();
      allGlobals.forEach((gf) => globalMap.set(gf.id, gf));

      if (template) {
        setTitle(template.title);
        setCategory(template.category);
        setDescription(template.description || '');
        setDefaultPrice(template.defaultPrice ? template.defaultPrice.toString() : '30.00');
        setTemplateBody(template.templateBody || '');

        // Safe rehydration of fields: enrich template fields with global metadata
        let loadedFields: DocumentField[] = (template.fields || []).map((tf) => {
          const globalDef = globalMap.get(tf.id);
          return globalDef ? { ...globalDef, ...tf } : { ...tf };
        });

        // Sync with tags present in templateBody so no field is ever lost
        if (template.templateBody) {
          const tagMatches = [...template.templateBody.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
          const foundTagIds = Array.from(new Set(tagMatches.map((m) => m[1])));
          foundTagIds.forEach((tagId) => {
            if (!loadedFields.some((f) => f.id === tagId)) {
              const globalDef = globalMap.get(tagId);
              if (globalDef) {
                loadedFields.push({ ...globalDef });
              } else {
                const label = tagId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                loadedFields.push({
                  id: tagId,
                  label,
                  type: 'text',
                  required: false,
                });
              }
            }
          });
        }

        setFields(loadedFields);
        setActive(template.active !== false);
      } else {
        setTitle('');
        setCategory('Outros');
        setDescription('');
        setDefaultPrice('0.00');
        setTemplateBody('');
        setFields([]);
        setActive(true);
      }

      setErrorMsg('');
      setActiveTab('info');
      setIsFieldFormOpen(false);
      setIsGlobalLibraryOpen(false);
      setEditingFieldIndex(null);
      lastLoadedSessionRef.current = currentKey;
    }
  }, [template?.id, isOpen]);

  const handleOpenAddField = () => {
    setFieldId('');
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(true);
    setFieldPlaceholder('');
    setFieldDefaultValue('');
    setFieldOptions('');
    setFieldMapping('');
    setEditingFieldIndex(null);
    setIsFieldFormOpen(true);
    setIsGlobalLibraryOpen(false);
  };

  const handleEditField = (index: number) => {
    const f = fields[index];
    setFieldId(f.id);
    setFieldLabel(f.label);
    setFieldType(f.type);
    setFieldRequired(f.required !== false);
    setFieldPlaceholder(f.placeholder || '');
    setFieldDefaultValue(f.defaultValue || '');
    setFieldOptions(f.options ? f.options.join(', ') : '');
    setFieldMapping(f.customerFieldMapping || '');
    setEditingFieldIndex(index);
    setIsFieldFormOpen(true);
    setIsGlobalLibraryOpen(false);
  };

  const handleAddFromGlobal = (gf: DocumentField) => {
    if (fields.some((f) => f.id === gf.id)) {
      alert(`O campo "{{${gf.id}}}" (${gf.label}) já está presente neste modelo.`);
      return;
    }
    setFields((prev) => [...prev, { ...gf }]);
  };

  const handleDeleteGlobalField = (fieldId: string) => {
    if (window.confirm(`Excluir permanentemente a tag {{${fieldId}}} da Biblioteca Global?`)) {
      StorageService.deleteGlobalDocumentField(fieldId);
      setGlobalFields(StorageService.getGlobalDocumentFields());
    }
  };

  const handleSaveField = () => {
    const cleanId = fieldId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanId) {
      alert('Identificador da Tag é obrigatório (apenas letras, números e underline)');
      return;
    }
    if (!fieldLabel.trim()) {
      alert('Rótulo / Nome do campo é obrigatório');
      return;
    }

    const newField: DocumentField = {
      id: cleanId,
      label: fieldLabel.trim(),
      type: fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder.trim() || undefined,
      defaultValue: fieldDefaultValue.trim() || undefined,
      customerFieldMapping: (fieldMapping as DocumentSystemMapping) || undefined,
      options:
        fieldType === 'select' && fieldOptions.trim()
          ? fieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
    };

    // Register in Global Library so it becomes reusable in all current and future templates
    StorageService.upsertGlobalDocumentField(newField);
    setGlobalFields(StorageService.getGlobalDocumentFields());

    if (editingFieldIndex !== null) {
      const updated = [...fields];
      updated[editingFieldIndex] = newField;
      setFields(updated);
    } else {
      if (fields.some((f) => f.id === cleanId)) {
        alert(`Já existe um campo com a tag "{{${cleanId}}}" neste modelo.`);
        return;
      }
      setFields([...fields, newField]);
    }

    setIsFieldFormOpen(false);
    setEditingFieldIndex(null);
  };

  const handleDeleteField = (index: number) => {
    const toDelete = fields[index];
    if (
      window.confirm(
        `Remover o campo "${toDelete.label}" ({{${toDelete.id}}}) deste modelo?\n\nNota: O campo continuará preservado na Biblioteca Global para reutilização em outros modelos.`
      )
    ) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const insertTagIntoBody = (tag: string) => {
    const tagText = `{{${tag}}}`;
    setTemplateBody((prev) => `${prev} ${tagText}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('O título do modelo é obrigatório.');
      setActiveTab('info');
      return;
    }
    if (!templateBody.trim()) {
      setErrorMsg('O layout/corpo do documento é obrigatório.');
      setActiveTab('layout');
      return;
    }

    const priceNum = parseFloat(defaultPrice.replace(',', '.')) || 0;

    if (template) {
      StorageService.updateDocumentTemplate(template.id, {
        title: title.trim(),
        category,
        description: description.trim(),
        defaultPrice: priceNum,
        templateBody,
        fields,
        active,
      });
    } else {
      StorageService.addDocumentTemplate({
        title: title.trim(),
        category,
        description: description.trim(),
        defaultPrice: priceNum,
        templateBody,
        fields,
        active,
      });
    }

    onSave();
    onClose();
  };

  // Preview compiled template with sample dummy values
  const previewSampleCompiled = React.useMemo(() => {
    const sampleData: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.customerFieldMapping === 'name') sampleData[f.id] = 'João Carlos Pereira';
      else if (f.customerFieldMapping === 'document') sampleData[f.id] = '123.456.789-00';
      else if (f.customerFieldMapping === 'phone') sampleData[f.id] = '(11) 98765-4321';
      else if (f.customerFieldMapping === 'address') sampleData[f.id] = 'Av. Paulista, 1000 - Bela Vista';
      else if (f.customerFieldMapping === 'city') sampleData[f.id] = 'São Paulo - SP';
      else if (f.customerFieldMapping === 'current_date') sampleData[f.id] = new Date().toLocaleDateString('pt-BR');
      else if (f.defaultValue) sampleData[f.id] = f.defaultValue;
      else sampleData[f.id] = `[${f.label}]`;
    });

    const compiled = compileDocumentTemplate(
      templateBody,
      sampleData,
      fields
    );

    return formatDocumentToHtml(compiled, title || 'Pré-visualização do Modelo');
  }, [templateBody, fields, title]);

  return (
    <Modal
      id="document-template-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Configurar Modelo de Documento' : 'Novo Modelo de Documento'}
      subtitle="Defina os campos dinâmicos, preenchimento automático e layout de impressão"
      maxWidth="max-w-5xl"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>1. Informações Básicas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'fields'
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>2. Campos e Tags ({fields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'layout'
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Editor Visual A4</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>4. Pré-visualização</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeTab === 'info' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Título do Modelo de Documento *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Declaração de Residência para Terceiros"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="Declarações">Declarações</option>
                  <option value="Currículos">Currículos</option>
                  <option value="Contratos">Contratos</option>
                  <option value="Procurações">Procurações</option>
                  <option value="Requerimentos">Requerimentos</option>
                  <option value="Cartas">Cartas</option>
                  <option value="Recibos">Recibos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Preço do Serviço no PDV (R$)
                </label>
                <input
                  type="text"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="30.00"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-emerald-700 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Descrição Curta (Instruções ou Finalidade)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Modelo padrão exigido para comprovação de endereço sem contrato de locação..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Status do Modelo</span>
                  <span className="text-[11px] text-slate-500">
                    Modelos ativos aparecem no PDV e na central de documentos para geração rápida.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FIELDS MANAGEMENT */}
        {activeTab === 'fields' && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Campos do Formulário de Preenchimento</h4>
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-800 font-bold text-[10px] rounded-full">
                    {fields.length} {fields.length === 1 ? 'campo' : 'campos'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cada campo gera uma tag dinâmica &#123;&#123;tag&#125;&#125; que pode ser posicionada no texto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGlobalLibraryOpen(!isGlobalLibraryOpen);
                    setIsFieldFormOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                    isGlobalLibraryOpen
                      ? 'bg-violet-100 text-violet-800 border-violet-300'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                  title="Acessar biblioteca compartilhada de campos e tags"
                >
                  <Library className="w-3.5 h-3.5 text-violet-600" />
                  <span>Biblioteca Global ({globalFields.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddField}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Novo Campo</span>
                </button>
              </div>
            </div>

            {/* GLOBAL LIBRARY PICKER PANEL */}
            {isGlobalLibraryOpen && (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-violet-50/70 border border-violet-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-violet-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-700" />
                    <div>
                      <span className="text-xs font-bold text-violet-950 block">
                        Biblioteca Global de Campos e Tags
                      </span>
                      <span className="text-[10px] text-violet-700 block">
                        Campos reutilizáveis em qualquer modelo de documento. Clique em &quot;+ Adicionar&quot; para incluir neste modelo.
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={globalFieldSearch}
                      onChange={(e) => setGlobalFieldSearch(e.target.value)}
                      placeholder="Pesquisar tag ou rótulo..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-violet-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {globalFields.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Nenhum campo registrado na biblioteca global ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {globalFields
                      .filter(
                        (gf) =>
                          !globalFieldSearch.trim() ||
                          gf.label.toLowerCase().includes(globalFieldSearch.toLowerCase()) ||
                          gf.id.toLowerCase().includes(globalFieldSearch.toLowerCase())
                      )
                      .map((gf) => {
                        const isAlreadyUsed = fields.some((f) => f.id === gf.id);
                        return (
                          <div
                            key={gf.id}
                            className={`p-2 rounded-lg border text-left flex flex-col justify-between gap-1.5 transition-all ${
                              isAlreadyUsed
                                ? 'bg-white/80 border-slate-200 opacity-80'
                                : 'bg-white border-violet-200 hover:border-violet-400 shadow-2xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 truncate" title={gf.label}>
                                  {gf.label}
                                </span>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] rounded shrink-0">
                                  &#123;&#123;{gf.id}&#125;&#125;
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{gf.type}</span>
                                {gf.customerFieldMapping && (
                                  <span className="text-emerald-700 font-medium truncate">
                                    • {gf.customerFieldMapping}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              {isAlreadyUsed ? (
                                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 flex-1">
                                  <Check className="w-3 h-3" /> Adicionado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddFromGlobal(gf)}
                                  className="flex-1 py-1 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white font-bold text-[10px] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Adicionar</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGlobalField(gf.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Excluir tag permanentemente da biblioteca global"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-form to Add/Edit Field */}
            {isFieldFormOpen && (
              <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-violet-200 pb-2">
                  <span className="text-xs font-bold text-violet-900">
                    {editingFieldIndex !== null ? 'Editar Campo' : 'Novo Campo do Formulário'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFieldFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Duplicate / Existing Tag indicator */}
                {(() => {
                  const clean = fieldId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                  const matchGlobal = clean ? globalFields.find((g) => g.id === clean) : null;
                  const alreadyInThisModel = clean ? fields.some((f, idx) => f.id === clean && idx !== editingFieldIndex) : false;

                  if (alreadyInThisModel) {
                    return (
                      <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>Aviso: A tag &#123;&#123;{clean}&#125;&#125; já está em uso neste modelo. Use outro identificador.</span>
                      </div>
                    );
                  }

                  if (matchGlobal && editingFieldIndex === null) {
                    return (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span>Esta tag já existe na Biblioteca Global como &quot;{matchGlobal.label}&quot;. Salvar irá reutilizar e vincular este campo ao modelo.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFieldLabel(matchGlobal.label);
                            setFieldType(matchGlobal.type);
                            setFieldRequired(matchGlobal.required !== false);
                            setFieldPlaceholder(matchGlobal.placeholder || '');
                            setFieldDefaultValue(matchGlobal.defaultValue || '');
                            setFieldMapping(matchGlobal.customerFieldMapping || '');
                          }}
                          className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded hover:bg-blue-700 shrink-0"
                        >
                          Carregar Dados
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Identificador da Tag (ex: nome_pai) *
                    </label>
                    <input
                      type="text"
                      value={fieldId}
                      onChange={(e) => setFieldId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      placeholder="ex: cpf_declarante"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <span className="text-[10px] text-violet-600 block mt-0.5">
                      Tag no texto: &#123;&#123;{fieldId || 'tag'}&#125;&#125;
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Rótulo / Pergunta visível *
                    </label>
                    <input
                      type="text"
                      value={fieldLabel}
                      onChange={(e) => setFieldLabel(e.target.value)}
                      placeholder="Ex: Nome do Declarante"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Tipo do Campo
                    </label>
                    <select
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value as DocumentFieldType)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="text">Texto Curto</option>
                      <option value="textarea">Texto Longo (Parágrafo)</option>
                      <option value="date">Data</option>
                      <option value="number">Número</option>
                      <option value="phone">Telefone / WhatsApp</option>
                      <option value="email">E-mail</option>
                      <option value="select">Lista de Seleção</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Auto-Preenchimento com Dados do Cliente
                    </label>
                    <select
                      value={fieldMapping}
                      onChange={(e) => setFieldMapping(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="">Nenhum (Digitação Manual)</option>
                      <option value="name">Nome do Cliente</option>
                      <option value="document">CPF / CNPJ do Cliente</option>
                      <option value="phone">WhatsApp / Telefone</option>
                      <option value="email">E-mail do Cliente</option>
                      <option value="address">Endereço do Cliente</option>
                      <option value="city">Cidade / Estado do Cliente</option>
                      <option value="current_date">Data Atual do Sistema</option>
                      <option value="company_name">Nome da Gráfica / Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Texto Placeholder (Exemplo)
                    </label>
                    <input
                      type="text"
                      value={fieldPlaceholder}
                      onChange={(e) => setFieldPlaceholder(e.target.value)}
                      placeholder="Ex: Digite o CPF..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Valor Padrão (Opcional)
                    </label>
                    <input
                      type="text"
                      value={fieldDefaultValue}
                      onChange={(e) => setFieldDefaultValue(e.target.value)}
                      placeholder="Valor inicial sugerido"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  {fieldType === 'select' && (
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Opções de Escolha (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={fieldOptions}
                        onChange={(e) => setFieldOptions(e.target.value)}
                        placeholder="Ex: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-3 flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={fieldRequired}
                        onChange={(e) => setFieldRequired(e.target.checked)}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>Campo de Preenchimento Obrigatório</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsFieldFormOpen(false)}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveField}
                        className="px-4 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Salvar Campo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List of configured fields */}
            {fields.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                <span className="text-xs font-bold text-slate-700 block">Nenhum campo cadastrado ainda</span>
                <span className="text-[11px] text-slate-500 block">
                  Clique em &quot;Adicionar Campo&quot; para criar variáveis que serão preenchidas pelos atendentes.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-violet-300 flex items-center justify-between gap-2 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{f.label}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">
                            &#123;&#123;{f.id}&#125;&#125;
                          </span>
                          {f.required ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 font-bold rounded">
                              Obrigatório
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              Opcional
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Tipo: <strong>{f.type}</strong></span>
                          {f.customerFieldMapping && (
                            <span className="text-emerald-700 font-medium">
                              • Auto: {f.customerFieldMapping}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => insertTagIntoBody(f.id)}
                        className="px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                        title="Inserir tag no corpo do texto"
                      >
                        <Code className="w-3 h-3" />
                        <span>Inserir Tag</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditField(idx)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar campo"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Excluir campo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VISUAL A4 WYSIWYG EDITOR */}
        {activeTab === 'layout' && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  Formatação Visual do Documento (Folha A4) *
                </label>
                <p className="text-[11px] text-slate-500">
                  Formate seu documento como no Word: aplique negrito, escolha fontes, alinhe e insira tags nos locais desejados.
                </p>
              </div>

              {/* Toggle Visual / Code Mode */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    editorMode === 'visual'
                      ? 'bg-white text-violet-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Editor Visual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    editorMode === 'code'
                      ? 'bg-white text-violet-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Modo Texto / Código</span>
                </button>
              </div>
            </div>

            {/* Quick Tag Insert Bar */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-violet-50/70 border border-violet-200 rounded-xl">
              <span className="text-[11px] font-bold text-violet-900 flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5 text-violet-600" />
                Tags do Modelo:
              </span>
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => insertTagIntoBody(f.id)}
                  className="px-2 py-1 bg-white hover:bg-violet-100 text-slate-800 hover:text-violet-900 border border-violet-200 hover:border-violet-300 font-mono text-[11px] rounded-md transition-all cursor-pointer shadow-2xs"
                  title={`Inserir {{${f.id}}}`}
                >
                  + &#123;&#123;{f.id}&#125;&#125;
                </button>
              ))}
            </div>

            {editorMode === 'visual' ? (
              <DocumentVisualEditor
                initialContent={templateBody}
                onChange={(html) => setTemplateBody(html)}
                availableFields={fields}
                minHeight="680px"
                id="template-visual-editor"
              />
            ) : (
              <textarea
                rows={16}
                required
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder="Digite o texto do documento aqui. Use tags como {{nome_completo}}, {{cpf}}, {{data_atual}} onde os dados dinâmicos devem aparecer."
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 leading-relaxed focus:bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            )}
          </div>
        )}

        {/* TAB 4: LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
              <span className="font-bold text-slate-900">Simulação de Impressão (com dados de exemplo)</span>
              <span className="text-[11px] text-slate-500">Visualização fiel na Folha A4</span>
            </div>

            <DocumentVisualEditor
              initialContent={previewSampleCompiled}
              readOnly={true}
              minHeight="680px"
              id="template-preview-editor"
            />
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Modelo</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

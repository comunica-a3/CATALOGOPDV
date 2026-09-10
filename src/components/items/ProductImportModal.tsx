import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { Category, Item } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  ExistingItemsAction,
  exportImportErrorsCSV,
  generateProductImportTemplateCSV,
  generateProductImportTemplateXLSX,
  ImportValidationResult,
  parseImportFile,
  ValidatedImportItem,
  validateImportedRows,
} from '../../utils/productImport';
import { Badge } from '../common/Badge';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingItems: Item[];
  onImportCompleted: () => void;
}

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'PROCESSING' | 'RESULT';

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingItems,
  onImportCompleted,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string>('');

  // Validation Result State
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [existingAction, setExistingAction] = useState<ExistingItemsAction>('SKIP');

  // Preview Filters State
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'NEW' | 'EXISTING' | 'ERROR'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');

  // Final Result State
  const [importResult, setImportResult] = useState<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    createdCategoriesCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setCurrentStep('UPLOAD');
    setSelectedFile(null);
    setIsLoadingFile(false);
    setFileError('');
    setValidationResult(null);
    setExistingAction('SKIP');
    setPreviewFilter('ALL');
    setPreviewSearch('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processSelectedFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      setFileError('Formato de arquivo inválido. Por favor, envie uma planilha Excel (.xlsx, .xls) ou arquivo CSV (.csv).');
      return;
    }

    setIsLoadingFile(true);
    setFileError('');
    setSelectedFile(file);

    try {
      // 1. Converte arquivo em linhas brutas
      const rawRows = await parseImportFile(file);

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha de produto com dados foi encontrada no arquivo.');
      }

      // 2. Valida os dados contra o cadastro existente
      const currentItems = StorageService.getItems();
      const currentCategories = StorageService.getCategories();
      const validation = validateImportedRows(rawRows, currentItems, currentCategories);

      setValidationResult(validation);
      setCurrentStep('PREVIEW');
    } catch (err: any) {
      console.error('Erro na importação:', err);
      setFileError(err.message || 'Ocorreu um erro ao processar o arquivo. Verifique o modelo e tente novamente.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !currentUser) return;

    setCurrentStep('PROCESSING');

    try {
      const result = await StorageService.importProductsBatch({
        validatedItems: validationResult.items,
        existingItemsAction: existingAction,
        currentUser,
      });

      setImportResult(result);
      setCurrentStep('RESULT');
      onImportCompleted();
    } catch (err: any) {
      alert(err.message || 'Erro ao gravar produtos importados no servidor.');
      setCurrentStep('PREVIEW');
    }
  };

  // Itens filtrados para a tabela de pré-visualização
  const filteredPreviewItems = validationResult?.items.filter((item) => {
    const matchFilter =
      previewFilter === 'ALL' ||
      (previewFilter === 'NEW' && item.status === 'NEW') ||
      (previewFilter === 'EXISTING' && item.status === 'EXISTING') ||
      (previewFilter === 'ERROR' && item.status === 'ERROR');

    const searchLower = (previewSearch || '').toLowerCase().trim();
    const matchSearch =
      !searchLower ||
      (item.name || '').toLowerCase().includes(searchLower) ||
      (item.sku || '').toLowerCase().includes(searchLower) ||
      (item.barcode ? item.barcode.toLowerCase().includes(searchLower) : false) ||
      (item.categoryName ? item.categoryName.toLowerCase().includes(searchLower) : false) ||
      String(item.rowNumber).includes(searchLower);

    return matchFilter && matchSearch;
  }) || [];

  return (
    <div
      id="product-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="product-import-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/75 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Importação de Lista de Produtos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre dezenas ou centenas de produtos de uma só vez através de planilha Excel ou CSV.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-import-modal"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max mx-auto">
            <div
              className={`flex items-center gap-2 ${
                currentStep === 'UPLOAD' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 'UPLOAD'
                    ? 'bg-blue-600 text-white'
                    : validationResult
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                1
              </span>
              <span>1. Selecionar Arquivo</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-2 ${
                currentStep === 'PREVIEW' || currentStep === 'PROCESSING'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 'PREVIEW' || currentStep === 'PROCESSING'
                    ? 'bg-blue-600 text-white'
                    : currentStep === 'RESULT'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </span>
              <span>2. Conferir e Validar</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-2 ${
                currentStep === 'RESULT' ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 'RESULT' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </span>
              <span>3. Conclusão</span>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ================= STEP 1: UPLOAD ================= */}
          {currentStep === 'UPLOAD' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Download Models Box */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-blue-900">
                      Não tem a planilha no formato padrão? Baixe o modelo oficial:
                    </h3>
                    <p className="text-xs text-blue-700/90 mt-0.5">
                      O modelo já vem configurado com todos os campos necessários e exemplos reais de produtos gráficos, físicos e serviços.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    id="btn-download-template-xlsx"
                    onClick={() => generateProductImportTemplateXLSX(categories)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Baixar Modelo Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    id="btn-download-template-csv"
                    onClick={() => generateProductImportTemplateCSV()}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Baixar Modelo CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-3.5 transition-all cursor-pointer ${
                  isLoadingFile
                    ? 'bg-slate-50 border-slate-300 opacity-60'
                    : 'bg-slate-50/50 hover:bg-blue-50/40 border-slate-300 hover:border-blue-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  {isLoadingFile ? (
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  ) : (
                    <FileUp className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-bold text-slate-800">
                    {isLoadingFile ? 'Lendo e validando planilha...' : 'Clique para selecionar ou arraste o arquivo aqui'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Formatos suportados: <strong>Excel (.xlsx, .xls)</strong> ou <strong>CSV (.csv)</strong>
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-browse-file"
                  className="mt-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                >
                  Selecionar Arquivo do Computador
                </button>
              </div>

              {/* Error Alert */}
              {fileError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Aviso na leitura do arquivo: </span>
                    <span>{fileError}</span>
                  </div>
                </div>
              )}

              {/* Important Instructions Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Dicas para uma importação perfeita:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600 leading-relaxed">
                  <li>
                    <strong>Nome do Produto</strong> e <strong>Preço de Venda</strong> são os únicos campos estritamente obrigatórios.
                  </li>
                  <li>
                    Se o <strong>Código / SKU</strong> for deixado em branco, o sistema gerará automaticamente sequenciais como <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">FIS-00001</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">GRF-00001</code> ou <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">SRV-00001</code>.
                  </li>
                  <li>
                    Categorias que ainda não existirem no sistema serão <strong>criadas automaticamente</strong> sem você precisar cadastrá-las antes.
                  </li>
                  <li>
                    Se o item for um produto físico e tiver <strong>Estoque inicial</strong> informado, o saldo de estoque e as movimentações de inventário serão sincronizados na hora.
                  </li>
                  <li>
                    Produtos já existentes são identificados pelo Código SKU, Código de barras ou Nome e <strong>não são duplicados</strong>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PREVIEW & VALIDATION ================= */}
          {currentStep === 'PREVIEW' && validationResult && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Found */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Encontrado
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {validationResult.totalRows}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">itens na planilha</div>
                </div>

                {/* New Products */}
                <div
                  onClick={() => setPreviewFilter('NEW')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    previewFilter === 'NEW'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                      : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Novos Produtos</span>
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {validationResult.newItemsCount}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">serão cadastrados</div>
                </div>

                {/* Existing Products */}
                <div
                  onClick={() => setPreviewFilter('EXISTING')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    previewFilter === 'EXISTING'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Já Cadastrados</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {validationResult.existingItemsCount}
                  </div>
                  <div className="text-[11px] text-amber-600 mt-0.5">já no sistema</div>
                </div>

                {/* Error Products */}
                <div
                  onClick={() => setPreviewFilter('ERROR')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    previewFilter === 'ERROR'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                      : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Com Erro</span>
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700 mt-1">
                    {validationResult.errorItemsCount}
                  </div>
                  <div className="text-[11px] text-rose-600 mt-0.5">
                    {validationResult.errorItemsCount > 0 ? 'necessitam correção' : 'nenhum erro'}
                  </div>
                </div>
              </div>

              {/* Action Selector for Existing Products */}
              {validationResult.existingItemsCount > 0 && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      O que fazer com os {validationResult.existingItemsCount} produtos que já estão cadastrados?
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        existingAction === 'SKIP'
                          ? 'bg-white border-amber-500 shadow-2xs ring-1 ring-amber-300'
                          : 'bg-amber-50/40 border-amber-200/80 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="existingAction"
                        checked={existingAction === 'SKIP'}
                        onChange={() => setExistingAction('SKIP')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          Ignorar produtos existentes (Padrão e Seguro)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Mantém o cadastro e estoques atuais inalterados. Importa apenas os produtos novos.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        existingAction === 'UPDATE'
                          ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-300'
                          : 'bg-amber-50/40 border-amber-200/80 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="existingAction"
                        checked={existingAction === 'UPDATE'}
                        onChange={() => setExistingAction('UPDATE')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          Atualizar cadastro dos produtos existentes
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sobrescreve preços, estoque e dados dos itens existentes com as informações da planilha.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({validationResult.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('NEW')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'NEW'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Novos ({validationResult.newItemsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('EXISTING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'EXISTING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    Existentes ({validationResult.existingItemsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ERROR')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'ERROR'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Erros ({validationResult.errorItemsCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Filtrar prévia..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Código / SKU</th>
                        <th className="py-2.5 px-3">Nome do Produto</th>
                        <th className="py-2.5 px-3">Tipo / Categoria</th>
                        <th className="py-2.5 px-3 text-right">Preço Venda</th>
                        <th className="py-2.5 px-3 text-right">Custo</th>
                        <th className="py-2.5 px-3 text-center">Estoque</th>
                        <th className="py-2.5 px-3">Observações / Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                            Nenhum item corresponde ao filtro atual.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewItems.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              item.status === 'ERROR'
                                ? 'bg-rose-50/40'
                                : item.status === 'EXISTING'
                                ? 'bg-amber-50/20'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                              #{item.rowNumber}
                            </td>

                            <td className="py-2 px-3">
                              {item.status === 'NEW' && (
                                <Badge variant="success" size="sm">
                                  Novo
                                </Badge>
                              )}
                              {item.status === 'EXISTING' && (
                                <Badge variant="warning" size="sm">
                                  Já Cadastrado
                                </Badge>
                              )}
                              {item.status === 'ERROR' && (
                                <Badge variant="danger" size="sm">
                                  Com Erro
                                </Badge>
                              )}
                            </td>

                            <td className="py-2 px-3 font-mono text-xs text-slate-700">
                              {item.sku || (
                                <span className="text-[10px] text-slate-400 italic">
                                  (Auto: {item.type === 'PRODUTO_GRAFICO' ? 'GRF-...' : item.type === 'SERVICO' ? 'SRV-...' : 'FIS-...'})
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3 font-semibold text-slate-900 max-w-xs truncate" title={item.name}>
                              {item.name || <span className="text-rose-500 italic">Nome não informado</span>}
                            </td>

                            <td className="py-2 px-3">
                              <div className="text-slate-800 font-medium">{item.categoryName}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.type === 'PRODUTO_GRAFICO' ? 'Gráfico' : item.type === 'SERVICO' ? 'Serviço' : 'Físico'}
                                {item.isNewCategory && ' • (Nova Categoria)'}
                              </div>
                            </td>

                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {item.salePrice > 0 ? (
                                formatCurrency(item.salePrice)
                              ) : (
                                <span className="text-rose-500 font-bold">R$ 0,00</span>
                              )}
                            </td>

                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatCurrency(item.costPrice)}
                            </td>

                            <td className="py-2 px-3 text-center font-semibold text-slate-700">
                              {item.type === 'PRODUTO_FISICO' ? item.stock : '—'}
                            </td>

                            <td className="py-2 px-3 text-[11px]">
                              {item.errors.length > 0 ? (
                                <div className="text-rose-700 font-semibold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>{item.errors.map((e) => `[${e.field}] ${e.message}`).join(' | ')}</span>
                                </div>
                              ) : item.status === 'EXISTING' ? (
                                <div className="text-amber-700">
                                  Identificado por {item.matchReason === 'SKU' ? 'SKU' : item.matchReason === 'BARCODE' ? 'Código de barras' : 'Nome'} ({item.existingItem?.name})
                                </div>
                              ) : (
                                <div className="text-slate-500">
                                  {item.warnings.length > 0 ? item.warnings[0] : 'Pronto para cadastrar'}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PROCESSING ================= */}
          {currentStep === 'PROCESSING' && (
            <div className="py-16 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Importando e Gravando Produtos...
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastrando itens, calculando margens e sincronizando categorias e estoques.
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 4: RESULT ================= */}
          {currentStep === 'RESULT' && importResult && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Importação Concluída com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Os produtos foram processados e já estão disponíveis no PDV, orçamentos, estoque e catálogo.
                </p>
              </div>

              {/* Result Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-700">
                    {importResult.createdCount}
                  </div>
                  <div className="text-xs font-bold text-emerald-800 mt-1">
                    Cadastrados com Sucesso
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-blue-700">
                    {importResult.updatedCount}
                  </div>
                  <div className="text-xs font-bold text-blue-800 mt-1">
                    Atualizados no Sistema
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-amber-700">
                    {importResult.skippedCount}
                  </div>
                  <div className="text-xs font-bold text-amber-800 mt-1">
                    Ignorados (Já Existentes)
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-slate-700">
                    {importResult.errorCount}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    Descartados por Erro
                  </div>
                </div>
              </div>

              {/* Categories created info */}
              {importResult.createdCategoriesCount > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    <strong>{importResult.createdCategoriesCount} nova(s) categoria(s)</strong> foram criadas automaticamente no catálogo para acomodar os novos produtos.
                  </span>
                </div>
              )}

              {/* Download Error Report if needed */}
              {validationResult && validationResult.errorsList.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-rose-900">
                        {validationResult.errorsList.length} erro(s) identificado(s) na planilha
                      </div>
                      <div className="text-[11px] text-rose-700">
                        Baixe o relatório detalhado para corrigir as linhas que não foram importadas.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-download-error-report"
                    onClick={() => exportImportErrorsCSV(validationResult.errorsList)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Relatório de Erros (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {currentStep === 'UPLOAD' && (
            <div className="flex items-center justify-end w-full gap-2">
              <button
                type="button"
                id="btn-cancel-import-step1"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {currentStep === 'PREVIEW' && validationResult && (
            <>
              <button
                type="button"
                id="btn-back-to-upload"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trocar Arquivo</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-cancel-preview"
                  onClick={handleClose}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  id="btn-confirm-import-action"
                  onClick={handleConfirmImport}
                  disabled={validationResult.newItemsCount === 0 && (validationResult.existingItemsCount === 0 || existingAction === 'SKIP')}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    Confirmar Importação (
                    {validationResult.newItemsCount +
                      (existingAction === 'UPDATE' ? validationResult.existingItemsCount : 0)}{' '}
                    itens)
                  </span>
                </button>
              </div>
            </>
          )}

          {currentStep === 'PROCESSING' && (
            <div className="w-full text-center text-xs text-slate-500 font-semibold py-1">
              Por favor, aguarde enquanto os dados são gravados...
            </div>
          )}

          {currentStep === 'RESULT' && (
            <>
              <button
                type="button"
                id="btn-import-another-file"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Outro Arquivo</span>
              </button>

              <button
                type="button"
                id="btn-finish-and-view-items"
                onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir e Ver Produtos</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

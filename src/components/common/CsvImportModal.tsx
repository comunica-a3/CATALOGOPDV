import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  RefreshCw,
  Search,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { StorageService } from '../../services/storage';
import { formatCurrency } from '../../utils/formatters';
import {
  CsvEntityType,
  CsvValidationResult,
  downloadCsvTemplate,
  downloadImportErrorsCsv,
  downloadXlsxTemplate,
  ExistingAction,
  parseCsvOrExcelFile,
  validateCsvRows,
} from '../../utils/csvImport';
import { Badge } from './Badge';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: CsvEntityType;
  onSuccess: () => void;
}

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'PROCESSING' | 'RESULT';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string>('');

  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [existingAction, setExistingAction] = useState<ExistingAction>('SKIP');

  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'NEW' | 'EXISTING' | 'ERROR'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');

  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  if (!isOpen) return null;

  const entityTitle =
    entityType === 'CUSTOMERS'
      ? 'Clientes'
      : entityType === 'BUDGETS'
      ? 'Orçamentos'
      : 'Vendas';

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
      const rawRows = await parseCsvOrExcelFile(file);
      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha com dados válidos foi encontrada no arquivo.');
      }

      const existingData = {
        customers: StorageService.getCustomers(),
        budgets: StorageService.getBudgets(),
        sales: StorageService.getSales(),
      };

      const result = validateCsvRows(entityType, rawRows, existingData);
      setValidationResult(result);
      setCurrentStep('PREVIEW');
    } catch (err: any) {
      console.error('Erro na validação do arquivo:', err);
      setFileError(err.message || 'Ocorreu um erro ao processar o arquivo. Verifique o formato e tente novamente.');
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleExecuteImport = async () => {
    if (!validationResult) return;
    setCurrentStep('PROCESSING');

    try {
      const validRows = validationResult.rows.filter((r) => r.status !== 'ERROR');
      let created = 0;
      let updated = 0;
      let skipped = 0;

      if (entityType === 'CUSTOMERS') {
        const customersToImport = validRows.map((r) => r.entity as any);
        const res = StorageService.importCustomersBatch(customersToImport, existingAction);
        created = res.created;
        updated = res.updated;
        skipped = res.skipped;
      } else if (entityType === 'BUDGETS') {
        const budgetsToImport = validRows.map((r) => r.entity as any);
        const res = StorageService.importBudgetsBatch(budgetsToImport, existingAction);
        created = res.created;
        updated = res.updated;
        skipped = res.skipped;
      } else if (entityType === 'SALES') {
        const salesToImport = validRows.map((r) => r.entity as any);
        const res = StorageService.importSalesBatch(salesToImport, existingAction);
        created = res.created;
        updated = res.updated;
        skipped = res.skipped;
      }

      setImportResult({
        created,
        updated,
        skipped,
        errors: validationResult.errorCount,
      });
      setCurrentStep('RESULT');
    } catch (err: any) {
      console.error('Falha ao gravar importação:', err);
      setFileError(err.message || 'Falha ao processar os registros no banco de dados.');
      setCurrentStep('PREVIEW');
    }
  };

  const filteredPreviewRows = (validationResult?.rows || []).filter((row) => {
    if (previewFilter === 'NEW' && row.status !== 'NEW') return false;
    if (previewFilter === 'EXISTING' && row.status !== 'EXISTING') return false;
    if (previewFilter === 'ERROR' && row.status !== 'ERROR') return false;

    if (previewSearch.trim()) {
      const query = previewSearch.toLowerCase();
      const primaryMatch = row.displaySummary.primary.toLowerCase().includes(query);
      const secondaryMatch = row.displaySummary.secondary.toLowerCase().includes(query);
      return primaryMatch || secondaryMatch;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Importação em Lote de {entityTitle}
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre ou atualize registros rapidamente a partir de arquivos CSV ou Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Breadcrumb */}
        <div className="flex items-center justify-between px-8 py-3 bg-white border-b border-slate-100 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'UPLOAD'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              1
            </span>
            <span className={currentStep === 'UPLOAD' ? 'text-indigo-600 font-bold' : 'text-slate-700'}>
              Arquivo & Modelo
            </span>
          </div>

          <div className="h-0.5 w-12 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'PREVIEW'
                  ? 'bg-indigo-600 text-white'
                  : currentStep === 'PROCESSING' || currentStep === 'RESULT'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={currentStep === 'PREVIEW' ? 'text-indigo-600 font-bold' : 'text-slate-700'}>
              Validação & Pré-visualização
            </span>
          </div>

          <div className="h-0.5 w-12 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'RESULT'
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 'PROCESSING'
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={currentStep === 'RESULT' ? 'text-emerald-600 font-bold' : 'text-slate-700'}>
              Conclusão
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* STEP 1: UPLOAD */}
          {currentStep === 'UPLOAD' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Template Download Card */}
              <div className="p-5 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Modelos Oficiais de Planilha
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Baixe o modelo com cabeçalhos corretos e exemplos prontos para preencher sem erros.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadCsvTemplate(entityType)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Modelo (.CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadXlsxTemplate(entityType)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Modelo (.XLSX)</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isLoadingFile
                    ? 'border-indigo-400 bg-indigo-50/40 pointer-events-none'
                    : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 group-hover:scale-105 transition-transform">
                  <FileUp className="w-8 h-8" />
                </div>

                <h4 className="text-sm font-bold text-slate-800">
                  {isLoadingFile ? 'Processando dados da planilha...' : 'Arraste o arquivo aqui ou clique para selecionar'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Formatos suportados: CSV (.csv) delimitado por ponto e vírgula ou vírgula, e Excel (.xlsx, .xls).
                </p>

                {isLoadingFile && (
                  <div className="flex items-center gap-2 mt-4 text-xs font-bold text-indigo-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Lendo linhas e verificando duplicidades...</span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {fileError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Erro no processamento do arquivo:</strong>
                    <span>{fileError}</span>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Dicas para uma importação perfeita:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                  <li>Mantenha a primeira linha com o nome dos cabeçalhos.</li>
                  <li>Para valores monetários, use o formato padrão brasileiro (ex: 150,00 ou 150.00).</li>
                  <li>Duplicidades são identificadas automaticamente por telefone, documento ou número único.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {currentStep === 'PREVIEW' && validationResult && (
            <div className="space-y-5">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total de Linhas
                  </span>
                  <span className="text-lg font-bold text-slate-800 block">
                    {validationResult.totalRows}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Novos Registros
                  </span>
                  <span className="text-lg font-bold text-emerald-800 block">
                    {validationResult.newCount}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Já Cadastrados
                  </span>
                  <span className="text-lg font-bold text-amber-800 block">
                    {validationResult.existingCount}
                  </span>
                </div>

                <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                    Inconsistências
                  </span>
                  <span className="text-lg font-bold text-rose-800 block">
                    {validationResult.errorCount}
                  </span>
                </div>
              </div>

              {/* Duplicate Resolution Strategy */}
              {validationResult.existingCount > 0 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        {validationResult.existingCount} registro(s) já existente(s) no sistema
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        Escolha como o sistema deve tratar os registros que já possuem cadastro:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={existingAction === 'SKIP'}
                        onChange={() => setExistingAction('SKIP')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Ignorar (Manter dados atuais)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={existingAction === 'UPDATE'}
                        onChange={() => setExistingAction('UPDATE')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Atualizar com os dados da planilha</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Error Warning & Inconsistencies Export */}
              {validationResult.errorCount > 0 && (
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">
                        {validationResult.errorCount} linha(s) possuem inconsistências obrigatórias
                      </h4>
                      <p className="text-[11px] text-rose-700">
                        Linhas com erro serão ignoradas durante a gravação. Você pode baixar um relatório para corrigir.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadImportErrorsCsv(entityType, validationResult.errorsList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-rose-600" />
                    <span>Baixar Relatório de Erros</span>
                  </button>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'ALL'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Novos ({validationResult.newCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('EXISTING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewFilter === 'EXISTING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Existentes ({validationResult.existingCount})
                  </button>
                  {validationResult.errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('ERROR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        previewFilter === 'ERROR'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Com Erro ({validationResult.errorCount})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar nesta prévia..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[42vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5 w-14 text-center">Linha</th>
                      <th className="px-3.5 py-2.5 w-28">Status</th>
                      <th className="px-3.5 py-2.5">Identificação</th>
                      <th className="px-3.5 py-2.5">Detalhes / Contato</th>
                      <th className="px-3.5 py-2.5 text-right">Valor / Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum registro encontrado para o filtro aplicado.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50 transition-colors ${
                            row.status === 'ERROR'
                              ? 'bg-rose-50/40'
                              : row.status === 'EXISTING'
                              ? 'bg-amber-50/20'
                              : ''
                          }`}
                        >
                          <td className="px-3.5 py-2.5 text-center font-mono text-slate-400 font-bold">
                            #{row.rowNumber}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {row.status === 'NEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Novo</span>
                              </span>
                            )}
                            {row.status === 'EXISTING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Existente</span>
                              </span>
                            )}
                            {row.status === 'ERROR' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Erro</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-800">
                            <div>{row.displaySummary.primary}</div>
                            {row.matchReason && (
                              <div className="text-[10px] text-amber-700 font-normal">
                                {row.matchReason}
                              </div>
                            )}
                            {row.errors.length > 0 && (
                              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                {row.errors.map((e) => e.message).join(' | ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500">
                            {row.displaySummary.secondary}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-slate-700">
                            {row.displaySummary.amount !== undefined
                              ? formatCurrency(row.displaySummary.amount)
                              : row.displaySummary.badge || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {currentStep === 'PROCESSING' && (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                Processando e gravando {entityTitle.toLowerCase()}...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Estamos sincronizando as alterações locais e gravando no banco de dados SQLite. Isso leva apenas alguns segundos.
              </p>
            </div>
          )}

          {/* STEP 4: RESULT */}
          {currentStep === 'RESULT' && importResult && (
            <div className="py-8 max-w-lg mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Importação Concluída com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Os dados foram processados e integrados com segurança.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Cadastrados</span>
                  <span className="text-base font-bold text-emerald-700 block">{importResult.created}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Atualizados</span>
                  <span className="text-base font-bold text-indigo-700 block">{importResult.updated}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ignorados</span>
                  <span className="text-base font-bold text-amber-700 block">{importResult.skipped}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Inconsistências</span>
                  <span className="text-base font-bold text-rose-700 block">{importResult.errors}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
          {currentStep === 'UPLOAD' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <div />
            </>
          )}

          {currentStep === 'PREVIEW' && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep('UPLOAD')}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Trocar Arquivo</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!validationResult || validationResult.totalRows - validationResult.errorCount <= 0}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <span>Confirmar e Importar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 'RESULT' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  handleClose();
                }}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

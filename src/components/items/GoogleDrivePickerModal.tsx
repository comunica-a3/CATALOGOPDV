import {
  AlertCircle,
  Check,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  getCurrentDriveUser,
  getDriveAccessToken,
  signInWithGoogleDrive,
  signOutGoogleDrive,
} from '../../services/googleDriveAuth';
import {
  extractGoogleDriveFileId,
  getGoogleDriveDisplayUrl,
  getGoogleDriveFileMetadata,
  GoogleDriveFile,
  listGoogleDriveImages,
} from '../../services/googleDriveService';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (selected: {
    fileId: string;
    fileName: string;
    mimeType: string;
    sizeBytes?: number;
    thumbnailUrl: string;
    displayUrl: string;
    webViewLink?: string;
    accountEmail?: string;
  }) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [currentUser, setCurrentUser] = useState(getCurrentDriveUser());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Manual Link / ID input
  const [manualInput, setManualInput] = useState('');
  const [isResolvingManual, setIsResolvingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  // Selected file preview before confirming
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);

  useEffect(() => {
    if (isOpen) {
      const user = getCurrentDriveUser();
      const token = getDriveAccessToken();
      setCurrentUser(user);
      if (user && token) {
        loadDriveFiles(true);
      }
    } else {
      setSelectedFile(null);
      setManualInput('');
      setManualError('');
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const { user } = await signInWithGoogleDrive();
      setCurrentUser(user);
      loadDriveFiles(true);
    } catch (err: any) {
      const code = err?.code || '';
      console.warn('Falha na autenticação Google:', code || err);
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('A janela de login do Google foi fechada antes da conclusão.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'O navegador ou iframe bloqueou o popup de login do Google. Para autenticar com sua conta, abra o sistema em uma nova aba ou use o link direto da imagem abaixo.'
        );
      } else if (code === 'auth/internal-error' || code === 'auth/network-request-failed') {
        setAuthError(
          'A autenticação popup do Google foi bloqueada pelas restrições do ambiente embutido (iframe). Abra o sistema em uma nova aba para conectar sua conta ou cole o link direto da imagem abaixo.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'Domínio não autorizado no Firebase Authentication. Cole o link direto de compartilhamento da imagem abaixo para vincular sem restrições.'
        );
      } else {
        setAuthError(
          err.message ||
            'Erro ao conectar conta Google. Abra o sistema em uma nova aba ou cole o link direto do arquivo abaixo.'
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setCurrentUser(null);
      setFiles([]);
      setNextPageToken(undefined);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  const loadDriveFiles = async (reset = false) => {
    setIsLoadingFiles(true);
    setFetchError('');
    try {
      const result = await listGoogleDriveImages({
        searchQuery: searchQuery.trim() || undefined,
        pageSize: 20,
      });
      setFiles(result.files);
      setNextPageToken(result.nextPageToken);
    } catch (err: any) {
      console.error('Erro ao buscar imagens do Drive:', err);
      setFetchError(err.message || 'Não foi possível carregar as imagens do Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await listGoogleDriveImages({
        searchQuery: searchQuery.trim() || undefined,
        pageToken: nextPageToken,
        pageSize: 20,
      });
      setFiles((prev) => [...prev, ...result.files]);
      setNextPageToken(result.nextPageToken);
    } catch (err: any) {
      console.error('Erro ao carregar mais imagens:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    loadDriveFiles(true);
  };

  const handleConfirmSelection = (file: GoogleDriveFile) => {
    const fileId = file.id;
    const displayUrl = getGoogleDriveDisplayUrl(fileId, 1200);
    const thumbUrl = file.thumbnailLink || getGoogleDriveDisplayUrl(fileId, 400);

    onSelectFile({
      fileId,
      fileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.size ? Number(file.size) : undefined,
      thumbnailUrl: thumbUrl,
      displayUrl: displayUrl,
      webViewLink: file.webViewLink,
      accountEmail: currentUser?.email || undefined,
    });
    onClose();
  };

  const handleResolveManualInput = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;

    setManualError('');
    setIsResolvingManual(true);

    try {
      const fileId = extractGoogleDriveFileId(manualInput.trim());
      if (!fileId) {
        throw new Error('Link ou ID do Google Drive não reconhecido. Cole um link de compartilhamento válido.');
      }

      const meta = await getGoogleDriveFileMetadata(fileId);
      handleConfirmSelection(meta);
    } catch (err: any) {
      setManualError(err.message || 'Não foi possível carregar as informações desta imagem do Google Drive.');
    } finally {
      setIsResolvingManual(false);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '';
    const bytes = Number(bytesStr);
    if (isNaN(bytes) || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="google-drive-picker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-4xl h-[90vh] max-h-[750px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Google Drive
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Zero Armazenamento Local
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione fotos do seu Drive sem ocupar espaço de storage no sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* If NOT authenticated with Google */}
          {!currentUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                <HardDrive className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Conectar ao Google Drive
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
                Faça login com sua conta do Google para pesquisar e selecionar imagens diretamente dos seus arquivos do Drive.
              </p>

              {authError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2.5 text-left max-w-md">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-800 leading-relaxed">{authError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-100/80 hover:bg-rose-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Sistema em Nova Aba</span>
                  </button>
                </div>
              )}

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isAuthenticating ? 'Conectando ao Google...' : 'Entrar com Google'}
                </span>
              </button>

              <div className="mt-8 pt-6 border-t border-slate-200 w-full max-w-md text-left">
                <p className="text-xs font-bold text-slate-700 mb-2">
                  Ou use um link direto do Google Drive:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleResolveManualInput();
                      }
                    }}
                    placeholder="Cole o link de compartilhamento do Drive..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleResolveManualInput()}
                    disabled={isResolvingManual || !manualInput.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isResolvingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Usar Link'}
                  </button>
                </div>
                {manualError && (
                  <p className="text-[11px] text-rose-600 mt-1.5">{manualError}</p>
                )}
              </div>
            </div>
          ) : (
            /* Authenticated Drive Browser */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="p-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Account info */}
                <div className="flex items-center gap-2">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google'}
                      className="w-7 h-7 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {currentUser.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left leading-tight">
                    <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[200px]">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                      {currentUser.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="ml-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Bar & Refresh */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      placeholder="Pesquisar fotos por nome..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadDriveFiles(true)}
                    disabled={isLoadingFiles}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Paste direct link collapsible bar */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                    Ou cole o link do Drive:
                  </span>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleResolveManualInput();
                      }
                    }}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleResolveManualInput()}
                    disabled={isResolvingManual || !manualInput.trim()}
                    className="px-3 py-1 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isResolvingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Usar'}
                  </button>
                </div>
              </div>

              {manualError && (
                <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              {/* File Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingFiles ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2.5">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-semibold">Consultando fotos no Google Drive...</p>
                  </div>
                ) : fetchError ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">Não foi possível listar as imagens</p>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">{fetchError}</p>
                    <button
                      type="button"
                      onClick={() => loadDriveFiles(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">Nenhuma imagem encontrada</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {searchQuery
                        ? `Nenhum resultado para "${searchQuery}". Tente outro termo.`
                        : 'Não encontramos arquivos de imagem recentes no seu Google Drive.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {files.map((file) => {
                        const isSelected = selectedFile?.id === file.id;
                        const thumbUrl =
                          file.thumbnailLink || getGoogleDriveDisplayUrl(file.id, 400);

                        return (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            onDoubleClick={() => handleConfirmSelection(file)}
                            className={`group relative rounded-xl border p-2 flex flex-col transition-all cursor-pointer select-none bg-white ${
                              isSelected
                                ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                                : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
                            }`}
                          >
                            {/* Image container */}
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center mb-2">
                              <img
                                src={thumbUrl}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Fallback placeholder on preview error
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors" />

                              {/* Selected checkmark */}
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              )}
                            </div>

                            {/* File info */}
                            <div className="min-w-0">
                              <p
                                className="text-xs font-bold text-slate-800 truncate"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>{formatFileSize(file.size)}</span>
                                <span className="uppercase">{file.mimeType.split('/')[1] || 'IMG'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination - Load More */}
                    {nextPageToken && (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Carregar Mais Fotos</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500">
                  {selectedFile ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 truncate max-w-[280px]">
                        {selectedFile.name}
                      </span>
                      {selectedFile.webViewLink && (
                        <a
                          href={selectedFile.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px]"
                        >
                          <span>Abrir no Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <span>Selecione uma imagem para utilizar no produto.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFile}
                    onClick={() => selectedFile && handleConfirmSelection(selectedFile)}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Usar Imagem Selecionada</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

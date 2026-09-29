import React, { useEffect, useState } from 'react';
import {
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Github,
  ShieldCheck,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface PublishCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PublishCatalogModal: React.FC<PublishCatalogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [status, setStatus] = useState<{
    configured: boolean;
    owner?: string;
    repo?: string;
    branch?: string;
    hasToken: boolean;
  } | null>(null);

  // Campos manuais opcionais para configurar se não estiver no .env
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('pdv_github_token') || '');
  const [githubOwner, setGithubOwner] = useState(() => localStorage.getItem('pdv_github_owner') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('pdv_github_repo') || '');
  const [githubBranch, setGithubBranch] = useState(() => localStorage.getItem('pdv_github_branch') || 'main');
  const [showConfigFields, setShowConfigFields] = useState(false);

  // Resultado
  const [successResult, setSuccessResult] = useState<{
    message: string;
    itemsCount: number;
    commitUrl?: string;
    targetRepo: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      setErrorMessage(null);
      setIsLoadingStatus(true);
      api
        .getCatalogPublishStatus()
        .then((data) => {
          setStatus(data);
          if (data.owner && !githubOwner) setGithubOwner(data.owner);
          if (data.repo && !githubRepo) setGithubRepo(data.repo);
          if (data.branch && !githubBranch) setGithubBranch(data.branch);
          if (!data.configured) {
            setShowConfigFields(true);
          }
        })
        .catch(() => {
          setShowConfigFields(true);
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    }
  }, [isOpen]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      // Salva preferências no localStorage
      if (githubToken) localStorage.setItem('pdv_github_token', githubToken.trim());
      if (githubOwner) localStorage.setItem('pdv_github_owner', githubOwner.trim());
      if (githubRepo) localStorage.setItem('pdv_github_repo', githubRepo.trim());
      if (githubBranch) localStorage.setItem('pdv_github_branch', githubBranch.trim());

      const res = await api.publishCatalog({
        githubToken: githubToken.trim() || undefined,
        githubRepoOwner: githubOwner.trim() || undefined,
        githubRepoName: githubRepo.trim() || undefined,
        githubBranch: githubBranch.trim() || undefined,
      });

      setSuccessResult({
        message: res.message || 'Catálogo atualizado com sucesso no GitHub! A vitrine será atualizada em instantes.',
        itemsCount: res.itemsCount,
        commitUrl: res.commitUrl,
        targetRepo: res.targetRepo,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao publicar catálogo no GitHub.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={isPublishing ? () => {} : onClose} title="Publicar Catálogo na Web" size="lg">
      <div className="space-y-5">
        {/* Banner Explicativo */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-blue-950">Sincronização da Vitrine Estática</h3>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
              Exporta automaticamente os produtos públicos e categorias do seu banco de dados local para o arquivo{' '}
              <code className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-semibold">public/catalogo.json</code>{' '}
              no seu repositório do GitHub. A vitrine estática é atualizada instantaneamente sem expor custos ou margens da sua empresa.
            </p>
          </div>
        </div>

        {/* Garantia de Segurança */}
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Segurança garantida: apenas produtos marcados para o catálogo são exportados; custos de fornecedor e margens de lucro são 100% removidos.</span>
        </div>

        {/* Feedback de Sucesso */}
        {successResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successResult.message}</span>
            </div>
            <div className="text-xs text-emerald-800 space-y-1 pl-7">
              <p>
                <strong>{successResult.itemsCount} produtos</strong> ativos e públicos sincronizados com{' '}
                <span className="font-mono">{successResult.targetRepo}</span>.
              </p>
              {successResult.commitUrl && (
                <a
                  href={successResult.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold underline mt-1"
                >
                  <span>Ver alteração no repositório GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Feedback de Erro */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Falha na publicação</p>
              <p className="mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Status das Variáveis */}
        {!isLoadingStatus && status && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-slate-800" />
                <span>Repositório Alvo:</span>
              </span>
              <span className="font-mono text-slate-900 font-bold">
                {status.owner && status.repo ? `${status.owner}/${status.repo}` : (githubOwner && githubRepo ? `${githubOwner}/${githubRepo}` : 'Não configurado')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Token de acesso GitHub:</span>
              <span className={`font-semibold flex items-center gap-1 ${status.hasToken || githubToken ? 'text-emerald-700' : 'text-amber-700'}`}>
                {status.hasToken || githubToken ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Configurado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Pendente</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Alternador de Configurações de Conexão */}
        <div>
          <button
            type="button"
            onClick={() => setShowConfigFields(!showConfigFields)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showConfigFields ? 'Ocultar credenciais do GitHub' : 'Editar credenciais / repositório do GitHub'}</span>
          </button>

          {showConfigFields && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (escopo repo / contents:write)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Crie em: GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dono do Repositório (Owner / Usuário)
                  </label>
                  <input
                    type="text"
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                    placeholder="ex: seu-usuario-github"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome do Repositório (Repo)
                  </label>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="ex: catalogo-dumorro"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Branch (Padrão: main)
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando Catálogo na Web...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publicar Catálogo na Web</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

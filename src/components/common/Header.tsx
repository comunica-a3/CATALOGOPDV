import {
  AlertCircle,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings } from '../../types';
import { Modal } from './Modal';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  companySettings: CompanySettings;
  pendingProdCount?: number;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  companySettings,
  pendingProdCount = 0,
  showSidebar = true,
  onToggleSidebar,
}) => {
  const { currentUser, users, switchUser, isAdmin, changePassword } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Self password change modal state
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);

  const handleOpenChangePwd = () => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setPwdSuccess('');
    setShowUserDropdown(false);
    setIsChangePwdOpen(true);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd.trim()) {
      setPwdError('Por favor, informe a senha atual.');
      return;
    }
    if (newPwd.trim().length < 4) {
      setPwdError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('A confirmação da nova senha não confere.');
      return;
    }

    setPwdError('');
    setIsSubmittingPwd(true);

    try {
      const res = await changePassword(currentPwd.trim(), newPwd.trim(), currentUser.id);
      if (res.success) {
        setPwdSuccess('Senha alterada com sucesso!');
        setTimeout(() => {
          setIsChangePwdOpen(false);
          setPwdSuccess('');
        }, 1500);
      } else {
        setPwdError(res.error || 'Erro ao alterar a senha.');
      }
    } catch (err: any) {
      setPwdError(err.message || 'Erro ao alterar a senha.');
    } finally {
      setIsSubmittingPwd(false);
    }
  };

  return (
    <header
      id="main-app-header"
      className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 select-none shadow-xs"
    >
      <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              id="header-toggle-sidebar-btn"
              onClick={onToggleSidebar}
              title={showSidebar ? 'Ocultar Menu (Aproveitar Tela Cheia)' : 'Mostrar Menu Principal'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold hidden lg:flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                !showSidebar
                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700 shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              {!showSidebar ? (
                <>
                  <Menu className="w-4 h-4 text-white" />
                  <span>Mostrar Menu</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-500" />
                  <span>Ocultar Menu</span>
                </>
              )}
            </button>
          )}

          <div
            onClick={() => onNavigate('pdv')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  {companySettings?.name || 'Digital Express'}
                </span>

              </div>
              <p className="text-xs text-slate-500 font-normal hidden sm:block">
                Sistema Integrado de Vendas e Produção
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Shortcuts */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Catálogo Público Button */}
          <button
            type="button"
            id="header-btn-catalog"
            onClick={() => onNavigate('catalog')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              currentView === 'catalog'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
            title="Abrir Catálogo de Produtos e Serviços"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Catálogo</span>
            <ExternalLink className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          {/* Quick Action Button (PDV for sellers/collabs/admins, Orçamentos for Promotores) */}
          {currentUser.role === 'PROMOTOR' ? (
            <button
              type="button"
              id="header-btn-pos"
              onClick={() => onNavigate('budgets')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                currentView === 'budgets'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Criar Orçamento</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="header-btn-pos-facil"
                onClick={() => onNavigate('pdv_facil')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  currentView === 'pdv_facil' || currentView === 'pdv-facil'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200'
                }`}
                title="PDV Fácil — Atendimento rápido de balcão"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">PDV Fácil</span>
              </button>

              <button
                type="button"
                id="header-btn-pos"
                onClick={() => onNavigate('pdv')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  currentView === 'pdv' || currentView === 'pos'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>PDV</span>
              </button>
            </div>
          )}

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="header-user-menu-btn"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  isAdmin
                    ? 'bg-amber-100 text-amber-800'
                    : currentUser.role === 'COLABORADOR'
                    ? 'bg-indigo-100 text-indigo-800'
                    : currentUser.role === 'PROMOTOR'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  {isAdmin ? (
                    <Shield className="w-3 h-3 text-amber-600" />
                  ) : currentUser.role === 'COLABORADOR' ? (
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  ) : currentUser.role === 'PROMOTOR' ? (
                    <Megaphone className="w-3 h-3 text-teal-600" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-blue-600" />
                  )}
                  <span>
                    {currentUser.role === 'ADMINISTRADOR'
                      ? 'Administrador'
                      : currentUser.role === 'COLABORADOR'
                      ? 'Colaborador'
                      : currentUser.role === 'PROMOTOR'
                      ? 'Promotor'
                      : 'Vendedor'}
                  </span>
                </div>
              </div>
            </button>

            {showUserDropdown && (
              <div
                id="user-dropdown-menu"
                className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        currentUser.role === 'ADMINISTRADOR'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : currentUser.role === 'COLABORADOR'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : currentUser.role === 'PROMOTOR'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {currentUser.role === 'ADMINISTRADOR'
                        ? 'Admin'
                        : currentUser.role === 'COLABORADOR'
                        ? 'Colaborador'
                        : currentUser.role === 'PROMOTOR'
                        ? 'Promotor'
                        : 'Vendedor'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentUser.email || 'Usuário autenticado'}
                  </p>
                </div>

                {/* Self Password Change Button */}
                <div className="px-2 py-1.5 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handleOpenChangePwd}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span>Alterar Minha Senha</span>
                  </button>
                </div>

                {/* Switch Seller Profile (If Admin) */}
                {isAdmin && (
                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Alternar Perfil Ativo (Admin):
                    </p>
                    <div className="max-h-36 overflow-y-auto">
                      {users.map((u) => {
                        const isSelected = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              switchUser(u.id);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                u.role === 'ADMINISTRADOR'
                                  ? 'bg-amber-100 text-amber-800'
                                  : u.role === 'COLABORADOR'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : u.role === 'PROMOTOR'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="truncate block">{u.name}</span>
                                <span className="text-[9px] text-slate-400 block -mt-0.5">
                                  {u.role === 'ADMINISTRADOR'
                                    ? 'Administrador'
                                    : u.role === 'COLABORADOR'
                                    ? 'Colaborador'
                                    : u.role === 'PROMOTOR'
                                    ? 'Promotor'
                                    : 'Vendedor'}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="px-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onNavigate('logout');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sair / Trocar Usuário</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            id="header-btn-logout"
            onClick={() => onNavigate('logout')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangePwdOpen && (
        <Modal
          id="header-change-password-modal"
          isOpen={isChangePwdOpen}
          onClose={() => setIsChangePwdOpen(false)}
          title="Alterar Minha Senha"
          subtitle={`Defina uma nova senha para ${currentUser.name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            {pwdError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Senha Atual *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  required
                  autoFocus
                  value={currentPwd}
                  onChange={(e) => {
                    setCurrentPwd(e.target.value);
                    setPwdError('');
                  }}
                  placeholder="Digite sua senha atual..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nova Senha *
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  value={newPwd}
                  onChange={(e) => {
                    setNewPwd(e.target.value);
                    setPwdError('');
                  }}
                  placeholder="Mínimo 4 caracteres..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmar Nova Senha *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  required
                  value={confirmPwd}
                  onChange={(e) => {
                    setConfirmPwd(e.target.value);
                    setPwdError('');
                  }}
                  placeholder="Repita a nova senha..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsChangePwdOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmittingPwd}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmittingPwd ? 'Salvando...' : 'Salvar Nova Senha'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
};


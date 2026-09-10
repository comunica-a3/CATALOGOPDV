import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  Lock,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings } from '../../types';

interface AdminLoginViewProps {
  companySettings: CompanySettings;
  onLoginSuccess: (mustChangePassword?: boolean) => void;
  onBackToCatalog: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  companySettings,
  onLoginSuccess,
  onBackToCatalog,
}) => {
  const { login } = useAuth();

  // Authentication credentials state
  const [userNameInput, setUserNameInput] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Input refs
  const userInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = userNameInput.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUser) {
      setError('Por favor, informe o usuário de acesso.');
      userInputRef.current?.focus();
      return;
    }

    if (!trimmedPassword) {
      setError('Por favor, informe a senha de acesso.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(trimmedUser, trimmedPassword);
      if (result.success) {
        onLoginSuccess(result.mustChangePassword);
      } else {
        setError(result.error || 'Credenciais inválidas. Verifique usuário e senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-auth-view"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-blue-500 selection:text-white"
    >
      {/* Back to Catalog Navigation */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Catálogo</span>
        </button>

        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Área Restrita</span>
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-600 border border-blue-400/40 shadow-blue-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Acesso ao Sistema
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {companySettings?.name || 'Painel de Gestão e PDV'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* First Access Notice */}
        <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Primeiro acesso ou recuperação: utilize o usuário <strong className="text-slate-200">admin</strong> e senha <strong className="text-slate-200">admin</strong>.
          </span>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label
              htmlFor="input-login-username"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Usuário ou E-mail *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                ref={userInputRef}
                id="input-login-username"
                type="text"
                autoComplete="username"
                required
                value={userNameInput}
                onChange={(e) => {
                  setUserNameInput(e.target.value);
                  setError('');
                }}
                placeholder="Ex: admin"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="input-login-password"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Senha de Acesso *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={passwordInputRef}
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Digite sua senha..."
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900/90 border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-submit-login"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <Lock className="w-4 h-4" />
            <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

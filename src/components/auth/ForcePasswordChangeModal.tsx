import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForcePasswordChangeModalProps {
  onSuccess: () => void;
  onLogout: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  onSuccess,
  onLogout,
}) => {
  const { forceInitialPasswordChange } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setError('Por favor, informe a nova senha.');
      return;
    }

    if (trimmedNew.length < 4) {
      setError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (trimmedNew === 'admin') {
      setError('A nova senha não pode ser a senha padrão "admin". Escolha uma senha pessoal segura.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await forceInitialPasswordChange(trimmedNew);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Erro ao definir nova senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="force-password-change-screen"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Security Alert Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Cadastrar Nova Senha
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Primeiro Acesso Detectado: Defina sua senha pessoal definitiva para desbloquear o painel administrativo.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <Lock className="w-3.5 h-3.5" />
            <span>Etapa Obrigatória de Segurança</span>
          </div>
          <p className="leading-relaxed">
            Por segurança, você não poderá utilizar as funções do sistema enquanto a senha padrão não for substituída. Após a alteração, a senha antiga deixará de funcionar imediatamente.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                autoFocus
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder="Mínimo de 4 caracteres..."
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirme a Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Digite a nova senha novamente..."
                className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Salvando...' : 'Salvar Senha e Liberar Painel'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cancelar e Sair</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

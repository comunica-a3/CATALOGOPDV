import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EditSectionTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titles: {
    mainTitle: string;
    mainSubtitle: string;
    funilTitle: string;
    funilDesc: string;
  };
  onSave: (newTitles: { mainTitle: string; mainSubtitle: string; funilTitle: string; funilDesc: string }) => void;
}

export const EditSectionTitlesModal: React.FC<EditSectionTitlesModalProps> = ({
  isOpen,
  onClose,
  titles,
  onSave,
}) => {
  const { isAdmin } = useAuth();
  const [mainTitle, setMainTitle] = useState(titles.mainTitle);
  const [mainSubtitle, setMainSubtitle] = useState(titles.mainSubtitle);
  const [funilTitle, setFunilTitle] = useState(titles.funilTitle);
  const [funilDesc, setFunilDesc] = useState(titles.funilDesc);

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Acesso Restrito</h3>
          <p className="text-xs text-slate-600">
            Apenas administradores podem alterar os títulos e descrições dos blocos da Captação Ativa.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      mainTitle,
      mainSubtitle,
      funilTitle,
      funilDesc,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">Editar Títulos e Descrições da Captação</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Título Principal da Seção</label>
            <input
              type="text"
              value={mainTitle}
              onChange={(e) => setMainTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Subtítulo / Descrição Principal</label>
            <textarea
              value={mainSubtitle}
              onChange={(e) => setMainSubtitle(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título do Bloco / Guia Principal (Funil)</label>
            <input
              type="text"
              value={funilTitle}
              onChange={(e) => setFunilTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Descrição / Auxiliar do Funil</label>
            <textarea
              value={funilDesc}
              onChange={(e) => setFunilDesc(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

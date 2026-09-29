import {
  Copy,
  Layers,
  MessageCircle,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage';
import { ApproachMessageTemplate, OpportunityStage } from '../../types';
import { Modal } from '../common/Modal';

interface ApproachTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ApproachMessageTemplate | null;
  onSaved: (savedTpl: ApproachMessageTemplate) => void;
}

export const ApproachTemplateModal: React.FC<ApproachTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Primeiro Contato');
  const [targetStage, setTargetStage] = useState<OpportunityStage | 'ALL'>('ALL');
  const [templateText, setTemplateText] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (template) {
        setTitle(template.title);
        setCategory(template.category || 'Geral');
        setTargetStage(template.targetStage || 'ALL');
        setTemplateText(template.templateText);
        setActive(template.active !== false);
      } else {
        setTitle('');
        setCategory('Primeiro Contato');
        setTargetStage('A_CONTATAR');
        setTemplateText(
          'Olá, [NOME]! Tudo bem?\n\nMe chamo [VENDEDOR], da *[EMPRESA]*. Notei a presença do *[NOME_DO_NEGOCIO]* e gostaríamos de apresentar nossas condições especiais para [NECESSIDADE]...\n\nPodemos conversar?'
        );
        setActive(true);
      }
    }
  }, [isOpen, template]);

  const handleInsertTag = (tag: string) => {
    setTemplateText((prev) => prev + ` ${tag} `);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título do modelo de mensagem.');
      return;
    }
    if (!templateText.trim()) {
      setError('Por favor, escreva o texto da mensagem.');
      return;
    }

    try {
      const saved = StorageService.saveApproachTemplate({
        id: template?.id,
        title: title.trim(),
        category: category.trim(),
        targetStage,
        templateText: templateText.trim(),
        active,
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar modelo.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? `Editar Modelo: ${template.title}` : 'Criar Novo Modelo de Abordagem WhatsApp'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Título do Modelo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: 1ª Abordagem Restaurante, Retorno de Orçamento..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="Primeiro Contato">Primeiro Contato / Apresentação</option>
              <option value="Oferta de Pacote">Oferta de Pacote / Kit</option>
              <option value="Pós-Orçamento">Pós-Orçamento / Follow-up</option>
              <option value="Retorno">Retomada / Lead Antigo</option>
              <option value="Geral">Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Etapa Alvo do Funil
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Etapas</option>
              <option value="A_CONTATAR">🟠 A Contatar</option>
              <option value="CONTATADO">🟡 Contatado</option>
              <option value="INTERESSADO">🔵 Interessado</option>
              <option value="ORCAMENTO">🟣 Em Orçamento</option>
            </select>
          </div>
        </div>

        {/* TAGS DINÂMICAS */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Clique para inserir variáveis inteligentes no texto:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { tag: '[NOME]', label: 'Nome do Contato' },
              { tag: '[NOME_DO_NEGOCIO]', label: 'Nome da Empresa' },
              { tag: '[VENDEDOR]', label: 'Nome do Vendedor' },
              { tag: '[EMPRESA]', label: 'Nome da Gráfica' },
              { tag: '[NECESSIDADE]', label: 'Necessidade Identificada' },
              { tag: '[PACOTE_SUGERIDO]', label: 'Nome do Pacote' },
            ].map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => handleInsertTag(t.tag)}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 rounded text-xs font-mono font-medium transition-colors"
              >
                + {t.tag} ({t.label})
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Texto da Mensagem (WhatsApp) *
          </label>
          <textarea
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            rows={7}
            className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 font-sans"
            placeholder="Digite aqui o texto da mensagem..."
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="tplActive"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded text-blue-600"
          />
          <label htmlFor="tplActive" className="text-xs text-slate-700 cursor-pointer">
            Modelo Ativo e Disponível para Abordagens
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            {template ? 'Salvar Alterações' : 'Criar Modelo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Divide,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Indent,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minus,
  Outdent,
  PaintBucket,
  Palette,
  Pilcrow,
  Plus,
  Scissors,
  SplitSquareVertical,
  Strikethrough,
  Tag,
  Type,
  Underline,
  WrapText,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DocumentField } from '../../types';
import { convertTemplateToHtml } from '../../utils/documentGenerator';

interface DocumentVisualEditorProps {
  initialContent: string;
  onChange?: (htmlContent: string) => void;
  availableFields?: DocumentField[];
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
  id?: string;
}

export const DocumentVisualEditor: React.FC<DocumentVisualEditorProps> = ({
  initialContent,
  onChange,
  availableFields = [],
  readOnly = false,
  minHeight = '900px',
  placeholder = 'Comece a digitar ou insira tags do documento...',
  id = 'doc-visual-editor',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedFontSize, setSelectedFontSize] = useState('12pt');
  const [selectedHeading, setSelectedHeading] = useState('p');
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [paragraphSpacing, setParagraphSpacing] = useState('normal'); // compact, normal, relaxed
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
  const [isParagraphBgPickerOpen, setIsParagraphBgPickerOpen] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Quick font options
  const fontFamilies = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Garamond', value: 'Garamond, serif' },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  ];

  // Font sizes in points
  const fontSizes = [
    { label: '9 pt', value: '9pt' },
    { label: '10 pt', value: '10pt' },
    { label: '11 pt', value: '11pt' },
    { label: '12 pt', value: '12pt' },
    { label: '14 pt', value: '14pt' },
    { label: '16 pt', value: '16pt' },
    { label: '18 pt', value: '18pt' },
    { label: '20 pt', value: '20pt' },
    { label: '24 pt', value: '24pt' },
    { label: '28 pt', value: '28pt' },
    { label: '32 pt', value: '32pt' },
    { label: '36 pt', value: '36pt' },
  ];

  // Preset text colors
  const textColors = [
    { label: 'Automático / Preto', value: '#0f172a' },
    { label: 'Cinza Escuro', value: '#334155' },
    { label: 'Cinza Médio', value: '#64748b' },
    { label: 'Azul Marinho', value: '#1e3a8a' },
    { label: 'Azul Real', value: '#2563eb' },
    { label: 'Verde Floresta', value: '#15803d' },
    { label: 'Bordô / Vinho', value: '#991b1b' },
    { label: 'Vermelho Vivo', value: '#dc2626' },
  ];

  // Preset highlight colors (inline text marker)
  const highlightColors = [
    { label: 'Sem destaque', value: 'transparent' },
    { label: 'Amarelo', value: '#fef08a' },
    { label: 'Verde Claro', value: '#bbf7d0' },
    { label: 'Azul Claro', value: '#bae6fd' },
    { label: 'Laranja Claro', value: '#fed7aa' },
    { label: 'Cinza Suave', value: '#e2e8f0' },
  ];

  // Preset paragraph / full-line background colors (covers full usable A4 width)
  const paragraphBgColors = [
    { label: 'Sem fundo', value: 'transparent' },
    { label: 'Cinza Suave', value: '#f1f5f9' },
    { label: 'Cinza Médio', value: '#e2e8f0' },
    { label: 'Grafite Escuro', value: '#1e293b' },
    { label: 'Preto Carvão', value: '#0f172a' },
    { label: 'Azul Suave', value: '#dbeafe' },
    { label: 'Azul Marinho', value: '#1e40af' },
    { label: 'Roxo Lavanda', value: '#ede9fe' },
    { label: 'Roxo Escuro', value: '#581c87' },
    { label: 'Verde Suave', value: '#dcfce7' },
    { label: 'Verde Floresta', value: '#15803d' },
    { label: 'Amarelo Suave', value: '#fef3c7' },
    { label: 'Laranja Pêssego', value: '#ffedd5' },
    { label: 'Coral Suave', value: '#fee2e2' },
    { label: 'Vinho Bordô', value: '#991b1b' },
  ];

  // Initialize editor content once or on major content reset
  useEffect(() => {
    if (editorRef.current) {
      if (document.activeElement === editorRef.current) {
        return;
      }
      const html = convertTemplateToHtml(initialContent);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [initialContent]);

  // Save selection before clicking dropdown menus so we can restore cursor position
  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const restoreSavedSelection = () => {
    if (savedRange && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Helper command runner
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (readOnly) return;
    restoreSavedSelection();
    document.execCommand(command, false, value);
    handleInput();
  };

  // Formatting actions
  const handleBold = () => executeCommand('bold');
  const handleItalic = () => executeCommand('italic');
  const handleUnderline = () => executeCommand('underline');
  const handleStrikethrough = () => executeCommand('strikeThrough');

  const handleAlignLeft = () => executeCommand('justifyLeft');
  const handleAlignCenter = () => executeCommand('justifyCenter');
  const handleAlignRight = () => executeCommand('justifyRight');
  const handleAlignJustify = () => executeCommand('justifyFull');

  const handleBulletList = () => executeCommand('insertUnorderedList');
  const handleNumberedList = () => executeCommand('insertOrderedList');
  const handleIndent = () => executeCommand('indent');
  const handleOutdent = () => executeCommand('outdent');

  const handleHorizontalRule = () => {
    executeCommand('insertHorizontalRule');
  };

  const handleLineBreak = () => {
    executeCommand('insertHTML', '<br>');
  };

  const handlePageBreak = () => {
    const pageBreakHtml = `
      <div class="page-break" style="page-break-before: always; margin: 28px 0; border-top: 2px dashed #94a3b8; text-align: center; color: #64748b; font-size: 10pt; padding-top: 6px; user-select: none;">
        ✂️ --- QUEBRA DE PÁGINA A4 ---
      </div>
      <p><br></p>
    `;
    executeCommand('insertHTML', pageBreakHtml);
  };

  // Change Font Family
  const handleFontFamilyChange = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    executeCommand('fontName', fontFamily);
  };

  // Change Font Size
  const handleFontSizeChange = (sizePt: string) => {
    setSelectedFontSize(sizePt);
    restoreSavedSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = sizePt;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(range);
    handleInput();
  };

  // Change Heading / Block Format
  const handleHeadingChange = (headingType: string) => {
    setSelectedHeading(headingType);
    if (headingType === 'p') {
      executeCommand('formatBlock', '<p>');
    } else {
      executeCommand('formatBlock', `<${headingType}>`);
    }
  };

  // Change Text Color
  const handleTextColorChange = (color: string) => {
    executeCommand('foreColor', color);
    setIsColorPickerOpen(false);
  };

  // Change Text Highlight Color (inline text marker)
  const handleHighlightColorChange = (color: string) => {
    if (color === 'transparent') {
      executeCommand('removeFormat');
    } else {
      executeCommand('hiliteColor', color);
    }
    setIsHighlightPickerOpen(false);
  };

  // Helper to find enclosing paragraph/heading block elements
  const getSelectedBlockElements = (): HTMLElement[] => {
    if (!editorRef.current) return [];
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);

    const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'LI', 'BLOCKQUOTE'];
    const findEnclosingBlock = (node: Node | null): HTMLElement | null => {
      let curr: Node | null = node;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeType === Node.ELEMENT_NODE && blockTags.includes((curr as HTMLElement).tagName)) {
          return curr as HTMLElement;
        }
        curr = curr.parentNode;
      }
      return null;
    };

    const startBlock = findEnclosingBlock(range.startContainer);
    const endBlock = findEnclosingBlock(range.endContainer);

    if (startBlock && endBlock && startBlock === endBlock) {
      return [startBlock];
    }

    const blocks: HTMLElement[] = [];
    if (startBlock) blocks.push(startBlock);

    // Multi-block selection traversal
    const allCandidateBlocks = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, li, blockquote');
    allCandidateBlocks.forEach((b) => {
      const el = b as HTMLElement;
      if (sel.containsNode(el, true) && !blocks.includes(el)) {
        blocks.push(el);
      }
    });

    if (endBlock && !blocks.includes(endBlock)) {
      blocks.push(endBlock);
    }

    if (blocks.length === 0 && sel.anchorNode) {
      const fallback = findEnclosingBlock(sel.anchorNode);
      if (fallback) blocks.push(fallback);
    }

    return blocks;
  };

  // Change Paragraph / Full-Line Background Color (fills 100% of the line within A4 margins)
  const handleParagraphBackgroundChange = (color: string) => {
    restoreSavedSelection();
    let blocks = getSelectedBlockElements();

    if (blocks.length === 0 && editorRef.current) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode && sel.anchorNode !== editorRef.current) {
        let node: Node | null = sel.anchorNode;
        while (node && node.parentNode !== editorRef.current) {
          node = node.parentNode;
        }
        if (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            blocks = [node as HTMLElement];
          } else if (node.nodeType === Node.TEXT_NODE) {
            const p = document.createElement('p');
            node.parentNode?.insertBefore(p, node);
            p.appendChild(node);
            blocks = [p];
          }
        }
      }
    }

    if (blocks.length === 0 && editorRef.current) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      editorRef.current.appendChild(p);
      blocks = [p];
    }

    blocks.forEach((block) => {
      if (color === 'transparent' || color === 'none') {
        block.style.backgroundColor = '';
        block.style.padding = '';
        block.style.borderRadius = '';
        block.style.boxSizing = '';
        block.style.width = '';
        block.style.display = '';
      } else {
        block.style.backgroundColor = color;
        block.style.padding = '6px 12px';
        block.style.borderRadius = '4px';
        block.style.boxSizing = 'border-box';
        block.style.width = '100%';
        block.style.display = 'block';
      }
    });

    setIsParagraphBgPickerOpen(false);
    handleInput();
  };

  // Change Line Spacing
  const handleLineSpacingChange = (spacing: string) => {
    setLineSpacing(spacing);
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (['P', 'H1', 'H2', 'H3', 'H4', 'DIV', 'LI'].includes(el.tagName)) {
              el.style.lineHeight = spacing;
              break;
            }
          }
          node = node.parentNode;
        }
      }
      handleInput();
    }
  };

  // Insert Dynamic Tag at cursor position
  const handleInsertTag = (tagId: string) => {
    restoreSavedSelection();
    const tagText = `{{${tagId}}}`;
    executeCommand('insertText', tagText);
    setIsTagDropdownOpen(false);
    setTagSearch('');
  };

  const filteredFields = availableFields.filter(
    (f) =>
      f.id.toLowerCase().includes(tagSearch.toLowerCase()) ||
      f.label.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div id={id} className="flex flex-col w-full bg-slate-100 border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
      {/* 1. TOP TOOLBAR */}
      {!readOnly && (
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1.5 sticky top-0 z-20 shadow-2xs select-none">
          {/* Heading / Style Selector */}
          <div className="flex items-center">
            <select
              value={selectedHeading}
              onChange={(e) => handleHeadingChange(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
              title="Estilo de Título / Parágrafo"
            >
              <option value="p">Texto Normal</option>
              <option value="h1">Título Principal (H1)</option>
              <option value="h2">Subtítulo (H2)</option>
              <option value="h3">Título de Seção (H3)</option>
            </select>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Font Family Selector */}
          <div className="flex items-center">
            <select
              value={selectedFont}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="text-xs font-medium px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500 max-w-[130px]"
              title="Tipo da Fonte"
            >
              {fontFamilies.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center">
            <select
              value={selectedFontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className="text-xs font-medium px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500 w-[72px]"
              title="Tamanho da Fonte"
            >
              {fontSizes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Text Style Buttons: Bold, Italic, Underline, Strikethrough */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={handleBold}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Negrito (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleItalic}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Itálico (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleUnderline}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Sublinhado (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleStrikethrough}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Tachado"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Color and Highlight Pickers */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => {
                saveCurrentSelection();
                setIsColorPickerOpen(!isColorPickerOpen);
                setIsHighlightPickerOpen(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              title="Cor do Texto"
            >
              <Palette className="w-3.5 h-3.5 text-slate-800" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white shadow-2xs"></span>
            </button>

            {isColorPickerOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-30 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1 block">Cor do Texto</span>
                <div className="grid grid-cols-4 gap-1.5 p-1">
                  {textColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleTextColorChange(c.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => {
                saveCurrentSelection();
                setIsHighlightPickerOpen(!isHighlightPickerOpen);
                setIsColorPickerOpen(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              title="Destaque de Texto (Marca-texto)"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            </button>

            {isHighlightPickerOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-30 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1 block">Destaque de Letras</span>
                <div className="grid grid-cols-3 gap-1.5 p-1">
                  {highlightColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleHighlightColorChange(c.value)}
                      className="h-7 rounded-md border border-slate-300 shadow-2xs flex items-center justify-center text-[10px] font-bold text-slate-700 hover:scale-105 transition-transform cursor-pointer"
                      style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
                      title={c.label}
                    >
                      {c.value === 'transparent' ? 'Nenhum' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. PARAGRAPH / FULL-LINE BACKGROUND (Fundo da Linha / Parágrafo) */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => {
                saveCurrentSelection();
                setIsParagraphBgPickerOpen(!isParagraphBgPickerOpen);
                setIsHighlightPickerOpen(false);
                setIsColorPickerOpen(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer bg-slate-50/60 transition-colors"
              title="Fundo da Linha / Parágrafo (Preenchimento 100% da Linha no A4)"
            >
              <PaintBucket className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-slate-700">Fundo Linha</span>
            </button>

            {isParagraphBgPickerOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-30 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <PaintBucket className="w-3 h-3 text-indigo-600" />
                    Fundo da Linha / Parágrafo
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Preenche toda a largura útil da linha/parágrafo no A4 (ótimo para faixas e títulos de seção).
                </p>

                <div className="grid grid-cols-3 gap-1.5">
                  {paragraphBgColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleParagraphBackgroundChange(c.value)}
                      className={`h-7 px-1 rounded-md border border-slate-300 shadow-2xs flex items-center justify-center text-[10px] font-medium hover:scale-105 transition-transform cursor-pointer truncate ${
                        c.value === 'transparent'
                          ? 'bg-white text-slate-700 border-dashed'
                          : ['#1e293b', '#0f172a', '#1e40af', '#581c87', '#15803d', '#991b1b'].includes(c.value)
                          ? 'text-white font-semibold'
                          : 'text-slate-800'
                      }`}
                      style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
                      title={c.label}
                    >
                      {c.value === 'transparent' ? 'Sem Fundo' : c.label}
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-600 font-medium">Cor personalizada:</span>
                  <input
                    type="color"
                    onChange={(e) => handleParagraphBackgroundChange(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                    title="Escolher qualquer cor personalizada"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Alignment Buttons */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={handleAlignLeft}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Alinhar à Esquerda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAlignCenter}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Centralizar"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAlignRight}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Alinhar à Direita"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAlignJustify}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Justificar"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Line spacing & Indent */}
          <div className="flex items-center gap-1">
            <select
              value={lineSpacing}
              onChange={(e) => handleLineSpacingChange(e.target.value)}
              className="text-xs px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-pointer focus:outline-none"
              title="Espaçamento entre Linhas"
            >
              <option value="1.0">Linhas 1.0 (Simples)</option>
              <option value="1.15">Linhas 1.15</option>
              <option value="1.5">Linhas 1.5</option>
              <option value="2.0">Linhas 2.0 (Duplo)</option>
            </select>

            <button
              type="button"
              onClick={handleOutdent}
              className="p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              title="Diminuir Recuo"
            >
              <Outdent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleIndent}
              className="p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              title="Aumentar Recuo"
            >
              <Indent className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Lists */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={handleBulletList}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Lista com Marcadores"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNumberedList}
              className="p-1.5 text-slate-700 hover:text-violet-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Lista Numerada"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Basic Elements: Divider, Line Break, Page Break */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleHorizontalRule}
              className="p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1 text-xs"
              title="Inserir Linha Divisória Horizontal"
            >
              <Minus className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium hidden sm:inline">Linha</span>
            </button>
            <button
              type="button"
              onClick={handlePageBreak}
              className="p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1 text-xs"
              title="Inserir Quebra de Página A4"
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-medium hidden sm:inline">Quebra Pág.</span>
            </button>
          </div>

          {/* Dynamic Tags Menu */}
          {availableFields.length > 0 && (
            <div className="relative inline-block ml-auto">
              <button
                type="button"
                onClick={() => {
                  saveCurrentSelection();
                  setIsTagDropdownOpen(!isTagDropdownOpen);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Inserir Tag Dinâmica do Documento no Cursor"
              >
                <Tag className="w-3.5 h-3.5 text-violet-700" />
                <span>Inserir Campo</span>
              </button>

              {isTagDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-violet-200 rounded-xl shadow-xl p-2.5 z-40 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-800">Campos do Documento</span>
                    <span className="text-[10px] text-slate-400">Clique para inserir</span>
                  </div>

                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Filtrar campos..."
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none"
                    autoFocus
                  />

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredFields.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-2 text-center">Nenhum campo encontrado</p>
                    ) : (
                      filteredFields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleInsertTag(f.id)}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-violet-50 hover:text-violet-900 text-xs flex items-center justify-between group transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800 group-hover:text-violet-900">{f.label}</span>
                          <span className="font-mono text-[10px] text-violet-600 bg-violet-50 px-1 py-0.5 rounded">
                            &#123;&#123;{f.id}&#125;&#125;
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. A4 VISUAL SHEET WORKSPACE */}
      <div
        className="w-full bg-slate-200/80 p-4 sm:p-8 flex justify-center items-start overflow-x-auto min-h-[500px]"
        onClick={() => {
          setIsColorPickerOpen(false);
          setIsHighlightPickerOpen(false);
          setIsTagDropdownOpen(false);
        }}
      >
        {/* The Realistic A4 Sheet container */}
        <div
          className="bg-white text-slate-900 shadow-xl border border-slate-300 rounded-sm relative flex flex-col transition-all"
          style={{
            width: '794px', // Standard A4 width in pixels at 96 DPI
            minHeight: minHeight || '1123px', // Standard A4 height in pixels at 96 DPI
            maxWidth: '100%',
            padding: '56px 48px', // ~20mm margins
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle A4 Header Watermark / Indicator */}
          <div className="text-[10px] font-sans text-slate-300 uppercase tracking-widest text-right mb-4 select-none pointer-events-none pb-2 border-b border-slate-100">
            Folha A4 (210 x 297 mm) • Margens Padrão (20mm)
          </div>

          {/* Editable Document Surface */}
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            onBlur={() => {
              saveCurrentSelection();
              handleInput();
            }}
            onKeyUp={() => {
              saveCurrentSelection();
              handleInput();
            }}
            onMouseUp={saveCurrentSelection}
            data-placeholder={placeholder}
            className="outline-none flex-1 text-[12pt] leading-relaxed text-slate-900 font-sans cursor-text selection:bg-violet-100 selection:text-violet-900"
            style={{
              fontFamily: selectedFont,
              lineHeight: lineSpacing,
            }}
          />

          {/* Subtle A4 Footer Watermark */}
          <div className="text-[9px] font-sans text-slate-300 text-center mt-8 pt-4 border-t border-slate-100 select-none pointer-events-none">
            Documento formatado visualmente no padrão A4
          </div>
        </div>
      </div>
    </div>
  );
};

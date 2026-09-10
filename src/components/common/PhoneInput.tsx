import React, { useCallback } from 'react';
import { Phone } from 'lucide-react';
import { extractPhoneDigits, maskPhone } from '../../utils/formatters';

export interface PhoneInputProps {
  id?: string;
  name?: string;
  value: string | undefined | null;
  onChange: (value: string, rawDigits: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
  maxLength?: number;
}

/**
 * Componente unificado e inteligente para campos de Telefone/Celular/WhatsApp.
 * - Aceita estritamente números de 0 a 9.
 * - Aplica máscara automática brasileira progressiva ((DD) XXXXX-XXXX ou (DD) XXXX-XXXX).
 * - Remove automaticamente caracteres inválidos e trata DDI (+55) ao colar.
 * - Suporta inicialização com dígitos puros ou formatados vindos do banco/API.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = '(11) 99999-9999',
  required = false,
  disabled = false,
  autoFocus = false,
  className,
  showIcon = false,
  iconClassName = 'w-4 h-4 text-slate-400',
  maxLength = 15,
}) => {
  // Garante que o valor exibido sempre reflita a máscara correta
  const displayValue = maskPhone(value);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const digits = extractPhoneDigits(rawInput);
      const masked = maskPhone(digits);
      onChange(masked, digits);
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const digits = extractPhoneDigits(pastedText);
      const masked = maskPhone(digits);
      onChange(masked, digits);
    },
    [onChange]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de navegação, exclusão e atalhos (Ctrl/Cmd + C, V, A, Z)
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Bloquear qualquer caractere que não seja número de 0 a 9
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  const defaultClasses =
    'w-full px-3.5 py-2 text-xs sm:text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-medium';

  const inputElement = (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      id={id}
      name={name}
      value={displayValue}
      onChange={handleInputChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      maxLength={maxLength}
      className={className || defaultClasses}
    />
  );

  if (showIcon) {
    return (
      <div className="relative">
        <Phone className={`${iconClassName} absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none`} />
        <div className="[&>input]:pl-9.5">{inputElement}</div>
      </div>
    );
  }

  return inputElement;
};

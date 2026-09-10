export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00%';
  }
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDocument(doc: string | undefined | null): string {
  if (!doc) return '-';
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

/**
 * Extrai os dígitos brasileiros de um telefone, tratando DDI +55, prefixo 0 ou caracteres especiais.
 * Remove quaisquer caracteres que não sejam números (0 a 9).
 */
export function extractPhoneDigits(value: string | undefined | null): string {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');

  // Se veio com DDI +55 e tem 12 ou 13 dígitos, remove o 55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  // Se veio com 0 antes do DDD (ex: 031999999999 ou 03133334444)
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }

  // Limita ao tamanho máximo do padrão brasileiro (11 dígitos = DDD + 9 dígitos)
  return digits.slice(0, 11);
}

/**
 * Normaliza o telefone para comparação, unicidade e armazenamento (somente dígitos).
 */
export function normalizePhone(phone: string | undefined | null): string {
  return extractPhoneDigits(phone);
}

/**
 * Aplica máscara de telefone brasileiro automática à medida que o usuário digita ou cola.
 * Formato celular (11 dígitos): (DD) XXXXX-XXXX
 * Formato fixo (10 dígitos): (DD) XXXX-XXXX
 */
export function maskPhone(value: string | undefined | null): string {
  const digits = extractPhoneDigits(value);
  if (!digits || digits.length === 0) return '';
  
  if (digits.length === 1) {
    return `(${digits}`;
  }
  if (digits.length === 2) {
    return `(${digits}) `;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validação de telefone brasileiro (retorna true se vazio quando opcional, ou se tiver 10 ou 11 dígitos com DDD válido).
 */
export function isValidPhone(phone: string | undefined | null, required = false): boolean {
  const digits = extractPhoneDigits(phone);
  if (!digits) return !required;
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) return false;
  return true;
}

/**
 * Formata um telefone existente para exibição padrão brasileira (DDD) XXXXX-XXXX ou (DDD) XXXX-XXXX
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const clean = extractPhoneDigits(phone);
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length > 0) {
    return maskPhone(clean);
  }
  return phone;
}

export function formatWhatsAppLink(phone: string, message?: string): string {
  const cleanPhone = extractPhoneDigits(phone);
  if (!cleanPhone) return '#';
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedMsg = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${finalPhone}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
}


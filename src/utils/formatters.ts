export function formatPoints(points: number): string {
  return `${points.toLocaleString('pt-BR')} pts`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Relação oficial vigente dos 67 DDDs brasileiros segundo a ANATEL.
 */
export const VALID_BRAZILIAN_DDDS: ReadonlySet<string> = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export function normalizeBrazilianPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

export function validateBrazilianPhone(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const digits = normalizeBrazilianPhoneDigits(raw);
  if (!digits) {
    return {
      valid: false,
      normalized: '',
      error: 'Informe seu telefone ou WhatsApp com DDD.',
    };
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return {
      valid: false,
      normalized: digits,
      error: 'Informe um telefone brasileiro válido com DDD (10 dígitos para fixo ou 11 para celular).',
    };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      error: 'Número de telefone inválido.',
    };
  }
  if (!VALID_BRAZILIAN_DDDS.has(digits.slice(0, 2))) {
    return {
      valid: false,
      normalized: digits,
      error: 'DDD inválido. Informe um DDD brasileiro válido.',
    };
  }
  if (digits.length === 11 && digits[2] !== '9') {
    return {
      valid: false,
      normalized: digits,
      error: 'Números de celular com 11 dígitos devem começar com 9 após o DDD.',
    };
  }
  if (digits.length === 10 && !/[2-5]/.test(digits[2])) {
    return {
      valid: false,
      normalized: digits,
      error: 'Número de telefone fixo inválido após o DDD.',
    };
  }
  return { valid: true, normalized: digits };
}

export function maskBrazilianPhoneInput(raw: string): string {
  const digits = normalizeBrazilianPhoneDigits(raw).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatBrazilianPhone(value?: string | null): string {
  if (!value) return '';
  return maskBrazilianPhoneInput(value);
}

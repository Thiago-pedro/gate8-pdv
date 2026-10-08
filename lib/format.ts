export function formatEventDate(value: string | null) {
  if (!value) return 'Data a definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data a definir';
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatEventDateTime(value: string | null) {
  if (!value) return 'Data a definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data a definir';
  const day = date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} · ${time}`;
}

export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatMoneyInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value === 0) return '';
  const negative = value < 0;
  const cents = Math.round(Math.abs(value) * 100);
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole},${frac}`;
}

export function sanitizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);
  if (decimalAt < 0) return cleaned;
  const intPart = cleaned.slice(0, decimalAt).replace(/[.,]/g, '');
  const frac = cleaned.slice(decimalAt + 1).replace(/[.,]/g, '').slice(0, 2);
  return `${intPart}${cleaned[decimalAt]}${frac}`;
}

export function parseMoneyInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ',' || trimmed === '.') return 0;
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized = trimmed;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(',', '.');
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function formatDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCheckinAt(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatted.replace(',', '');
}

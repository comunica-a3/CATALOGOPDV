/**
 * Utilitário de detecção de ambiente para diferenciar o servidor local do ERP
 * (localhost / rede local com Node + Express + SQLite) da vitrine estática
 * publicada no GitHub Pages (ex.: *.github.io, dumorro.com).
 */
export function isStaticCatalogOnlyHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  if (!host) return false;

  const isLocalOrLan =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host);

  return !isLocalOrLan;
}

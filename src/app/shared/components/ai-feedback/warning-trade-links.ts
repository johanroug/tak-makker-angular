import { COMPANY_TRADES } from '../../../core/company/company-trades';

export function warningTradeParts(warning: string): { text: string; link: boolean }[] {
  const names = COMPANY_TRADES.join('|');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${names})(?:(?:\\s*,\\s*|\\s+og\\s+)(?:${names}))*(?![\\p{L}\\p{N}])`, 'giu');
  const parts: { text: string; link: boolean }[] = [];
  let position = 0;
  for (const match of warning.matchAll(pattern)) {
    if (match.index > position) parts.push({ text: warning.slice(position, match.index), link: false });
    parts.push({ text: match[0], link: true });
    position = match.index + match[0].length;
  }
  if (position < warning.length) parts.push({ text: warning.slice(position), link: false });
  return parts;
}

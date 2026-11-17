// Match structured provider codes only. A bare HTTP 429 also covers normal
// request/token rate limiting and must not be presented as exhausted credit.
const spendingCodes = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
]);

export function isOpenAiBudgetError(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const root = value as Record<string, unknown>;
  const details = root.error && typeof root.error === 'object'
    ? root.error as Record<string, unknown> : root;
  // The SDK exposes code/type directly; fetch returns { error: { code, type } }.
  const code = root.code ?? details.code;
  const type = root.type ?? details.type;
  if (typeof code === 'string' && spendingCodes.has(code)) return true;
  if (code === 'rate_limit_exceeded' || code === 'slow_down') return false;
  return type === 'insufficient_quota';
}

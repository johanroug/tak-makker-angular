// Conservative micro-DKK accounting: USD/DKK 8, no cache discount.
// Luna: long-context/cache-write maximum input rate + 10% regional premium;
// output includes reasoning. 3 DKK covers the documented model context/output.
export const OFFER_MODEL = 'gpt-6-luna';
export const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
export const BUDGET_MESSAGE = 'AI er midlertidigt sat på pause. Prøv igen senere.';

type Client = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };
export class AiBudgetError extends Error {}

export class AiBudget {
  private id: string | undefined;
  private dispatched = false;
  private client: Client;
  constructor(client: Client) { this.client = client; }

  async reserve(kind: 'offer' | 'transcription'): Promise<void> {
    try {
      const { data, error } = await this.client.rpc('reserve_global_ai_budget', { p_kind: kind });
      if (error || data?.allowed !== true || typeof data.requestId !== 'string') throw new AiBudgetError(BUDGET_MESSAGE);
      this.id = data.requestId;
    } catch { throw new AiBudgetError(BUDGET_MESSAGE); }
  }

  start(): void { this.dispatched = true; }

  async record(kind: 'offer' | 'transcription', usage: { input_tokens?: number; output_tokens?: number } | undefined): Promise<void> {
    const input = usage?.input_tokens;
    const output = usage?.output_tokens;
    // Unknown usage is never treated as free, including timeouts and parse errors.
    if (typeof input !== 'number' || typeof output !== 'number' ||
        !Number.isSafeInteger(input) || !Number.isSafeInteger(output) || input < 0 || output < 0) return;
    const amount = Math.ceil(kind === 'offer'
      ? input * 2.2 + output * 6.6
      : (input + output) * 44);
    if (!Number.isSafeInteger(amount)) return;
    await this.settle(amount);
  }

  async releaseUnsent(): Promise<void> {
    if (this.id && !this.dispatched) await this.settle(0);
  }

  private async settle(amount: number): Promise<void> {
    if (!this.id) return;
    try {
      const { error } = await this.client.rpc('settle_global_ai_budget', { p_request_id: this.id, p_amount: amount });
      if (!error) this.id = undefined;
      else console.error('Could not settle global AI budget; reservation retained');
    } catch { console.error('Could not settle global AI budget; reservation retained'); }
  }
}

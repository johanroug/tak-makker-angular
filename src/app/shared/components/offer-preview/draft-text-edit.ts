export type DraftTextEdit = { id: string; value: string; save: boolean } & (
  | { kind: 'work'; field: 'trade' | 'description' | 'hours' }
  | { kind: 'material'; field: 'name' | 'quantity' | 'unit' | 'unitPrice' }
);

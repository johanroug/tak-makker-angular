export type DraftTextEdit = { id: string; value: string; save: boolean } & (
  | { kind: 'work'; field: 'trade' | 'description' }
  | { kind: 'material'; field: 'name' | 'description' }
);

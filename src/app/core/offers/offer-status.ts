export const OFFER_STATUSES = [
  { value: 'finalized', label: 'Færdiggjort' },
  { value: 'sent', label: 'Sendt' },
  { value: 'accepted', label: 'Accepteret' },
  { value: 'rejected', label: 'Afvist' },
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number]['value'];

export function offerStatusLabel(status: string): string {
  return OFFER_STATUSES.find((option) => option.value === status)?.label ?? 'Ukendt status';
}

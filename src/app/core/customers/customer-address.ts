export function customerAddress(customer: { address: string; postal_code?: string; city?: string }): string {
  return [customer.address, [customer.postal_code, customer.city].filter(Boolean).join(' ')].filter(Boolean).join('\n');
}

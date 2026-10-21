export function formatMoney(cents: number, currency = 'TZS') {
  const major = cents / 100;
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(major);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

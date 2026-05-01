export function formatVnd(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

export function formatDate(value: string | Date | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN');
}

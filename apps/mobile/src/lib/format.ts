/** Formatting helpers shared by listings, chat and profile surfaces. */

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

export function formatCompactPrice(value: number): string {
  // Hermes' Intl compact notation is inconsistent for en-IN, so use the
  // lakh/crore units the audience reads natively.
  if (value >= 10_000_000) {
    const crores = value / 10_000_000;
    return `₹${Number.isInteger(crores) ? crores : crores.toFixed(1)}Cr`;
  }
  if (value >= 100_000) {
    const lakhs = value / 100_000;
    return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatPricePerAcre(price: number, areaAcres: number): string | null {
  if (!Number.isFinite(price) || !Number.isFinite(areaAcres) || areaAcres <= 0) {
    return null;
  }
  return `${formatCompactPrice(Math.round(price / areaAcres))}/acre`;
}

export function formatListedShort(iso: string): string {
  const label = formatListedAt(iso).replace(/^Listed /, '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatArea(areaAcres: number): string {
  const value = Number.isInteger(areaAcres) ? String(areaAcres) : areaAcres.toFixed(1);
  return `${value} ${areaAcres === 1 ? 'acre' : 'acres'}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatConversationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (dayDiff <= 0) return formatTime(iso);
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export function formatListedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (dayDiff <= 0) return 'Listed today';
  if (dayDiff === 1) return 'Listed yesterday';
  if (dayDiff < 30) return `Listed ${dayDiff} days ago`;
  return `Listed ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'SELLER':
      return 'Seller';
    case 'BROKER':
      return 'Broker';
    default:
      return 'Buyer';
  }
}

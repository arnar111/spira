import type { Grow } from '@/lib/db';

/** Stutt íslensk afstæð tímasetning fyrir nýjustu umhverfismælingu (1.4). */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'núna';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `fyrir ${mins} mín`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `fyrir ${hours} klst`;
  const days = Math.floor(hours / 24);
  return `fyrir ${days} d`;
}

export function categoryLabel(c: Grow['category']): string {
  switch (c) {
    case 'pepper':
      return 'Pipur';
    case 'tomato':
      return 'Tómatar';
    case 'strawberry':
      return 'Jarðarber';
    case 'potato':
      return 'Kartöflur';
    case 'herb':
      return 'Krydd';
    case 'leafy':
      return 'Salat';
    case 'fruit':
      return 'Ávextir';
    case 'houseplant':
      return 'Pottaplanta';
    default:
      return 'Annað';
  }
}

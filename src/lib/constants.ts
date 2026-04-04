export const KUWAIT_AREAS = [
  'Salmiya', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Jahra',
  'Mubarak Al-Kabeer', 'Kuwait City', 'Rumaithiya', 'Mishref', 'Bayan',
] as const;

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90] as const;

export const HOUR_OPTIONS: string[] = [];
for (let h = 7; h <= 23; h++) {
  HOUR_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 23) HOUR_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`);
}

export const formatPrice = (price: number): string => `${price.toFixed(3)} KD`;

export const maskPhone = (phone: string): string => {
  if (phone.length < 8) return phone;
  return phone.slice(0, 7) + 'XXXXX' + phone.slice(-3);
};

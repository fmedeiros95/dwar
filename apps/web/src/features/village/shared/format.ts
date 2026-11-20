export const numbers = new Intl.NumberFormat('pt-BR');
export const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const shortTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
export const resources = [
  { code: 'wood', name: 'Madeira' },
  { code: 'stone', name: 'Argila' },
  { code: 'iron', name: 'Ferro' },
] as const;
export function duration(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 3600)}:${Math.floor((value % 3600) / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
export function completionDate(value: string, now: number): string {
  const date = new Date(value),
    today = new Date(now),
    tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sameDay = (other: Date) =>
    date.getFullYear() === other.getFullYear() &&
    date.getMonth() === other.getMonth() &&
    date.getDate() === other.getDate();
  return `${sameDay(today) ? 'hoje' : sameDay(tomorrow) ? 'amanhã' : shortDate.format(date)} às ${shortTime.format(date)}`;
}

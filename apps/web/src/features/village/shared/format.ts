export const numbers = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
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
/** Como `completionDate`, com segundos: em ordens e batalhas, segundos separam uma da outra. */
export function arrivalDate(value: string, now: number): string {
  return completionDate(value, now).replace(/\d{2}:\d{2}$/, timeFormat.format(new Date(value)));
}
/** Resultado de uma batalha nas palavras de quem defendeu a aldeia. */
export const defenseOutcome = {
  won: 'Sua aldeia resistiu',
  lost: 'Defesa perdida',
  draw: 'Empate',
} as const;

/** Velocidade guardada em milésimos (1200 = 1,2×), do jeito que o jogador lê. */
export const speedLabel = (thousandths: number) =>
  `${(thousandths / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×`;

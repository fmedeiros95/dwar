/** Noite do jogo: das 20h às 8h (horário de Brasília), como no Speed Wars. */
export const nightHours = { start: 20, end: 8 } as const;

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  timeZone: 'America/Sao_Paulo',
});

/** Diz se é noite no mundo no instante dado (Date ou epoch em ms). */
export function isNight(now: Date | number = new Date()): boolean {
  const hour = Number(hourFormat.format(now)) % 24;
  return hour >= nightHours.start || hour < nightHours.end;
}

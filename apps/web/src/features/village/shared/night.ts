/** Noite do jogo: das 20h às 8h (horário de Brasília), como no Speed Wars. */
export const nightHours = { start: 20, end: 8 } as const;

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  timeZone: 'America/Sao_Paulo',
});

function hourOf(now: Date | number): number {
  return Number(hourFormat.format(now)) % 24;
}

/** Diz se é noite no mundo no instante dado (Date ou epoch em ms). */
export function isNight(now: Date | number = new Date()): boolean {
  const hour = hourOf(now);
  return hour >= nightHours.start || hour < nightHours.end;
}

/**
 * Fase do dia usada só na ambientação do cenário: a primeira hora depois da noite é o
 * amanhecer e as três anteriores a ela, o entardecer. Não afeta nenhuma regra do jogo.
 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export function dayPhase(now: Date | number = new Date()): DayPhase {
  if (isNight(now)) return 'night';
  const hour = hourOf(now);
  if (hour === nightHours.end) return 'dawn';
  if (hour >= nightHours.start - 3) return 'dusk';
  return 'day';
}

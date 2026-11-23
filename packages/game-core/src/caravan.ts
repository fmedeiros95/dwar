import { resourceCodes, type Resources } from '@dwar/game-config';

/**
 * Partilha da Caravana: um divide a carga em duas carroças, o vizinho escolhe uma.
 * Abrir a carga custa: em cada recurso repartido, a parte menor paga um quarto de pedágio. Sem
 * isso, metade de tudo é segura e quase sempre a melhor resposta; com isso, arriscar rende.
 */
export const caravanRules = {
  tollPercent: 25,
  /** Cada carroça leva ao menos isto de algum recurso: sem diferença não há escolha. */
  leadPercent: 60,
  divideHours: 12,
  chooseHours: 12,
  /** Descanso entre o fim de uma partilha e a próxima caravana do mesmo jogador. */
  restHours: 20,
  /** Distância máxima, em campos, entre as aldeias que dividem uma caravana. */
  maxDistance: 20,
  /** Carga total em relação à capacidade (média geométrica) dos dois armazéns. */
  cargoShare: 0.6,
} as const;

export const caravanLots = ['sun', 'moon'] as const;
export type CaravanLot = (typeof caravanLots)[number];
export type CaravanLots = Record<CaravanLot, Resources>;

export const otherLot = (lot: CaravanLot): CaravanLot => (lot === 'sun' ? 'moon' : 'sun');
export const lotTotal = (lot: Resources) => lot.wood + lot.stone + lot.iron;

/** Pedágio de um recurso repartido em duas partes: incide só sobre a menor. */
export function caravanToll(a: number, b: number): number {
  return Math.floor((Math.min(a, b) * caravanRules.tollPercent) / 100);
}

/** As duas carroças já com o pedágio pago. Em partes iguais, paga a carroça da Lua. */
export function caravanSplit(cargo: Resources, sun: Resources): CaravanLots {
  const lots: CaravanLots = {
    sun: { wood: 0, stone: 0, iron: 0 },
    moon: { wood: 0, stone: 0, iron: 0 },
  };
  for (const code of resourceCodes) {
    const a = sun[code];
    const b = cargo[code] - a;
    const toll = caravanToll(a, b);
    lots.sun[code] = a < b ? a - toll : a;
    lots.moon[code] = a < b ? b : b - toll;
  }
  return lots;
}

/** Motivo para recusar a divisão, ou null se vale. */
export function caravanSplitError(cargo: Resources, sun: Resources): string | null {
  for (const code of resourceCodes)
    if (!Number.isSafeInteger(sun[code]) || sun[code] < 0 || sun[code] > cargo[code])
      return 'A divisão não fecha com a carga da caravana.';
  const leads = (part: (code: keyof Resources) => number) =>
    resourceCodes.some((code) => part(code) * 100 >= cargo[code] * caravanRules.leadPercent);
  if (!leads((code) => sun[code]) || !leads((code) => cargo[code] - sun[code]))
    return `Cada carroça precisa levar ao menos ${caravanRules.leadPercent}% de algum recurso.`;
  return null;
}

/**
 * Divisão do caravaneiro, quando quem divide não aparece: o recurso maior, inteiro, numa carroça e
 * o resto na outra. Não paga pedágio e o vizinho escolhe; quem faltou perdeu só o controle.
 */
export function caravanDefault(cargo: Resources): Resources {
  const top = resourceCodes.reduce((best, code) => (cargo[code] > cargo[best] ? code : best));
  return { wood: 0, stone: 0, iron: 0, [top]: cargo[top] };
}

/**
 * Carroça de quem deveria escolher e não apareceu: a que leva mais do recurso da sua flâmula;
 * sem flâmula (ou no empate), a mais pesada. A regra é pública antes da divisão.
 */
export function caravanAbsentChoice(lots: CaravanLots, banner: keyof Resources | null): CaravanLot {
  if (banner && lots.sun[banner] !== lots.moon[banner])
    return lots.sun[banner] > lots.moon[banner] ? 'sun' : 'moon';
  return lotTotal(lots.sun) >= lotTotal(lots.moon) ? 'sun' : 'moon';
}

/** Carga da caravana: proporção sorteada entre os recursos, tamanho ligado aos dois armazéns. */
export function caravanCargo(
  capacityA: number,
  capacityB: number,
  random: () => number,
): Resources {
  const total = Math.sqrt(capacityA * capacityB) * caravanRules.cargoShare;
  const shares = [0.46, 0.32, 0.22].map((share) => share * (0.85 + random() * 0.3));
  const sum = shares.reduce((a, b) => a + b, 0);
  const order = [...shares];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const amount = (index: number) =>
    Math.max(20, Math.round((total * order[index]!) / sum / 20) * 20);
  return { wood: amount(0), stone: amount(1), iron: amount(2) };
}

/** O que cabe no armazém agora; o resto espera na carroça. */
export function caravanUnload(stock: Resources, waiting: Resources, capacity: number) {
  const unloaded = { wood: 0, stone: 0, iron: 0 };
  const left = { ...waiting };
  for (const code of resourceCodes) {
    const room = Math.max(0, Math.floor(capacity - stock[code]));
    unloaded[code] = Math.min(room, waiting[code]);
    left[code] = waiting[code] - unloaded[code];
  }
  return { unloaded, left };
}

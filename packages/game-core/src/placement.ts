export type Coordinates = { x: number; y: number };
/** nw/ne/se/sw: noroeste, nordeste, sudeste e sudoeste a partir do centro do mundo (500|500). */
export const quadrants = ['ne', 'nw', 'se', 'sw'] as const;
export type Quadrant = (typeof quadrants)[number];
/** Estado de um quadrante: aldeias criadas, raio-base do anel atual e ângulo do último ponto. */
export type QuadrantState = { count: number; ring: number; alpha: number };
export type Placement = Record<Quadrant, QuadrantState>;
export type PlacementStream = 'player' | 'barbarian';
export const worldCenter = 500;

export const initialPlacement = (): Placement => ({
  ne: { count: 0, ring: 1, alpha: 0 },
  nw: { count: 0, ring: 1, alpha: 0 },
  se: { count: 0, ring: 1, alpha: 0 },
  sw: { count: 0, ring: 1, alpha: 0 },
});

/** Em que quadrante do mundo cai um ponto (os eixos pertencem ao norte/leste). */
export function quadrantOf(point: Coordinates): Quadrant {
  const north = point.y >= worldCenter,
    east = point.x >= worldCenter;
  return north ? (east ? 'ne' : 'nw') : east ? 'se' : 'sw';
}

/**
 * Posiciona uma aldeia nova em espiral, como o create_village do Speed Wars: cada quadrante
 * tem um anel de raio crescente e um ângulo que avança a cada aldeia; jogadores vão para o
 * quadrante com menos aldeias (equilíbrio) e as bárbaras, para um quadrante qualquer.
 * Se o ponto estiver ocupado, o ângulo continua avançando e os anéis crescem até achar um livre.
 */
export function placeVillage(
  state: Placement,
  occupied: ReadonlySet<string>,
  stream: PlacementStream,
  randomInteger: (minimum: number, maximumInclusive: number) => number,
): { point: Coordinates; quadrant: Quadrant; state: Placement } {
  const next: Placement = {
    ne: { ...state.ne },
    nw: { ...state.nw },
    se: { ...state.se },
    sw: { ...state.sw },
  };
  // jogadores: o quadrante menos povoado (empate: ne, nw, se, sw); bárbaras: sorteio
  const quadrant: Quadrant =
    stream === 'player'
      ? quadrants.reduce((best, item) => (next[item].count < next[best].count ? item : best))
      : quadrants[randomInteger(0, 3)]!;
  const chosen = next[quadrant];
  let alpha = chosen.alpha;
  let wrapped = false;
  for (let attempt = 0; attempt < 20000; attempt += 1) {
    const longest = Math.max(...quadrants.map((item) => next[item].ring));
    const half = Math.round((longest - chosen.ring) / 2);
    const radius = randomInteger(chosen.ring, longest - half);
    alpha += (90 / chosen.ring) * (randomInteger(130, 250) / 100);
    if (alpha >= 90) {
      chosen.alpha = randomInteger(1, 25);
      wrapped = true;
      chosen.ring += randomInteger(1, 3);
      alpha = chosen.alpha;
    } else wrapped = false;
    const angle = (alpha * 2 * Math.PI) / 360;
    const dx = Math.ceil(Math.sin(angle) * radius),
      dy = Math.ceil(Math.cos(angle) * radius);
    const point = {
      x: worldCenter + (quadrant === 'nw' || quadrant === 'sw' ? -dx : dx),
      y: worldCenter + (quadrant === 'sw' || quadrant === 'se' ? -dy : dy),
    };
    if (point.x < 0 || point.x > 999 || point.y < 0 || point.y > 999) continue;
    if (occupied.has(`${point.x},${point.y}`)) continue;
    chosen.alpha = wrapped ? 0 : Math.min(89, Math.round(alpha));
    chosen.count += 1;
    return { point, quadrant, state: next };
  }
  throw new Error('Não há espaço livre para posicionar uma nova aldeia.');
}

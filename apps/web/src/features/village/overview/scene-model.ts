import positions from './tribul-positions.json';
import manifest from './tribul-manifest.json';

export type SceneTheme = 'summer' | 'winter' | 'halloween';
export const sceneThemes: { code: SceneTheme; label: string }[] = [
  { code: 'summer', label: 'Verão' },
  { code: 'winter', label: 'Inverno' },
  { code: 'halloween', label: 'Halloween' },
];

export const sceneSize = positions.scene;

/** Código de edifício do DWar -> id da arte (pasta em public/game/buildings). */
export const buildingArtId: Record<string, number> = {
  main: 1,
  house: 2,
  place: 3,
  storage: 4,
  stone: 5,
  wood: 6,
  iron: 7,
  farm: 8,
  mill: 9,
  treasury: 10,
  smith: 11,
  hide: 12,
  market: 13,
  barracks: 14,
  stable: 15,
  wall: 16,
  workshop: 17,
  noble: 18,
};

type Rect = { left?: number; top?: number; width: number; height: number; z?: number };
type Slot = { container?: Rect; sprite?: Rect; road?: Rect; hit?: Rect };
type ManifestEntry = {
  tiers: number[];
  road: boolean;
  roadWinter: boolean;
  phases: number[];
  winter: boolean;
  halloween: boolean;
};

const slots = positions.buildings as Record<string, Record<string, Slot>>;
const labels = positions.labels as unknown as Record<
  string,
  { left?: number; top?: number } | undefined
>;
const art = manifest.buildings as Record<string, ManifestEntry>;

/** Escolhe o nível de arte (1..N) distribuindo os níveis do jogo entre as artes disponíveis. */
export function artTier(artId: number, level: number, maxLevel: number): number {
  const tiers = art[artId]?.tiers.length ?? 1;
  if (level <= 1 || tiers <= 1) return 1;
  const progress = (level - 1) / Math.max(1, maxLevel - 1);
  return Math.min(tiers, 1 + Math.ceil(progress * (tiers - 1) - 1e-9));
}

export function phaseFor(artId: number, progress: number): number | null {
  const phases = art[artId]?.phases ?? [];
  if (!phases.length) return null;
  const wanted = progress <= 0.34 ? 25 : progress <= 0.67 ? 50 : 75;
  return phases.includes(wanted) ? wanted : (phases.at(-1) ?? null);
}

function suffix(theme: SceneTheme, artId: number, kind: 'sprite' | 'road'): string {
  const entry = art[artId];
  if (!entry) return '';
  if (theme === 'winter' && (kind === 'sprite' ? entry.winter : entry.roadWinter)) return '-winter';
  return '';
}

export function spriteUrl(
  artId: number,
  tier: number,
  theme: SceneTheme,
  phase: number | null,
): string {
  const entry = art[artId];
  if (theme === 'halloween' && entry?.halloween && tier === 1 && phase === null)
    return `/game/buildings/${artId}/${artId}_1-halloween-theme.webp`;
  const phasePart = phase ? `-${phase}` : '';
  return `/game/buildings/${artId}/${artId}_${tier}${phasePart}${suffix(theme, artId, 'sprite')}.webp`;
}

export function roadUrl(artId: number, theme: SceneTheme): string | null {
  const entry = art[artId];
  if (!entry?.road) return null;
  return `/game/buildings/${artId}/${artId}_road${suffix(theme, artId, 'road')}.webp`;
}

export function backingUrl(theme: SceneTheme): string {
  return `/game/town/backing${theme === 'summer' ? '' : `-${theme}`}.webp`;
}

export type PlacedBuilding = {
  code: string;
  artId: number;
  tier: number;
  slot: Slot;
  label: { left: number; top: number } | null;
};

/** Posição de um edifício no cenário, ou null se não há arte/posição para ele. */
export function placeBuilding(
  code: string,
  level: number,
  maxLevel: number,
): PlacedBuilding | null {
  const artId = buildingArtId[code];
  if (!artId || !art[artId]) return null;
  const tier = artTier(artId, level, maxLevel);
  const slot = slots[String(artId)]?.[String(tier)];
  if (!slot?.container) return null;
  const label = labels[String(artId)];
  return {
    code,
    artId,
    tier,
    slot,
    label:
      label?.left !== undefined && label.top !== undefined
        ? { left: label.left, top: label.top }
        : null,
  };
}

export const sceneArtReady = (code: string) => Boolean(buildingArtId[code]);

/** Miniatura do edifício (150x150, com transparência); cai no ícone antigo se não houver arte. */
export function buildingThumb(code: string): string {
  const artId = buildingArtId[code];
  return artId && art[artId] ? `/game/buildings/${artId}/thumb.webp` : `/legacy/build/${code}.jpg`;
}

import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { currentResources, type Have } from '../shared/current-resources.js';
import { resources } from '../shared/format.js';
import type { CrestState } from '../overview/village-scene.js';

type ResourceCode = (typeof resources)[number]['code'];

/** Tudo o que a decisão "qual obra agora?" precisa, já calculado para o próximo nível. */
export type ObraPlan = {
  building: BuildingView;
  /** Estado da próxima obra deste edifício (não da que já está na fila). */
  state: Extract<CrestState, 'ready' | 'wait' | 'blocked' | 'max'>;
  /** Níveis deste edifício que já estão na fila. */
  queued: number;
  /** Nível que esta obra levaria (depois do que já está na fila). */
  nextLevel: number;
  maxed: boolean;
  gain: { label: string; unit: string; current: number; next: number; diff: number } | null;
  /** Efeito derivado que costuma decidir a escolha (armazém enche, custo pago em). */
  effect: { label: string; before: string; after: string } | null;
  cost: Have;
  costTotal: number;
  missing: Partial<Record<ResourceCode, number>>;
  /** O que sobra de cada recurso depois de pagar, se der para pagar agora. */
  leftover: Have | null;
  durationSeconds: number;
  /** Quando os recursos estarão disponíveis (agora, mais tarde ou nunca sem outra ação). */
  resourcesAt: number | null;
  /** Quando a obra começaria: depois da fila e dos recursos. */
  startsAt: number | null;
  endsAt: number | null;
  /** Começa depois do fim da fila atual. */
  afterQueue: boolean;
  blockedReason: string | null;
};

const hoursLabel = (hours: number) =>
  !Number.isFinite(hours)
    ? 'nunca'
    : hours >= 48
      ? `${Math.round(hours / 24)} dias`
      : `${Math.floor(hours)}h${String(Math.round((hours % 1) * 60)).padStart(2, '0')}`;

/** Horas até o primeiro recurso encher o armazém com esta capacidade. */
function hoursToFull(snapshot: VillageSnapshot, have: Have, capacity: number) {
  return Math.min(
    ...resources.map(({ code }) => {
      const rate = snapshot.village.productionPerHour[code];
      return rate > 0 ? Math.max(0, capacity - have[code]) / rate : Infinity;
    }),
  );
}

export function queueEnd(snapshot: VillageSnapshot, clock: number) {
  return snapshot.queue.reduce(
    (end, item) => Math.max(end, new Date(item.endsAt).getTime()),
    clock,
  );
}

export function planObra(
  snapshot: VillageSnapshot,
  building: BuildingView,
  clock: number,
): ObraPlan {
  const have = currentResources(snapshot, clock);
  const maxed = building.queuedLevel >= building.maxLevel;
  const state: ObraPlan['state'] = maxed
    ? 'max'
    : building.canBuild
      ? 'ready'
      : building.resourcesAvailableAt
        ? 'wait'
        : 'blocked';
  const nextLevel = building.queuedLevel + 1;
  const detail = building.details.find((item) => item.next !== null);
  const gain = detail
    ? {
        label: detail.label,
        unit: detail.unit,
        current: detail.current,
        next: detail.next!,
        diff: detail.next! - detail.current,
      }
    : null;
  const cost = { wood: building.cost.wood, stone: building.cost.stone, iron: building.cost.iron };
  const costTotal = cost.wood + cost.stone + cost.iron;
  const missing: ObraPlan['missing'] = {};
  for (const { code } of resources)
    if (cost[code] > have[code]) missing[code] = cost[code] - have[code];
  let effect: ObraPlan['effect'] = null;
  if (building.code === 'storage' && gain) {
    effect = {
      label: 'Armazém enche em',
      before: hoursLabel(hoursToFull(snapshot, have, gain.current)),
      after: hoursLabel(hoursToFull(snapshot, have, gain.next)),
    };
  } else if (['wood', 'stone', 'iron'].includes(building.code) && gain && gain.diff > 0) {
    effect = {
      label: 'Paga o próprio custo em',
      before: '',
      after: `~${hoursLabel(costTotal / gain.diff)}`,
    };
  }
  const end = queueEnd(snapshot, clock);
  const queueFull = snapshot.queue.length >= snapshot.world.maxBuildQueue;
  const resourcesAt = maxed
    ? null
    : building.canBuild
      ? clock
      : building.resourcesAvailableAt
        ? new Date(building.resourcesAvailableAt).getTime()
        : null;
  const startsAt = resourcesAt === null || queueFull ? null : Math.max(resourcesAt, end);
  const blockedReason = maxed
    ? null
    : building.canBuild
      ? null
      : building.resourcesAvailableAt
        ? null
        : (building.unavailableReason ?? 'Indisponível agora.');
  return {
    building,
    state,
    queued: snapshot.queue.filter((item) => item.buildingCode === building.code).length,
    nextLevel,
    maxed,
    gain,
    effect,
    cost,
    costTotal,
    missing,
    leftover: building.canBuild
      ? {
          wood: have.wood - cost.wood,
          stone: have.stone - cost.stone,
          iron: have.iron - cost.iron,
        }
      : null,
    durationSeconds: building.durationSeconds,
    resourcesAt,
    startsAt,
    endsAt: startsAt === null ? null : startsAt + building.durationSeconds * 1000,
    afterQueue: startsAt !== null && snapshot.queue.length > 0 && end > (resourcesAt ?? 0),
    blockedReason,
  };
}

import { and, eq } from 'drizzle-orm';
import {
  buildings,
  technologies,
  technologyCodes,
  type BuildingCode,
  type BuildingLevels,
  type TechnologyCode,
} from '@dwar/game-config';
import {
  insufficientResources,
  type TechnologyView,
  type Resources,
  type VillageSnapshot,
} from '@dwar/api-client';
import { db, researchEvents, villages } from '@dwar/database';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage, settleVillage, snapshot } from './village-engine.js';

export function technologyViews(
  levels: BuildingLevels,
  resources: Resources,
  capacity: number,
  events: (typeof researchEvents.$inferSelect)[],
): TechnologyView[] {
  const byCode = new Map(events.map((event) => [event.technologyCode, event]));
  return technologyCodes.map((code) => {
    const definition = technologies[code];
    const event = byCode.get(code);
    const requirements = Object.entries(definition.requirements).map(([building, level]) => ({
      name: buildings[building as BuildingCode].name,
      level,
      met: levels[building as BuildingCode] >= level,
    }));
    const unavailableReason =
      levels.smith === 0
        ? 'Construa a ferraria para pesquisar unidades.'
        : requirements.some((requirement) => !requirement.met)
          ? 'Condições de pesquisa não atendidas.'
          : Object.values(definition.cost).some((cost) => cost > capacity)
            ? 'Amplie o armazém para comportar o custo.'
            : (['wood', 'stone', 'iron'] as const).some(
                  (resource) => definition.cost[resource] > resources[resource],
                )
              ? insufficientResources
              : null;
    return {
      code,
      name: definition.name,
      cost: definition.cost,
      durationSeconds: definition.durationSeconds,
      requirements,
      status:
        definition.initiallyResearched || event?.completedAt
          ? 'researched'
          : event
            ? 'researching'
            : unavailableReason
              ? 'unavailable'
              : 'available',
      endsAt: event?.endsAt.toISOString() ?? null,
      unavailableReason,
    };
  });
}

export async function enqueueResearch(
  accountId: number,
  worldId: number,
  villageId: number,
  code: TechnologyCode,
  requestId: string,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const owned = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    const [request] = await tx
      .select()
      .from(researchEvents)
      .where(and(eq(researchEvents.villageId, villageId), eq(researchEvents.requestId, requestId)));
    if (request && request.technologyCode !== code)
      throw new GameError('Esta solicitação já foi usada em outra pesquisa.', 409);
    const before = await snapshot(tx, village, world, now);
    const technology = before.technologies.find((item) => item.code === code);
    if (!technology) throw new GameError('Pesquisa inválida.');
    // One lifetime event per village and technology also protects retries with a new key.
    if (technology.endsAt) return before;
    if (technology.status === 'researched')
      throw new GameError('Esta unidade já foi pesquisada.', 409);
    if (technology.status !== 'available')
      throw new GameError(technology.unavailableReason ?? 'Pesquisa indisponível.');
    await tx.insert(researchEvents).values({
      worldId,
      villageId,
      technologyCode: code,
      startsAt: now,
      endsAt: new Date(now.getTime() + technology.durationSeconds * 1000),
      cost: technology.cost,
      requestId,
    });
    const updated = {
      ...village,
      wood: village.wood - technology.cost.wood,
      stone: village.stone - technology.cost.stone,
      iron: village.iron - technology.cost.iron,
    };
    await tx
      .update(villages)
      .set({ wood: updated.wood, stone: updated.stone, iron: updated.iron })
      .where(eq(villages.id, villageId));
    return snapshot(tx, updated, world, now);
  });
}

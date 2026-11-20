import {
  unitCodes,
  combatStats,
  combatRules,
  wallBonuses,
  minimumBuildingLevels,
  resourceCodes,
  type Troops,
  type Resources,
  type BuildingCode,
} from '@dwar/game-config';
export const emptyTroops = (): Troops => Object.fromEntries(unitCodes.map((c) => [c, 0])) as Troops;
const total = (troops: Troops) => unitCodes.reduce((sum, c) => sum + troops[c], 0);
export function morale(attackerPoints: number, defenderPoints: number) {
  if (!attackerPoints || !defenderPoints) return 100;
  return Math.max(
    combatRules.minimumMorale,
    Math.min(100, Math.floor(((defenderPoints / attackerPoints) * 3 + 0.25) * 100)),
  );
}
export function loyaltyAt(loyalty: number, from: Date, until: Date, speed: number) {
  return Math.floor(
    Math.min(
      100,
      loyalty +
        (Math.max(0, until.getTime() - from.getTime()) / 3600000) *
          combatRules.loyaltyPerHour *
          speed,
    ),
  );
}
export function battle(
  att: Troops,
  def: Troops,
  wall: number,
  target: { code: BuildingCode; level: number } | null,
  luck: number,
  moral: number,
) {
  const attack = [0, 0, 0],
    defense = [0, 0, 0];
  const group = (c: keyof Troops) =>
    combatStats[c].group === 'cavalry' ? 1 : combatStats[c].group === 'archer' ? 2 : 0;
  for (const c of unitCodes) {
    const stats = combatStats[c];
    attack[group(c)]! += stats.attack * att[c];
    defense[0]! += stats.footDefense * def[c];
    defense[1]! += stats.cavalryDefense * def[c];
    defense[2]! += stats.archerDefense * def[c];
  }
  const rawAttack = attack.reduce((a, b) => a + b, 0),
    attackPower = (((rawAttack * (100 + luck)) / 100) * moral) / 100;
  const weights = attack.map((n) => (rawAttack > 0 ? n / rawAttack : 0));
  const weightedDefense = defense.map((n, i) => n * weights[i]!);
  const rawDefense = weightedDefense.reduce((a, b) => a + b, 0);
  const wallDuring =
    att.ram > 0
      ? Math.max(
          Math.round(wall / 2),
          wall - Math.round(att.ram / (combatRules.ramBase * combatRules.ramFactor ** wall)),
        )
      : wall;
  const defensePower =
    (rawDefense + combatRules.basicDefense) * (1 + (wallBonuses[wallDuring] ?? 0));
  const attackerLosses = emptyTroops(),
    defenderLosses = emptyTroops();
  const winner: 'attacker' | 'defender' | 'draw' =
    attackPower > defensePower ? 'attacker' : attackPower < defensePower ? 'defender' : 'draw';
  for (const c of unitCodes) {
    if (winner === 'attacker') {
      const i = group(c),
        a = attackPower * weights[i]!,
        d = rawDefense > 0 ? (defensePower * weightedDefense[i]!) / rawDefense : 0;
      attackerLosses[c] = Math.min(att[c], Math.round(att[c] * (a > 0 ? (d / a) ** 1.5 : 0)));
      defenderLosses[c] = def[c];
    } else if (winner === 'defender') {
      attackerLosses[c] = att[c];
      defenderLosses[c] = Math.min(
        def[c],
        Math.round(def[c] * (attackPower / defensePower) ** 1.5),
      );
    } else {
      attackerLosses[c] = att[c];
      defenderLosses[c] = def[c];
    }
  }
  const lostAtt = total(attackerLosses),
    lostDef = total(defenderLosses);
  const ratio =
    winner === 'attacker'
      ? total(att) > 0
        ? lostAtt / total(att)
        : 1
      : total(def) > 0
        ? lostDef / total(def)
        : 1;
  function damage(count: number, strength: number, base: number, factor: number, level: number) {
    const maximum = (count * strength) / (base * factor ** level);
    return Math.round(winner === 'attacker' ? maximum * (1 - 0.5 * ratio) : (maximum * ratio) / 2);
  }
  let newWall = Math.max(
    0,
    wall -
      damage(att.ram, combatStats.ram.attack, combatRules.ramBase, combatRules.ramFactor, wall),
  );
  let demolition: { code: BuildingCode; before: number; after: number } | null = null;
  if (target && att.catapult > 0) {
    const level = target.code === 'wall' ? newWall : target.level;
    const after = Math.max(
      minimumBuildingLevels[target.code] ?? 0,
      level -
        damage(
          att.catapult,
          combatStats.catapult.attack,
          combatRules.catapultBase,
          combatRules.catapultFactor,
          level,
        ),
    );
    demolition = { code: target.code, before: target.level, after };
    if (target.code === 'wall') newWall = after;
  }
  // Spies fight only defending spies; they never kill defenders during a scouting command.
  const scouting = att.spy > 0 && att.spy === total(att);
  if (scouting) for (const c of unitCodes) defenderLosses[c] = 0;
  attackerLosses.spy =
    att.spy > 0
      ? Math.min(
          att.spy,
          Math.round(att.spy * (def.spy / (att.spy * combatRules.spyFactor)) ** 1.5),
        )
      : 0;
  const survivors = Object.fromEntries(
    unitCodes.map((c) => [c, att[c] - attackerLosses[c]]),
  ) as Troops;
  const showDefense =
    winner === 'attacker' || total(def) === 0 || lostDef / total(def) >= 2 / 3 || survivors.spy > 0;
  return {
    winner: scouting ? (survivors.spy > 0 ? ('attacker' as const) : ('defender' as const)) : winner,
    attackerLosses,
    defenderLosses,
    survivors,
    showDefense,
    wallAfter: newWall,
    demolition,
    lootCapacity: unitCodes.reduce((sum, c) => sum + combatStats[c].carry * survivors[c], 0),
  };
}
export function plunder(resources: Resources, hidden: number, capacity: number): Resources {
  const available = Object.fromEntries(
    resourceCodes.map((c) => [c, Math.max(0, Math.floor(resources[c] - hidden))]),
  ) as Resources;
  const sum = resourceCodes.reduce((n, c) => n + available[c], 0),
    maximum = Math.min(capacity, sum);
  const loot = Object.fromEntries(
    resourceCodes.map((c) => [c, sum > 0 ? Math.floor((maximum * available[c]) / sum) : 0]),
  ) as Resources;
  let remaining = maximum - resourceCodes.reduce((n, c) => n + loot[c], 0);
  for (const c of resourceCodes)
    if (remaining > 0 && loot[c] < available[c]) {
      loot[c]++;
      remaining--;
    }
  return loot;
}
// Largest remainder allocation preserves the exact aggregate loss across support origins.
export function distributeLosses(loss: number, contingents: { id: number; quantity: number }[]) {
  const sum = contingents.reduce((n, c) => n + c.quantity, 0);
  const rows = contingents.map((c) => ({
    ...c,
    lost: sum ? Math.floor((loss * c.quantity) / sum) : 0,
    fraction: sum ? ((loss * c.quantity) / sum) % 1 : 0,
  }));
  let remainder = loss - rows.reduce((n, c) => n + c.lost, 0);
  for (const row of [...rows].sort((a, b) => b.fraction - a.fraction || a.id - b.id))
    if (remainder > 0 && row.lost < row.quantity) {
      row.lost++;
      remainder--;
    }
  return rows;
}

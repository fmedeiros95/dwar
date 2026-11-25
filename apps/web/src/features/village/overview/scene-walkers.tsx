import type { CSSProperties } from 'react';
import type { BuildingView } from '@dwar/api-client';
import type { DayPhase } from '../shared/night.js';
import './scene-walkers.css';

const atlasRows = { basket: 0, woodcutter: 1, guard: 2, farmer: 3 } as const;

type VillagerRoute = {
  id: string;
  role: keyof typeof atlasRows;
  path: string;
  destination?: string;
  height: number;
  facing: -1 | 1;
  duration: number;
  delay: number;
  restingPoint: number;
};

// Pés alinhados com as estradas pintadas, deixando folga junto a portões e telhados.
const routes: VillagerRoute[] = [
  {
    id: 'south-patrol',
    role: 'guard',
    path: 'M831 534 C809 553 792 578 774 607 C764 626 758 638 753 650',
    height: 20,
    facing: -1,
    duration: 35,
    delay: 11,
    restingPoint: 55,
  },
  {
    id: 'plaza-basket',
    role: 'basket',
    path: 'M870 522 C891 515 917 506 944 504',
    destination: 'place',
    height: 20,
    facing: 1,
    duration: 22,
    delay: 3,
    restingPoint: 40,
  },
  {
    id: 'market-basket',
    role: 'basket',
    path: 'M605 520 C656 515 713 522 782 520',
    destination: 'market',
    height: 19,
    facing: 1,
    duration: 38,
    delay: 23,
    restingPoint: 53,
  },
  {
    id: 'northeast-wood',
    role: 'woodcutter',
    path: 'M1004 262 C1060 250 1104 236 1152 222 S1213 203 1251 198',
    destination: 'wood',
    height: 18,
    facing: 1,
    duration: 52,
    delay: 9,
    restingPoint: 28,
  },
  {
    id: 'southwest-farm',
    role: 'farmer',
    path: 'M642 820 C606 853 553 873 500 870',
    destination: 'farm',
    height: 22,
    facing: -1,
    duration: 36,
    delay: 7,
    restingPoint: 62,
  },
  {
    id: 'barracks-patrol',
    role: 'guard',
    path: 'M851 540 C875 551 899 572 924 587',
    destination: 'barracks',
    height: 19,
    facing: 1,
    duration: 26,
    delay: 15,
    restingPoint: 46,
  },
];

export function SceneWalkers({
  layers,
  phase,
}: {
  layers: readonly { building: Pick<BuildingView, 'code' | 'level'> }[];
  phase: DayPhase;
}) {
  const built = new Set(
    layers.filter(({ building }) => building.level > 0).map(({ building }) => building.code),
  );
  return routes
    .filter(
      (route) =>
        (phase !== 'night' || route.role === 'guard') &&
        (!route.destination || built.has(route.destination)),
    )
    .map((route) => (
      <span
        key={route.id}
        className="scene-villager"
        data-role={route.role}
        style={
          {
            offsetPath: `path('${route.path}')`,
            '--villager-height': `${route.height}px`,
            '--villager-facing': route.facing,
            '--villager-route-duration': `${route.duration}s`,
            '--villager-route-delay': `${-route.delay}s`,
            '--villager-resting-point': `${route.restingPoint}%`,
            '--villager-atlas-row': `${-100 * atlasRows[route.role]}%`,
          } as CSSProperties
        }
      >
        <span className="scene-villager-gait">
          <img
            className="scene-villager-atlas"
            src="/game/town/life/villagers.webp"
            alt=""
            draggable={false}
          />
        </span>
      </span>
    ));
}

import type { BuildingView, Construction } from '@dwar/api-client';
import { spritePositions } from './sprite-positions.js';
import { spriteLayers, spriteHitAreas } from './scene-geometry.js';
import { duration } from '../shared/index.js';

function tier(code: string, level: number): number {
  if (level === 1 || code === 'noble' || code === 'place') return 1;
  if (code === 'hide') return level <= 7 ? 2 : 3;
  if (code === 'market') return level < 7 ? 2 : level < 15 ? 3 : level < 21 ? 4 : 5;
  if (code === 'smith') return level < 10 ? 2 : 3;
  return level < 6 ? 2 : level < 11 ? 3 : level < 16 ? 4 : level < 21 ? 5 : 6;
}

export function VillageScene({
  buildings,
  selected,
  onSelect,
  onHover,
  queue,
  clock,
}: {
  buildings: BuildingView[];
  selected: string;
  onSelect: (code: string) => void;
  onHover?: (code: string | null) => void;
  queue: Construction[];
  clock: number;
}) {
  const present = buildings.filter((building) => building.level > 0 || building.queuedLevel > 0);
  // SVG paints in document order; reproduce the PHP/CSS stacking before rendering.
  const layers = present
    .flatMap((building) => {
      const sprite = `${building.code}_${tier(building.code, building.level)}`;
      const road = `${building.code}_road`;
      return [
        { building, sprite, road: false, layer: spriteLayers[sprite] ?? 0 },
        ...(spritePositions[road]
          ? [{ building, sprite: road, road: true, layer: spriteLayers[road] ?? 0 }]
          : []),
      ];
    })
    .sort((a, b) => a.layer - b.layer);
  return (
    <svg
      className="village-scene"
      viewBox="0 0 942 430"
      aria-label="Vista da aldeia. Selecione um edifício para ver sua evolução."
    >
      <image href="/legacy/layout/back.jpg" x={0} y={0} width={942} height={430} />
      {layers.map(({ building, sprite, road }) => {
        const position = spritePositions[sprite];
        if (!position) return null;
        if (road)
          return (
            <image
              key={sprite}
              pointerEvents="none"
              href={`/legacy/buildings/${building.code}/${sprite}.png`}
              x={position.x + 171}
              y={position.y}
            />
          );
        const hitArea = spriteHitAreas[sprite];
        const event = queue.find((item) => item.buildingCode === building.code);
        const progress = event
          ? Math.max(
              0,
              (clock - new Date(event.startsAt).getTime()) /
                (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()),
            )
          : 0;
        const phase = event ? `-${progress <= 0.25 ? 25 : progress <= 0.5 ? 50 : 75}` : '';
        return (
          <g
            key={sprite}
            role="button"
            tabIndex={0}
            aria-label={`${building.name}, nível ${building.level}`}
            className={selected === building.code ? 'scene-building selected' : 'scene-building'}
            onClick={() => onSelect(building.code)}
            onMouseEnter={() => onHover?.(building.code)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(building.code)}
            onBlur={() => onHover?.(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(building.code);
              }
            }}
          >
            <title>
              {building.name} · nível {building.level}
            </title>
            <image
              href={`/legacy/buildings/${building.code}/${sprite}${phase}.png`}
              pointerEvents={hitArea ? 'none' : undefined}
              x={position.x + 171}
              y={position.y}
            />
            {hitArea ? (
              <polygon
                points={hitArea}
                transform="translate(171, 0)"
                fill="transparent"
                pointerEvents="all"
              />
            ) : null}
          </g>
        );
      })}
      {present.map((building) => {
        const label = spritePositions[`${building.code}_l`];
        if (!label) return null;
        const timedEvent =
          building.code === 'main' || building.level === 0 ? queue.at(-1) : undefined;
        return (
          <g
            key={`label-${building.code}`}
            className="scene-label"
            transform={`translate(${label.x + 171}, ${label.y})`}
            aria-hidden="true"
          >
            <rect
              className="scene-badge"
              width={timedEvent ? 54 : building.level >= 10 ? 24 : 20}
              height={timedEvent && building.level > 0 ? 32 : 20}
              rx={timedEvent ? 8 : 10}
            />
            <text
              className="scene-badge-level"
              textAnchor={timedEvent ? 'start' : 'middle'}
              x={timedEvent ? 6 : building.level >= 10 ? 12 : 10}
              y="14"
            >
              {building.level > 0 ? building.level : ''}
            </text>
            {timedEvent ? (
              <text className="scene-badge-timer" x="6" y={building.level > 0 ? 27 : 14}>
                {duration((new Date(timedEvent.endsAt).getTime() - clock) / 1000)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

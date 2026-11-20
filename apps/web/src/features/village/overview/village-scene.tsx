import { useMemo, type ReactNode } from 'react';
import { Ghost, LocateFixed, Minus, Plus, Snowflake, Sun } from 'lucide-react';
import type { BuildingView, Construction } from '@dwar/api-client';
import { usePanZoom } from '../../../components/use-pan-zoom.js';
import { duration } from '../shared/index.js';
import {
  backingUrl,
  phaseFor,
  placeBuilding,
  roadUrl,
  sceneSize,
  sceneThemes,
  spriteUrl,
  type SceneTheme,
} from './scene-model.js';

const themeIcons = { summer: Sun, winter: Snowflake, halloween: Ghost } as const;
const focus = { x: sceneSize.width / 2, y: sceneSize.height * 0.5 };

export function VillageScene({
  buildings,
  onSelect,
  onHover,
  queue,
  clock,
  theme,
  onThemeChange,
  children,
}: {
  buildings: BuildingView[];
  onSelect: (code: string) => void;
  onHover?: (code: string | null) => void;
  queue: Construction[];
  clock: number;
  theme: SceneTheme;
  onThemeChange: (theme: SceneTheme) => void;
  /** Camadas de HUD desenhadas por cima do cenário, fora do zoom. */
  children?: ReactNode;
}) {
  const pan = usePanZoom({ width: sceneSize.width, height: sceneSize.height, focus });

  const layers = useMemo(
    () =>
      buildings
        .filter((building) => building.level > 0 || building.queuedLevel > 0)
        .flatMap((building) => {
          const displayLevel =
            building.queuedLevel > building.level ? building.queuedLevel : building.level;
          const placed = placeBuilding(building.code, displayLevel, building.maxLevel);
          return placed ? [{ building, placed }] : [];
        })
        .sort(
          (a, b) =>
            (a.placed.slot.container?.z ?? 0) - (b.placed.slot.container?.z ?? 0) ||
            a.placed.artId - b.placed.artId,
        ),
    [buildings],
  );

  return (
    <div
      ref={pan.viewportRef}
      className={`scene-viewport${pan.dragging ? ' dragging' : ''}`}
      tabIndex={0}
      role="application"
      aria-label="Vista da aldeia. Arraste para mover, use a roda para ampliar e selecione um edifício."
      {...pan.handlers}
    >
      <div
        className="scene-ambient"
        aria-hidden="true"
        style={{ backgroundImage: `url(${backingUrl(theme)})` }}
      />
      <svg
        className={`village-scene${pan.gapX ? ' gap-x' : ''}${pan.gapY ? ' gap-y' : ''}`}
        width={sceneSize.width}
        height={sceneSize.height}
        viewBox={`0 0 ${sceneSize.width} ${sceneSize.height}`}
        style={{
          transform: `translate(${pan.view.x}px, ${pan.view.y}px) scale(${pan.view.scale})`,
        }}
      >
        <image
          href={backingUrl(theme)}
          x={0}
          y={0}
          width={sceneSize.width}
          height={sceneSize.height}
        />
        {layers.map(({ building, placed }) => {
          const { slot } = placed;
          const container = slot.container;
          if (!container || !slot.sprite) return null;
          const event = queue.find((item) => item.buildingCode === building.code);
          const progress = event
            ? Math.min(
                1,
                Math.max(
                  0,
                  (clock - new Date(event.startsAt).getTime()) /
                    Math.max(
                      1,
                      new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime(),
                    ),
                ),
              )
            : 0;
          const phase = event ? phaseFor(placed.artId, progress) : null;
          const road = slot.road ? roadUrl(placed.artId, theme) : null;
          const hit = slot.hit;
          return (
            <g
              key={building.code}
              role="button"
              tabIndex={0}
              aria-label={`${building.name}, nível ${building.level}`}
              className="scene-building"
              onClick={() => {
                if (!pan.didDrag()) onSelect(building.code);
              }}
              onMouseEnter={() => onHover?.(building.code)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(building.code)}
              onBlur={() => onHover?.(null)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                  keyEvent.preventDefault();
                  onSelect(building.code);
                }
              }}
            >
              <title>
                {building.name} · nível {building.level}
              </title>
              {road && slot.road ? (
                <image
                  pointerEvents="none"
                  href={road}
                  x={(container.left ?? 0) + (slot.road.left ?? 0)}
                  y={(container.top ?? 0) + (slot.road.top ?? 0)}
                  width={slot.road.width}
                  height={slot.road.height}
                />
              ) : null}
              <image
                pointerEvents="none"
                href={spriteUrl(placed.artId, placed.tier, theme, phase)}
                x={(container.left ?? 0) + (slot.sprite.left ?? 0)}
                y={(container.top ?? 0) + (slot.sprite.top ?? 0)}
                width={slot.sprite.width}
                height={slot.sprite.height}
              />
              {hit ? (
                <rect
                  x={hit.left ?? 0}
                  y={hit.top ?? 0}
                  width={hit.width}
                  height={hit.height}
                  fill="transparent"
                  pointerEvents="all"
                />
              ) : null}
            </g>
          );
        })}
        {layers.map(({ building, placed }) => {
          if (!placed.label) return null;
          const timedEvent =
            building.code === 'main' || building.level === 0 ? queue.at(-1) : undefined;
          const width = timedEvent ? 64 : building.level >= 10 ? 30 : 26;
          const height = timedEvent && building.level > 0 ? 40 : 26;
          return (
            <g
              key={`label-${building.code}`}
              className="scene-label"
              transform={`translate(${placed.label.left}, ${placed.label.top})`}
              aria-hidden="true"
            >
              <rect
                className="scene-badge"
                width={width}
                height={height}
                rx={timedEvent ? 10 : 13}
              />
              <text
                className="scene-badge-level"
                textAnchor={timedEvent ? 'start' : 'middle'}
                x={timedEvent ? 9 : width / 2}
                y="18"
              >
                {building.level > 0 ? building.level : ''}
              </text>
              {timedEvent ? (
                <text className="scene-badge-timer" x="9" y={building.level > 0 ? 33 : 18}>
                  {duration((new Date(timedEvent.endsAt).getTime() - clock) / 1000)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="scene-tools" onPointerDown={(event) => event.stopPropagation()}>
        <div className="scene-tool-group" role="group" aria-label="Zoom">
          <button
            type="button"
            aria-label="Ampliar"
            title="Ampliar"
            disabled={!pan.canZoomIn}
            onClick={() => pan.zoomBy(1.25)}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            aria-label="Reduzir"
            title="Reduzir"
            disabled={!pan.canZoomOut}
            onClick={() => pan.zoomBy(1 / 1.25)}
          >
            <Minus size={18} />
          </button>
          <button type="button" aria-label="Centralizar" title="Centralizar" onClick={pan.reset}>
            <LocateFixed size={18} />
          </button>
        </div>
        <div className="scene-tool-group" role="group" aria-label="Estação do cenário">
          {sceneThemes.map(({ code, label }) => {
            const Icon = themeIcons[code];
            return (
              <button
                key={code}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={theme === code}
                onClick={() => onThemeChange(code)}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

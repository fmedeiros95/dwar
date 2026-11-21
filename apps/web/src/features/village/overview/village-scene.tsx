import { useMemo, useState, type ReactNode } from 'react';
import {
  Ghost,
  LocateFixed,
  Minus,
  Moon,
  Plus,
  Snowflake,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import type { BuildingView, Construction } from '@dwar/api-client';
import { usePanZoom } from '../../../components/use-pan-zoom.js';
import { duration } from '../shared/index.js';
import { dayPhase, nightHours } from '../shared/night.js';
import { SceneCelebrations, SceneLife } from './scene-life.js';
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
const lifeKey = 'dwar:scene-life';
const phaseChip = {
  dawn: { icon: Sunrise, label: 'Amanhecer', title: 'O sol está nascendo sobre a aldeia' },
  dusk: { icon: Sunset, label: 'Entardecer', title: `A noite começa às ${nightHours.start}h` },
  night: {
    icon: Moon,
    label: 'Noite',
    title: `É noite no mundo (${nightHours.start}h às ${nightHours.end}h)`,
  },
} as const;

function progressOf(event: Construction, clock: number) {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  return Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
}

export function VillageScene({
  villageId,
  buildings,
  onSelect,
  onHover,
  queue,
  clock,
  theme,
  onThemeChange,
  children,
}: {
  villageId: number;
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
  const phase = dayPhase(clock);
  const night = phase === 'night';
  const [life, setLife] = useState(() => {
    try {
      return localStorage.getItem(lifeKey) !== '0';
    } catch {
      return true;
    }
  });
  function toggleLife() {
    const value = !life;
    setLife(value);
    try {
      localStorage.setItem(lifeKey, value ? '1' : '0');
    } catch {
      /* preferência só desta sessão */
    }
  }
  const worldStyle = {
    transform: `translate(${pan.view.x}px, ${pan.view.y}px) scale(${pan.view.scale})`,
  };
  const gaps = `${pan.gapX ? ' gap-x' : ''}${pan.gapY ? ' gap-y' : ''}`;

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
      className={`scene-viewport${pan.dragging ? ' dragging' : ''}${night ? ' night' : ''}`}
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
      <div className={`scene-world${gaps}`} style={worldStyle}>
        <svg
          className="village-scene"
          width={sceneSize.width}
          height={sceneSize.height}
          viewBox={`0 0 ${sceneSize.width} ${sceneSize.height}`}
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
            const progress = event ? progressOf(event, clock) : 0;
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
          {night ? (
            /* Noite: escurece e esfria o cenário sem filtro (barato ao arrastar); os selos ficam por cima */
            <g className="scene-night-shade" pointerEvents="none" aria-hidden="true">
              <rect
                className="scene-night-desaturate"
                width={sceneSize.width}
                height={sceneSize.height}
              />
              <rect
                className="scene-night-tint"
                width={sceneSize.width}
                height={sceneSize.height}
              />
            </g>
          ) : null}
          {phase === 'dawn' || phase === 'dusk' ? (
            <rect
              className={`scene-${phase}-tint`}
              width={sceneSize.width}
              height={sceneSize.height}
              pointerEvents="none"
            />
          ) : null}
        </svg>
        {life ? (
          <SceneLife layers={layers} queue={queue} clock={clock} theme={theme} phase={phase} />
        ) : null}
        <svg
          className="village-labels"
          width={sceneSize.width}
          height={sceneSize.height}
          viewBox={`0 0 ${sceneSize.width} ${sceneSize.height}`}
          aria-hidden="true"
        >
          {layers.map(({ building, placed }) => {
            if (!placed.label) return null;
            const timedEvent =
              building.code === 'main' || building.level === 0 ? queue.at(-1) : undefined;
            const width = timedEvent ? 64 : building.level >= 10 ? 30 : 26;
            const height = timedEvent && building.level > 0 ? 40 : 26;
            const works = queue.find(
              (item) =>
                item.buildingCode === building.code && new Date(item.startsAt).getTime() <= clock,
            );
            return (
              <g
                key={`label-${building.code}`}
                className={`scene-label${works ? ' working' : ''}`}
                transform={`translate(${placed.label.left}, ${placed.label.top})`}
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
                {works ? (
                  <g className="scene-badge-progress" transform={`translate(0, ${height + 4})`}>
                    <rect className="track" width={width} height={5} rx={2.5} />
                    <rect
                      className="fill"
                      width={Math.max(5, width * progressOf(works, clock))}
                      height={5}
                      rx={2.5}
                    />
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
        {life ? (
          <SceneCelebrations villageId={villageId} layers={layers} queue={queue} clock={clock} />
        ) : null}
      </div>

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
        <div className="scene-tool-group" role="group" aria-label="Ambientação">
          <button
            type="button"
            aria-label="Animações do cenário"
            title={life ? 'Desligar animações do cenário' : 'Ligar animações do cenário'}
            aria-pressed={life}
            onClick={toggleLife}
          >
            <Sparkles size={18} />
          </button>
        </div>
        {phase !== 'day' ? <PhaseChip phase={phase} /> : null}
      </div>
      {children}
    </div>
  );
}

function PhaseChip({ phase }: { phase: keyof typeof phaseChip }) {
  const chip = phaseChip[phase];
  const ChipIcon = chip.icon;
  return (
    <span className={`scene-night-chip phase-${phase}`} title={chip.title}>
      <ChipIcon size={13} aria-hidden="true" /> {chip.label}
    </span>
  );
}

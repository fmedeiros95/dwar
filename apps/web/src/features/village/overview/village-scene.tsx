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

/**
 * Brasão de cada edifício no cenário. A forma de escudo vem do emblema do jogo; o preenchimento
 * diz o que o jogador pode fazer ali sem abrir nenhuma janela:
 *   ready    dourado com aba ↑   pode evoluir agora
 *   wait     escuro, filete âmbar falta recurso (chega sozinho com o tempo)
 *   blocked  escuro e apagado     requisito, fila cheia ou população
 *   working  escuro, contorno de progresso dourado   em obra
 *   queued   escuro, contorno tracejado               na fila, ainda não começou
 *   max      prata com coroa      nível máximo
 */
export type CrestState = 'ready' | 'wait' | 'blocked' | 'working' | 'queued' | 'max';
export const crestSize = { width: 30, height: 34 };
const crestPath = 'M1.5 3.5 Q15 -0.5 28.5 3.5 L28.5 16 Q28.5 27.5 15 33.5 Q1.5 27.5 1.5 16 Z';
export const crestLabels: Record<CrestState, string> = {
  ready: 'pode evoluir',
  wait: 'aguardando recursos',
  blocked: 'indisponível',
  working: 'em obra',
  queued: 'na fila de obras',
  max: 'nível máximo',
};

/** Parte do edifício apontada no cenário. */
export type SceneTarget = { code: string; part: 'crest' | 'building' };

export function crestState(
  building: BuildingView,
  queue: Construction[],
  clock: number,
): CrestState {
  const event = queue.find((item) => item.buildingCode === building.code);
  if (event) return new Date(event.startsAt).getTime() <= clock ? 'working' : 'queued';
  const next = Math.max(building.level, building.queuedLevel);
  if (next >= building.maxLevel) return 'max';
  if (building.canBuild) return 'ready';
  if (building.resourcesAvailableAt) return 'wait';
  return 'blocked';
}

function progressOf(event: Construction, clock: number) {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  return Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
}

export function VillageScene({
  villageId,
  buildings,
  onSelect,
  onCrest,
  compared = [],
  onHover,
  coveredRight = 0,
  queue,
  clock,
  theme,
  onThemeChange,
  children,
}: {
  villageId: number;
  buildings: BuildingView[];
  onSelect: (code: string) => void;
  /** Clique no brasão: leva a obra para a comparação, sem abrir janela. */
  onCrest?: (code: string) => void;
  /** Edifícios em comparação na mesa de obras: o brasão ganha um anel. */
  compared?: string[];
  /** O que está sob o cursor ou o foco: o brasão e o edifício fazem coisas diferentes. */
  onHover?: (target: SceneTarget | null) => void;
  /** Faixa à direita coberta pela mesa de obras: a vista pode deslizar para descobri-la. */
  coveredRight?: number;
  queue: Construction[];
  clock: number;
  theme: SceneTheme;
  onThemeChange: (theme: SceneTheme) => void;
  /** Camadas de HUD desenhadas por cima do cenário, fora do zoom. */
  children?: ReactNode;
}) {
  const pan = usePanZoom({
    width: sceneSize.width,
    height: sceneSize.height,
    focus,
    insetRight: coveredRight,
  });
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
          // O cenário mostra o que está de pé. Uma obra na fila não derruba o edifício atual.
          const builtLevel = building.level > 0 ? building.level : building.queuedLevel;
          const placed = placeBuilding(building.code, builtLevel, building.maxLevel);
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
          {layers.map(({ building, placed: built }) => {
            const event = queue.find((item) => item.buildingCode === building.code);
            const running = event && new Date(event.startsAt).getTime() <= clock ? event : null;
            // Andaime só quando a obra já começou e muda o estágio da arte, ou num edifício novo.
            const upgrade = running
              ? placeBuilding(building.code, running.targetLevel, building.maxLevel)
              : null;
            const placed =
              upgrade && (building.level === 0 || upgrade.tier !== built.tier) ? upgrade : built;
            const phase =
              placed === upgrade && running
                ? phaseFor(placed.artId, progressOf(running, clock))
                : building.level === 0 && event
                  ? phaseFor(placed.artId, 0)
                  : null;
            const { slot } = placed;
            const container = slot.container;
            if (!container || !slot.sprite) return null;
            const road = slot.road ? roadUrl(placed.artId, theme) : null;
            const hit = slot.hit;
            return (
              <g
                key={building.code}
                role="button"
                tabIndex={0}
                aria-label={`${building.name}, nível ${building.level}, ${crestLabels[crestState(building, queue, clock)]}`}
                className="scene-building"
                onClick={() => {
                  if (!pan.didDrag()) onSelect(building.code);
                }}
                onMouseEnter={() => onHover?.({ code: building.code, part: 'building' })}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.({ code: building.code, part: 'building' })}
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
        >
          {layers.map(({ building, placed }) => {
            if (!placed.label) return null;
            const state = crestState(building, queue, clock);
            const works = queue.find(
              (item) =>
                item.buildingCode === building.code && new Date(item.startsAt).getTime() <= clock,
            );
            const timedEvent = works;
            return (
              <g
                key={`label-${building.code}`}
                className={`scene-label crest-${state}`}
                data-compared={compared.includes(building.code) ? 'true' : undefined}
                data-crest={building.code}
                role={onCrest ? 'button' : undefined}
                tabIndex={onCrest ? 0 : undefined}
                aria-pressed={onCrest ? compared.includes(building.code) : undefined}
                aria-label={`Comparar ${building.name}, nível ${building.level}, ${crestLabels[state]}`}
                onFocus={() => onHover?.({ code: building.code, part: 'crest' })}
                onBlur={() => onHover?.(null)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    onCrest?.(building.code);
                  }
                }}
                transform={`translate(${placed.label.left - 2}, ${placed.label.top - 4})`}
                onClick={
                  onCrest
                    ? (clickEvent) => {
                        clickEvent.stopPropagation();
                        if (!pan.didDrag()) onCrest(building.code);
                      }
                    : undefined
                }
                onMouseEnter={() => onHover?.({ code: building.code, part: 'crest' })}
                onMouseLeave={() => onHover?.(null)}
              >
                {onCrest ? (
                  <circle className="crest-hit" cx={crestSize.width / 2} cy={17} r={24} />
                ) : null}
                {compared.includes(building.code) ? (
                  <path className="crest-compare-ring" d={crestPath} />
                ) : null}
                <path className="crest-shape" d={crestPath} />
                {state === 'working' && works ? (
                  <path
                    className="crest-progress"
                    d={crestPath}
                    pathLength={100}
                    strokeDasharray={`${progressOf(works, clock) * 100} 100`}
                  />
                ) : null}
                <text className="crest-level" x={crestSize.width / 2} y={21} textAnchor="middle">
                  {building.level > 0 ? building.level : '+'}
                </text>
                {state === 'ready' ? (
                  <g className="crest-tab" transform={`translate(${crestSize.width - 5}, -3)`}>
                    <circle r={7} cx={0} cy={4} />
                    <path d="M-3.2 5.6 L0 2 L3.2 5.6" />
                  </g>
                ) : null}
                {state === 'max' ? (
                  <path
                    className="crest-crown"
                    transform={`translate(${crestSize.width / 2 - 7}, -7)`}
                    d="M0 8 L2 1 L5 5 L7 0 L9 5 L12 1 L14 8 Z"
                  />
                ) : null}
                {timedEvent ? (
                  <g
                    className="crest-timer"
                    aria-hidden="true"
                    transform={`translate(${crestSize.width + 3}, ${crestSize.height / 2 - 9})`}
                  >
                    <rect width={58} height={18} rx={9} />
                    <text x={29} y={12.5} textAnchor="middle">
                      {duration((new Date(timedEvent.endsAt).getTime() - clock) / 1000)}
                    </text>
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

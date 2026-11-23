import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Hammer } from 'lucide-react';
import type { BuildingView, Construction } from '@dwar/api-client';
import type { DayPhase } from '../shared/index.js';
import type { PlacedBuilding, SceneTheme } from './scene-model.js';

/*
 * Vida do cenário: aldeões, fumaça, nuvens, pássaros, brilho na água, luzes da noite, neve,
 * poeira de obra e o selo de "subiu de nível". É só ambientação: nada aqui lê ou muda regra.
 *
 * Tudo é HTML posicionado nas coordenadas da arte (1600x1000) e animado apenas com
 * transform/opacity, então roda no compositor e não redesenha o SVG do cenário.
 */

export type SceneLayer = { building: BuildingView; placed: PlacedBuilding };
type Box = { x: number; y: number; w: number; h: number };

function spriteBox(placed: PlacedBuilding): Box | null {
  const container = placed.slot.container;
  const sprite = placed.slot.sprite;
  if (!container || !sprite) return null;
  return {
    x: (container.left ?? 0) + (sprite.left ?? 0),
    y: (container.top ?? 0) + (sprite.top ?? 0),
    w: sprite.width,
    h: sprite.height,
  };
}

/** Pseudoaleatório estável: o mesmo índice sempre dá o mesmo valor (nada pula entre renders). */
function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function px(value: number) {
  return `${Math.round(value * 10) / 10}px`;
}

/* ---- Aldeões nas estradas (coordenadas da arte de verão; as outras estações usam o mesmo traçado) ---- */
const routes: { d: string; people: number; seconds: number }[] = [
  // Praça -> portão sul
  { d: 'M838 524 C815 548 792 576 774 610 S750 666 734 694', people: 2, seconds: 26 },
  // Praça -> portão do edifício principal
  { d: 'M846 506 C856 482 868 458 878 440', people: 1, seconds: 14 },
  // Praça -> estrada norte
  { d: 'M832 506 C818 472 798 432 778 388', people: 1, seconds: 22 },
  // Praça -> oeste
  { d: 'M826 518 C790 518 722 512 650 516 S582 522 566 524', people: 2, seconds: 30 },
  // Praça -> sudoeste
  { d: 'M808 532 C780 540 742 544 700 552 S628 566 604 576', people: 1, seconds: 24 },
  // Praça -> leste
  { d: 'M858 510 C900 504 950 502 1008 504', people: 1, seconds: 20 },
  // Praça -> sudeste (quartel)
  { d: 'M856 530 C884 548 912 570 940 594', people: 1, seconds: 18 },
  // Fora dos muros: ponte sul -> estrada
  { d: 'M676 784 C664 810 650 842 646 882 S640 960 648 1010', people: 2, seconds: 34 },
  // Fora dos muros: estrada nordeste
  { d: 'M1004 262 C1060 250 1104 236 1152 222 S1242 198 1292 186', people: 1, seconds: 30 },
];
const tunics = ['#8b2c22', '#2f4f7a', '#5d7a2a', '#7a5a2a', '#6b3a6b', '#a07a2a', '#3d6b66'];

function Walkers() {
  let index = 0;
  return (
    <>
      {routes.flatMap((route) =>
        Array.from({ length: route.people }, (_, person) => {
          const i = index++;
          const seconds = route.seconds * (0.85 + seeded(i, 1) * 0.35);
          return (
            <span
              key={`${route.d}-${person}`}
              className="life-walker"
              style={
                {
                  offsetPath: `path('${route.d}')`,
                  animationDuration: `${seconds}s`,
                  animationDelay: `${-seeded(i, 2) * seconds * 2}s`,
                  '--tunic': tunics[i % tunics.length],
                } as CSSProperties
              }
            >
              <i />
            </span>
          );
        }),
      )}
    </>
  );
}

/*
 * Chaminés: fração da caixa do sprite, por arte e por nível de arte (a casa muda de forma
 * conforme cresce). Medidas sobre as próprias imagens em public/game/buildings.
 */
type Chimney = { tiers: Record<number, [number, number][]>; forge?: boolean };
const chimneys: Record<number, Chimney> = {
  // ferreiro: a forja solta fumaça escura e brasas
  11: {
    forge: true,
    tiers: { 1: [[0.52, 0.46]], 2: [[0.53, 0.44]], 3: [[0.52, 0.4]], 4: [[0.52, 0.4]] },
  },
  // armazém
  4: {
    tiers: {
      1: [[0.57, 0.14]],
      2: [[0.57, 0.04]],
      3: [
        [0.39, 0.21],
        [0.62, 0.03],
      ],
      4: [
        [0.39, 0.21],
        [0.63, 0.03],
      ],
      5: [
        [0.37, 0.3],
        [0.61, 0.1],
      ],
      6: [
        [0.37, 0.3],
        [0.6, 0.1],
      ],
    },
  },
  // casas
  2: {
    tiers: {
      1: [
        [0.28, 0.47],
        [0.51, 0.31],
      ],
      2: [
        [0.27, 0.39],
        [0.48, 0.25],
      ],
      3: [[0.47, 0.28]],
      4: [
        [0.26, 0.38],
        [0.46, 0.27],
      ],
      5: [
        [0.26, 0.38],
        [0.46, 0.27],
      ],
      6: [
        [0.27, 0.38],
        [0.46, 0.27],
      ],
    },
  },
  // quartel
  14: {
    tiers: {
      1: [[0.8, 0.48]],
      2: [[0.8, 0.43]],
      4: [[0.81, 0.45]],
      5: [[0.79, 0.28]],
      6: [[0.78, 0.25]],
    },
  },
  // academia
  18: { tiers: { 1: [[0.82, 0.18]] } },
};

function Smoke({ layers, phase }: { layers: SceneLayer[]; phase: DayPhase }) {
  return (
    <>
      {layers.flatMap(({ building, placed }) => {
        const chimney = chimneys[placed.artId];
        const points = chimney?.tiers[placed.tier];
        const box = spriteBox(placed);
        if (!chimney || !points || !box || building.level === 0) return [];
        return points.map(([fx, fy], c) => {
          const x = box.x + box.w * fx;
          const y = box.y + box.h * fy;
          return (
            <span
              key={`${building.code}-${c}`}
              className={`life-chimney${chimney.forge ? ' forge' : ''}${phase === 'night' ? ' night' : ''}`}
              style={{ left: px(x), top: px(y) }}
            >
              {[0, 1, 2, 3].map((puff) => (
                <i key={puff} style={{ animationDelay: `${-puff * 1.4}s` }} />
              ))}
              {chimney.forge
                ? [0, 1, 2].map((ember) => (
                    <b key={ember} style={{ animationDelay: `${-ember * 0.7}s` }} />
                  ))
                : null}
            </span>
          );
        });
      })}
    </>
  );
}

/* ---- Céu e água ---- */
const sparkles: [number, number][] = [
  [40, 172],
  [122, 214],
  [70, 282],
  [180, 262],
  [32, 352],
  [238, 196],
  [150, 140],
  [94, 236],
  [1222, 96],
  [1332, 102],
  [1452, 116],
  [1528, 98],
];

function Sky({ theme, phase }: { theme: SceneTheme; phase: DayPhase }) {
  const night = phase === 'night';
  const bats = theme === 'halloween';
  return (
    <>
      {!night
        ? [0, 1, 2].map((cloud) => (
            <span
              key={`cloud-${cloud}`}
              className="life-cloud"
              style={{
                top: px(120 + cloud * 300),
                animationDuration: `${120 + cloud * 35}s`,
                animationDelay: `${-cloud * 55}s`,
              }}
            />
          ))
        : null}
      {!night && theme !== 'halloween'
        ? sparkles.map(([x, y], i) => (
            <span
              key={`spark-${i}`}
              className="life-sparkle"
              style={{
                left: px(x),
                top: px(y),
                animationDelay: `${-seeded(i, 3) * 5}s`,
                animationDuration: `${3.5 + seeded(i, 4) * 3}s`,
              }}
            />
          ))
        : null}
      {(!night || bats) &&
        [0, 1].map((flock) => (
          <span
            key={`flock-${flock}`}
            className={`life-flock${bats ? ' bats' : ''}`}
            style={{
              top: px(140 + flock * 210),
              animationDuration: `${bats ? 30 : 38 + flock * 9}s`,
              animationDelay: `${-flock * 21 - 6}s`,
            }}
          >
            {[
              [0, 0],
              [-14, -7],
              [-14, 8],
              [-27, -13],
              [-26, 15],
            ]
              .slice(0, flock ? 3 : 5)
              .map(([dx, dy], bird) => (
                <i
                  key={bird}
                  style={{
                    left: px(dx ?? 0),
                    top: px(dy ?? 0),
                    animationDelay: `${-bird * 0.13}s`,
                  }}
                >
                  <svg viewBox="0 0 14 6" width="14" height="6" aria-hidden="true">
                    <path d="M0 4 Q3.5 0 7 3.6 Q10.5 0 14 4" />
                  </svg>
                </i>
              ))}
          </span>
        ))}
    </>
  );
}

/* ---- Noite: tochas nos portões, janelas acesas e vaga-lumes ---- */
const torches: [number, number][] = [
  [697, 700],
  [879, 432],
  [828, 486],
  [1088, 688],
  [790, 290],
];
const fireflyFields: Box[] = [
  { x: 120, y: 420, w: 260, h: 260 },
  { x: 1240, y: 360, w: 260, h: 300 },
  { x: 700, y: 820, w: 260, h: 150 },
  { x: 560, y: 560, w: 120, h: 70 },
];

function NightLights({ theme }: { theme: SceneTheme }) {
  return (
    <>
      {torches.map(([x, y], i) => (
        <span
          key={`torch-${i}`}
          className="life-torch"
          style={{ left: px(x), top: px(y), animationDelay: `${-seeded(i, 5) * 2}s` }}
        />
      ))}
      {theme === 'summer'
        ? fireflyFields.flatMap((field, f) =>
            Array.from({ length: 5 }, (_, n) => {
              const i = f * 10 + n;
              return (
                <span
                  key={`fly-${i}`}
                  className="life-firefly"
                  style={{
                    left: px(field.x + seeded(i, 6) * field.w),
                    top: px(field.y + seeded(i, 7) * field.h),
                    animationDuration: `${5 + seeded(i, 8) * 5}s, ${1.6 + seeded(i, 9) * 1.8}s`,
                    animationDelay: `${-seeded(i, 10) * 8}s, ${-seeded(i, 11) * 3}s`,
                  }}
                />
              );
            }),
          )
        : null}
    </>
  );
}

/* ---- Estações ---- */
function Weather({ theme }: { theme: SceneTheme }) {
  if (theme === 'winter')
    return (
      <>
        {Array.from({ length: 90 }, (_, i) => {
          const size = 2 + seeded(i, 12) * 3;
          return (
            <span
              key={`snow-${i}`}
              className="life-snow"
              style={{
                left: px(seeded(i, 13) * 1600),
                width: px(size),
                height: px(size),
                opacity: 0.55 + seeded(i, 14) * 0.45,
                animationDuration: `${10 + seeded(i, 15) * 10}s, ${2.5 + seeded(i, 16) * 2.5}s`,
                animationDelay: `${-seeded(i, 17) * 20}s, ${-seeded(i, 18) * 4}s`,
              }}
            />
          );
        })}
      </>
    );
  if (theme === 'halloween')
    return (
      <>
        {[0, 1, 2].map((band) => (
          <span
            key={`fog-${band}`}
            className="life-fog"
            style={{
              top: px(300 + band * 220),
              animationDuration: `${60 + band * 20}s`,
              animationDelay: `${-band * 25}s`,
            }}
          />
        ))}
      </>
    );
  return null;
}

/* ---- Obras: poeira e faíscas na base do edifício ---- */
function activeConstructions(layers: SceneLayer[], queue: Construction[], clock: number) {
  return layers.flatMap((layer) => {
    const event = queue.find((item) => item.buildingCode === layer.building.code);
    if (!event) return [];
    const start = new Date(event.startsAt).getTime();
    if (start > clock) return [];
    const box = spriteBox(layer.placed);
    return box ? [{ layer, box }] : [];
  });
}

function ConstructionDust({
  layers,
  queue,
  clock,
}: {
  layers: SceneLayer[];
  queue: Construction[];
  clock: number;
}) {
  return (
    <>
      {activeConstructions(layers, queue, clock).map(({ layer, box }) => (
        <span
          key={layer.building.code}
          className="life-works"
          style={{ left: px(box.x + box.w / 2), top: px(box.y + box.h * 0.78) }}
        >
          {[0, 1, 2, 3].map((puff) => (
            <i
              key={puff}
              style={
                {
                  '--dx': `${(puff - 1.5) * Math.min(40, box.w / 6)}px`,
                  animationDelay: `${-puff * 0.55}s`,
                } as CSSProperties
              }
            />
          ))}
          {[0, 1, 2].map((spark) => (
            <b
              key={spark}
              style={
                {
                  '--dx': `${(spark - 1) * 18}px`,
                  animationDelay: `${-spark * 0.4}s`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      ))}
    </>
  );
}

export function SceneLife({
  layers,
  queue,
  clock,
  theme,
  phase,
}: {
  layers: SceneLayer[];
  queue: Construction[];
  clock: number;
  theme: SceneTheme;
  phase: DayPhase;
}) {
  return (
    <div className={`scene-life phase-${phase}`} aria-hidden="true">
      <Walkers />
      <Smoke layers={layers} phase={phase} />
      <ConstructionDust layers={layers} queue={queue} clock={clock} />
      {phase === 'night' ? <NightLights theme={theme} /> : null}
      <Sky theme={theme} phase={phase} />
      <Weather theme={theme} />
    </div>
  );
}

/* ---- Por cima dos selos: martelo das obras e a comemoração de nível ---- */
type Burst = { id: number; code: string; level: number; x: number; y: number };

function anchorOf(placed: PlacedBuilding): { x: number; y: number } | null {
  if (placed.label) return { x: placed.label.left + 13, y: placed.label.top + 13 };
  const box = spriteBox(placed);
  return box ? { x: box.x + box.w / 2, y: box.y + box.h * 0.35 } : null;
}

export function SceneCelebrations({
  villageId,
  layers,
  queue,
  clock,
}: {
  /** Trocar de aldeia não é subir de nível: a memória dos níveis recomeça. */
  villageId: number;
  layers: SceneLayer[];
  queue: Construction[];
  clock: number;
}) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const levels = useRef<{ villageId: number; map: Map<string, number> } | null>(null);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const map = new Map(layers.map(({ building }) => [building.code, building.level]));
    const previous = levels.current?.villageId === villageId ? levels.current.map : null;
    levels.current = { villageId, map };
    if (!previous) return;
    const fresh: Burst[] = [];
    for (const { building, placed } of layers) {
      if (building.level <= (previous.get(building.code) ?? 0)) continue;
      const anchor = anchorOf(placed);
      if (anchor)
        fresh.push({
          id: nextId.current++,
          code: building.code,
          level: building.level,
          ...anchor,
        });
    }
    if (!fresh.length) return;
    setBursts((list) => [...list, ...fresh]);
    const ids = new Set(fresh.map((item) => item.id));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setBursts((list) => list.filter((item) => !ids.has(item.id)));
    }, 2800);
    timers.current.add(timer);
  }, [layers, villageId]);

  return (
    <div className="scene-celebrations" aria-hidden="true">
      {activeConstructions(layers, queue, clock).flatMap(({ layer }) => {
        const label = layer.placed.label;
        if (!label || layer.building.code === 'main') return [];
        return [
          <span
            key={`hammer-${layer.building.code}`}
            className="life-hammer"
            // À esquerda do brasão: à direita fica o tempo da obra, que o martelo cobria.
            style={{ left: px(label.left - 22), top: px(label.top - 6) }}
          >
            <Hammer size={14} strokeWidth={2.4} />
          </span>,
        ];
      })}
      {bursts.map((burst) => (
        <span key={burst.id} className="life-burst" style={{ left: px(burst.x), top: px(burst.y) }}>
          <i className="life-burst-ring" />
          <i className="life-burst-rays" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <b key={n} style={{ '--angle': `${n * 45 + 10}deg` } as CSSProperties} />
          ))}
          <strong>Nível {burst.level}</strong>
        </span>
      ))}
    </div>
  );
}

import type { CSSProperties } from 'react';
import type { CaravanLot, CaravanResource, Resources } from '@dwar/api-client';

const order: CaravanResource[] = ['wood', 'stone', 'iron'];
const total = (lot: Resources) => lot.wood + lot.stone + lot.iron;

/** Um volume de carga: feixe de toras, fardo de argila ou pilha de lingotes. */
function Bale({ code }: { code: CaravanResource }) {
  if (code === 'wood')
    return (
      <>
        {[
          [7, 17],
          [20, 17],
          [13.5, 7],
        ].map(([cx, cy]) => (
          <g key={`${cx}`}>
            <circle cx={cx} cy={cy} r={6.6} fill="#6d4526" stroke="#2c190c" strokeWidth={1.2} />
            <circle cx={cx} cy={cy} r={4.4} fill="#c79358" />
            <circle cx={cx} cy={cy} r={2.1} fill="none" stroke="#8d5d30" strokeWidth={0.9} />
          </g>
        ))}
      </>
    );
  if (code === 'stone')
    return (
      <>
        <path
          d="M3 23 Q1 10 8 5 L19 5 Q26 10 24 23 Z"
          fill="#b4613a"
          stroke="#3d1a0c"
          strokeWidth={1.2}
        />
        <path d="M8 5 Q13.5 1 19 5 L17 8 H10 Z" fill="#d98a5b" stroke="#3d1a0c" />
        <path d="M3.4 15 H23.8" stroke="#6b3117" strokeWidth={1.6} />
      </>
    );
  return (
    <>
      <path d="M1 24 L4 15 H13 L16 24 Z" fill="#7d8b99" stroke="#1c242c" strokeWidth={1.1} />
      <path d="M12 24 L15 15 H24 L27 24 Z" fill="#6a7885" stroke="#1c242c" strokeWidth={1.1} />
      <path d="M6.5 15 L9.5 6 H18.5 L21.5 15 Z" fill="#a9b7c3" stroke="#1c242c" strokeWidth={1.1} />
      <path d="M10.5 8.5 H17.5" stroke="#e4edf3" strokeWidth={1.2} />
    </>
  );
}

/** Pilha de um recurso: até dez volumes; o último encolhe conforme a fração que falta. */
function Stack({ code, amount, unit }: { code: CaravanResource; amount: number; unit: number }) {
  const exact = amount / unit;
  const count = Math.min(10, Math.ceil(exact));
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const part = Math.min(1, Math.max(0.35, exact - index));
        return (
          <g
            key={index}
            className="cv-bale"
            style={
              {
                '--x': `${(index % 2) * 27 + (Math.floor(index / 2) % 2) * 3}px`,
                '--y': `${-Math.floor(index / 2) * 22}px`,
                '--s': part,
              } as CSSProperties
            }
          >
            <Bale code={code} />
          </g>
        );
      })}
    </>
  );
}

function Wheel({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 176)`}>
      <circle r={34} fill="#1a0f08" />
      <circle r={33} fill="none" stroke="#7a4d29" strokeWidth={7} />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M0 -6 V-29"
          stroke="#8b5a31"
          strokeWidth={4}
          transform={`rotate(${i * 45})`}
        />
      ))}
      <circle r={8} fill="#b7853f" stroke="#2a180b" strokeWidth={2} />
    </g>
  );
}

function Ox() {
  return (
    <g fill="#54402f" stroke="#1a100a" strokeWidth={1.5}>
      <path d="M0 150 Q-4 118 26 112 L92 108 Q112 92 128 100 L146 112 Q150 122 138 126 L122 126 Q116 142 104 148 L104 202 H92 L90 158 L40 160 L36 202 H24 L22 160 Q8 160 0 150 Z" />
      <path
        d="M124 101 Q118 84 130 78 M134 103 Q136 86 150 84"
        fill="none"
        stroke="#e9dcc0"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M0 148 Q-12 160 -8 184" fill="none" stroke="#54402f" strokeWidth={4} />
      <path d="M96 104 Q110 132 98 150" fill="none" stroke="#b7853f" strokeWidth={6} />
    </g>
  );
}

export function LotEmblem({ lot, size = 28 }: { lot: CaravanLot; size?: number }) {
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} aria-hidden="true">
      {lot === 'sun' ? (
        <g fill="#f0b64c">
          <circle r={7} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M-2.4 -9 L0 -15 L2.4 -9 Z" transform={`rotate(${i * 45})`} />
          ))}
        </g>
      ) : (
        <path d="M4 -12 A12 12 0 1 0 11 7 A10 10 0 0 1 4 -12 Z" fill="#cfdcf2" />
      )}
    </svg>
  );
}

/** A carroça: a lona recolhida deixa ver a carga; a cor e o símbolo dizem qual é. */
export function Wagon({
  lot,
  load,
  unit,
}: {
  lot: CaravanLot;
  load: Resources;
  /** Quanto vale um volume empilhado. */
  unit: number;
}) {
  const cloth = lot === 'sun' ? ['#c4512f', '#e9b25c'] : ['#31508a', '#b9c9e6'];
  return (
    <g className="cv-wagon" data-lot={lot}>
      <ellipse cx={180} cy={212} rx={220} ry={12} fill="#000" opacity={0.35} />
      <g transform="translate(330 0)">
        <Ox />
      </g>
      <path d="M290 150 L352 136" stroke="#5a3719" strokeWidth={7} />
      {/* arcos de trás */}
      <path
        d="M22 132 V58 Q22 12 70 12 H226 Q274 12 274 58 V132"
        fill="none"
        stroke="#5a3719"
        strokeWidth={6}
      />
      <path d="M36 128 V62 Q36 26 72 26 H224 Q260 26 260 62 V128 Z" fill="#120b07" opacity={0.5} />
      <g transform="translate(40 104)">
        {order.map((code, index) => (
          <g key={code} transform={`translate(${index * 72} 0)`}>
            <Stack code={code} amount={load[code]} unit={unit} />
          </g>
        ))}
      </g>
      {/* lona enrolada no alto, listrada na cor da carroça */}
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M${24 + i * 28} 34 Q${38 + i * 28} 54 ${52 + i * 28} 34 L${50 + i * 28} 6 Q${38 + i * 28} 0 ${26 + i * 28} 6 Z`}
          fill={cloth[i % 2]}
          stroke="#1b0f08"
          strokeWidth={1.2}
        />
      ))}
      {/* caçamba */}
      <path d="M8 124 H288 L276 164 H20 Z" fill="#6a4223" stroke="#24140a" strokeWidth={2.5} />
      <path d="M12 137 H284 M16 150 H280" stroke="#3f2612" strokeWidth={2} />
      {[60, 148, 236].map((x) => (
        <path key={x} d={`M${x} 124 V164`} stroke="#b7853f" strokeWidth={4} />
      ))}
      <Wheel x={66} />
      <Wheel x={230} />
      {/* estandarte */}
      <path d="M10 124 V-34" stroke="#4d2f16" strokeWidth={5} />
      <path d="M12 -34 H64 L54 -16 L64 2 H12 Z" fill={cloth[0]} stroke="#1b0f08" />
      <svg x={18} y={-32} width={32} height={32} viewBox="-16 -16 32 32">
        {lot === 'sun' ? (
          <g fill="#ffd98a">
            <circle r={6} />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M-2.2 -8 L0 -13 L2.2 -8 Z" transform={`rotate(${i * 45})`} />
            ))}
          </g>
        ) : (
          <path d="M3 -11 A11 11 0 1 0 10 6 A9 9 0 0 1 3 -11 Z" fill="#e8effc" />
        )}
      </svg>
    </g>
  );
}

/**
 * Fronteira ao cair da tarde: de um lado ainda é dia, do outro já é noite. No meio, o marco, o
 * caravaneiro e a balança, que pende para a carroça mais pesada.
 */
export function CaravanScene({
  sun,
  moon,
  toll,
  unit,
  mine,
  leaving,
}: {
  sun: Resources;
  moon: Resources;
  toll: number;
  unit: number;
  mine?: CaravanLot | null;
  leaving?: boolean;
}) {
  const weight = total(sun) + total(moon) || 1;
  const tilt = ((total(moon) - total(sun)) / weight) * 16;
  const coffer = Math.min(6, Math.ceil(toll / (unit * 0.6)));
  return (
    <svg
      className="cv-scene"
      viewBox="0 0 1274 330"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Duas carroças paradas junto ao marco da fronteira"
      data-leaving={leaving ? 'true' : undefined}
    >
      <defs>
        <linearGradient id="cv-sky" x1="0" x2="1">
          <stop offset="0" stopColor="#e98f4a" />
          <stop offset="0.36" stopColor="#a8536a" />
          <stop offset="0.66" stopColor="#3c3a72" />
          <stop offset="1" stopColor="#141c3d" />
        </linearGradient>
        <linearGradient id="cv-glow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0d1030" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#f2b878" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="cv-ground" x1="0" x2="1">
          <stop offset="0" stopColor="#6b5a2e" />
          <stop offset="0.5" stopColor="#3f4030" />
          <stop offset="1" stopColor="#1b2734" />
        </linearGradient>
      </defs>
      <rect width="1274" height="330" fill="url(#cv-sky)" />
      <rect width="1274" height="330" fill="url(#cv-glow)" />
      <circle cx="120" cy="176" r="58" fill="#ffd98a" opacity="0.95" />
      <circle cx="120" cy="176" r="92" fill="#ffc870" opacity="0.22" />
      <path
        d="M1168 34 A34 34 0 1 0 1190 92 A28 28 0 0 1 1168 34 Z"
        transform="translate(-150 -6)"
        fill="#e8effc"
      />
      {[
        [760, 40],
        [830, 88],
        [905, 30],
        [968, 70],
        [1040, 34],
        [1078, 110],
        [1242, 52],
        [1110, 150],
      ].map(([x, y]) => (
        <circle key={`${x}`} cx={x} cy={y} r={1.6} fill="#dfe7ff" />
      ))}
      <path
        d="M0 232 L90 196 L180 220 L270 178 L360 214 L470 186 L560 222 L660 190 L760 226 L880 182 L980 218 L1090 176 L1180 214 L1274 188 V330 H0 Z"
        fill="#241a35"
        opacity="0.75"
      />
      <path d="M0 252 Q320 222 640 246 T1274 244 V330 H0 Z" fill="url(#cv-ground)" />
      {/* estradas que se afastam do marco */}
      <path d="M637 262 Q420 268 0 300 V330 H520 Q600 300 637 262 Z" fill="#a98a55" opacity="0.5" />
      <path
        d="M637 262 Q854 268 1274 300 V330 H754 Q674 300 637 262 Z"
        fill="#59627a"
        opacity="0.5"
      />
      <g className="cv-slot" data-side="sun" data-mine={mine === 'sun' ? 'true' : undefined}>
        <g transform="translate(498 88) scale(-0.95 0.95)">
          <g className="cv-roll">
            <Wagon lot="sun" load={sun} unit={unit} />
          </g>
        </g>
      </g>
      <g className="cv-slot" data-side="moon" data-mine={mine === 'moon' ? 'true' : undefined}>
        <g transform="translate(776 88) scale(0.95)">
          <g className="cv-roll">
            <Wagon lot="moon" load={moon} unit={unit} />
          </g>
        </g>
      </g>
      {/* marco da fronteira */}
      <path
        d="M604 298 L612 196 Q637 176 662 196 L670 298 Z"
        fill="#8f887c"
        stroke="#262229"
        strokeWidth={3}
      />
      <path d="M637 206 V284 M622 232 H652" stroke="#4b463f" strokeWidth={4} />
      {/* balança */}
      <path d="M637 192 V74" stroke="#5b3c1c" strokeWidth={7} />
      <circle cx="637" cy="72" r="8" fill="#e0ae55" stroke="#2a180b" strokeWidth={2} />
      <g className="cv-beam" style={{ transform: `rotate(${tilt}deg)` }}>
        <path d="M552 74 H722" stroke="#c9964a" strokeWidth={6} strokeLinecap="round" />
        {[552, 722].map((x) => (
          <g
            key={x}
            className="cv-pan"
            style={{ transform: `rotate(${-tilt}deg)`, transformOrigin: `${x}px 74px` }}
          >
            <path
              d={`M${x} 74 L${x - 24} 116 M${x} 74 L${x + 24} 116`}
              stroke="#2a180b"
              strokeWidth={2}
            />
            <path
              d={`M${x - 30} 116 H${x + 30} Q${x} 138 ${x - 30} 116 Z`}
              fill="#c9964a"
              stroke="#2a180b"
              strokeWidth={2}
            />
            <svg x={x - 13} y={92} width={26} height={26} viewBox="-16 -16 32 32">
              {x === 552 ? (
                <circle r={10} fill="#ffd98a" />
              ) : (
                <path d="M4 -12 A12 12 0 1 0 11 7 A10 10 0 0 1 4 -12 Z" fill="#e8effc" />
              )}
            </svg>
          </g>
        ))}
      </g>
      {/* caravaneiro */}
      <g transform="translate(676 196)">
        <path
          d="M4 104 Q-6 46 14 30 Q34 46 30 104 Z"
          fill="#4a2030"
          stroke="#170a10"
          strokeWidth={2}
        />
        <path d="M4 34 Q16 4 28 34 Q16 44 4 34 Z" fill="#6d3145" stroke="#170a10" strokeWidth={2} />
        <path d="M10 32 Q16 22 22 32 Q16 38 10 32 Z" fill="#1c0e0a" />
        <path d="M34 8 V104" stroke="#5a3719" strokeWidth={4} />
        <circle cx="34" cy="14" r="7" fill="#ffd27a" />
        <circle cx="34" cy="14" r="18" fill="#ffd27a" opacity="0.2" />
      </g>
      {/* arca do pedágio */}
      <g transform="translate(556 268)">
        <path d="M0 14 H44 V40 H0 Z" fill="#5a3719" stroke="#1d0f07" strokeWidth={2} />
        <path d="M0 14 Q22 4 44 14" fill="none" stroke="#b7853f" strokeWidth={3} />
        {Array.from({ length: coffer }, (_, i) => (
          <circle
            key={i}
            cx={7 + i * 6}
            cy={11 - (i % 2) * 4}
            r={4.4}
            fill="#e0ae55"
            stroke="#4d2f16"
          />
        ))}
      </g>
    </svg>
  );
}

/** Silhueta da caravana no mapa e no portão da aldeia: boi, lona alta e dois estandartes. */
export function CaravanGlyph({ single }: { single?: CaravanLot }) {
  const cloth = single === 'moon' ? '#31508a' : '#c4512f';
  return (
    <g>
      <ellipse cx={30} cy={50} rx={30} ry={5} fill="#000" opacity={0.45} />
      <path
        d="M39 34 Q40 27 47 27 L54 24 L59 28 L56 33 L53 33 L53 48 H50 L49 38 L43 38 L42 48 H39 Z"
        fill="#2c1e16"
      />
      <path d="M54 25 Q53 20 57 19" fill="none" stroke="#f2e6c8" strokeWidth={1.8} />
      <path
        d="M4 36 Q4 12 20 11 Q37 12 37 36 Z"
        fill="#efe0bd"
        stroke="#22130a"
        strokeWidth={1.6}
      />
      <path d="M4 36 Q4 12 20 11 L20 36 Z" fill={cloth} stroke="#22130a" strokeWidth={1.6} />
      {single ? null : (
        <path d="M20 11 Q37 12 37 36 H20 Z" fill="#31508a" stroke="#22130a" strokeWidth={1.6} />
      )}
      <path d="M2 35 H40 L38 43 H4 Z" fill="#6a4223" stroke="#22130a" strokeWidth={1.6} />
      {[11, 31].map((x) => (
        <g key={x}>
          <circle cx={x} cy={45} r={6.5} fill="#1a0f08" stroke="#b7853f" strokeWidth={2.4} />
          <path d={`M${x - 5} 45 H${x + 5} M${x} 40 V50`} stroke="#b7853f" strokeWidth={1.4} />
        </g>
      ))}
      <path d="M20 11 V1" stroke="#22130a" strokeWidth={1.8} />
      <path d="M20 1 L31 4 L20 8 Z" fill="#ffd98a" stroke="#22130a" />
    </g>
  );
}

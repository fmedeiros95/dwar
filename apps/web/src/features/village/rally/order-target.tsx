import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Swords, TriangleAlert } from 'lucide-react';
import { api, type PublicVillage, type RallySnapshot, type TroopCounts } from '@dwar/api-client';
import { MapCrest, ownerColor, ownerKind, type OwnerKind } from '../map/map-legend.js';
import { numbers } from '../shared/index.js';
import { unitIconSrc, unitIconSrcSet } from '../../../components/unit-icon.js';

/** Como o jogo chama cada tipo de dono, nas mesmas palavras da legenda do mapa. */
export const relationLabel: Record<OwnerKind, string> = {
  current: 'Esta aldeia',
  own: 'Sua aldeia',
  tribe: 'Sua tribo',
  ally: 'Tribo aliada',
  nap: 'Pacto de não agressão',
  enemy: 'Tribo inimiga',
  marked: 'Jogador marcado',
  player: 'Outro jogador',
  barbarian: 'Aldeia abandonada',
};
/** Atacar estes donos quase sempre é engano. */
const friendly: OwnerKind[] = ['current', 'own', 'tribe', 'ally', 'nap'];

export type OrderTargetInfo = {
  village: PublicVillage | null;
  kind: OwnerKind | null;
  color: string;
  loading: boolean;
};

/** Quem está em X|Y, com tribo e relação, a partir do mesmo recorte de mapa que o mapa usa. */
export function useOrderTarget(
  worldId: number,
  villageId: number,
  x: number | null,
  y: number | null,
): OrderTargetInfo {
  const valid = x !== null && y !== null && x >= 0 && y >= 0 && x <= 999 && y <= 999;
  const lookup = useQuery({
    queryKey: ['order-target', worldId, villageId, x, y],
    queryFn: () => api.map(worldId, villageId, x!, y!, 1),
    enabled: valid,
    staleTime: 30_000,
  });
  const map = lookup.data;
  const village = map?.villages.find((item) => item.x === x && item.y === y) ?? null;
  if (!map || !village)
    return { village: null, kind: null, color: '', loading: valid && lookup.isPending };
  const args = [village, villageId, map.marks, map.ownTribeId, map.tribeRelations] as const;
  return { village, kind: ownerKind(...args), color: ownerColor(...args), loading: false };
}

function OwnerLine({ village, kind }: { village: PublicVillage; kind: OwnerKind }) {
  return (
    <span className="order-target-owner">
      <b>{relationLabel[kind]}</b>
      {village.playerId !== null && !village.own ? <> · {village.username}</> : null}
      {village.tribe ? <> · [{village.tribe.tag}]</> : null} · {numbers.format(village.points)} pts
    </span>
  );
}

/** Destino da ordem, logo abaixo das coordenadas: o jogador vê de quem é antes de escolher. */
export function OrderTarget({
  info,
  x,
  y,
  attack,
}: {
  info: OrderTargetInfo;
  x: string;
  y: string;
  attack: boolean;
}) {
  if (!x || !y) return <p className="order-target empty">Digite as coordenadas do destino.</p>;
  if (info.loading)
    return (
      <p className="order-target empty">
        Procurando a aldeia em {x}|{y}…
      </p>
    );
  if (!info.village || !info.kind)
    return (
      <p className="order-target empty" role="status">
        Nenhuma aldeia em {x}|{y}.
      </p>
    );
  const warn = attack && friendly.includes(info.kind);
  return (
    <div className="order-target" data-owner={info.kind} role="status">
      <span className="order-target-crest">
        {info.kind === 'barbarian' ? (
          <span className="map-legend-none" aria-hidden="true" />
        ) : (
          <MapCrest kind={info.kind} color={info.color} />
        )}
      </span>
      <span className="order-target-text">
        <strong>{info.village.name}</strong>
        <OwnerLine village={info.village} kind={info.kind} />
      </span>
      {warn ? (
        <span className="order-target-warn">
          <TriangleAlert size={14} aria-hidden="true" /> Você vai atacar{' '}
          {info.kind === 'own' || info.kind === 'current'
            ? 'uma aldeia sua'
            : info.kind === 'tribe'
              ? 'alguém da sua tribo'
              : 'uma tribo com acordo'}
          .
        </span>
      ) : null}
    </div>
  );
}

/**
 * Faixa da revisão: responde de relance para onde, quem vai e se é ataque ou apoio.
 * Ataque e apoio diferem por cor, símbolo (espadas ou escudo) e palavra.
 */
export function OrderBanner({
  worldId,
  villageId,
  attack,
  target,
  types,
  troops,
  arrival,
}: {
  worldId: number;
  villageId: number;
  attack: boolean;
  target: PublicVillage;
  types: RallySnapshot['unitTypes'];
  troops: TroopCounts;
  arrival: string;
}) {
  const info = useOrderTarget(worldId, villageId, target.x, target.y);
  const kind =
    info.kind ?? (target.playerId === null ? 'barbarian' : target.own ? 'own' : 'player');
  const sent = types.filter(({ code }) => (troops[code] ?? 0) > 0);
  const total = sent.reduce((sum, { code }) => sum + (troops[code] ?? 0), 0);
  const Icon = attack ? Swords : Shield;
  // A janela guarda a rolagem do formulário; a faixa precisa ser a primeira coisa vista.
  const banner = useRef<HTMLElement>(null);
  useEffect(() => {
    banner.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  return (
    <section
      ref={banner}
      className="order-banner"
      data-kind={attack ? 'attack' : 'support'}
      aria-label={`${attack ? 'Ataque' : 'Apoio'} a ${target.name} com ${total} unidades`}
    >
      <div className="order-banner-kind">
        <Icon size={22} aria-hidden="true" />
        <span>{attack ? 'Ataque' : 'Apoio'}</span>
      </div>
      <div className="order-banner-target">
        <small>Para</small>
        <span className="order-banner-place">
          {kind === 'barbarian' ? (
            <span className="map-legend-none" aria-hidden="true" />
          ) : (
            <MapCrest kind={kind} color={info.color || '#9a6236'} />
          )}
          <strong>{target.name}</strong>
          <em>
            {target.x}|{target.y}
          </em>
        </span>
        <OwnerLine village={target} kind={kind} />
        {attack && friendly.includes(kind) ? (
          <span className="order-target-warn">
            <TriangleAlert size={14} aria-hidden="true" /> Este alvo não é inimigo.
          </span>
        ) : null}
      </div>
      <div className="order-banner-troops">
        <small>
          Quem vai · <b>{numbers.format(total)}</b> · chega {arrival}
        </small>
        <ul>
          {sent.map(({ code, name }) => (
            <li key={code} title={`${numbers.format(troops[code] ?? 0)} ${name}`}>
              <img src={unitIconSrc(code)} srcSet={unitIconSrcSet(code)} alt="" />
              <strong>{numbers.format(troops[code] ?? 0)}</strong>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

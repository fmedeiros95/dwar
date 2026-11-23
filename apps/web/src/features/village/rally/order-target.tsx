import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { api, type PublicVillage } from '@dwar/api-client';
import { MapCrest, ownerColor, ownerKind, type OwnerKind } from '../map/map-legend.js';
import { numbers } from '../shared/index.js';

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
/** O jogo não aceita ordens entre aldeias do mesmo jogador. */
export const ownTarget = (kind: OwnerKind) => kind === 'current' || kind === 'own';
/** Atacar estes donos quase sempre é engano. */
export const friendly: OwnerKind[] = ['current', 'own', 'tribe', 'ally', 'nap'];

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
  const own = ownTarget(info.kind);
  const warn = attack && !own && friendly.includes(info.kind);
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
      {own ? (
        <span className="order-target-warn">
          <TriangleAlert size={14} aria-hidden="true" /> Ordens não valem entre as suas próprias
          aldeias.
        </span>
      ) : warn ? (
        <span className="order-target-warn">
          <TriangleAlert size={14} aria-hidden="true" /> Você vai atacar{' '}
          {info.kind === 'tribe' ? 'alguém da sua tribo' : 'uma tribo com acordo'}.
        </span>
      ) : null}
    </div>
  );
}

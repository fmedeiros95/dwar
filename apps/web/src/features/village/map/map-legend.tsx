import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicVillage, type MapSnapshot } from '@dwar/api-client';
import { duration, numbers } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

export function villageGraphic(points: number): number {
  return points < 300
    ? 1
    : points < 1000
      ? 2
      : points < 3000
        ? 3
        : points < 9000
          ? 4
          : points < 12000
            ? 5
            : 6;
}

export function ownerColor(village: PublicVillage, currentId: number, marks: MapSnapshot['marks']) {
  return village.id === currentId
    ? '#ffffff'
    : village.own
      ? '#f0c800'
      : (marks.find((mark) => mark.playerId === village.playerId)?.color ??
        (village.playerId ? '#823c0a' : '#969696'));
}

const villageLegend = [
  ['#ffffff', 'Aldeia atual'],
  ['#f0c800', 'Suas aldeias'],
  ['#0000f4', 'Sua tribo'],
  ['#969696', 'Aldeias abandonadas'],
  ['#823c0a', 'Outras aldeias'],
];
const tribeLegend = [
  ['#00a0f4', 'Aliados'],
  ['#800080', 'Pacto de não agressão'],
  ['#f40000', 'Inimigos'],
];

export function MapLegend() {
  return (
    <table className="legacy-table world-map-legend">
      <tbody>
        {[
          { label: 'Aldeias:', items: villageLegend },
          { label: 'Tribos:', items: tribeLegend },
        ].map(({ label, items }) => (
          <tr key={label}>
            <td>{label}</td>
            {items.map(([color, name]) => (
              <Fragment key={color}>
                <td className="map-legend-swatch" style={{ backgroundColor: color }} />
                <td>{name}</td>
              </Fragment>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Popup que acompanha o mouse sobre uma aldeia. Mostra de imediato o que o mapa já sabe e
 * completa com os detalhes do servidor (distância, moral, proteção, tropas e tempos de viagem).
 */
export function VillagePopup({
  village,
  x,
  y,
  worldId,
  currentVillageId,
  showUnits,
  showTimes,
}: {
  village: PublicVillage;
  x: number;
  y: number;
  worldId: number;
  currentVillageId: number;
  showUnits: boolean;
  showTimes: boolean;
}) {
  const info = useQuery({
    queryKey: ['village-popup', worldId, currentVillageId, village.id],
    queryFn: () => api.villagePopup(worldId, currentVillageId, village.id),
    staleTime: 10000,
  });
  const detail = info.data;
  const abandoned = village.playerId === null;
  const troops = detail?.units.filter((unit) => (unit.home ?? 0) + (unit.foreign ?? 0) > 0) ?? [];
  const travel = detail && !detail.current ? detail.units : [];
  const blocked = detail?.protectedUntil
    ? `Proteção de iniciante até ${shortDate.format(new Date(detail.protectedUntil))}`
    : detail?.pointRatioBlocked
      ? 'Fora da proporção de pontos para atacar'
      : null;
  return createPortal(
    <div
      className="village-popup"
      style={{
        left: Math.max(3, Math.min(x + 15, window.innerWidth - 335)),
        // Sem espaço embaixo, o popup abre para cima e fica colado ao cursor.
        ...(y + 320 < window.innerHeight
          ? { top: y + 15 }
          : { bottom: window.innerHeight - y + 15, maxHeight: Math.max(120, y - 20) }),
      }}
      role="tooltip"
    >
      <header>
        <strong>{village.name}</strong>
        <span>
          ({village.x}|{village.y}){' '}
          K{Math.floor(village.y / 100)}
          {Math.floor(village.x / 100)}
        </span>
      </header>
      <dl>
        <dt>Pontos</dt>
        <dd>{numbers.format(village.points)}</dd>
        <dt>Jogador</dt>
        <dd>
          {abandoned ? (
            <em>Abandonada</em>
          ) : (
            <>
              {village.username}
              <small> {numbers.format(village.playerPoints)} pontos</small>
            </>
          )}
        </dd>
        {detail ? (
          <>
            {detail.current ? null : (
              <>
                <dt>Distância</dt>
                <dd>{detail.distance.toLocaleString('pt-BR')} campos</dd>
              </>
            )}
            {detail.morale !== null ? (
              <>
                <dt>Moral</dt>
                <dd>{detail.morale}%</dd>
              </>
            ) : null}
          </>
        ) : null}
      </dl>
      {detail?.current ? <p className="pop-tag">Aldeia atual</p> : null}
      {detail?.own && !detail.current ? <p className="pop-tag">Sua aldeia</p> : null}
      {blocked ? <p className="pop-warn">{blocked}</p> : null}
      {!detail ? (
        <p className="pop-loading">{info.isError ? 'Detalhes indisponíveis.' : 'Carregando detalhes…'}</p>
      ) : null}
      {showUnits && detail?.own ? (
        <section aria-label="Tropas na aldeia">
          <h3>Tropas na aldeia</h3>
          {troops.length ? (
            <ul className="pop-grid">
              {troops.map((unit) => (
                <li key={unit.code} title={unit.name}>
                  <img src={unitIconSrc(unit.code)} alt={unit.name} width="26" height="26" />
                  <b>{numbers.format((unit.home ?? 0) + (unit.foreign ?? 0))}</b>
                  {unit.foreign ? <small>({numbers.format(unit.home ?? 0)} suas)</small> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pop-loading">Nenhuma tropa.</p>
          )}
        </section>
      ) : null}
      {showTimes && travel.length ? (
        <section aria-label="Tempo de viagem">
          <h3>Tempo de viagem</h3>
          <ul className="pop-grid">
            {travel.map((unit) => (
              <li key={unit.code} title={unit.name}>
                <img src={unitIconSrc(unit.code)} alt={unit.name} width="26" height="26" />
                <b>{duration(unit.seconds ?? 0)}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>,
    document.body,
  );
}

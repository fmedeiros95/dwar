import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import type { PublicVillage, MapSnapshot } from '@dwar/api-client';
import { numbers } from '../shared/index.js';

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

export function VillagePopup({ village, x, y }: { village: PublicVillage; x: number; y: number }) {
  return createPortal(
    <div
      className="world-map-popup"
      style={{
        left: Math.max(3, Math.min(x + 15, window.innerWidth - 345)),
        top: y + 100 < window.innerHeight ? y + 15 : Math.max(3, y - 100),
      }}
      role="tooltip"
    >
      <table className="legacy-table">
        <thead>
          <tr>
            <th colSpan={2}>
              {village.name} ({village.x}|{village.y}) K{Math.floor(village.y / 100)}
              {Math.floor(village.x / 100)}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pontos:</td>
            <td>{numbers.format(village.points)}</td>
          </tr>
          <tr>
            <td>Proprietário:</td>
            <td>
              {village.username}
              {village.playerId ? ` (${numbers.format(village.playerPoints)} pontos)` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body,
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { arrivalDate, duration } from './format.js';

type Place = { name: string; x: number; y: number };

/**
 * Algo a caminho (comando de tropas ou remessa de mercadores): tipo, rota, o que leva,
 * quanto falta e, quando dá, a ação de cancelar.
 */
export function TransitRow({
  tone,
  icon,
  label,
  from,
  to,
  startsAt,
  endsAt,
  clock,
  children,
  action,
}: {
  tone: 'attack' | 'support' | 'return' | 'trade' | 'incoming';
  icon: ReactNode;
  label: string;
  from: Place;
  to: Place;
  startsAt: string;
  endsAt: string;
  clock: number;
  /** O que viaja (tropas ou carga). */
  children?: ReactNode;
  action?: ReactNode;
}) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const progress = Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
  return (
    <li className={`transit-row ${tone}`} style={{ '--progress': progress } as CSSProperties}>
      <span className="transit-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="transit-main">
        <div className="transit-route">
          <strong>{label}</strong>
          <span>
            {from.name}{' '}
            <small>
              ({from.x}|{from.y})
            </small>
            <span className="transit-arrow" aria-hidden="true">
              →
            </span>
            {to.name}{' '}
            <small>
              ({to.x}|{to.y})
            </small>
          </span>
        </div>
        {children ? <div className="transit-load">{children}</div> : null}
        <span className="transit-bar" aria-hidden="true" />
      </div>
      <div className="transit-time">
        <time dateTime={endsAt}>{duration((end - clock) / 1000)}</time>
        <small>{arrivalDate(endsAt, clock)}</small>
      </div>
      {action ? <div className="transit-action">{action}</div> : null}
    </li>
  );
}

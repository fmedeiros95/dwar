import type { ReactNode } from 'react';
import { completionDate, duration, numbers } from './format.js';

type Place = { name: string; x: number; y: number };

/**
 * Resumo de uma viagem (tropas ou mercadores) para conferir antes de confirmar: de onde sai, para
 * onde vai, a distância, quanto demora e quando cada etapa acontece.
 */
export function TripSummary({
  label,
  tone,
  origin,
  target,
  targetNote,
  distance,
  durationSeconds,
  departsAt,
  arrivesAt,
  returnsAt,
  returnLabel,
  clock,
  footnote,
}: {
  /** Tipo da viagem: "Ataque", "Apoio" ou "Remessa". */
  label: string;
  tone: 'attack' | 'support' | 'trade';
  origin: Place;
  target: Place;
  /** Linha de apoio sob o destino (dono e pontos). */
  targetNote: ReactNode;
  distance: number;
  durationSeconds: number;
  departsAt: string;
  arrivesAt: string;
  returnsAt: string | null;
  returnLabel?: string;
  clock: number;
  footnote?: ReactNode;
}) {
  const steps = [
    { name: 'Saída', value: departsAt, text: 'agora' },
    { name: 'Chegada', value: arrivesAt, text: completionDate(arrivesAt, clock) },
    ...(returnsAt
      ? [
          {
            name: returnLabel ?? 'Retorno',
            value: returnsAt,
            text: completionDate(returnsAt, clock),
          },
        ]
      : []),
  ];
  return (
    <section className={`trip ${tone}`} aria-label="Resumo da viagem">
      <div className="trip-route">
        <div className="trip-end">
          <small>Origem</small>
          <strong>{origin.name}</strong>
          <span>
            {origin.x}|{origin.y}
          </span>
        </div>
        <div className="trip-line" aria-hidden="true">
          <span className="trip-kind">{label}</span>
          <i />
          <span>
            {numbers.format(Math.round(distance * 10) / 10)} campos · {duration(durationSeconds)}
          </span>
        </div>
        <div className="trip-end target">
          <small>Destino</small>
          <strong>{target.name}</strong>
          <span>
            {target.x}|{target.y}
          </span>
          <em>{targetNote}</em>
        </div>
      </div>
      <ol className="trip-steps">
        {steps.map((step) => (
          <li key={step.name}>
            <small>{step.name}</small>
            <time dateTime={step.value}>{step.text}</time>
          </li>
        ))}
      </ol>
      {footnote ? <p className="trip-note">{footnote}</p> : null}
    </section>
  );
}

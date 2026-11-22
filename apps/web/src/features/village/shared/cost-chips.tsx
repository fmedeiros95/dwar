import { Clock } from 'lucide-react';
import type { Resources } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from './format.js';
import type { Have } from './current-resources.js';

/**
 * Custo como fichas: cada recurso (em vermelho o que falta, com quanto falta no título),
 * população e tempo. Usado em obras, pesquisas, tropas e na academia.
 */
export function CostChips({
  cost,
  have,
  population,
  seconds,
  label,
  multiplier = 1,
}: {
  cost: Resources;
  have: Have;
  population?: number;
  seconds?: number;
  label: string;
  /** Quantas vezes o custo (ex.: lote de tropas). */
  multiplier?: number;
}) {
  return (
    <ul className="cost-chips" aria-label={label}>
      {resources.map(({ code, name }) => {
        const value = cost[code] * multiplier;
        const short = have[code] < value;
        return (
          <li
            key={code}
            className={short ? 'short' : undefined}
            title={
              short ? `Faltam ${numbers.format(value - have[code])} de ${name.toLowerCase()}` : name
            }
          >
            <ResourceIcon code={code} label={name} size={16} />
            {numbers.format(value)}
          </li>
        );
      })}
      {population !== undefined ? (
        <li title="População">
          <ResourceIcon code="peasants" label="População" />
          {numbers.format(population * multiplier)}
        </li>
      ) : null}
      {seconds !== undefined ? (
        <li className="cost-time" title="Tempo">
          <Clock size={14} aria-hidden="true" />
          {duration(seconds)}
        </li>
      ) : null}
    </ul>
  );
}

/** Por que não dá para fazer agora: quando os recursos chegam ou o motivo dado pelo servidor. */
export function WaitReason({
  availableAt,
  reason,
  clock,
}: {
  availableAt: string | null;
  reason: string | null;
  clock: number;
}) {
  if (!availableAt && !reason) return null;
  return (
    <p className="wait-reason">
      {availableAt
        ? `Recursos suficientes em ${duration((new Date(availableAt).getTime() - clock) / 1000)}`
        : reason}
    </p>
  );
}

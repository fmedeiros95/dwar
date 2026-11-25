import type { CSSProperties } from 'react';
import type { Recruitment } from '@dwar/api-client';
import { completionDate, duration, numbers } from './format.js';
import { unitPortraitSrc } from '../../../components/unit-icon.js';

export function RecruitmentQueue({
  queue,
  clock,
  pending,
  onCancel,
  academy = false,
}: {
  queue: Recruitment[];
  clock: number;
  pending: boolean;
  onCancel: (id: number) => void;
  academy?: boolean;
}) {
  if (!queue.length) return null;
  return (
    <section className="queue" aria-label="Treinamento em andamento">
      <h2>
        Treinamento em andamento
        <small>{queue.length}</small>
      </h2>
      <ol>
        {queue.map((event, index) => {
          const start = new Date(event.startsAt).getTime();
          const end = new Date(event.endsAt).getTime();
          const active = index === 0;
          const progress = active
            ? Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)))
            : 0;
          const seconds = (end - (active ? clock : start)) / 1000;
          // O lote sai aos poucos: a unidade k fica pronta em início + k × tempo da unidade.
          const unitMs = Math.max(1, event.unitSeconds * 1000);
          const delivered = Math.min(
            event.quantity,
            Math.max(event.delivered, active ? Math.floor((clock - start) / unitMs) : 0),
          );
          const remaining = event.quantity - delivered;
          const nextSeconds = Math.max(0, (start + (delivered + 1) * unitMs - clock) / 1000);
          const label = academy
            ? '1 Nobre'
            : delivered > 0
              ? `${event.name} (${numbers.format(remaining)} de ${numbers.format(event.quantity)} restantes)`
              : `${event.name} (${numbers.format(event.quantity)})`;
          return (
            <li
              key={event.id}
              className={active ? 'queue-item active unit-queue' : 'queue-item unit-queue'}
              style={{ '--progress': progress } as CSSProperties}
            >
              <img
                className="queue-portrait"
                src={unitPortraitSrc(academy ? 'noble' : event.unitCode)}
                alt=""
              />
              <div className="queue-info">
                <strong>{label}</strong>
                <span>
                  {!academy && event.quantity > 1 && active && remaining > 0
                    ? `Próxima em ${duration(nextSeconds)} · `
                    : ''}
                  Conclui {completionDate(event.endsAt, clock)}
                </span>
                <span className="queue-bar" aria-hidden="true" />
              </div>
              <time className="queue-time">{duration(seconds)}</time>
              <button
                className="queue-cancel"
                aria-label={`Cancelar recrutamento de ${event.name} (${event.quantity})`}
                disabled={pending}
                onClick={() => onCancel(event.id)}
              >
                Cancelar
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

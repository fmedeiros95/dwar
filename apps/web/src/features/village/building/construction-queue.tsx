import type { CSSProperties } from 'react';
import type { VillageSnapshot } from '@dwar/api-client';
import { completionDate, duration } from '../shared/index.js';
export function ConstructionQueue({
  snapshot,
  clock,
  onCancel,
  pending,
}: {
  snapshot: VillageSnapshot;
  clock: number;
  onCancel: (id: number) => void;
  pending: boolean;
}) {
  if (!snapshot.queue.length) return null;
  return (
    <section className="queue" aria-label="Obras em andamento">
      <h2>
        Obras em andamento
        <small>
          {snapshot.queue.length}/{snapshot.world.maxBuildQueue}
        </small>
      </h2>
      <ol>
        {snapshot.queue.map((item, index) => {
          const start = new Date(item.startsAt).getTime();
          const end = new Date(item.endsAt).getTime();
          const remaining = (end - clock) / 1000;
          const active = index === 0;
          const progress = active
            ? Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)))
            : 0;
          return (
            <li
              key={item.id}
              className={active ? 'queue-item active' : 'queue-item'}
              style={{ '--progress': progress } as CSSProperties}
            >
              <img src={`/legacy/build/${item.buildingCode}.jpg`} alt="" />
              <div className="queue-info">
                <strong>{item.name}</strong>
                <span>
                  Nível {item.targetLevel} · conclui {completionDate(item.endsAt, clock)}
                </span>
                <span className="queue-bar" aria-hidden="true" />
              </div>
              <time className="queue-time">
                {active && remaining <= 0
                  ? 'Concluindo…'
                  : duration(active ? remaining : (end - start) / 1000)}
              </time>
              <button
                className="queue-cancel"
                aria-label={`Cancelar ${item.name} nível ${item.targetLevel}`}
                disabled={pending || remaining <= 0}
                onClick={() => onCancel(item.id)}
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

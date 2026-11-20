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
    <div className="table-scroll construction-queue">
      <table className="legacy-table">
        <thead>
          <tr>
            <th>
              Construção ({snapshot.queue.length}/{snapshot.world.maxBuildQueue})
            </th>
            <th>Duração</th>
            <th>Conclusão</th>
            <th>Opção</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.queue.map((item, index) => {
            const remaining = (new Date(item.endsAt).getTime() - clock) / 1000;
            const seconds =
              index === 0
                ? remaining
                : (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 1000;
            return (
              <tr key={item.id} className={index === 0 ? 'selected-row' : undefined}>
                <td>
                  {item.name} (nível {item.targetLevel})
                </td>
                <td>{index === 0 && remaining <= 0 ? 'Concluindo…' : duration(seconds)}</td>
                <td>{completionDate(item.endsAt, clock)}</td>
                <td>
                  <button
                    className="text-button"
                    aria-label={`Cancelar ${item.name} nível ${item.targetLevel}`}
                    disabled={pending || remaining <= 0}
                    onClick={() => onCancel(item.id)}
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

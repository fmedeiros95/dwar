import type { Recruitment } from '@dwar/api-client';
import { completionDate, duration, numbers } from './format.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

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
    <div className="table-scroll">
      <table className={`legacy-table recruitment-queue${academy ? ' academy-queue' : ''}`}>
        <thead>
          <tr>
            <th>Unidade</th>
            <th>Duração</th>
            <th>Conclusão</th>
            <th>{academy ? 'Opção' : 'Ação'}</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((event, index) => (
            <tr key={event.id} className={index === 0 ? 'selected-row' : undefined}>
              <td>
                {academy ? (
                  <>
                    <img className="research-unit-icon" src={unitIconSrc('noble')} alt="" /> 1 Nobre
                  </>
                ) : (
                  <>
                    {event.name} ({numbers.format(event.quantity)})
                  </>
                )}
              </td>
              <td>
                {duration(
                  (new Date(event.endsAt).getTime() -
                    (index === 0 ? clock : new Date(event.startsAt).getTime())) /
                    1000,
                )}
              </td>
              <td>{completionDate(event.endsAt, clock)}</td>
              <td>
                <button
                  className="text-button"
                  aria-label={`Cancelar recrutamento de ${event.name} (${event.quantity})`}
                  disabled={pending}
                  onClick={() => onCancel(event.id)}
                >
                  Cancelar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

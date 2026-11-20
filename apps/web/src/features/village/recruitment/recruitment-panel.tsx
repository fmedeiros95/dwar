import { useState, type FormEvent } from 'react';
import type { RecruitmentOrder, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { RecruitmentQueue, duration, numbers, resources } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

export function RecruitmentPanel({
  snapshot,
  buildingCode,
  clock,
  pending,
  onRecruit,
  onCancel,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  buildingCode: string;
  clock: number;
  pending: boolean;
  onRecruit: (buildingCode: string, orders: RecruitmentOrder[]) => void;
  onCancel: (id: number) => void;
  onSelect: (code: string) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const units = snapshot.units.filter((unit) => unit.building === buildingCode);
  const queue = snapshot.recruitmentQueue.filter((event) => event.buildingCode === buildingCode);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orders = units.flatMap((unit) =>
      Number(quantities[unit.code]) > 0
        ? [{ unitCode: unit.code, quantity: Number(quantities[unit.code]) }]
        : [],
    );
    if (orders.length) onRecruit(buildingCode, orders);
  }
  return (
    <>
      <RecruitmentQueue queue={queue} clock={clock} pending={pending} onCancel={onCancel} />
      <form onSubmit={submit} aria-label="Recrutar tropas">
        <div className="table-scroll">
          <table className="legacy-table recruitment-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th colSpan={4}>Recursos</th>
                <th>Tempo</th>
                <th>Na aldeia/Total</th>
                <th>Recrutar</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.code}>
                  <td>
                    <img className="research-unit-icon" src={unitIconSrc(unit.code)} alt="" />{' '}
                    <strong>{unit.name}</strong>
                  </td>
                  {resources.map(({ code, name }) => (
                    <td key={code}>
                      <ResourceIcon code={code} label={name} /> {numbers.format(unit.cost[code])}
                    </td>
                  ))}
                  <td>
                    <ResourceIcon code="peasants" label="População" /> {unit.population}
                  </td>
                  <td>{duration(unit.durationSeconds)}</td>
                  <td>
                    {numbers.format(unit.indoors)}/{numbers.format(unit.total)}
                  </td>
                  <td>
                    {!unit.researched ? (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onSelect('smith')}
                      >
                        Unidade não pesquisada.
                      </button>
                    ) : unit.unavailableReason ? (
                      unit.unavailableReason
                    ) : (
                      <>
                        <input
                          aria-label={`Quantidade de ${unit.name}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={5}
                          size={5}
                          disabled={pending}
                          value={quantities[unit.code] ?? ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setQuantities((current) => ({ ...current, [unit.code]: value }));
                          }}
                        />{' '}
                        <button
                          type="button"
                          className="text-button"
                          aria-label={`Recrutar o máximo de ${unit.name}`}
                          disabled={pending}
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [unit.code]: String(unit.maxRecruitable),
                            }))
                          }
                        >
                          ({numbers.format(unit.maxRecruitable)})
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8}>
                  <button
                    disabled={pending || !units.some((unit) => Number(quantities[unit.code]) > 0)}
                  >
                    {pending ? 'Processando…' : 'Recrutar'}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </form>
    </>
  );
}

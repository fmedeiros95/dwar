import { useMemo, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import type { RecruitmentOrder, UnitView, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { RecruitmentQueue, duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const units = snapshot.units.filter((unit) => unit.building === buildingCode);
  const queue = snapshot.recruitmentQueue.filter((event) => event.buildingCode === buildingCode);
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);

  const chosen = units.filter((unit) => (quantities[unit.code] ?? 0) > 0);
  const total = chosen.reduce((sum, unit) => sum + (quantities[unit.code] ?? 0), 0);
  const totalCost = Object.fromEntries(
    resources.map(({ code }) => [
      code,
      chosen.reduce((sum, unit) => sum + unit.cost[code] * (quantities[unit.code] ?? 0), 0),
    ]),
  ) as Record<(typeof resources)[number]['code'], number>;
  const totalPopulation = chosen.reduce(
    (sum, unit) => sum + unit.population * (quantities[unit.code] ?? 0),
    0,
  );
  const overBudget = resources.some(({ code }) => totalCost[code] > have[code]);

  function setQuantity(unit: UnitView, value: number) {
    const bounded = Math.max(0, Math.min(unit.maxRecruitable, Number.isFinite(value) ? value : 0));
    setQuantities((current) => ({ ...current, [unit.code]: bounded }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orders = chosen.map((unit) => ({
      unitCode: unit.code,
      quantity: quantities[unit.code] ?? 0,
    }));
    if (orders.length) onRecruit(buildingCode, orders);
  }
  return (
    <>
      <RecruitmentQueue queue={queue} clock={clock} pending={pending} onCancel={onCancel} />
      <form onSubmit={submit} aria-label="Recrutar tropas">
        <ul className="ugrid">
          {units.map((unit) => {
            const quantity = quantities[unit.code] ?? 0;
            const locked = !unit.researched;
            const blocked = Boolean(unit.unavailableReason);
            return (
              <li className="ucard" key={unit.code} data-state={locked ? 'locked' : undefined}>
                <div className="ucard-top">
                  <img className="ucard-portrait" src={unitIconSrc(unit.code)} alt="" />
                  <div className="ucard-title">
                    <h3>{unit.name}</h3>
                    <span className="ucard-stock">
                      Na aldeia <strong>{numbers.format(unit.indoors)}</strong>
                      <span aria-hidden="true"> · </span>
                      Total <strong>{numbers.format(unit.total)}</strong>
                    </span>
                  </div>
                </div>
                <ul className="bcard-cost" aria-label={`Custo de 1 ${unit.name}`}>
                  {resources.map(({ code, name }) => (
                    <li
                      key={code}
                      className={have[code] < unit.cost[code] ? 'short' : undefined}
                      title={name}
                    >
                      <ResourceIcon code={code} label={name} />
                      {numbers.format(unit.cost[code])}
                    </li>
                  ))}
                  <li title="População">
                    <ResourceIcon code="peasants" label="População" />
                    {unit.population}
                  </li>
                  <li className="bcard-time" title="Tempo por unidade">
                    {duration(unit.durationSeconds)}
                  </li>
                </ul>
                {locked ? (
                  <button type="button" className="ucard-locked" onClick={() => onSelect('smith')}>
                    <Lock size={14} aria-hidden="true" />
                    Pesquisar na Ferraria
                  </button>
                ) : blocked ? (
                  <p className="bcard-reason">{unit.unavailableReason}</p>
                ) : (
                  <div className="ucard-qty">
                    <div className="stepper">
                      <button
                        type="button"
                        aria-label={`Diminuir ${unit.name}`}
                        disabled={pending || quantity <= 0}
                        onClick={() => setQuantity(unit, quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        aria-label={`Quantidade de ${unit.name}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                        disabled={pending}
                        value={quantity > 0 ? quantity : ''}
                        placeholder="0"
                        onChange={(event) =>
                          setQuantity(unit, Number(event.currentTarget.value.replace(/\D/g, '')))
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Aumentar ${unit.name}`}
                        disabled={pending || quantity >= unit.maxRecruitable}
                        onClick={() => setQuantity(unit, quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="ucard-max"
                      aria-label={`Recrutar o máximo de ${unit.name}`}
                      disabled={pending || unit.maxRecruitable <= 0}
                      onClick={() => setQuantity(unit, unit.maxRecruitable)}
                    >
                      Máx. {numbers.format(unit.maxRecruitable)}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className={`recruit-bar${total ? ' active' : ''}`}>
          <div className="recruit-summary" aria-live="polite">
            {total ? (
              <>
                <strong>
                  {numbers.format(total)} {total === 1 ? 'unidade' : 'unidades'}
                </strong>
                <ul className="bcard-cost" aria-label="Custo total">
                  {resources.map(({ code, name }) => (
                    <li key={code} className={totalCost[code] > have[code] ? 'short' : undefined}>
                      <ResourceIcon code={code} label={name} />
                      {numbers.format(totalCost[code])}
                    </li>
                  ))}
                  <li>
                    <ResourceIcon code="peasants" label="População" />
                    {numbers.format(totalPopulation)}
                  </li>
                </ul>
              </>
            ) : (
              <span className="recruit-hint">Escolha as quantidades para recrutar.</span>
            )}
          </div>
          <button className="green" disabled={pending || !total || overBudget}>
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Recrutando…
              </>
            ) : (
              'Recrutar'
            )}
          </button>
        </div>
      </form>
    </>
  );
}

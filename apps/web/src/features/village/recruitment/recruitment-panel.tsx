import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Lock, Swords } from 'lucide-react';
import type { RecruitmentOrder, Resources, UnitView, VillageSnapshot } from '@dwar/api-client';
import { RecruitmentQueue, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { CostChips } from '../shared/cost-chips.js';
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
  ) as Resources;
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
      <form className="recruit-form" onSubmit={submit} aria-label="Recrutar tropas">
        <ul className="unit-list">
          {units.map((unit) => {
            const quantity = quantities[unit.code] ?? 0;
            const locked = !unit.researched;
            const blocked = Boolean(unit.unavailableReason);
            const max = unit.maxRecruitable;
            return (
              <li
                className="unit-card"
                key={unit.code}
                data-state={locked ? 'locked' : quantity > 0 ? 'picked' : undefined}
              >
                <img
                  className="unit-portrait"
                  src={unitIconSrc(unit.code)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="unit-info">
                  <h2>{unit.name}</h2>
                  <span className="unit-stock">
                    Na aldeia <strong>{numbers.format(unit.indoors)}</strong> · total{' '}
                    <strong>{numbers.format(unit.total)}</strong>
                  </span>
                  <CostChips
                    label={`Custo de 1 ${unit.name}`}
                    cost={unit.cost}
                    have={have}
                    population={unit.population}
                    seconds={unit.durationSeconds}
                  />
                </div>
                <div className="unit-qty">
                  {locked ? (
                    <button type="button" className="button" onClick={() => onSelect('smith')}>
                      <Lock size={14} aria-hidden="true" /> Pesquisar no ferreiro
                    </button>
                  ) : blocked ? (
                    <p className="wait-reason">{unit.unavailableReason}</p>
                  ) : (
                    <>
                      <div className="unit-qty-row">
                        <input
                          aria-label={`Quantidade de ${unit.name}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          disabled={pending}
                          value={quantity > 0 ? quantity : ''}
                          placeholder="0"
                          onChange={(event) =>
                            setQuantity(unit, Number(event.currentTarget.value.replace(/\D/g, '')))
                          }
                        />
                        <button
                          type="button"
                          className="button"
                          aria-label={`Máx: recrutar o máximo de ${unit.name}`}
                          disabled={pending || max <= 0}
                          onClick={() => setQuantity(unit, max)}
                        >
                          Máx
                        </button>
                      </div>
                      <input
                        type="range"
                        className="unit-slider"
                        aria-label={`Ajustar quantidade de ${unit.name}`}
                        min={0}
                        max={Math.max(1, max)}
                        step={1}
                        value={quantity}
                        disabled={pending || max <= 0}
                        style={{ '--fill': max ? quantity / max : 0 } as CSSProperties}
                        onChange={(event) => setQuantity(unit, Number(event.currentTarget.value))}
                      />
                      <small className="unit-max">
                        até {numbers.format(max)} com os recursos atuais
                      </small>
                    </>
                  )}
                </div>
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
                <CostChips
                  label="Custo total"
                  cost={totalCost}
                  have={have}
                  population={totalPopulation}
                />
              </>
            ) : (
              <span className="recruit-hint">Escolha as quantidades para recrutar.</span>
            )}
          </div>
          <button disabled={pending || !total || overBudget}>
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Recrutando…
              </>
            ) : (
              <>
                <Swords size={16} aria-hidden="true" /> Recrutar
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

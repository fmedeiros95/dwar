import { useState } from 'react';
import type { BuildingView } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from '../shared/index.js';
export function BuildingTable({
  buildings,
  pending,
  clock,
  onConstruct,
  onSelect,
}: {
  buildings: BuildingView[];
  pending: boolean;
  clock: number;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const [showUnavailable, setShowUnavailable] = useState(false);
  const unavailable = buildings.filter(
    (item) =>
      item.level === 0 &&
      item.queuedLevel === 0 &&
      item.requirements.some((requirement) => !requirement.met),
  );
  const available = buildings.filter((item) => !unavailable.includes(item));
  return (
    <div className="table-scroll">
      <table className="legacy-table building-table">
        <thead>
          <tr>
            <th>Edifício</th>
            {resources.map(({ code, name }) => (
              <th key={code}>
                <ResourceIcon code={code} label={name} />
              </th>
            ))}
            <th>
              <ResourceIcon code="peasants" label="População" />
            </th>
            <th>Duração</th>
            <th>Opção</th>
          </tr>
        </thead>
        <tbody>
          {available.map((building) => (
            <tr key={building.code}>
              <td>
                <button className="text-button" onClick={() => onSelect(building.code)}>
                  {building.name}
                </button>{' '}
                <span className="building-level">
                  ({building.level ? `nível ${building.level}` : 'não construído'})
                </span>
              </td>
              {building.queuedLevel >= building.maxLevel ? (
                <td colSpan={6}>Edifício completamente construído.</td>
              ) : (
                <>
                  {resources.map(({ code }) => (
                    <td className="numeric" key={code}>
                      {numbers.format(building.cost[code])}
                    </td>
                  ))}
                  <td className="numeric">{building.population}</td>
                  <td className="numeric">{duration(building.durationSeconds)}</td>
                  <td className="build-option">
                    {building.canBuild ? (
                      building.queuedLevel === 0 ? (
                        <button
                          className="text-button"
                          disabled={pending}
                          onClick={() => onConstruct(building.code)}
                        >
                          Construir
                        </button>
                      ) : (
                        <div className="build-control">
                          <div
                            className="legacy-progress"
                            aria-label={`Nível ${building.level} de ${building.maxLevel}`}
                          >
                            <span
                              style={{ width: `${(building.level / building.maxLevel) * 100}%` }}
                            />
                          </div>
                          <button
                            className="build-plus"
                            aria-label={`Evoluir ${building.name}`}
                            title={`Construir nível ${building.queuedLevel + 1}`}
                            disabled={pending}
                            onClick={() => onConstruct(building.code)}
                          >
                            <img src="/legacy/icons/plus.png" alt="" />
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="unavailable-reason">
                        {building.resourcesAvailableAt
                          ? `Recursos disponíveis em ${duration((new Date(building.resourcesAvailableAt).getTime() - clock) / 1000)}`
                          : building.unavailableReason}
                      </span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
          {showUnavailable
            ? unavailable.map((building) => (
                <tr key={building.code}>
                  <td>
                    <button className="text-button" onClick={() => onSelect(building.code)}>
                      {building.name}
                    </button>
                  </td>
                  <td colSpan={6}>
                    {building.requirements
                      .filter((item) => !item.met)
                      .map((item) => `${item.name} (nível ${item.level})`)
                      .join(' · ')}
                  </td>
                </tr>
              ))
            : null}
          {unavailable.length ? (
            <tr>
              <th colSpan={7}>
                <label className="unavailable-toggle">
                  <input
                    type="checkbox"
                    checked={showUnavailable}
                    onChange={(event) => setShowUnavailable(event.currentTarget.checked)}
                  />
                  {showUnavailable
                    ? 'Ocultar edifícios indisponíveis'
                    : 'Mostrar edifícios indisponíveis'}
                </label>
              </th>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

import { useMemo } from 'react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from '../shared/index.js';
import { currentResources, type Have } from '../shared/current-resources.js';
import { buildingArt } from '../overview/scene-model.js';

export function BuildingTable({
  snapshot,
  pending,
  pendingCode,
  clock,
  onConstruct,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  pending: boolean;
  pendingCode?: string | undefined;
  clock: number;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const { buildings } = snapshot;
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  const unavailable = buildings.filter(
    (item) =>
      item.level === 0 &&
      item.queuedLevel === 0 &&
      item.requirements.some((requirement) => !requirement.met),
  );
  const available = buildings.filter((item) => !unavailable.includes(item));
  return (
    <>
      <ul className="bgrid">
        {available.map((building) => (
          <BuildingCard
            key={building.code}
            building={building}
            have={have}
            pending={pending}
            busy={pendingCode === building.code}
            clock={clock}
            onConstruct={onConstruct}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {unavailable.length ? (
        <details className="bunavail">
          <summary>Edifícios indisponíveis ({unavailable.length})</summary>
          <ul>
            {unavailable.map((building) => (
              <li key={building.code}>
                <button className="text-button" onClick={() => onSelect(building.code)}>
                  {building.name}
                </button>
                <span className="bunavail-reqs">
                  {building.requirements
                    .filter((item) => !item.met)
                    .map((item) => (
                      <span className="bunavail-req" key={item.code}>
                        {item.name} nível {item.level}
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function BuildingCard({
  building,
  have,
  pending,
  busy,
  clock,
  onConstruct,
  onSelect,
}: {
  building: BuildingView;
  have: Have;
  pending: boolean;
  busy: boolean;
  clock: number;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const maxed = building.queuedLevel >= building.maxLevel;
  const building_ = building.queuedLevel > building.level;
  const next = building.queuedLevel + 1;
  const progress = (building.level / building.maxLevel) * 100;
  const queuedProgress = (building.queuedLevel / building.maxLevel) * 100;
  return (
    <li className="bcard" data-state={maxed ? 'max' : building_ ? 'building' : undefined}>
      <div className="bcard-top">
        <button
          className="bcard-art"
          aria-label={`Abrir ${building.name}`}
          onClick={() => onSelect(building.code)}
        >
          <img
            src={buildingArt(building.code, building.level, building.maxLevel)}
            alt=""
            loading="lazy"
          />
        </button>
        <div className="bcard-title">
          <h3>
            <button className="text-button" onClick={() => onSelect(building.code)}>
              {building.name}
            </button>
          </h3>
          <span className="bcard-level">
            {building.level ? `Nível ${building.level} de ${building.maxLevel}` : 'Não construído'}
            {building_ ? <em> → {building.queuedLevel}</em> : null}
          </span>
          <div
            className="bcard-progress"
            role="img"
            aria-label={`Nível ${building.level} de ${building.maxLevel}`}
          >
            <span className="bcard-progress-queued" style={{ width: `${queuedProgress}%` }} />
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="bcard-body">
        {maxed ? (
          <p className="bcard-maxed">Nível máximo</p>
        ) : (
          <>
            <ul className="bcard-cost" aria-label={`Custo do nível ${next}`}>
              {resources.map(({ code, name }) => (
                <li
                  key={code}
                  className={have[code] < building.cost[code] ? 'short' : undefined}
                  title={
                    have[code] < building.cost[code]
                      ? `Faltam ${numbers.format(building.cost[code] - have[code])} de ${name.toLowerCase()}`
                      : name
                  }
                >
                  <ResourceIcon code={code} label={name} />
                  {numbers.format(building.cost[code])}
                </li>
              ))}
              <li title="População">
                <ResourceIcon code="peasants" label="População" />
                {building.population}
              </li>
              <li className="bcard-time" title="Tempo de construção">
                {duration(building.durationSeconds)}
              </li>
            </ul>
            {building.canBuild ? (
              <button
                className="bcard-action green"
                disabled={pending}
                onClick={() => onConstruct(building.code)}
              >
                {busy ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Construindo…
                  </>
                ) : building.queuedLevel === 0 ? (
                  'Construir'
                ) : (
                  `Evoluir para o nível ${next}`
                )}
              </button>
            ) : (
              <p className="bcard-reason">
                {building.resourcesAvailableAt
                  ? `Recursos disponíveis em ${duration((new Date(building.resourcesAvailableAt).getTime() - clock) / 1000)}`
                  : building.unavailableReason}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  );
}

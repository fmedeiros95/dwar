import { useMemo } from 'react';
import { Check, Lock } from 'lucide-react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';

/** Página de um edifício ainda não construído: custo, requisitos e o botão para construir. */
export function BuildPrompt({
  snapshot,
  building,
  clock,
  pending,
  onConstruct,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
  clock: number;
  pending: boolean;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  const unmet = building.requirements.filter((requirement) => !requirement.met);
  return (
    <section className="build-prompt" aria-label={`Construir ${building.name}`}>
      <div className="build-prompt-block">
        <h2>Custo</h2>
        <ul className="bcard-cost" aria-label="Custo do nível 1">
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
      </div>
      {building.requirements.length ? (
        <div className="build-prompt-block">
          <h2>Requisitos</h2>
          <ul className="req-list">
            {building.requirements.map((requirement) => (
              <li key={requirement.code} className={requirement.met ? 'met' : 'unmet'}>
                {requirement.met ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Lock size={13} aria-hidden="true" />
                )}
                <span>
                  {requirement.name} nível {requirement.level}
                </span>
                {!requirement.met ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onSelect(requirement.code)}
                  >
                    Ir para {requirement.name}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {building.canBuild && !unmet.length ? (
        <button
          className="bcard-action green build-prompt-action"
          disabled={pending}
          onClick={() => onConstruct(building.code)}
        >
          Construir {building.name}
        </button>
      ) : (
        <p className="bcard-reason">
          {building.resourcesAvailableAt
            ? `Recursos disponíveis em ${duration((new Date(building.resourcesAvailableAt).getTime() - clock) / 1000)}`
            : (building.unavailableReason ?? 'Cumpra os requisitos para construir.')}
        </p>
      )}
    </section>
  );
}

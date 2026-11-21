import { useMemo, type ReactNode } from 'react';
import { ArrowUp, Crown, Hourglass, Lock, Sparkles } from 'lucide-react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { currentResources, type Have } from '../shared/current-resources.js';
import { CostChips, WaitReason } from '../shared/cost-chips.js';
import { buildingArt } from '../overview/scene-model.js';

type Group = 'ready' | 'waiting' | 'locked' | 'max';

function groupOf(building: BuildingView): Group {
  if (building.queuedLevel >= building.maxLevel) return 'max';
  if (
    building.level === 0 &&
    building.queuedLevel === 0 &&
    building.requirements.some((requirement) => !requirement.met)
  )
    return 'locked';
  return building.canBuild ? 'ready' : 'waiting';
}

/** Lista de obras do edifício principal, separada pelo que dá para fazer agora. */
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
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  const groups: Record<Group, BuildingView[]> = { ready: [], waiting: [], locked: [], max: [] };
  for (const building of snapshot.buildings) groups[groupOf(building)].push(building);
  const complete = groups.max.length === snapshot.buildings.length;
  const card = (building: BuildingView) => (
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
  );
  return (
    <div className="build-groups">
      {complete ? (
        <div className="upgrade-max all-max">
          <Crown size={26} aria-hidden="true" />
          <div>
            <strong>Aldeia completa</strong>
            <small>Todos os edifícios estão no nível máximo.</small>
          </div>
        </div>
      ) : (
        <BuildGroup
          icon={<Sparkles size={16} />}
          title="Prontos para evoluir"
          count={groups.ready.length}
          empty={
            snapshot.queue.length >= snapshot.world.maxBuildQueue
              ? 'A fila de obras está cheia.'
              : 'Nenhuma obra possível agora: veja abaixo quando os recursos chegam.'
          }
        >
          {groups.ready.map(card)}
        </BuildGroup>
      )}
      {groups.waiting.length ? (
        <BuildGroup icon={<Hourglass size={16} />} title="Aguardando" count={groups.waiting.length}>
          {groups.waiting.map(card)}
        </BuildGroup>
      ) : null}
      {groups.locked.length ? (
        <BuildGroup icon={<Lock size={16} />} title="Bloqueados" count={groups.locked.length}>
          {groups.locked.map((building) => (
            <li key={building.code} className="bcard2 locked">
              <button
                className="bcard2-art"
                aria-label={`Abrir ${building.name}`}
                onClick={() => onSelect(building.code)}
              >
                <img src={buildingArt(building.code)} alt="" loading="lazy" />
              </button>
              <div className="bcard2-main">
                <button className="text-button bcard2-name" onClick={() => onSelect(building.code)}>
                  {building.name}
                </button>
                <div className="req-chips">
                  {building.requirements
                    .filter((item) => !item.met)
                    .map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        className="req-chip"
                        onClick={() => onSelect(item.code)}
                      >
                        <Lock size={11} aria-hidden="true" /> {item.name} {item.level}
                      </button>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </BuildGroup>
      ) : null}
      {groups.max.length ? (
        <details className="build-group build-max" open={complete}>
          <summary>
            <Crown size={16} aria-hidden="true" /> Nível máximo
            <span className="panel-count">{groups.max.length}</span>
          </summary>
          <ul className="max-chips">
            {groups.max.map((building) => (
              <li key={building.code}>
                <button type="button" onClick={() => onSelect(building.code)}>
                  <img
                    src={buildingArt(building.code, building.maxLevel, building.maxLevel)}
                    alt=""
                    loading="lazy"
                  />
                  <span>{building.name}</span>
                  <small>{building.maxLevel}</small>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function BuildGroup({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section className="build-group">
      <h2>
        {icon}
        {title}
        {count ? <span className="panel-count">{count}</span> : null}
      </h2>
      {count ? <ul className="bgrid2">{children}</ul> : <p className="panel-hint">{empty}</p>}
    </section>
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
  const next = building.queuedLevel + 1;
  const queued = building.queuedLevel > building.level;
  return (
    <li className="bcard2" data-state={queued ? 'building' : undefined}>
      <button
        className="bcard2-art"
        aria-label={`Abrir ${building.name}`}
        onClick={() => onSelect(building.code)}
      >
        <img
          src={buildingArt(building.code, building.level, building.maxLevel)}
          alt=""
          loading="lazy"
        />
      </button>
      <div className="bcard2-main">
        <div className="bcard2-head">
          <button className="text-button bcard2-name" onClick={() => onSelect(building.code)}>
            {building.name}
          </button>
          <span className="bcard2-level">
            {building.level ? `${building.level}/${building.maxLevel}` : 'novo'}
            {queued ? <em> → {building.queuedLevel}</em> : null}
          </span>
        </div>
        <div className="bcard2-bar" aria-hidden="true">
          <span
            className="queued"
            style={{ width: `${(building.queuedLevel / building.maxLevel) * 100}%` }}
          />
          <span style={{ width: `${(building.level / building.maxLevel) * 100}%` }} />
        </div>
        <CostChips
          label={`Custo do nível ${next}`}
          cost={building.cost}
          have={have}
          population={building.population}
          seconds={building.durationSeconds}
        />
      </div>
      <div className="bcard2-act">
        {building.canBuild ? (
          <button disabled={pending} onClick={() => onConstruct(building.code)}>
            {busy ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              <ArrowUp size={16} aria-hidden="true" />
            )}
            {building.queuedLevel === 0 ? 'Construir' : `Nível ${next}`}
          </button>
        ) : (
          <WaitReason
            availableAt={building.resourcesAvailableAt}
            reason={building.unavailableReason}
            clock={clock}
          />
        )}
      </div>
    </li>
  );
}

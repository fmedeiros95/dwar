import { useState, type CSSProperties } from 'react';
import type { BuildingView, Construction, VillageSnapshot } from '@dwar/api-client';
import { ChevronDown, Hammer, List } from 'lucide-react';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { VillageScene, crestLabels, crestState } from './village-scene.js';
import { buildingArt, sceneThemes, type SceneTheme } from './scene-model.js';
import { completionDate, duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

function ConstructionCard({
  queue,
  buildings,
  clock,
  maxQueue,
}: {
  queue: Construction[];
  buildings: BuildingView[];
  clock: number;
  maxQueue: number;
}) {
  return (
    <section
      className="hud-card hud-construction"
      aria-label="Obras em andamento"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <h2>
        <span>
          <Hammer size={15} aria-hidden="true" /> Obras
        </span>
        {maxQueue <= 8 ? (
          <small className="hud-slots" aria-label={`${queue.length} de ${maxQueue} vagas usadas`}>
            {Array.from({ length: maxQueue }, (_, slot) => (
              <i key={slot} data-used={slot < queue.length ? 'true' : undefined} />
            ))}
          </small>
        ) : (
          <small
            className="hud-slots-count"
            aria-label={`${queue.length} de ${maxQueue} vagas usadas`}
          >
            <b>{queue.length}</b>/{maxQueue} vagas
          </small>
        )}
      </h2>
      {queue.length === 0 ? (
        <p className="hud-empty">
          Nenhuma obra em andamento.
          <br />
          Clique em um edifício para construir.
        </p>
      ) : (
        <ul>
          {queue.map((item) => {
            const start = new Date(item.startsAt).getTime();
            const end = new Date(item.endsAt).getTime();
            const running = start <= clock;
            const progress = Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
            return (
              <li
                key={item.id}
                data-running={running ? 'true' : undefined}
                style={{ '--progress': progress } as CSSProperties}
              >
                <img
                  className="hud-thumb"
                  src={buildingArt(
                    item.buildingCode,
                    item.targetLevel,
                    buildings.find((b) => b.code === item.buildingCode)?.maxLevel,
                  )}
                  alt=""
                />
                <span className="hud-row">
                  <strong>{item.name}</strong>
                  <em>
                    Nível {item.targetLevel} ·{' '}
                    {running ? completionDate(item.endsAt, clock) : 'na fila'}
                  </em>
                </span>
                <time>{duration((end - clock) / 1000)}</time>
                <span className="hud-bar" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Cartão do edifício sob o cursor: tudo o que sustenta a decisão "evoluo este agora?".
 * Estado no topo (mesma cor do brasão), ganho do próximo nível, custo com o que falta e quando
 * os recursos chegam.
 */
function BuildingCard({
  building,
  snapshot,
  clock,
}: {
  building: BuildingView;
  snapshot: VillageSnapshot;
  clock: number;
}) {
  const next = building.queuedLevel > building.level ? building.queuedLevel : building.level;
  const state = crestState(building, snapshot.queue, clock);
  const maxed = state === 'max';
  const have = currentResources(snapshot, clock);
  const gain = building.details.find((detail) => detail.next !== null);
  const readyAt = building.resourcesAvailableAt
    ? new Date(building.resourcesAvailableAt).getTime()
    : null;
  return (
    <aside className="hud-card hud-building" data-state={state} aria-live="polite">
      <header>
        <img
          className="hud-building-art"
          src={buildingArt(building.code, Math.max(1, next), building.maxLevel)}
          alt=""
        />
        <div>
          <h2>{building.name}</h2>
          <span className="hud-state">
            <i aria-hidden="true" />
            {crestLabels[state]}
          </span>
        </div>
        <span className="hud-level">
          {building.level > 0 ? `Nível ${building.level}` : 'Não construído'}
        </span>
      </header>
      {maxed ? (
        <p className="hud-maxed">{building.description}</p>
      ) : (
        <>
          <div className="hud-next">
            <span>Nível {next + 1}</span>
            {gain ? (
              <span className="hud-gain">
                {gain.label}: {numbers.format(gain.current)} <b>→ {numbers.format(gain.next!)}</b>
                {gain.unit ? ` ${gain.unit}` : ''}
              </span>
            ) : (
              <span className="hud-gain">{building.description}</span>
            )}
          </div>
          <ul className="hud-cost">
            {resources.map(({ code, name }) => {
              const missing = building.cost[code] - Math.floor(have[code]);
              return (
                <li
                  key={code}
                  data-short={missing > 0 ? 'true' : undefined}
                  title={
                    missing > 0
                      ? `Faltam ${numbers.format(missing)} de ${name}`
                      : `${name} suficiente`
                  }
                >
                  <ResourceIcon code={code} label={name} />
                  {numbers.format(building.cost[code])}
                  {missing > 0 ? <small>−{numbers.format(missing)}</small> : null}
                </li>
              );
            })}
            <li>
              <ResourceIcon code="peasants" label="População" />
              {numbers.format(building.population)}
            </li>
            <li className="hud-time">{duration(building.durationSeconds)}</li>
          </ul>
          {state === 'wait' && readyAt ? (
            <p className="hud-reason" data-tone="wait">
              Recursos suficientes em <b>{duration((readyAt - clock) / 1000)}</b>
            </p>
          ) : state === 'blocked' && building.unavailableReason ? (
            <p className="hud-reason">{building.unavailableReason}</p>
          ) : state === 'ready' ? (
            <p className="hud-reason" data-tone="ready">
              Clique para abrir e evoluir
            </p>
          ) : null}
        </>
      )}
    </aside>
  );
}

function Production({ snapshot }: { snapshot: VillageSnapshot }) {
  const perMinute = snapshot.world.buildSpeed > 100;
  return (
    <table className="legacy-table">
      <thead>
        <tr>
          <th colSpan={2}>Produção por {perMinute ? 'minuto' : 'hora'}</th>
        </tr>
      </thead>
      <tbody>
        {resources.map(({ code, name }) => (
          <tr key={code}>
            <td>{name}</td>
            <td>
              <strong>
                {numbers.format(
                  perMinute
                    ? Math.ceil(snapshot.village.productionPerHour[code] / 60)
                    : snapshot.village.productionPerHour[code],
                )}
              </strong>{' '}
              unidades
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Troops({ snapshot }: { snapshot: VillageSnapshot }) {
  if (!snapshot.units.some((unit) => unit.present > 0)) return null;
  return (
    <table className="legacy-table troops-summary">
      <thead>
        <tr>
          <th>Tropas</th>
        </tr>
      </thead>
      <tbody>
        {snapshot.units
          .filter((unit) => unit.present > 0)
          .map((unit) => (
            <tr key={unit.code}>
              <td>
                <img className="research-unit-icon" src={unitIconSrc(unit.code)} alt="" />{' '}
                <strong>{numbers.format(unit.present)}</strong> {unit.name}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
/** Painel da aldeia sobre o cenário: produção (com o quanto o armazém já encheu) e tropas. */
function VillageLedger({
  snapshot,
  clock,
  collapsed,
  onToggle,
  onClassic,
  classicPending,
}: {
  snapshot: VillageSnapshot;
  clock: number;
  collapsed: boolean;
  onToggle: () => void;
  onClassic: () => void;
  classicPending: boolean;
}) {
  const perMinute = snapshot.world.buildSpeed > 100;
  const have = currentResources(snapshot, clock);
  const capacity = Math.max(1, snapshot.village.capacity);
  const troops = snapshot.units.filter((unit) => unit.present > 0);
  const total = troops.reduce((sum, unit) => sum + unit.present, 0);
  return (
    <aside
      className="hud-card hud-ledger"
      data-collapsed={collapsed ? 'true' : undefined}
      aria-label="Produção e tropas da aldeia"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="hud-ledger-head">
        <h2>Sua aldeia</h2>
        <div className="hud-ledger-tools">
          <button
            type="button"
            title="Visão clássica (lista de edifícios)"
            aria-label="Visão clássica"
            disabled={classicPending}
            onClick={onClassic}
          >
            <List size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hud-ledger-toggle"
            title={collapsed ? 'Mostrar produção e tropas' : 'Ocultar produção e tropas'}
            aria-label={collapsed ? 'Mostrar produção e tropas' : 'Ocultar produção e tropas'}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </header>
      {collapsed ? null : (
        <>
          <section>
            <h3>
              Produção <small>por {perMinute ? 'minuto' : 'hora'}</small>
            </h3>
            <ul className="ledger-res">
              {resources.map(({ code, name }) => {
                const rate = snapshot.village.productionPerHour[code];
                const fill = Math.min(1, have[code] / capacity);
                return (
                  <li
                    key={code}
                    data-state={fill >= 1 ? 'full' : fill >= 0.9 ? 'near' : undefined}
                    style={{ '--fill': fill } as CSSProperties}
                    title={`${name}: ${numbers.format(have[code])} de ${numbers.format(capacity)} no armazém`}
                  >
                    <ResourceIcon code={code} label={name} />
                    <span className="ledger-name">{name}</span>
                    <strong>+{numbers.format(perMinute ? Math.ceil(rate / 60) : rate)}</strong>
                    <span className="ledger-bar" aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3>
              Tropas <small>{troops.length ? `${numbers.format(total)} na aldeia` : ''}</small>
            </h3>
            {troops.length ? (
              <ul className="ledger-troops">
                {troops.map((unit) => (
                  <li key={unit.code} title={`${numbers.format(unit.present)} ${unit.name}`}>
                    <img src={unitIconSrc(unit.code)} alt="" />
                    <strong>{numbers.format(unit.present)}</strong>
                    <span>{unit.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hud-empty">Nenhuma tropa na aldeia. Recrute no quartel.</p>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

export function Overview({
  snapshot,
  graphical,
  preferencePending,
  onPreference,
  onSelect,
  clock,
}: {
  snapshot: VillageSnapshot;
  graphical: boolean;
  preferencePending: boolean;
  onPreference: (value: boolean) => void;
  onSelect: (code: string) => void;
  clock: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [theme, setTheme] = useState<SceneTheme>(() => {
    const saved = localStorage.getItem('dwar:scene-theme');
    return sceneThemes.some((item) => item.code === saved) ? (saved as SceneTheme) : 'summer';
  });
  function changeTheme(value: SceneTheme) {
    setTheme(value);
    localStorage.setItem('dwar:scene-theme', value);
  }
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('dwar:overview-panel-collapsed') === '1',
  );
  function toggle() {
    const value = !collapsed;
    setCollapsed(value);
    localStorage.setItem('dwar:overview-panel-collapsed', value ? '1' : '0');
  }
  if (!graphical)
    return (
      <div className="legacy-classic-overview">
        <aside>
          <table className="legacy-table">
            <thead>
              <tr>
                <th>
                  <button
                    className="text-button"
                    disabled={preferencePending}
                    onClick={() => onPreference(true)}
                  >
                    » Visão gráfica
                  </button>
                </th>
              </tr>
            </thead>
          </table>
          <Production snapshot={snapshot} />
          <Troops snapshot={snapshot} />
        </aside>
        <section>
          <table className="legacy-table">
            <thead>
              <tr>
                <th>Edifícios</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.buildings
                .filter((building) => building.level > 0)
                .map((building) => (
                  <tr key={building.code}>
                    <td>
                      <button className="text-button" onClick={() => onSelect(building.code)}>
                        {building.name}
                      </button>{' '}
                      (nível <strong>{building.level}</strong>)
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <th>&nbsp;</th>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>
    );
  const hoveredBuilding = snapshot.buildings.find((building) => building.code === hovered);
  return (
    <VillageScene
      villageId={snapshot.village.id}
      buildings={snapshot.buildings}
      onSelect={onSelect}
      onHover={setHovered}
      queue={snapshot.queue}
      clock={clock}
      theme={theme}
      onThemeChange={changeTheme}
    >
      <ConstructionCard
        queue={snapshot.queue}
        buildings={snapshot.buildings}
        clock={clock}
        maxQueue={snapshot.world.maxBuildQueue}
      />
      {hoveredBuilding ? (
        <BuildingCard building={hoveredBuilding} snapshot={snapshot} clock={clock} />
      ) : null}
      <VillageLedger
        snapshot={snapshot}
        clock={clock}
        collapsed={collapsed}
        onToggle={toggle}
        onClassic={() => onPreference(false)}
        classicPending={preferencePending}
      />
    </VillageScene>
  );
}

import { useState, type CSSProperties } from 'react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { ChevronDown, List } from 'lucide-react';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { VillageScene, crestLabels, crestState } from './village-scene.js';
import { buildingArt, sceneThemes, type SceneTheme } from './scene-model.js';
import { BuildPlanner, type PlannerState } from '../planner/build-planner.js';
import { duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { unitIconSrc, unitIconSrcSet } from '../../../components/unit-icon.js';

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
          ) : null}
          <p className="hud-hint">
            <b>Brasão</b>: comparar na mesa de obras · <b>edifício</b>: abrir
          </p>
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
                    <img src={unitIconSrc(unit.code)} srcSet={unitIconSrcSet(unit.code)} alt="" />
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
  planner,
  pending,
  pendingCode,
  onConstruct,
  onCancel,
}: {
  snapshot: VillageSnapshot;
  graphical: boolean;
  preferencePending: boolean;
  onPreference: (value: boolean) => void;
  onSelect: (code: string) => void;
  clock: number;
  planner: PlannerState;
  pending: boolean;
  pendingCode?: string | undefined;
  onConstruct: (code: string) => void;
  onCancel: (id: number) => void;
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
      onSelect={(code) => {
        // O Edifício principal é a própria mesa de obras: abre o painel em vez de uma janela.
        if (code === 'main') planner.setOpen(true);
        else onSelect(code);
      }}
      onCrest={(code) => {
        planner.compare(code, true);
        planner.setOpen(true);
      }}
      compared={planner.compared}
      onHover={setHovered}
      queue={snapshot.queue}
      clock={clock}
      theme={theme}
      onThemeChange={changeTheme}
    >
      <BuildPlanner
        variant="dock"
        snapshot={snapshot}
        clock={clock}
        planner={planner}
        pending={pending}
        pendingCode={pendingCode}
        onConstruct={onConstruct}
        onCancel={onCancel}
        onOpen={onSelect}
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

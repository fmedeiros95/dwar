import { useState, type CSSProperties } from 'react';
import type { BuildingView, Construction, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { VillageScene } from './village-scene.js';
import { sceneThemes, type SceneTheme } from './scene-model.js';
import { duration, numbers, resources } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

function ConstructionCard({
  queue,
  clock,
  maxQueue,
}: {
  queue: Construction[];
  clock: number;
  maxQueue: number;
}) {
  return (
    <section className="hud-card hud-construction" aria-label="Obras em andamento">
      <h2>
        Obras
        <small>
          {queue.length}/{maxQueue}
        </small>
      </h2>
      {queue.length === 0 ? (
        <p className="hud-empty">Nenhuma obra em andamento. Passe o mouse sobre um edifício.</p>
      ) : (
        <ul>
          {queue.map((item) => {
            const start = new Date(item.startsAt).getTime();
            const end = new Date(item.endsAt).getTime();
            const progress = Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
            return (
              <li key={item.id} style={{ '--progress': progress } as CSSProperties}>
                <span className="hud-row">
                  <strong>{item.name}</strong>
                  <em>nível {item.targetLevel}</em>
                </span>
                <span className="hud-bar" aria-hidden="true" />
                <time>{duration((end - clock) / 1000)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BuildingCard({ building }: { building: BuildingView }) {
  const next = building.queuedLevel > building.level ? building.queuedLevel : building.level;
  const maxed = next >= building.maxLevel;
  return (
    <aside className="hud-card hud-building" aria-live="polite">
      <header>
        <h2>{building.name}</h2>
        <span className="hud-level">
          {building.level > 0 ? `Nível ${building.level}` : 'Não construído'}
        </span>
      </header>
      <p>{building.description}</p>
      {maxed ? (
        <p className="hud-maxed">Nível máximo</p>
      ) : (
        <>
          <span className="hud-next">Próximo nível: {next + 1}</span>
          <ul className="hud-cost">
            {resources.map(({ code, name }) => (
              <li key={code}>
                <ResourceIcon code={code} label={name} />
                {numbers.format(building.cost[code])}
              </li>
            ))}
            <li>
              <ResourceIcon code="peasants" label="População" />
              {numbers.format(building.population)}
            </li>
            <li className="hud-time">{duration(building.durationSeconds)}</li>
          </ul>
          {!building.canBuild && building.unavailableReason ? (
            <p className="hud-reason">{building.unavailableReason}</p>
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
        clock={clock}
        maxQueue={snapshot.world.maxBuildQueue}
      />
      {hoveredBuilding ? <BuildingCard building={hoveredBuilding} /> : null}
      <aside
        className="legacy-production"
        aria-label="Produção da aldeia"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {!collapsed ? (
          <>
            <button
              className="classic-view-link"
              disabled={preferencePending}
              onClick={() => onPreference(false)}
            >
              » Visão clássica
            </button>
            <Production snapshot={snapshot} />
            <Troops snapshot={snapshot} />
          </>
        ) : null}
        <button
          className="production-collapse"
          onClick={toggle}
          aria-label={collapsed ? 'Mostrar informações da aldeia' : 'Ocultar informações da aldeia'}
        >
          <img src={`/legacy/layout/grip_${collapsed ? 'down' : 'up'}.png`} alt="" />
        </button>
      </aside>
    </VillageScene>
  );
}

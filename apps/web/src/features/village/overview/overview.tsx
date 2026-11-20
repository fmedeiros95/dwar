import { useState } from 'react';
import type { VillageSnapshot } from '@dwar/api-client';
import { VillageScene } from './village-scene.js';
import { numbers, resources } from '../shared/index.js';

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
                <img
                  className="research-unit-icon"
                  src={`/legacy/unit/unit_${unit.code}.png`}
                  alt=""
                />{' '}
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
  return (
    <div className="legacy-landscape">
      <VillageScene
        buildings={snapshot.buildings}
        selected=""
        onSelect={onSelect}
        queue={snapshot.queue}
        clock={clock}
      />
      <aside className="legacy-production" aria-label="Produção da aldeia">
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
    </div>
  );
}

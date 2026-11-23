import { useEffect, useState, type CSSProperties } from 'react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { ChevronDown, List, Mountain, MousePointerClick, X } from 'lucide-react';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { VillageScene, crestLabels, crestState, type SceneTarget } from './village-scene.js';
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
  part,
  planner,
}: {
  building: BuildingView;
  snapshot: VillageSnapshot;
  clock: number;
  /** O que o jogador aponta: o cartão diz o que o clique faz ali. */
  part: SceneTarget['part'];
  planner: PlannerState;
}) {
  const next = building.queuedLevel > building.level ? building.queuedLevel : building.level;
  const state = crestState(building, snapshot.queue, clock);
  const maxed = state === 'max';
  const have = currentResources(snapshot, clock);
  const gain = building.details.find((detail) => detail.plan !== null);
  const compared = planner.compared.includes(building.code);
  const replaced = snapshot.buildings.find((item) => item.code === planner.replaces)?.name;
  const crestAction = compared
    ? planner.open
      ? 'tirar da comparação'
      : 'abrir a comparação'
    : replaced
      ? `comparar no lugar de ${replaced}`
      : 'comparar obras';
  const openAction = building.code === 'main' ? 'abrir a mesa de obras' : `abrir ${building.name}`;
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
                {gain.label}: {numbers.format(gain.plan!.current)}{' '}
                <b>→ {numbers.format(gain.plan!.next)}</b>
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
        </>
      )}
      <p className="hud-hint">
        <MousePointerClick size={14} aria-hidden="true" />
        {part === 'crest' ? (
          <>
            <b>Clique no brasão: {crestAction}</b>
            <span>no edifício: {openAction}</span>
          </>
        ) : (
          <>
            <b>Clique no edifício: {openAction}</b>
            <span>no brasão: {crestAction}</span>
          </>
        )}
      </p>
    </aside>
  );
}

/** Produção (com o quanto o armazém já encheu) e tropas: as mesmas no cenário e na lista. */
function LedgerSections({ snapshot, clock }: { snapshot: VillageSnapshot; clock: number }) {
  const perMinute = snapshot.world.buildSpeed > 100;
  const have = currentResources(snapshot, clock);
  const capacity = Math.max(1, snapshot.village.capacity);
  const troops = snapshot.units.filter((unit) => unit.present > 0);
  const total = troops.reduce((sum, unit) => sum + unit.present, 0);
  return (
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
  );
}

/** Visão clássica: a aldeia em lista, com o mesmo estado e as mesmas obras do cenário. */
function ClassicOverview({
  snapshot,
  clock,
  pending,
  onGraphical,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onGraphical: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="classic">
      <aside className="classic-side hud-card" aria-label="Produção e tropas da aldeia">
        <header className="hud-ledger-head">
          <h2>Sua aldeia</h2>
          <button type="button" className="button" disabled={pending} onClick={onGraphical}>
            <Mountain size={15} aria-hidden="true" /> Ver o cenário
          </button>
        </header>
        <LedgerSections snapshot={snapshot} clock={clock} />
      </aside>
      <section className="classic-list hud-card" aria-label="Edifícios">
        <h2>Edifícios</h2>
        <ul>
          {snapshot.buildings
            .filter((building) => building.level > 0)
            .map((building) => {
              const state = crestState(building, snapshot.queue, clock);
              return (
                <li key={building.code}>
                  <button
                    type="button"
                    data-state={state}
                    title={building.unavailableReason ?? undefined}
                    onClick={() => onSelect(building.code)}
                  >
                    <img
                      src={buildingArt(building.code, building.level, building.maxLevel)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <strong>{building.name}</strong>
                    <span>Nível {building.level}</span>
                    <em>{crestLabels[state]}</em>
                  </button>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
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
      {collapsed ? null : <LedgerSections snapshot={snapshot} clock={clock} />}
    </aside>
  );
}

/** Faixa do cenário que a mesa de obras aberta cobre (largura e margens em flows.css). */
const plannerWidth = 484;
const guideKey = 'dwar:guia-cena';
type GuidePart = SceneTarget['part'];

/** Apresenta as duas ações do cenário até o jogador usar ambas ou dispensar o aviso. */
function useSceneGuide() {
  const [done, setDone] = useState<GuidePart[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(guideKey) ?? '[]') as unknown;
      return Array.isArray(saved) ? (saved as GuidePart[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(guideKey, JSON.stringify(done));
    } catch {
      /* só nesta sessão */
    }
  }, [done]);
  return {
    done,
    visible: done.length < 2,
    learn: (part: GuidePart) => setDone((list) => (list.includes(part) ? list : [...list, part])),
    dismiss: () => setDone(['crest', 'building']),
  };
}

const tapVerb = matchMedia('(pointer: coarse)').matches ? 'Toque' : 'Clique';

/** Guia da primeira visita: diz, com a própria forma do brasão, o que cada clique faz. */
function SceneGuide({ guide }: { guide: ReturnType<typeof useSceneGuide> }) {
  return (
    <aside
      className="scene-guide"
      aria-label="Como usar o cenário"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p data-done={guide.done.includes('crest') ? 'true' : undefined}>
        <svg viewBox="0 0 30 34" width="20" height="23" aria-hidden="true">
          <path d="M1.5 3.5 Q15 -0.5 28.5 3.5 L28.5 16 Q28.5 27.5 15 33.5 Q1.5 27.5 1.5 16 Z" />
        </svg>
        <span>
          {tapVerb} no <b>brasão</b>
          <small>compara custo e prazo da obra</small>
        </span>
      </p>
      <p data-done={guide.done.includes('building') ? 'true' : undefined}>
        <img src={buildingArt('barracks', 1, 25)} alt="" />
        <span>
          {tapVerb} no <b>edifício</b>
          <small>abre a função dele</small>
        </span>
      </p>
      <button type="button" aria-label="Dispensar dica" title="Dispensar" onClick={guide.dismiss}>
        <X size={14} aria-hidden="true" />
      </button>
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
  const [hovered, setHovered] = useState<SceneTarget | null>(null);
  const guide = useSceneGuide();
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
      <ClassicOverview
        snapshot={snapshot}
        clock={clock}
        pending={preferencePending}
        onGraphical={() => onPreference(true)}
        onSelect={onSelect}
      />
    );
  const hoveredBuilding = snapshot.buildings.find((building) => building.code === hovered?.code);
  return (
    <VillageScene
      villageId={snapshot.village.id}
      buildings={snapshot.buildings}
      onSelect={(code) => {
        // O Edifício principal é a própria mesa de obras: abre o painel em vez de uma janela.
        guide.learn('building');
        if (code === 'main') planner.show();
        else onSelect(code);
      }}
      onCrest={(code) => {
        guide.learn('crest');
        // Com a mesa à vista, o brasão liga e desliga; recolhida, abre com a comparação que já havia.
        planner.compare(code, !(planner.open && planner.compared.includes(code)));
        planner.setOpen(true);
      }}
      coveredRight={planner.open ? plannerWidth : 0}
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
        <BuildingCard
          building={hoveredBuilding}
          snapshot={snapshot}
          clock={clock}
          part={hovered!.part}
          planner={planner}
        />
      ) : null}
      {guide.visible ? <SceneGuide guide={guide} /> : null}
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

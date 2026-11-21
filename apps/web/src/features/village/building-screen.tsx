import type { CSSProperties } from 'react';
import type { BuildingView, VillageSnapshot, RecruitmentOrder } from '@dwar/api-client';
import { BuildingTable, ConstructionQueue } from './building/index.js';
import { BuildingOverview } from './building/building-overview.js';
import { ResearchTable, researchProgress } from './research/index.js';
import { RecruitmentPanel } from './recruitment/index.js';
import { AcademyPanel, AcademyStats } from './academy/index.js';
import { MarketPanel } from './market/index.js';
import { RallyPanel } from './rally/index.js';
import { PanelHead } from './shared/panel-head.js';
import { numbers } from './shared/index.js';

const recruiters = ['barracks', 'stable', 'workshop'];

/** Edifícios com tela própria; os demais usam a visão geral (indicadores + evolução). */
export const panelBuildings = ['main', 'smith', 'noble', 'market', 'place', ...recruiters];

function MainStats({ snapshot }: { snapshot: VillageSnapshot }) {
  const maxed = snapshot.buildings.filter((item) => item.level >= item.maxLevel).length;
  return (
    <div className="head-stats">
      <div>
        <small>Obras na fila</small>
        <strong>
          {snapshot.queue.length}
          <span>/{snapshot.world.maxBuildQueue}</span>
        </strong>
      </div>
      <div>
        <small>No nível máximo</small>
        <strong>
          {maxed}
          <span>/{snapshot.buildings.length}</span>
        </strong>
      </div>
    </div>
  );
}

function ResearchStats({ snapshot }: { snapshot: VillageSnapshot }) {
  const { done, total } = researchProgress(snapshot);
  return (
    <div
      className="head-stats single"
      style={{ '--progress': total ? done / total : 0 } as CSSProperties}
    >
      <div>
        <small>Tecnologias pesquisadas</small>
        <strong>
          {done}
          <span>/{total}</span>
        </strong>
        <span className="head-meter" aria-hidden="true" />
      </div>
    </div>
  );
}

function RecruitStats({ snapshot, code }: { snapshot: VillageSnapshot; code: string }) {
  const training = snapshot.recruitmentQueue
    .filter((event) => event.buildingCode === code)
    .reduce((sum, event) => sum + event.quantity - event.delivered, 0);
  const home = snapshot.units
    .filter((unit) => unit.building === code)
    .reduce((sum, unit) => sum + unit.indoors, 0);
  return (
    <div className="head-stats">
      <div>
        <small>Na aldeia</small>
        <strong>{numbers.format(home)}</strong>
      </div>
      <div>
        <small>Em treino</small>
        <strong>{numbers.format(training)}</strong>
      </div>
    </div>
  );
}

export function BuildingScreen({
  snapshot,
  building,
  clock,
  pending,
  pendingCode,
  onCancel,
  onConstruct,
  onSelect,
  onResearch,
  researchPending,
  onRecruit,
  onCancelRecruitment,
  recruitmentPending,
  recruitmentVersion,
  onAcademyAction,
  academyPending,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
  clock: number;
  pending: boolean;
  pendingCode?: string | undefined;
  onCancel: (id: number) => void;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
  onResearch: (code: string) => void;
  researchPending: boolean;
  onRecruit: (buildingCode: string, orders: RecruitmentOrder[]) => void;
  onCancelRecruitment: (id: number) => void;
  recruitmentPending: boolean;
  recruitmentVersion: number;
  onAcademyAction: (action: 'mint' | 'recruit') => void;
  academyPending: boolean;
}) {
  const built = building.level > 0;
  if (building.code === 'market' && built)
    return <MarketPanel snapshot={snapshot} building={building} clock={clock} />;
  if (building.code === 'place' && built)
    return <RallyPanel snapshot={snapshot} building={building} />;
  if (building.code === 'main')
    return (
      <div className="building-panel">
        <PanelHead building={building}>
          <MainStats snapshot={snapshot} />
        </PanelHead>
        <ConstructionQueue
          snapshot={snapshot}
          clock={clock}
          onCancel={onCancel}
          pending={pending}
        />
        <BuildingTable
          snapshot={snapshot}
          pending={pending}
          pendingCode={pendingCode}
          clock={clock}
          onConstruct={onConstruct}
          onSelect={onSelect}
        />
      </div>
    );
  if (recruiters.includes(building.code) && built)
    return (
      <div className="building-panel">
        <PanelHead building={building}>
          <RecruitStats snapshot={snapshot} code={building.code} />
        </PanelHead>
        <RecruitmentPanel
          key={`${building.code}:${recruitmentVersion}`}
          snapshot={snapshot}
          buildingCode={building.code}
          clock={clock}
          pending={recruitmentPending}
          onRecruit={onRecruit}
          onCancel={onCancelRecruitment}
          onSelect={onSelect}
        />
      </div>
    );
  if (building.code === 'smith' && built)
    return (
      <div className="building-panel">
        <PanelHead building={building}>
          <ResearchStats snapshot={snapshot} />
        </PanelHead>
        <ResearchTable
          snapshot={snapshot}
          clock={clock}
          pending={researchPending}
          onResearch={onResearch}
        />
      </div>
    );
  if (building.code === 'noble' && built)
    return (
      <div className="building-panel">
        <PanelHead building={building}>
          <AcademyStats snapshot={snapshot} />
        </PanelHead>
        <AcademyPanel
          snapshot={snapshot}
          clock={clock}
          pending={academyPending}
          onAction={onAcademyAction}
          onCancel={onCancelRecruitment}
        />
      </div>
    );
  return (
    <BuildingOverview
      snapshot={snapshot}
      building={building}
      clock={clock}
      pending={pending}
      busy={pendingCode === building.code}
      onConstruct={onConstruct}
      onSelect={onSelect}
    />
  );
}

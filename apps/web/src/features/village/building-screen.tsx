import type { BuildingView, VillageSnapshot, RecruitmentOrder } from '@dwar/api-client';
import { ResourceIcon } from '../../components/legacy-frame.js';
import { BuildingTable, ConstructionQueue } from './building/index.js';
import { ResearchTable } from './research/index.js';
import { RecruitmentPanel } from './recruitment/index.js';
import { AcademyPanel } from './academy/index.js';
import { MarketPanel } from './market/index.js';
import { RallyPanel } from './rally/index.js';
import { completionDate, duration, numbers, resources } from './shared/index.js';
export function BuildingScreen({
  snapshot,
  building,
  clock,
  pending,
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
  if (building.code === 'market' && building.level > 0)
    return <MarketPanel snapshot={snapshot} building={building} clock={clock} />;
  if (building.code === 'place' && building.level > 0)
    return <RallyPanel snapshot={snapshot} building={building} />;
  return (
    <div className="legacy-content">
      <header className="legacy-building-heading">
        <img src={`/legacy/build/${building.code}.jpg`} alt="" />
        <div>
          <h1>
            {building.name} ({building.level ? `nível ${building.level}` : 'não construído'})
          </h1>
          <p>{building.description}</p>
        </div>
      </header>
      {['barracks', 'stable', 'workshop'].includes(building.code) && building.level > 0 ? (
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
      ) : null}
      {building.code === 'noble' && building.level > 0 ? (
        <AcademyPanel
          snapshot={snapshot}
          clock={clock}
          pending={academyPending}
          onAction={onAcademyAction}
          onCancel={onCancelRecruitment}
        />
      ) : null}
      {building.code === 'smith' && building.level > 0 ? (
        <ResearchTable
          technologies={snapshot.technologies}
          clock={clock}
          pending={researchPending}
          onResearch={onResearch}
        />
      ) : null}
      {building.code === 'main' ? (
        <>
          <ConstructionQueue
            snapshot={snapshot}
            clock={clock}
            onCancel={onCancel}
            pending={pending}
          />
          <BuildingTable
            snapshot={snapshot}
            pending={pending}
            clock={clock}
            onConstruct={onConstruct}
            onSelect={onSelect}
          />
        </>
      ) : (
        <>
          {building.details.length ? (
            <table className="legacy-table building-details">
              <tbody>
                {building.details.map((row) => (
                  <tr key={row.label}>
                    {row.icon ? (
                      <td className="detail-icon">
                        <ResourceIcon code={row.icon} label={row.label} />
                      </td>
                    ) : null}
                    <td>{row.label}:</td>
                    <td>
                      <strong>
                        {numbers.format(row.value)}
                        {row.unit === '%' ? '%' : ''}
                      </strong>
                      {row.unit === '%' ? '' : ` ${row.unit}`}
                    </td>
                  </tr>
                ))}
                {building.level === building.maxLevel ? (
                  <tr>
                    <td colSpan={3}>Edifício completamente construído.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
          {building.code === 'storage' ? (
            <table className="legacy-table building-details warehouse-times">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Armazém cheio</th>
                  <th>Duração</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(({ code, name }) => {
                  const seconds = Math.max(
                    0,
                    ((snapshot.village.capacity - snapshot.village.resources[code]) /
                      snapshot.village.productionPerHour[code]) *
                      3600 -
                      (clock - new Date(snapshot.serverTime).getTime()) / 1000,
                  );
                  const fullAt = new Date(clock + seconds * 1000).toISOString();
                  return (
                    <tr key={code}>
                      <td>
                        <ResourceIcon code={code} label={name} />
                      </td>
                      {seconds <= 0 ? (
                        <td colSpan={2}>
                          <strong>Armazém cheio de {name.toLowerCase()}.</strong>
                        </td>
                      ) : (
                        <>
                          <td>{completionDate(fullAt, clock)}</td>
                          <td>{duration(seconds)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </div>
  );
}

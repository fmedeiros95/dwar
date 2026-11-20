import { useMemo } from 'react';
import type { VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { RecruitmentQueue, duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

function Availability({
  reason,
  availableAt,
  clock,
}: {
  reason: string | null;
  availableAt: string | null;
  clock: number;
}) {
  return (
    <p className="bcard-reason">
      {availableAt
        ? `Recursos disponíveis em ${duration((new Date(availableAt).getTime() - clock) / 1000)}`
        : reason}
    </p>
  );
}

export function AcademyPanel({
  snapshot,
  clock,
  pending,
  onAction,
  onCancel,
}: {
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onAction: (action: 'mint' | 'recruit') => void;
  onCancel: (id: number) => void;
}) {
  const academy = snapshot.academy;
  const noble = snapshot.units.find((unit) => unit.code === 'noble')!;
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  const stats = [
    { label: 'Moedas cunhadas', value: academy.coins },
    { label: 'Nobres em recrutamento', value: academy.noblesInProgress },
    { label: 'Nobres desta aldeia', value: academy.noblesFromVillage },
    ...(academy.coinsMissing > 0
      ? [{ label: 'Moedas para o próximo nobre', value: academy.coinsMissing, warn: true }]
      : []),
  ];
  return (
    <>
      <RecruitmentQueue
        academy
        queue={snapshot.recruitmentQueue.filter((event) => event.buildingCode === 'noble')}
        clock={clock}
        pending={pending}
        onCancel={onCancel}
      />
      <dl className="stat-tiles">
        {stats.map((item) => (
          <div className={`stat-tile${'warn' in item ? ' warn' : ''}`} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{numbers.format(item.value)}</dd>
          </div>
        ))}
      </dl>
      <ul className="ugrid academy-grid">
        <li className="ucard">
          <div className="ucard-top">
            <img className="ucard-portrait" src={unitIconSrc('noble')} alt="" />
            <div className="ucard-title">
              <h3>Nobre</h3>
              <span className="ucard-stock">
                Na aldeia <strong>{numbers.format(noble.indoors)}</strong>
                <span aria-hidden="true"> · </span>
                Total <strong>{numbers.format(noble.total)}</strong>
              </span>
            </div>
          </div>
          <ul className="bcard-cost" aria-label="Custo de um nobre">
            {resources.map(({ code, name }) => (
              <li
                key={code}
                className={have[code] < noble.cost[code] ? 'short' : undefined}
                title={name}
              >
                <ResourceIcon code={code} label={name} />
                {numbers.format(noble.cost[code])}
              </li>
            ))}
            <li title="População">
              <ResourceIcon code="peasants" label="População" />
              {noble.population}
            </li>
            <li className="bcard-time" title="Tempo de treinamento">
              {duration(noble.durationSeconds)}
            </li>
          </ul>
          {academy.canRecruit ? (
            <button
              className="bcard-action green"
              disabled={pending}
              onClick={() => onAction('recruit')}
              aria-label="Recrutar nobre"
            >
              Recrutar nobre
            </button>
          ) : (
            <Availability
              reason={academy.recruitUnavailableReason}
              availableAt={academy.recruitResourcesAvailableAt}
              clock={clock}
            />
          )}
        </li>
        <li className="ucard">
          <div className="ucard-top">
            <span className="ucard-portrait coin" aria-hidden="true">
              <ResourceIcon code="coins" label="Moeda" />
            </span>
            <div className="ucard-title">
              <h3>Moeda</h3>
              <span className="ucard-stock">
                Cunhadas <strong>{numbers.format(academy.coins)}</strong>
              </span>
            </div>
          </div>
          <ul className="bcard-cost" aria-label="Custo de uma moeda">
            {resources.map(({ code, name }) => (
              <li
                key={code}
                className={have[code] < academy.coinCost[code] ? 'short' : undefined}
                title={name}
              >
                <ResourceIcon code={code} label={name} />
                {numbers.format(academy.coinCost[code])}
              </li>
            ))}
          </ul>
          {academy.canMint ? (
            <button
              className="bcard-action green"
              disabled={pending}
              onClick={() => onAction('mint')}
              aria-label="Cunhar uma moeda"
            >
              Cunhar moeda
            </button>
          ) : (
            <Availability
              reason={academy.mintUnavailableReason}
              availableAt={academy.mintResourcesAvailableAt}
              clock={clock}
            />
          )}
        </li>
      </ul>
    </>
  );
}

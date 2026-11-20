import type { VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { RecruitmentQueue, duration, numbers, resources } from '../shared/index.js';
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
  return availableAt ? (
    <>Recursos disponíveis em {duration((new Date(availableAt).getTime() - clock) / 1000)}</>
  ) : (
    <>{reason}</>
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
  return (
    <>
      <RecruitmentQueue
        academy
        queue={snapshot.recruitmentQueue.filter((event) => event.buildingCode === 'noble')}
        clock={clock}
        pending={pending}
        onCancel={onCancel}
      />
      <div className="table-scroll">
        <table className="legacy-table academy-recruitment">
          <thead>
            <tr>
              <th>Unidade</th>
              <th colSpan={4}>Recursos</th>
              <th>Tempo</th>
              <th>Na aldeia/Total</th>
              <th>Opção</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <img className="research-unit-icon" src={unitIconSrc('noble')} alt="" />{' '}
                <strong>Nobre</strong>
              </td>
              {resources.map(({ code, name }) => (
                <td key={code}>
                  <ResourceIcon code={code} label={name} /> {numbers.format(noble.cost[code])}
                </td>
              ))}
              <td>
                <ResourceIcon code="peasants" label="População" /> {noble.population}
              </td>
              <td>{duration(noble.durationSeconds)}</td>
              <td>
                {numbers.format(noble.indoors)}/{numbers.format(noble.total)}
              </td>
              <td>
                {academy.canRecruit ? (
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => onAction('recruit')}
                    aria-label="Recrutar nobre"
                  >
                    Recrutar
                  </button>
                ) : (
                  <Availability
                    reason={academy.recruitUnavailableReason}
                    availableAt={academy.recruitResourcesAvailableAt}
                    clock={clock}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <table className="legacy-table academy-info">
        <thead>
          <tr>
            <th colSpan={2}>Info:</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Moedas cunhadas:</td>
            <td>{numbers.format(academy.coins)}</td>
          </tr>
          <tr>
            <td>Nobres em recrutamento:</td>
            <td>{numbers.format(academy.noblesInProgress)}</td>
          </tr>
          <tr>
            <td>Nobres desta aldeia:</td>
            <td>{numbers.format(academy.noblesFromVillage)}</td>
          </tr>
          {academy.coinsMissing > 0 ? (
            <tr>
              <td>Moedas necessárias para o próximo nobre:</td>
              <td>{numbers.format(academy.coinsMissing)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="table-scroll">
        <table className="legacy-table academy-mint">
          <thead>
            <tr>
              <th>Unidade</th>
              <th colSpan={3}>Recursos</th>
              <th>Opção</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <ResourceIcon code="coins" label="Moeda" /> <strong>Moeda</strong>
              </td>
              {resources.map(({ code, name }) => (
                <td key={code}>
                  <ResourceIcon code={code} label={name} /> {numbers.format(academy.coinCost[code])}
                </td>
              ))}
              <td>
                {academy.canMint ? (
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => onAction('mint')}
                    aria-label="Cunhar uma moeda"
                  >
                    Cunhar
                  </button>
                ) : (
                  <Availability
                    reason={academy.mintUnavailableReason}
                    availableAt={academy.mintResourcesAvailableAt}
                    clock={clock}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

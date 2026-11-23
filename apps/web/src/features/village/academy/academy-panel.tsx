import { useMemo, type CSSProperties } from 'react';
import { Coins, Crown } from 'lucide-react';
import type { VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { RecruitmentQueue, numbers } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { CostChips, WaitReason } from '../shared/cost-chips.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

/** Indicadores da academia para o cabeçalho. */
export function AcademyStats({ snapshot }: { snapshot: VillageSnapshot }) {
  const { academy } = snapshot;
  return (
    <div className="head-stats">
      <div>
        <small>Moedas</small>
        <strong>{numbers.format(academy.coins)}</strong>
      </div>
      <div>
        <small>Nobres da aldeia</small>
        <strong>{numbers.format(academy.noblesFromVillage)}</strong>
      </div>
      {academy.noblesInProgress ? (
        <div>
          <small>Em treino</small>
          <strong>{numbers.format(academy.noblesInProgress)}</strong>
        </div>
      ) : null}
    </div>
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
  const required = Math.max(1, academy.coinsRequired);
  const coinProgress = Math.min(1, academy.coins / required);
  return (
    <>
      <RecruitmentQueue
        academy
        queue={snapshot.recruitmentQueue.filter((event) => event.buildingCode === 'noble')}
        clock={clock}
        pending={pending}
        onCancel={onCancel}
      />
      <div className="academy-flow">
        <article className="academy-card coin">
          <div className="academy-emblem" aria-hidden="true">
            <ResourceIcon code="coins" label="Moeda" />
          </div>
          <h2>Cunhar moedas</h2>
          <p className="panel-hint">Cada nobre exige moedas guardadas na academia.</p>
          <CostChips label="Custo de uma moeda" cost={academy.coinCost} have={have} />
          {academy.canMint ? (
            <button
              className="wide"
              disabled={pending}
              onClick={() => onAction('mint')}
            >
              <Coins size={17} aria-hidden="true" /> Cunhar moeda
            </button>
          ) : (
            <WaitReason
              availableAt={academy.mintResourcesAvailableAt}
              reason={academy.mintUnavailableReason}
              clock={clock}
            />
          )}
        </article>
        <div className="academy-link" style={{ '--progress': coinProgress } as CSSProperties}>
          <span className="academy-coins">
            <strong>{numbers.format(academy.coins)}</strong>{' '}
            {academy.coins === 1 ? 'moeda' : 'moedas'}
          </span>
          <span className="academy-meter" aria-hidden="true" />
          <small>
            {academy.coinsMissing > 0
              ? `Faltam ${numbers.format(academy.coinsMissing)} para o próximo nobre`
              : `O próximo nobre exige ${numbers.format(academy.coinsRequired)}`}
          </small>
        </div>
        <article className="academy-card noble">
          <div className="academy-emblem portrait" aria-hidden="true">
            <img src={unitIconSrc('noble')} alt="" />
          </div>
          <h2>Recrutar nobre</h2>
          <p className="panel-hint">
            Na aldeia <strong>{numbers.format(noble.indoors)}</strong> · total{' '}
            <strong>{numbers.format(noble.total)}</strong>. Nobres conquistam aldeias.
          </p>
          <CostChips
            label="Custo de um nobre"
            cost={noble.cost}
            have={have}
            population={noble.population}
            seconds={noble.durationSeconds}
          />
          {academy.canRecruit ? (
            <button
              className="wide"
              disabled={pending}
              onClick={() => onAction('recruit')}
              aria-label="Recrutar nobre"
            >
              <Crown size={17} aria-hidden="true" /> Recrutar nobre
            </button>
          ) : (
            <WaitReason
              availableAt={academy.recruitResourcesAvailableAt}
              reason={academy.recruitUnavailableReason}
              clock={clock}
            />
          )}
        </article>
      </div>
    </>
  );
}

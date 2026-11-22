import { useMemo, type CSSProperties } from 'react';
import { ArrowUp, Check, Crown, Hammer, Lock } from 'lucide-react';
import type { BuildingView, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { completionDate, duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { CostChips, WaitReason } from '../shared/cost-chips.js';
import { buildingArt } from '../overview/scene-model.js';

const formatStat = (value: number, unit: string) =>
  unit === '%' ? `${numbers.format(value)}%` : numbers.format(value);

/** Trilha de níveis: um segmento por nível; os já construídos cheios e os da fila em destaque. */
export function LevelTrack({ building }: { building: BuildingView }) {
  return (
    <div className="level-track">
      <div className="level-track-head">
        <span>
          {building.level ? (
            <>
              Nível <strong>{building.level}</strong> de {building.maxLevel}
            </>
          ) : (
            'Ainda não construído'
          )}
        </span>
        {building.queuedLevel > building.level ? (
          <em>
            <Hammer size={12} aria-hidden="true" /> obra até o nível {building.queuedLevel}
          </em>
        ) : null}
      </div>
      <ol className="level-segments" aria-hidden="true">
        {Array.from({ length: building.maxLevel }, (_, index) => {
          const level = index + 1;
          return (
            <li
              key={level}
              data-state={
                level <= building.level
                  ? 'built'
                  : level <= building.queuedLevel
                    ? 'queued'
                    : undefined
              }
            />
          );
        })}
      </ol>
    </div>
  );
}

function StatCard({
  stat,
  building,
}: {
  stat: BuildingView['details'][number];
  building: BuildingView;
}) {
  const levelStat = stat.next !== null || building.level >= building.maxLevel;
  const scale = Math.max(1, stat.max);
  return (
    <article className="stat-card">
      <header>
        {stat.icon ? <ResourceIcon code={stat.icon} label={stat.label} /> : null}
        {stat.label}
      </header>
      <p className="stat-now">
        <strong>{formatStat(stat.current, stat.unit)}</strong>
        {stat.unit !== '%' ? <span>{stat.unit}</span> : null}
      </p>
      {stat.next !== null ? (
        <p className="stat-next">
          <ArrowUp size={14} aria-hidden="true" />
          Nível {building.level + 1}: <strong>{formatStat(stat.next, stat.unit)}</strong>
          <em>+{formatStat(stat.next - stat.current, stat.unit)}</em>
        </p>
      ) : null}
      <div
        className="stat-track"
        style={
          {
            '--now': Math.min(1, stat.current / scale),
            '--next': Math.min(1, (stat.next ?? stat.current) / scale),
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <span className="next" />
        <span className="now" />
      </div>
      <small>
        {levelStat
          ? building.level >= building.maxLevel
            ? 'Valor máximo alcançado'
            : `No nível ${building.maxLevel}: ${formatStat(stat.max, stat.unit)}`
          : `de ${formatStat(stat.max, stat.unit)} disponíveis`}
      </small>
    </article>
  );
}

/** Armazém: quando cada recurso enche no ritmo atual. */
function StorageTimes({ snapshot, clock }: { snapshot: VillageSnapshot; clock: number }) {
  const have = currentResources(snapshot, clock);
  return (
    <article className="stat-card storage-times">
      <header>Quando o armazém enche</header>
      <ul>
        {resources.map(({ code, name }) => {
          const rate = snapshot.village.productionPerHour[code];
          const seconds =
            rate > 0 ? ((snapshot.village.capacity - have[code]) / rate) * 3600 : Infinity;
          return (
            <li key={code}>
              <ResourceIcon code={code} label={name} />
              <span>{name}</span>
              {seconds <= 0 ? (
                <strong className="full">Cheio</strong>
              ) : Number.isFinite(seconds) ? (
                <strong>
                  {duration(seconds)}
                  <small>
                    {completionDate(new Date(clock + seconds * 1000).toISOString(), clock)}
                  </small>
                </strong>
              ) : (
                <strong>—</strong>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/**
 * Evoluir (ou construir) o edifício daqui mesmo: obra em andamento, requisitos, custo do próximo
 * nível e o botão; no nível máximo, só o selo.
 */
export function UpgradePanel({
  snapshot,
  building,
  clock,
  pending,
  busy,
  onConstruct,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
  clock: number;
  pending: boolean;
  busy: boolean;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  const works = snapshot.queue.filter((item) => item.buildingCode === building.code);
  const current = works[0];
  const maxed = building.queuedLevel >= building.maxLevel;
  const next = building.queuedLevel + 1;
  const unmet = building.requirements.filter((item) => !item.met);
  const progress = current
    ? Math.min(
        1,
        Math.max(
          0,
          (clock - new Date(current.startsAt).getTime()) /
            Math.max(1, new Date(current.endsAt).getTime() - new Date(current.startsAt).getTime()),
        ),
      )
    : 0;
  return (
    <section className="upgrade-panel" data-state={maxed ? 'max' : undefined}>
      {current ? (
        <div className="upgrade-works" style={{ '--progress': progress } as CSSProperties}>
          <Hammer size={16} aria-hidden="true" />
          <div>
            <strong>Em obra: nível {current.targetLevel}</strong>
            <small>
              {new Date(current.startsAt).getTime() > clock
                ? `Na fila · começa ${completionDate(current.startsAt, clock)}`
                : `Termina ${completionDate(current.endsAt, clock)}`}
            </small>
            <span className="upgrade-bar" aria-hidden="true" />
          </div>
          <time>{duration((new Date(current.endsAt).getTime() - clock) / 1000)}</time>
        </div>
      ) : null}
      {maxed ? (
        <div className="upgrade-max">
          <Crown size={26} aria-hidden="true" />
          <div>
            <strong>Nível máximo</strong>
            <small>
              {building.level >= building.maxLevel
                ? 'Este edifício está completo.'
                : 'As obras na fila levam ao último nível.'}
            </small>
          </div>
        </div>
      ) : (
        <>
          <h2>
            {building.queuedLevel === 0
              ? `Construir ${building.name}`
              : `Evoluir para o nível ${next}`}
          </h2>
          {unmet.length ? (
            <ul className="req-list">
              {building.requirements.map((requirement) => (
                <li key={requirement.code} className={requirement.met ? 'met' : 'unmet'}>
                  {requirement.met ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Lock size={13} aria-hidden="true" />
                  )}
                  <span>
                    {requirement.name} nível {requirement.level}
                  </span>
                  {!requirement.met ? (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onSelect(requirement.code)}
                    >
                      Abrir
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <CostChips
            label={`Custo do nível ${next}`}
            cost={building.cost}
            have={have}
            population={building.population}
            seconds={building.durationSeconds}
          />
          {building.canBuild ? (
            <button className="wide" disabled={pending} onClick={() => onConstruct(building.code)}>
              {busy ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Iniciando obra…
                </>
              ) : (
                <>
                  <ArrowUp size={17} aria-hidden="true" />
                  {building.queuedLevel === 0 ? 'Construir' : `Evoluir para o nível ${next}`}
                </>
              )}
            </button>
          ) : (
            <WaitReason
              availableAt={building.resourcesAvailableAt}
              reason={building.unavailableReason}
              clock={clock}
            />
          )}
        </>
      )}
    </section>
  );
}

/** Tela dos edifícios sem painel próprio: arte, níveis, indicadores e evolução, tudo à vista. */
export function BuildingOverview({
  snapshot,
  building,
  clock,
  pending,
  busy,
  onConstruct,
  onSelect,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
  clock: number;
  pending: boolean;
  busy: boolean;
  onConstruct: (code: string) => void;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="bview">
      <section className="bview-hero">
        <div className="bview-art">
          <img
            src={buildingArt(building.code, building.level, building.maxLevel)}
            alt=""
            decoding="async"
          />
        </div>
        <div className="bview-intro">
          <h1>{building.name}</h1>
          <p>{building.description}</p>
          <LevelTrack building={building} />
        </div>
      </section>
      <div className="bview-body">
        {building.details.length || building.code === 'storage' ? (
          <div className="stat-cards">
            {building.details.map((stat) => (
              <StatCard key={stat.label} stat={stat} building={building} />
            ))}
            {building.code === 'storage' && building.level > 0 ? (
              <StorageTimes snapshot={snapshot} clock={clock} />
            ) : null}
          </div>
        ) : null}
        <UpgradePanel
          snapshot={snapshot}
          building={building}
          clock={clock}
          pending={pending}
          busy={busy}
          onConstruct={onConstruct}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

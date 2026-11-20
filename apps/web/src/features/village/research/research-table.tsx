import { useMemo } from 'react';
import { Check, Lock } from 'lucide-react';
import type { TechnologyView, VillageSnapshot } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from '../shared/index.js';
import { currentResources } from '../shared/current-resources.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

const groups = [
  { title: 'Infantaria', codes: ['spear', 'sword', 'axe', 'archer'] },
  { title: 'Cavalaria', codes: ['spy', 'light', 'heavy'] },
  { title: 'Cerco', codes: ['ram', 'catapult'] },
];

function Technology({
  technology,
  have,
  clock,
  pending,
  onResearch,
}: {
  technology: TechnologyView;
  have: Record<(typeof resources)[number]['code'], number>;
  clock: number;
  pending: boolean;
  onResearch: (code: string) => void;
}) {
  const missing = technology.requirements.filter((requirement) => !requirement.met);
  const { status } = technology;
  const affordable = resources.every(({ code }) => have[code] >= technology.cost[code]);
  return (
    <li
      className="ucard"
      data-state={
        status === 'researched' ? 'done' : status === 'unavailable' ? 'locked' : undefined
      }
    >
      <div className="ucard-top">
        <img className="ucard-portrait" src={unitIconSrc(technology.code)} alt="" />
        <div className="ucard-title">
          <h3>{technology.name}</h3>
          <span className={`tech-status tech-${status}`}>
            {status === 'researched' ? (
              <>
                <Check size={13} aria-hidden="true" /> Pesquisado
              </>
            ) : status === 'researching' ? (
              <>
                <span className="btn-spinner gold" aria-hidden="true" /> Pesquisando
              </>
            ) : status === 'available' ? (
              'Disponível para pesquisa'
            ) : (
              <>
                <Lock size={12} aria-hidden="true" /> Bloqueado
              </>
            )}
          </span>
        </div>
      </div>
      {status === 'researching' && technology.endsAt ? (
        <p className="tech-remaining">
          Restante{' '}
          <time dateTime={technology.endsAt}>
            {duration((new Date(technology.endsAt).getTime() - clock) / 1000)}
          </time>
        </p>
      ) : null}
      {status === 'available' ? (
        <>
          <ul className="bcard-cost" aria-label={`Custo de pesquisar ${technology.name}`}>
            {resources.map(({ code, name }) => (
              <li
                key={code}
                className={have[code] < technology.cost[code] ? 'short' : undefined}
                title={name}
              >
                <ResourceIcon code={code} label={name} />
                {numbers.format(technology.cost[code])}
              </li>
            ))}
            <li className="bcard-time" title="Tempo de pesquisa">
              {duration(technology.durationSeconds)}
            </li>
          </ul>
          <button
            className="bcard-action green"
            aria-label={`Pesquisar ${technology.name}`}
            disabled={pending || !affordable}
            title={affordable ? undefined : 'Recursos insuficientes'}
            onClick={() => onResearch(technology.code)}
          >
            Pesquisar
          </button>
        </>
      ) : null}
      {status === 'unavailable' ? (
        <div className="bunavail-reqs">
          {missing.length ? (
            missing.map((requirement) => (
              <span className="bunavail-req" key={requirement.name}>
                {requirement.name} nível {requirement.level}
              </span>
            ))
          ) : (
            <p className="bcard-reason">{technology.unavailableReason}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ResearchTable({
  snapshot,
  clock,
  pending,
  onResearch,
}: {
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onResearch: (code: string) => void;
}) {
  const byCode = new Map(snapshot.technologies.map((technology) => [technology.code, technology]));
  const have = useMemo(() => currentResources(snapshot, clock), [snapshot, clock]);
  return (
    <div className="tech-groups">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="tech-heading">{group.title}</h2>
          <ul className="tech-list">
            {group.codes.flatMap((code) => {
              const technology = byCode.get(code);
              return technology
                ? [
                    <Technology
                      key={code}
                      technology={technology}
                      have={have}
                      clock={clock}
                      pending={pending}
                      onResearch={onResearch}
                    />,
                  ]
                : [];
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

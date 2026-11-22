import { useMemo, type CSSProperties } from 'react';
import { Check, FlaskConical, Lock } from 'lucide-react';
import type { TechnologyView, VillageSnapshot } from '@dwar/api-client';
import { duration, resources } from '../shared/index.js';
import { currentResources, type Have } from '../shared/current-resources.js';
import { CostChips } from '../shared/cost-chips.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

const groups = [
  { title: 'Infantaria', codes: ['spear', 'sword', 'axe', 'archer'] },
  { title: 'Cavalaria', codes: ['spy', 'light', 'heavy'] },
  { title: 'Cerco', codes: ['ram', 'catapult'] },
];

/** Quantas tecnologias já foram pesquisadas (para o cabeçalho do ferreiro). */
export function researchProgress(snapshot: VillageSnapshot) {
  const done = snapshot.technologies.filter((item) => item.status === 'researched').length;
  return { done, total: snapshot.technologies.length };
}

function Technology({
  technology,
  have,
  clock,
  pending,
  onResearch,
}: {
  technology: TechnologyView;
  have: Have;
  clock: number;
  pending: boolean;
  onResearch: (code: string) => void;
}) {
  const { status } = technology;
  const missing = technology.requirements.filter((requirement) => !requirement.met);
  const affordable = resources.every(({ code }) => have[code] >= technology.cost[code]);
  const end = technology.endsAt ? new Date(technology.endsAt).getTime() : 0;
  const progress =
    status === 'researching' && end
      ? Math.min(1, Math.max(0, 1 - (end - clock) / Math.max(1, technology.durationSeconds * 1000)))
      : 0;
  return (
    <li className="tech-tile" data-state={status}>
      <div className="tech-portrait">
        <img src={unitIconSrc(technology.code)} alt="" loading="lazy" decoding="async" />
        {status === 'researched' ? (
          <span className="tech-badge done" aria-hidden="true">
            <Check size={13} strokeWidth={3} />
          </span>
        ) : status === 'unavailable' ? (
          <span className="tech-badge locked" aria-hidden="true">
            <Lock size={11} strokeWidth={2.6} />
          </span>
        ) : null}
      </div>
      <div className="tech-body">
        <h3>{technology.name}</h3>
        {status === 'researched' ? (
          <p className="tech-note done">Pesquisado · pronto para recrutar</p>
        ) : status === 'researching' ? (
          <div className="tech-progress" style={{ '--progress': progress } as CSSProperties}>
            <span className="tech-note">
              <FlaskConical size={13} aria-hidden="true" /> Pesquisando ·{' '}
              <time dateTime={technology.endsAt ?? undefined}>
                {duration((end - clock) / 1000)}
              </time>
            </span>
            <span className="tech-bar" aria-hidden="true" />
          </div>
        ) : status === 'available' ? (
          <>
            <CostChips
              label={`Custo de pesquisar ${technology.name}`}
              cost={technology.cost}
              have={have}
              seconds={technology.durationSeconds}
            />
            <button
              className="tech-action"
              aria-label={`Pesquisar ${technology.name}`}
              disabled={pending || !affordable}
              title={affordable ? undefined : 'Recursos insuficientes'}
              onClick={() => onResearch(technology.code)}
            >
              <FlaskConical size={15} aria-hidden="true" /> Pesquisar
            </button>
          </>
        ) : missing.length ? (
          <div className="req-chips">
            {missing.map((requirement) => (
              <span className="req-chip" key={requirement.name}>
                <Lock size={11} aria-hidden="true" /> {requirement.name} {requirement.level}
              </span>
            ))}
          </div>
        ) : (
          <p className="tech-note">{technology.unavailableReason}</p>
        )}
      </div>
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
      {groups.map((group) => {
        const items = group.codes.flatMap((code) => {
          const technology = byCode.get(code);
          return technology ? [technology] : [];
        });
        if (!items.length) return null;
        const done = items.filter((item) => item.status === 'researched').length;
        return (
          <section key={group.title} className="tech-group" aria-label={group.title}>
            <h2>
              {group.title}
              <small>
                {done}/{items.length}
              </small>
            </h2>
            <ul className="tech-list">
              {items.map((technology) => (
                <Technology
                  key={technology.code}
                  technology={technology}
                  have={have}
                  clock={clock}
                  pending={pending}
                  onResearch={onResearch}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

import type { TechnologyView } from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { duration, numbers, resources } from '../shared/index.js';

const rows = [
  ['spear', 'spy', 'ram'],
  ['sword', 'light', 'catapult'],
  ['axe', 'heavy', null],
  ['archer', null, null],
];

function Technology({
  technology,
  clock,
  pending,
  onResearch,
}: {
  technology: TechnologyView;
  clock: number;
  pending: boolean;
  onResearch: (code: string) => void;
}) {
  const missing = technology.requirements.filter((requirement) => !requirement.met);
  return (
    <>
      <img className="research-unit-icon" src={`/legacy/unit/unit_${technology.code}.png`} alt="" />{' '}
      <strong>{technology.name}</strong>{' '}
      {technology.status === 'researched' ? (
        '(pesquisado)'
      ) : technology.status === 'researching' ? (
        <ul>
          <li>
            Restante:{' '}
            <time dateTime={technology.endsAt!}>
              {duration((new Date(technology.endsAt!).getTime() - clock) / 1000)}
            </time>
          </li>
        </ul>
      ) : technology.status === 'available' ? (
        <>
          <button
            className="text-button"
            aria-label={`Pesquisar ${technology.name}`}
            disabled={pending}
            onClick={() => onResearch(technology.code)}
          >
            » Pesquisar
          </button>{' '}
          ({duration(technology.durationSeconds)})
          <ul>
            <li>
              {resources.map(({ code, name }) => (
                <span className="research-cost" key={code}>
                  <ResourceIcon code={code} label={name} /> {numbers.format(technology.cost[code])}
                </span>
              ))}
            </li>
          </ul>
        </>
      ) : (
        <ul>
          {missing.length ? (
            missing.map((requirement) => (
              <li className="research-requirement" key={requirement.name}>
                {requirement.name} =&gt; {requirement.level}
              </li>
            ))
          ) : (
            <li>{technology.unavailableReason}</li>
          )}
        </ul>
      )}
    </>
  );
}

export function ResearchTable({
  technologies,
  clock,
  pending,
  onResearch,
}: {
  technologies: TechnologyView[];
  clock: number;
  pending: boolean;
  onResearch: (code: string) => void;
}) {
  const byCode = new Map(technologies.map((technology) => [technology.code, technology]));
  return (
    <div className="table-scroll">
      <table className="legacy-table research-table">
        <thead>
          <tr>
            <th scope="col">Infantaria:</th>
            <th scope="col">Cavalaria:</th>
            <th scope="col">Cerco:</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((code, column) => {
                const technology = code ? byCode.get(code) : undefined;
                return (
                  <td key={code ?? column}>
                    {technology ? (
                      <Technology
                        technology={technology}
                        clock={clock}
                        pending={pending}
                        onResearch={onResearch}
                      />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

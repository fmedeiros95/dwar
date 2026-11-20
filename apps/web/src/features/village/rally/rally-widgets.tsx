import { useState, type FormEvent } from 'react';
import type { RallySnapshot, TroopCounts } from '@dwar/api-client';
import { numbers } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

export function UnitHeaders({ types }: { types: RallySnapshot['unitTypes'] }) {
  return types.map(({ code, name }) => (
    <th key={code}>
      <img src={unitIconSrc(code)} alt={name} title={name} />
    </th>
  ));
}

export function UnitCells({
  types,
  counts,
}: {
  types: RallySnapshot['unitTypes'];
  counts: TroopCounts;
}) {
  return types.map(({ code }) => <td key={code}>{numbers.format(counts[code] ?? 0)}</td>);
}

export function SendForm({
  data,
  pending,
  x,
  y,
  onPreview,
}: {
  data: RallySnapshot;
  pending: boolean;
  x: string;
  y: string;
  onPreview: (
    x: number,
    y: number,
    troops: TroopCounts,
    kind: 'support' | 'attack',
    targetBuilding?: string,
  ) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'support' | 'attack'>('attack');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPreview(
      Number(form.get('x')),
      Number(form.get('y')),
      Object.fromEntries(data.unitTypes.map(({ code }) => [code, Number(counts[code] ?? 0)])),
      form.get('kind') === 'attack' ? 'attack' : 'support',
      String(form.get('targetBuilding') ?? ''),
    );
  }
  return (
    <form onSubmit={submit} aria-label="Enviar tropas">
      <div className="rally-send-groups">
        {[
          [0, 4],
          [4, 7],
          [7, 9],
          [9, 10],
        ].map(([start, end]) => (
          <table className="legacy-table" key={start}>
            <tbody>
              {data.unitTypes.slice(start, end).map(({ code, name }) => (
                <tr key={code}>
                  <td>
                    <img src={unitIconSrc(code)} alt={name} title={name} />{' '}
                    <input
                      aria-label={`Enviar ${name}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      size={5}
                      maxLength={10}
                      value={counts[code] ?? ''}
                      onChange={(event) =>
                        setCounts({
                          ...counts,
                          [code]: event.target.value,
                        })
                      }
                      disabled={pending}
                    />{' '}
                    <button
                      type="button"
                      className="text-button"
                      disabled={pending}
                      aria-label={`Selecionar todos: ${name}`}
                      onClick={() => setCounts({ ...counts, [code]: String(data.home[code] ?? 0) })}
                    >
                      ({numbers.format(data.home[code] ?? 0)})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <p>
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() =>
            setCounts(
              Object.fromEntries(
                Object.entries(data.home).map(([code, count]) => [code, String(count)]),
              ),
            )
          }
        >
          » Todas as unidades
        </button>
      </p>
      <p className="rally-coordinates">
        <label>
          X:{' '}
          <input
            name="x"
            aria-label="Coordenada X"
            size={3}
            maxLength={3}
            inputMode="numeric"
            pattern="[0-9]+"
            required
            defaultValue={x}
            disabled={pending}
          />
        </label>{' '}
        <label>
          Y:{' '}
          <input
            name="y"
            aria-label="Coordenada Y"
            size={3}
            maxLength={3}
            inputMode="numeric"
            pattern="[0-9]+"
            required
            defaultValue={y}
            disabled={pending}
          />
        </label>{' '}
        <select
          name="kind"
          aria-label="Tipo de comando"
          value={kind}
          onChange={(event) => setKind(event.target.value as 'support' | 'attack')}
          disabled={pending}
        >
          <option value="attack">Atacar</option>
          <option value="support">Apoiar</option>
        </select>{' '}
        <button disabled={pending} aria-label="Conferir comando">
          OK
        </button>
      </p>
      {kind === 'attack' && Number(counts.catapult ?? 0) > 0 ? (
        <p>
          <label>
            Alvo das catapultas:{' '}
            <select name="targetBuilding" required disabled={pending} defaultValue="main">
              {data.catapultTargets.map((building) => (
                <option key={building.code} value={building.code}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
        </p>
      ) : null}
    </form>
  );
}

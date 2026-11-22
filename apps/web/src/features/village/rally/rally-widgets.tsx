import { useState, type FormEvent } from 'react';
import { Crosshair, Shield, Swords, Users } from 'lucide-react';
import type { RallySnapshot, TroopCounts } from '@dwar/api-client';
import { numbers } from '../shared/index.js';
import { PanelCard } from '../shared/panel-head.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

type UnitTypes = RallySnapshot['unitTypes'];

/** Tropas como fichas (retrato + quantidade); só as unidades com algum soldado. */
export function UnitStrip({
  types,
  counts,
  empty = 'Nenhuma tropa.',
}: {
  types: UnitTypes;
  counts: TroopCounts;
  empty?: string;
}) {
  const present = types.filter(({ code }) => (counts[code] ?? 0) > 0);
  if (!present.length) return <p className="unit-strip-empty">{empty}</p>;
  return (
    <ul className="unit-strip">
      {present.map(({ code, name }) => (
        <li key={code} title={`${numbers.format(counts[code] ?? 0)} ${name}`}>
          <img src={unitIconSrc(code)} alt={name} loading="lazy" decoding="async" />
          <strong>{numbers.format(counts[code] ?? 0)}</strong>
        </li>
      ))}
    </ul>
  );
}

/** O que foi digitado no envio de tropas, guardado para voltar da confirmação sem perder nada. */
export type SendDraft = {
  x: string;
  y: string;
  counts: Record<string, string>;
  kind: 'support' | 'attack';
};

export function SendForm({
  data,
  pending,
  x,
  y,
  initial,
  onDraft,
  onPreview,
}: {
  data: RallySnapshot;
  pending: boolean;
  x: string;
  y: string;
  initial?: SendDraft | null;
  onDraft?: (draft: SendDraft) => void;
  onPreview: (
    x: number,
    y: number,
    troops: TroopCounts,
    kind: 'support' | 'attack',
    targetBuilding?: string,
  ) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>(initial?.counts ?? {});
  const [kind, setKind] = useState<'support' | 'attack'>(initial?.kind ?? 'attack');
  const chosen = data.unitTypes.reduce((sum, { code }) => sum + (Number(counts[code]) || 0), 0);
  // Só as unidades que existem na aldeia (ou que já vieram preenchidas de um rascunho).
  const available = data.unitTypes.filter(
    ({ code }) => (data.home[code] ?? 0) > 0 || Number(counts[code]) > 0,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onDraft?.({ x: String(form.get('x')), y: String(form.get('y')), counts, kind });
    onPreview(
      Number(form.get('x')),
      Number(form.get('y')),
      Object.fromEntries(data.unitTypes.map(({ code }) => [code, Number(counts[code] ?? 0)])),
      kind,
      String(form.get('targetBuilding') ?? ''),
    );
  }
  return (
    <form className="rally-send" onSubmit={submit} aria-label="Enviar tropas">
      <PanelCard
        title="Escolha as tropas"
        icon={<Users size={16} />}
        className="troop-picker"
        aside={
          <div className="panel-actions">
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                setCounts(
                  Object.fromEntries(
                    Object.entries(data.home).map(([code, count]) => [code, String(count)]),
                  ),
                )
              }
            >
              Todas
            </button>
            <button
              type="button"
              className="button"
              disabled={pending || chosen === 0}
              onClick={() => setCounts({})}
            >
              Limpar
            </button>
          </div>
        }
      >
        {available.length ? null : (
          <p className="unit-strip-empty">Nenhuma tropa na aldeia. Recrute no quartel.</p>
        )}
        <ul className="troop-grid">
          {available.map(({ code, name }) => {
            const home = data.home[code] ?? 0;
            const picked = Number(counts[code]) || 0;
            return (
              <li
                key={code}
                data-empty={home === 0 ? 'true' : undefined}
                data-picked={picked > 0 ? 'true' : undefined}
              >
                <img src={unitIconSrc(code)} alt="" loading="lazy" decoding="async" />
                <label className="troop-name" htmlFor={`troop-${code}`}>
                  {name}
                </label>
                <input
                  id={`troop-${code}`}
                  aria-label={`Enviar ${name}`}
                  inputMode="numeric"
                  placeholder="0"
                  maxLength={10}
                  value={counts[code] ?? ''}
                  onChange={(event) =>
                    setCounts({ ...counts, [code]: event.target.value.replace(/\D/g, '') })
                  }
                  disabled={pending || home === 0}
                />
                <button
                  type="button"
                  className="troop-all"
                  disabled={pending || home === 0}
                  aria-label={`Selecionar todos: ${name}`}
                  title="Enviar todas desta unidade"
                  onClick={() => setCounts({ ...counts, [code]: String(home) })}
                >
                  {numbers.format(home)}
                </button>
              </li>
            );
          })}
        </ul>
      </PanelCard>
      <PanelCard title="Ordem" icon={<Crosshair size={16} />} className="order-card">
        <div className="order-kind" role="radiogroup" aria-label="Tipo de comando">
          {(
            [
              { code: 'attack', label: 'Atacar', icon: <Swords size={18} /> },
              { code: 'support', label: 'Apoiar', icon: <Shield size={18} /> },
            ] as const
          ).map((option) => (
            <label
              key={option.code}
              className={option.code}
              data-checked={kind === option.code ? 'true' : undefined}
            >
              <input
                type="radio"
                name="kind"
                value={option.code}
                checked={kind === option.code}
                onChange={() => setKind(option.code)}
                disabled={pending}
              />
              {option.icon}
              {option.label}
            </label>
          ))}
        </div>
        <div className="coord-pair">
          <label>
            <span>X</span>
            <input
              name="x"
              aria-label="Coordenada X"
              maxLength={3}
              inputMode="numeric"
              pattern="[0-9]+"
              required
              defaultValue={initial?.x ?? x}
              disabled={pending}
            />
          </label>
          <span className="coord-sep" aria-hidden="true">
            |
          </span>
          <label>
            <span>Y</span>
            <input
              name="y"
              aria-label="Coordenada Y"
              maxLength={3}
              inputMode="numeric"
              pattern="[0-9]+"
              required
              defaultValue={initial?.y ?? y}
              disabled={pending}
            />
          </label>
        </div>
        {kind === 'attack' && Number(counts.catapult ?? 0) > 0 ? (
          <label className="order-field">
            <span>Alvo das catapultas</span>
            <select name="targetBuilding" required disabled={pending} defaultValue="main">
              {data.catapultTargets.map((building) => (
                <option key={building.code} value={building.code}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          className={`wide order-go ${kind}`}
          disabled={pending || chosen === 0}
          aria-label="Conferir comando"
        >
          {kind === 'attack' ? <Swords size={17} /> : <Shield size={17} />}
          {chosen === 0
            ? 'Escolha as tropas'
            : `${kind === 'attack' ? 'Atacar' : 'Apoiar'} com ${numbers.format(chosen)}`}
        </button>
        <p className="panel-hint">Você vê o tempo de viagem e a moral antes de confirmar.</p>
      </PanelCard>
    </form>
  );
}

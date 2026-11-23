import type { FormEvent, ReactNode } from 'react';
import { Crosshair, Shield, Swords, Users } from 'lucide-react';
import type { RallySnapshot, TroopCounts } from '@dwar/api-client';
import { numbers } from '../shared/index.js';
import { PanelCard } from '../shared/panel-head.js';
import { unitIconSrc } from '../../../components/unit-icon.js';
import { OrderTarget, ownTarget, useOrderTarget } from './order-target.js';
import { clampCounts, type OrderChoice } from '../orders/use-order-flow.js';

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

/** O que foi digitado no envio de tropas: sobrevive à revisão e a fechar a janela. */
export type SendDraft = OrderChoice & { x: string; y: string };

export function SendForm({
  worldId,
  villageId,
  data,
  pending,
  draft,
  onDraft,
  error,
  onReview,
}: {
  worldId: number;
  villageId: number;
  data: RallySnapshot;
  pending: boolean;
  draft: SendDraft;
  onDraft: (draft: SendDraft) => void;
  error: ReactNode;
  onReview: (x: number, y: number) => void;
}) {
  const { kind } = draft;
  const counts = clampCounts(draft.counts, data.home);
  const toCoord = (value: string) => (/^\d{1,3}$/.test(value) ? Number(value) : null);
  const x = toCoord(draft.x),
    y = toCoord(draft.y);
  const target = useOrderTarget(worldId, villageId, x, y);
  const chosen = data.unitTypes.reduce((sum, { code }) => sum + (counts[code] ?? 0), 0);
  // Só as unidades que existem na aldeia (ou que já vieram preenchidas de um rascunho).
  const available = data.unitTypes.filter(
    ({ code }) => (data.home[code] ?? 0) > 0 || (counts[code] ?? 0) > 0,
  );
  const setCounts = (next: Record<string, number>) => onDraft({ ...draft, counts: next });
  const blocked = !target.village || !target.kind || ownTarget(target.kind);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (x === null || y === null || chosen === 0 || blocked || pending) return;
    onReview(x, y);
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
              onClick={() => setCounts({ ...data.home })}
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
            const picked = counts[code] ?? 0;
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
                  value={picked || ''}
                  onChange={(event) =>
                    setCounts({
                      ...counts,
                      [code]: Math.min(home, Number(event.target.value.replace(/\D/g, '')) || 0),
                    })
                  }
                  disabled={pending || home === 0}
                />
                <button
                  type="button"
                  className="troop-all"
                  disabled={pending || home === 0}
                  aria-label={`Selecionar todos: ${name}`}
                  title="Enviar todas desta unidade"
                  onClick={() => setCounts({ ...counts, [code]: home })}
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
                onChange={() => onDraft({ ...draft, kind: option.code })}
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
              value={draft.x}
              onChange={(event) => onDraft({ ...draft, x: event.target.value.replace(/\D/g, '') })}
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
              value={draft.y}
              onChange={(event) => onDraft({ ...draft, y: event.target.value.replace(/\D/g, '') })}
              disabled={pending}
            />
          </label>
        </div>
        <OrderTarget info={target} x={draft.x} y={draft.y} attack={kind === 'attack'} />
        {kind === 'attack' && (counts.catapult ?? 0) > 0 ? (
          <label className="order-field">
            <span>Alvo das catapultas</span>
            <select
              name="targetBuilding"
              required
              disabled={pending}
              value={draft.targetBuilding}
              onChange={(event) => onDraft({ ...draft, targetBuilding: event.target.value })}
            >
              {data.catapultTargets.map((building) => (
                <option key={building.code} value={building.code}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {error}
        <button
          className={`wide order-go ${kind}`}
          disabled={pending || chosen === 0 || blocked}
          aria-label={`Revisar ${kind === 'attack' ? 'ataque' : 'apoio'}`}
        >
          {kind === 'attack' ? <Swords size={17} /> : <Shield size={17} />}
          {chosen === 0
            ? 'Escolha as tropas'
            : blocked
              ? 'Escolha o destino'
              : `Revisar ${kind === 'attack' ? 'ataque' : 'apoio'} com ${numbers.format(chosen)}`}
        </button>
        <p className="panel-hint">
          Na revisão você vê chegada, volta e moral. Nada sai antes de confirmar.
        </p>
      </PanelCard>
    </form>
  );
}

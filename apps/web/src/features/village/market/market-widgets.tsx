import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, Scale, Store } from 'lucide-react';
import type {
  MarketAction,
  MarketSnapshot,
  OfferView,
  ResourceCode,
  Resources,
  ShipmentView,
} from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { EmptyState } from '../../../components/empty-state.js';
import { completionDate, duration, numbers, resources } from '../shared/index.js';
import { PanelCard } from '../shared/panel-head.js';
import { TransitRow } from '../shared/transit.js';

const resourceName = (code: ResourceCode) => resources.find((row) => row.code === code)!.name;

export function Cargo({ value }: { value: Resources }) {
  return (
    <span className="cargo-chips">
      {resources
        .filter(({ code }) => value[code] > 0)
        .map(({ code, name }) => (
          <span className="cargo-chip" key={code}>
            <ResourceIcon code={code} label={name} /> {numbers.format(value[code])}
          </span>
        ))}
    </span>
  );
}

export function Amount({ code, value }: { code: ResourceCode; value: number }) {
  return (
    <span className="cargo-chip big">
      <ResourceIcon code={code} label={resourceName(code)} /> {numbers.format(value)}
    </span>
  );
}

/** Mercadores livres em destaque e, na barra, onde estão os outros. */
export function Merchants({ data }: { data: MarketSnapshot }) {
  const total = Math.max(1, data.totalMerchants);
  const parts = [
    { key: 'free', label: 'Livres', value: data.availableMerchants },
    { key: 'out', label: 'Indo', value: data.outgoingMerchants },
    { key: 'back', label: 'Voltando', value: data.returningMerchants },
    { key: 'offer', label: 'Em ofertas', value: data.reservedMerchants },
  ];
  return (
    <div className="merchant-meter">
      <div className="merchant-meter-head">
        <span>
          <strong>{numbers.format(data.availableMerchants)}</strong> /{' '}
          {numbers.format(data.totalMerchants)} mercadores livres
        </span>
        <small>Levam até {numbers.format(data.transportCapacity)}</small>
      </div>
      <div className="merchant-bar" aria-hidden="true">
        {parts.map((part) =>
          part.value ? (
            <i
              key={part.key}
              className={part.key}
              style={{ width: `${(part.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="merchant-legend">
        {parts.map((part) => (
          <li key={part.key} className={part.key}>
            {part.label} <strong>{numbers.format(part.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Formulário de envio: carga por recurso com "Máx", barra de capacidade e destino. */
export function SendResources({
  data,
  pending,
  initial,
  x,
  y,
  onSubmit,
}: {
  data: MarketSnapshot;
  pending: boolean;
  initial: Record<string, string> | null;
  x: string;
  y: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [amounts, setAmounts] = useState<Record<ResourceCode, string>>({
    wood: initial?.wood ?? '',
    stone: initial?.stone ?? '',
    iron: initial?.iron ?? '',
  });
  const value = (code: ResourceCode) => Math.max(0, Math.floor(Number(amounts[code]) || 0));
  const total = resources.reduce((sum, { code }) => sum + value(code), 0);
  const capacity = data.transportCapacity;
  const usage = capacity ? Math.min(1, total / capacity) : 1;
  const over = total > capacity;
  function fill(code: ResourceCode) {
    const others = total - value(code);
    const room = Math.max(0, capacity - others);
    setAmounts({ ...amounts, [code]: String(Math.min(data.resources[code], room)) });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      ...amounts,
      x: String(form.get('x') ?? ''),
      y: String(form.get('y') ?? ''),
    });
  }
  return (
    <form className="trade-send" onSubmit={submit} aria-label="Enviar recursos">
      <PanelCard
        title="Carga"
        className="cargo-card"
        aside={
          total > 0 ? (
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => setAmounts({ wood: '', stone: '', iron: '' })}
            >
              Limpar
            </button>
          ) : null
        }
      >
        <ul className="cargo-list">
          {resources.map(({ code, name }) => (
            <li key={code}>
              <ResourceIcon code={code} label={name} />
              <label className="cargo-name" htmlFor={`send-${code}`}>
                {name}
                <small>{numbers.format(data.resources[code])} na aldeia</small>
              </label>
              <input
                id={`send-${code}`}
                name={code}
                value={amounts[code]}
                onChange={(event) =>
                  setAmounts({ ...amounts, [code]: event.target.value.replace(/\D/g, '') })
                }
                aria-label={`Enviar ${name}`}
                inputMode="numeric"
                placeholder="0"
                maxLength={7}
                disabled={pending}
              />
              <button
                type="button"
                className="button"
                disabled={pending || data.resources[code] === 0}
                onClick={() => fill(code)}
              >
                Máx
              </button>
            </li>
          ))}
        </ul>
        <div
          className="capacity-meter"
          data-over={over ? 'true' : undefined}
          role="meter"
          aria-label="Capacidade dos mercadores livres"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={Math.min(total, capacity)}
          style={{ '--usage': usage } as CSSProperties}
        >
          <span />
        </div>
        <p className="capacity-note">
          {over
            ? `Passa ${numbers.format(total - capacity)} do que os mercadores livres carregam.`
            : `${numbers.format(total)} de ${numbers.format(capacity)} que os mercadores livres carregam.`}
        </p>
      </PanelCard>
      <PanelCard title="Destino" className="target-card">
        <div className="coord-pair">
          <label>
            <span>X</span>
            <input
              name="x"
              defaultValue={initial?.x ?? x}
              aria-label="Coordenada X"
              inputMode="numeric"
              pattern="[0-9]+"
              maxLength={3}
              required
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
              defaultValue={initial?.y ?? y}
              aria-label="Coordenada Y"
              inputMode="numeric"
              pattern="[0-9]+"
              maxLength={3}
              required
              disabled={pending}
            />
          </label>
        </div>
        <button className="wide" disabled={pending || total === 0 || over}>
          Conferir envio
        </button>
        <p className="panel-hint">Você vê o tempo de viagem antes de confirmar.</p>
      </PanelCard>
    </form>
  );
}

export function Transports({
  rows,
  incoming,
  clock,
  pending,
  onCancel,
}: {
  rows: ShipmentView[];
  incoming?: boolean;
  clock: number;
  pending: boolean;
  onCancel: (id: number) => void;
}) {
  if (!rows.length) return null;
  return (
    <PanelCard
      title={incoming ? 'Chegando na aldeia' : 'Saindo da aldeia'}
      icon={incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      aside={<span className="panel-count">{rows.length}</span>}
    >
      <ul className="transit-list">
        {rows.map((row) => {
          const cancellable =
            !incoming && row.cancelUntil && clock < new Date(row.cancelUntil).getTime();
          return (
            <TransitRow
              key={row.id}
              tone={incoming ? 'incoming' : 'trade'}
              icon={incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              label={`${row.merchants} ${row.merchants === 1 ? 'mercador' : 'mercadores'}`}
              from={row.from}
              to={row.to}
              startsAt={row.startsAt}
              endsAt={row.endsAt}
              clock={clock}
              action={
                cancellable ? (
                  <button
                    className="button danger"
                    disabled={pending}
                    onClick={() => onCancel(row.id)}
                  >
                    Cancelar
                  </button>
                ) : null
              }
            >
              <Cargo value={row.resources} />
            </TransitRow>
          );
        })}
      </ul>
    </PanelCard>
  );
}

function ratioTone(ratio: number) {
  if (ratio > 1) return { tone: 'good', label: 'Vantajosa' };
  if (ratio < 1) return { tone: 'bad', label: 'Desvantajosa' };
  return { tone: 'fair', label: 'Justa' };
}

export function Offers({
  rows,
  own,
  pending,
  onAction,
  clock,
}: {
  rows: OfferView[];
  own: boolean;
  pending: boolean;
  onAction: (action: MarketAction) => void;
  clock: number;
}) {
  if (!rows.length)
    return own ? (
      <EmptyState icon={<Store size={30} />} title="Você não tem ofertas publicadas">
        Crie uma oferta para trocar um recurso que sobra por outro que falta.
      </EmptyState>
    ) : (
      <EmptyState icon={<Scale size={30} />} title="Nenhuma oferta no momento">
        Quando outros jogadores publicarem trocas, elas aparecem aqui.
      </EmptyState>
    );
  return (
    <ul className="offer-grid">
      {rows.map((row) => {
        const rate = ratioTone(row.ratio);
        return (
          <li key={row.id} className="offer-card">
            <div className="offer-swap">
              <div>
                <small>{own ? 'Você oferece' : 'Você recebe'}</small>
                <Amount code={row.sellResource} value={row.sellAmount} />
              </div>
              <ArrowRight size={18} aria-hidden="true" className="offer-arrow" />
              <div>
                <small>{own ? 'Em troca de' : 'Você paga'}</small>
                <Amount code={row.buyResource} value={row.buyAmount} />
              </div>
            </div>
            <dl className="offer-meta">
              {own ? (
                <>
                  <div>
                    <dt>Aldeia</dt>
                    <dd>{row.village.name}</dd>
                  </div>
                  <div>
                    <dt>Mercadores</dt>
                    <dd>{row.merchants}</dd>
                  </div>
                  <div>
                    <dt>Publicada</dt>
                    <dd>{completionDate(row.createdAt, clock)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Jogador</dt>
                    <dd>{row.village.username}</dd>
                  </div>
                  <div>
                    <dt>Entrega</dt>
                    <dd>{duration(row.durationSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Proporção</dt>
                    <dd>
                      <span className={`ratio-badge ${rate.tone}`} title={rate.label}>
                        {numbers.format(row.ratio)} · {rate.label}
                      </span>
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {own ? (
              <button
                className="button danger"
                disabled={pending}
                onClick={() => onAction({ type: 'cancel_offer', id: row.id })}
              >
                Cancelar oferta
              </button>
            ) : row.canAccept ? (
              <button
                disabled={pending}
                onClick={() => onAction({ type: 'accept_offer', id: row.id })}
              >
                Aceitar troca
              </button>
            ) : (
              <p className="offer-blocked">{row.unavailableReason}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ResourcePicker({
  name,
  label,
  value,
  onChange,
  pending,
}: {
  name: string;
  label: string;
  value: ResourceCode | null;
  onChange: (code: ResourceCode) => void;
  pending: boolean;
}) {
  return (
    <div className="resource-picker" role="radiogroup" aria-label={label}>
      {resources.map(({ code, name: resource }) => (
        <label key={code} data-checked={value === code ? 'true' : undefined}>
          <input
            type="radio"
            name={name}
            value={code}
            checked={value === code}
            onChange={() => onChange(code)}
            required
            disabled={pending}
          />
          <ResourceIcon code={code} label={resource} />
          {resource}
        </label>
      ))}
    </div>
  );
}

function CreateOffer({
  pending,
  onCreate,
  onCancel,
}: {
  pending: boolean;
  onCreate: (action: MarketAction) => void;
  onCancel: () => void;
}) {
  const [sell, setSell] = useState<ResourceCode | null>(null);
  const [buy, setBuy] = useState<ResourceCode | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const ratio =
    Number(sellAmount) > 0 && Number(buyAmount) > 0 ? Number(sellAmount) / Number(buyAmount) : null;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sell || !buy) return;
    onCreate({
      type: 'create_offer',
      sellResource: sell,
      buyResource: buy,
      sellAmount: Number(sellAmount),
      buyAmount: Number(buyAmount),
    });
  }
  return (
    <form className="offer-form" onSubmit={submit} aria-label="Criar oferta">
      <PanelCard title="Você oferece" className="offer-side">
        <input
          aria-label="Quantidade oferecida"
          value={sellAmount}
          onChange={(event) => setSellAmount(event.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="Quantidade"
          maxLength={7}
          required
          disabled={pending}
        />
        <ResourcePicker
          name="sellResource"
          label="Recurso oferecido"
          value={sell}
          onChange={setSell}
          pending={pending}
        />
      </PanelCard>
      <span className="offer-form-arrow" aria-hidden="true">
        <ArrowRight size={22} />
      </span>
      <PanelCard title="Em troca de" className="offer-side">
        <input
          aria-label="Quantidade pedida"
          value={buyAmount}
          onChange={(event) => setBuyAmount(event.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="Quantidade"
          maxLength={7}
          required
          disabled={pending}
        />
        <ResourcePicker
          name="buyResource"
          label="Recurso pedido"
          value={buy}
          onChange={setBuy}
          pending={pending}
        />
      </PanelCard>
      <div className="offer-form-foot">
        <span className="panel-hint">
          {sell && buy && sell === buy
            ? 'Escolha recursos diferentes para a troca.'
            : ratio !== null
              ? `Quem aceitar recebe ${numbers.format(Math.round(ratio * 100) / 100)} para cada 1 que pagar.`
              : 'Os mercadores ficam reservados enquanto a oferta estiver publicada.'}
        </span>
        <div className="panel-actions">
          <button type="button" className="button" disabled={pending} onClick={onCancel}>
            Cancelar
          </button>
          <button disabled={pending || !sell || !buy || sell === buy} aria-label="Publicar oferta">
            Publicar oferta
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Trocas num quadro só: publicar uma oferta (o formulário abre no lugar), as suas ofertas e as
 * dos outros jogadores.
 */
export function TradeBoard({
  data,
  pending,
  composing,
  onCompose,
  onAction,
  clock,
}: {
  data: MarketSnapshot;
  pending: boolean;
  composing: boolean;
  onCompose: (value: boolean) => void;
  onAction: (action: MarketAction) => void;
  clock: number;
}) {
  return (
    <>
      {composing ? (
        <CreateOffer pending={pending} onCreate={onAction} onCancel={() => onCompose(false)} />
      ) : (
        <div className="trade-toolbar">
          <p className="panel-hint">
            Troque o recurso que sobra pelo que falta. Quando alguém aceita, os mercadores dos dois
            lados levam a carga.
          </p>
          <button disabled={pending} onClick={() => onCompose(true)}>
            <Plus size={16} aria-hidden="true" /> Nova oferta
          </button>
        </div>
      )}
      {data.ownOffers.length ? (
        <PanelCard
          title="Suas ofertas"
          icon={<Store size={16} />}
          aside={<span className="panel-count">{data.ownOffers.length}</span>}
        >
          <Offers own rows={data.ownOffers} pending={pending} onAction={onAction} clock={clock} />
        </PanelCard>
      ) : null}
      <PanelCard
        title="Ofertas de outros jogadores"
        icon={<Scale size={16} />}
        aside={
          data.otherOffers.length ? (
            <span className="panel-count">{data.otherOffers.length}</span>
          ) : null
        }
      >
        <Offers
          own={false}
          rows={data.otherOffers}
          pending={pending}
          onAction={onAction}
          clock={clock}
        />
      </PanelCard>
    </>
  );
}

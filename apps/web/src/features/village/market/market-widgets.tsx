import { type FormEvent } from 'react';
import type {
  MarketAction,
  MarketSnapshot,
  OfferView,
  ResourceCode,
  Resources,
  ShipmentView,
} from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { completionDate, duration, numbers, resources } from '../shared/index.js';

export function Cargo({ value }: { value: Resources }) {
  return (
    <>
      {resources
        .filter(({ code }) => value[code] > 0)
        .map(({ code, name }) => (
          <span className="market-cargo" key={code}>
            <ResourceIcon code={code} label={name} /> {numbers.format(value[code])}{' '}
          </span>
        ))}
    </>
  );
}

export function Amount({ code, value }: { code: ResourceCode; value: number }) {
  return (
    <span className="market-cargo">
      <ResourceIcon code={code} label={resources.find((row) => row.code === code)!.name} />{' '}
      {numbers.format(value)}
    </span>
  );
}

export function Merchants({ data }: { data: MarketSnapshot }) {
  return (
    <table className="legacy-table market-merchants">
      <thead>
        <tr>
          <th>
            Mercadores: {data.availableMerchants}/{data.totalMerchants}
          </th>
          <th>Capacidade máxima de transporte: {numbers.format(data.transportCapacity)}</th>
        </tr>
      </thead>
    </table>
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
    <>
      <h2 className="market-section-title">{incoming ? 'Chegando' : 'Saindo'}:</h2>
      <div className="table-scroll">
        <table className="legacy-table market-transports">
          <thead>
            <tr>
              <th>Transporte</th>
              <th>Recursos</th>
              <th>Mercadores</th>
              <th>Duração</th>
              <th>Chegada</th>
              {!incoming ? <th>Opção</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const target = incoming ? row.from : row.to;
              return (
                <tr key={row.id}>
                  <td>
                    {target.name} ({target.x}|{target.y})
                  </td>
                  <td>
                    <Cargo value={row.resources} />
                  </td>
                  <td>{row.merchants}</td>
                  <td>{duration((new Date(row.endsAt).getTime() - clock) / 1000)}</td>
                  <td>{completionDate(row.endsAt, clock)}</td>
                  {!incoming ? (
                    <td>
                      {row.cancelUntil && clock < new Date(row.cancelUntil).getTime() ? (
                        <button
                          className="text-button"
                          disabled={pending}
                          onClick={() => onCancel(row.id)}
                        >
                          Cancelar
                        </button>
                      ) : (
                        <span className="market-unavailable">Cancelar</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
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
  if (!rows.length) return <p>Nenhuma oferta encontrada.</p>;
  return (
    <div className="table-scroll">
      <table className="legacy-table market-offers">
        <thead>
          <tr>
            {own ? <th>Aldeia</th> : null}
            <th>Oferece</th>
            <th>Por</th>
            {own ? (
              <>
                <th>Mercadores</th>
                <th>Publicada</th>
              </>
            ) : (
              <>
                <th>Jogador</th>
                <th>Prazo de entrega</th>
                <th>Proporção</th>
              </>
            )}
            <th>Opção</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {own ? <td>{row.village.name}</td> : null}
              <td>
                <Amount code={row.sellResource} value={row.sellAmount} />
              </td>
              <td>
                <Amount code={row.buyResource} value={row.buyAmount} />
              </td>
              {own ? (
                <>
                  <td>{row.merchants}</td>
                  <td>{completionDate(row.createdAt, clock)}</td>
                </>
              ) : (
                <>
                  <td>{row.village.username}</td>
                  <td>{duration(row.durationSeconds)}</td>
                  <td
                    style={{
                      color: '#000',
                      background:
                        row.ratio === 1 ? '#eaff00' : row.ratio < 1 ? '#ff8a00' : '#96ff00',
                    }}
                  >
                    {numbers.format(row.ratio)}
                  </td>
                </>
              )}
              <td>
                {own ? (
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => onAction({ type: 'cancel_offer', id: row.id })}
                  >
                    Cancelar
                  </button>
                ) : row.canAccept ? (
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => onAction({ type: 'accept_offer', id: row.id })}
                  >
                    Aceitar
                  </button>
                ) : (
                  row.unavailableReason
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CreateOffer({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate: (action: MarketAction) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({
      type: 'create_offer',
      sellResource: String(form.get('sellResource')) as ResourceCode,
      buyResource: String(form.get('buyResource')) as ResourceCode,
      sellAmount: Number(form.get('sellAmount')),
      buyAmount: Number(form.get('buyAmount')),
    });
  }
  return (
    <form onSubmit={submit} aria-label="Criar oferta">
      <table className="legacy-table market-create">
        <tbody>
          {[
            { label: 'Oferecer', amount: 'sellAmount', code: 'sellResource' },
            { label: 'Receber', amount: 'buyAmount', code: 'buyResource' },
          ].map((row) => (
            <tr key={row.code}>
              <td>{row.label}:</td>
              <td>
                <input
                  aria-label={`Quantidade para ${row.label.toLowerCase()}`}
                  name={row.amount}
                  inputMode="numeric"
                  pattern="[0-9]+"
                  maxLength={6}
                  size={6}
                  required
                  disabled={pending}
                />
              </td>
              <td>
                {resources.map(({ code, name }) => (
                  <label className="market-radio" key={code}>
                    <input
                      type="radio"
                      name={row.code}
                      value={code}
                      aria-label={`${row.label} ${name}`}
                      required
                      disabled={pending}
                    />
                    <ResourceIcon code={code} label={name} />
                  </label>
                ))}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3}>
              <button disabled={pending} aria-label="Publicar oferta">
                OK
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}

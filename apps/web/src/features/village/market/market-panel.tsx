import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { newRequestKey } from '@dwar/api-client';
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  api,
  ApiError,
  type BuildingView,
  type MarketAction,
  type Resources,
  type TradePreview,
  type VillageSnapshot,
} from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { numbers, resources, speedLabel } from '../shared/index.js';
import { TripSummary } from '../shared/trip-summary.js';
import { Cargo, CreateOffer, Merchants, Offers, Transports } from './market-widgets.js';

const modes = [
  { code: 'send', name: 'Enviar recursos' },
  { code: 'create_offer', name: 'Criar oferta' },
  { code: 'other_offer', name: 'Outras ofertas' },
  { code: 'own_offer', name: 'Minhas ofertas' },
  { code: 'status', name: 'Situação dos mercadores' },
];

export function MarketPanel({
  snapshot,
  building,
  clock: fallbackClock,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
  clock: number;
}) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const client = useQueryClient(),
    [params, setParams] = useSearchParams();
  const mode = modes.some((row) => row.code === params.get('mode')) ? params.get('mode')! : 'send';
  const [confirmation, setConfirmation] = useState<TradePreview | null>(null),
    [formVersion, setFormVersion] = useState(0),
    [draft, setDraft] = useState<Record<string, string> | null>(null);
  const intent = useRef<{ action: MarketAction; requestId: string } | null>(null);
  const key = ['market', worldId, villageId];
  const market = useQuery({
    queryKey: key,
    queryFn: () => api.market(worldId, villageId),
    refetchInterval: 3000,
  });
  function changeMode(value: string) {
    const next = new URLSearchParams(params);
    next.set('mode', value);
    setParams(next);
    setConfirmation(null);
    preview.reset();
  }
  const preview = useMutation({
    mutationFn: (input: { x: number; y: number; resources: Resources }) =>
      api.previewTrade(worldId, villageId, input.x, input.y, input.resources),
    onSuccess: setConfirmation,
  });
  const action = useMutation({
    mutationFn: (input: { action: MarketAction; requestId: string }) =>
      api.marketAction(worldId, villageId, input.action, input.requestId),
    onSuccess: (data, input) => {
      intent.current = null;
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      preview.reset();
      if (input.action.type === 'create_offer') changeMode('own_offer');
      if (input.action.type === 'accept_offer' || input.action.type === 'send') {
        changeMode('send');
        setFormVersion((value) => value + 1);
        setDraft(null);
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
    },
  });
  function perform(value: MarketAction) {
    const input = intent.current ?? { action: value, requestId: newRequestKey() };
    intent.current = input;
    action.mutate(input);
  }
  const pending =
    preview.isPending || action.isPending || (action.isError && intent.current !== null);
  const error = preview.error ?? action.error ?? market.error;
  const alert = error ? (
    <p className="error" role="alert">
      {error.message}
      {action.isError && intent.current ? (
        <button
          className="text-button"
          disabled={action.isPending}
          onClick={() => {
            if (intent.current) action.mutate(intent.current);
          }}
        >
          Conferir e tentar novamente
        </button>
      ) : null}
    </p>
  ) : null;
  const data = market.data;
  const clock = data
    ? new Date(data.serverTime).getTime() + Math.max(0, Date.now() - market.dataUpdatedAt)
    : fallbackClock;
  if (!data)
    return (
      <div className="legacy-content">
        {alert ?? <p>Carregando mercado…</p>}
        <button onClick={() => void market.refetch()}>Atualizar</button>
      </div>
    );
  if (confirmation) {
    const { target } = confirmation;
    const total =
      confirmation.resources.wood + confirmation.resources.stone + confirmation.resources.iron;
    const usage = confirmation.capacity ? Math.round((total / confirmation.capacity) * 100) : 0;
    return (
      <div className="legacy-content confirm">
        {alert}
        <TripSummary
          label="Remessa"
          tone="trade"
          origin={confirmation.origin}
          target={target}
          targetNote={target.username}
          distance={confirmation.distance}
          durationSeconds={confirmation.durationSeconds}
          departsAt={confirmation.departsAt}
          arrivesAt={confirmation.arrivesAt}
          returnsAt={confirmation.returnsAt}
          returnLabel="Mercadores de volta"
          clock={clock}
          footnote={`Velocidade do mundo ${speedLabel(confirmation.worldSpeed)}. Os mercadores levam o mesmo tempo para voltar.`}
        />
        <section className="confirm-block">
          <h2>Carga</h2>
          <p>
            <Cargo value={confirmation.resources} />
          </p>
          <div
            className="confirm-bar"
            role="progressbar"
            aria-label="Capacidade dos mercadores usada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usage}
          >
            <span style={{ width: `${usage}%` }} />
          </div>
          <small className="muted">
            {numbers.format(total)} de {numbers.format(confirmation.capacity)} de capacidade
          </small>
        </section>
        <ul className="confirm-facts">
          <li>
            <small>Mercadores usados</small>
            <strong>
              {confirmation.merchants} de {confirmation.merchantsAvailable} disponíveis
            </strong>
          </li>
          <li>
            <small>Mercadores livres depois</small>
            <strong>{confirmation.merchantsAvailable - confirmation.merchants}</strong>
          </li>
          <li>
            <small>Sobra na aldeia</small>
            <strong>
              <Cargo value={confirmation.remaining} />
            </strong>
          </li>
        </ul>
        <div className="confirm-actions">
          <button
            aria-label="Confirmar envio"
            disabled={pending}
            onClick={() =>
              perform({
                type: 'send',
                targetId: target.id,
                resources: confirmation.resources,
              })
            }
          >
            Enviar
          </button>
          <button disabled={pending} className="text-button" onClick={() => setConfirmation(null)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setDraft(Object.fromEntries([...form.entries()].map(([name, value]) => [name, String(value)])));
    preview.mutate({
      x: Number(form.get('x')),
      y: Number(form.get('y')),
      resources: {
        wood: Number(form.get('wood')),
        stone: Number(form.get('stone')),
        iron: Number(form.get('iron')),
      },
    });
  }
  return (
    <div className="market-layout">
      <aside>
        <table className="legacy-table market-menu">
          <thead>
            <tr>
              <th>Submenus</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((row) => (
              <tr key={row.code}>
                <td>
                  <button
                    className="text-button"
                    onClick={() => changeMode(row.code)}
                    disabled={pending}
                  >
                    {mode === row.code ? '» ' : ''}
                    {row.name}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
      <section className="market-content">
        {alert}
        {mode === 'send' ? (
          <>
            <header className="legacy-building-heading">
              <img src="/legacy/build/market.jpg" alt="" />
              <div>
                <h1>
                  {building.name} (nível {building.level})
                </h1>
                <p>{building.description}</p>
              </div>
            </header>
            <Merchants data={data} />
            <form key={formVersion} onSubmit={send} aria-label="Enviar recursos">
              <div className="market-send-fields">
                <table className="legacy-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Recursos:</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(({ code, name }) => (
                      <tr key={code}>
                        <td>
                          <ResourceIcon code={code} label={name} />
                        </td>
                        <td>
                          <input
                            name={code}
                            defaultValue={draft?.[code] ?? ''}
                            aria-label={`Enviar ${name}`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            size={5}
                            disabled={pending}
                          />{' '}
                          <strong>
                            (
                            {numbers.format(Math.min(data.resources[code], data.transportCapacity))}
                            )
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className="legacy-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Destino:</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <label>
                          X:{' '}
                          <input
                            name="x"
                            defaultValue={draft?.x ?? params.get('x') ?? ''}
                            aria-label="Coordenada X"
                            inputMode="numeric"
                            pattern="[0-9]+"
                            maxLength={3}
                            size={3}
                            required
                            disabled={pending}
                          />
                        </label>
                      </td>
                      <td>
                        <label>
                          Y:{' '}
                          <input
                            name="y"
                            defaultValue={draft?.y ?? params.get('y') ?? ''}
                            aria-label="Coordenada Y"
                            inputMode="numeric"
                            pattern="[0-9]+"
                            maxLength={3}
                            size={3}
                            required
                            disabled={pending}
                          />
                        </label>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <button disabled={pending} aria-label="Conferir envio">
                          OK
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>
            <Transports
              rows={data.outgoing}
              clock={clock}
              pending={pending}
              onCancel={(id) => perform({ type: 'cancel_shipment', id })}
            />
            <Transports
              incoming
              rows={data.incoming}
              clock={clock}
              pending={pending}
              onCancel={() => undefined}
            />
          </>
        ) : mode === 'create_offer' ? (
          <>
            <Merchants data={data} />
            <CreateOffer pending={pending} onCreate={perform} />
          </>
        ) : mode === 'own_offer' ? (
          <>
            <h1>Minhas ofertas</h1>
            <Offers own rows={data.ownOffers} pending={pending} onAction={perform} clock={clock} />
          </>
        ) : mode === 'other_offer' ? (
          <Offers
            own={false}
            rows={data.otherOffers}
            pending={pending}
            onAction={perform}
            clock={clock}
          />
        ) : (
          <>
            <h2>Situação dos mercadores</h2>
            <p>Aqui você pode ver a situação dos seus mercadores.</p>
            <table className="legacy-table market-status">
              <tbody>
                {[
                  ['Mercadores saindo', data.outgoingMerchants],
                  ['Mercadores retornando', data.returningMerchants],
                  ['Mercadores em ofertas', data.reservedMerchants],
                  ['Mercadores disponíveis na aldeia', data.availableMerchants],
                ].map(([name, value]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total de mercadores</th>
                  <th>{data.totalMerchants}</th>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

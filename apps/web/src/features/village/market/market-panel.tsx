import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { newRequestKey } from '@dwar/api-client';
import { useRef, useState } from 'react';
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
import { Scale, Send } from 'lucide-react';
import { SegmentedTabs } from '../../../components/segmented-tabs.js';
import { numbers, speedLabel } from '../shared/index.js';
import { TripSummary } from '../shared/trip-summary.js';
import { PanelHead } from '../shared/panel-head.js';
import { Cargo, Merchants, SendResources, TradeBoard, Transports } from './market-widgets.js';

/*
 * Duas seções: enviar e trocar. Os endereços antigos de ofertas (criar, outras, minhas) abrem
 * as trocas; "status" virou o indicador de mercadores do cabeçalho e cai no envio.
 */
const tradeModes = ['trade', 'create_offer', 'other_offer', 'own_offer'];

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
  const mode = tradeModes.includes(params.get('mode') ?? '') ? 'trade' : 'send';
  const [composing, setComposing] = useState(params.get('mode') === 'create_offer');
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
      if (input.action.type === 'create_offer') setComposing(false);
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
            Confirmar envio
          </button>
          <button disabled={pending} className="button" onClick={() => setConfirmation(null)}>
            Voltar e editar
          </button>
        </div>
      </div>
    );
  }
  function send(values: Record<string, string>) {
    setDraft(values);
    preview.mutate({
      x: Number(values.x),
      y: Number(values.y),
      resources: {
        wood: Number(values.wood || 0),
        stone: Number(values.stone || 0),
        iron: Number(values.iron || 0),
      },
    });
  }
  return (
    <div className="building-panel market-panel">
      <PanelHead building={building}>
        <Merchants data={data} />
      </PanelHead>
      <SegmentedTabs
        label="Seções do mercado"
        value={mode}
        onChange={changeMode}
        disabled={pending}
        items={[
          { code: 'send', label: 'Enviar recursos', icon: <Send size={15} /> },
          {
            code: 'trade',
            label: 'Trocas',
            icon: <Scale size={15} />,
            count: data.otherOffers.length,
          },
        ]}
      />
      {alert}
      {mode === 'send' ? (
        <>
          <SendResources
            key={formVersion}
            data={data}
            pending={pending}
            initial={draft}
            x={params.get('x') ?? ''}
            y={params.get('y') ?? ''}
            onSubmit={send}
          />
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
      ) : (
        <TradeBoard
          data={data}
          pending={pending}
          composing={composing}
          onCompose={setComposing}
          onAction={perform}
          clock={clock}
        />
      )}
    </div>
  );
}

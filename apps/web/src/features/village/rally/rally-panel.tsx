import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { newRequestKey } from '@dwar/api-client';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  api,
  ApiError,
  type BuildingView,
  type RallyAction,
  type SupportPreview,
  type TroopCounts,
  type VillageSnapshot,
} from '@dwar/api-client';
import { CornerDownLeft, Shield, Swords } from 'lucide-react';
import { numbers, speedLabel } from '../shared/index.js';
import { TripSummary } from '../shared/trip-summary.js';
import { PanelCard, PanelHead } from '../shared/panel-head.js';
import { TransitRow } from '../shared/transit.js';
import { SendForm, UnitStrip, type SendDraft } from './rally-widgets.js';

export function RallyPanel({
  snapshot,
  building,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
}) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const client = useQueryClient(),
    [params] = useSearchParams();
  const [draft, setDraft] = useState<SendDraft | null>(null),
    [confirmation, setConfirmation] = useState<SupportPreview | null>(null),
    [version, setVersion] = useState(0),
    [notice, setNotice] = useState('');
  const intent = useRef<{ action: RallyAction; requestId: string } | null>(null);
  const key = ['rally', worldId, villageId];
  const rally = useQuery({
    queryKey: key,
    queryFn: () => api.rally(worldId, villageId),
    refetchInterval: 3000,
  });
  const preview = useMutation({
    mutationFn: (input: {
      x: number;
      y: number;
      troops: TroopCounts;
      kind: 'attack' | 'support';
      targetBuilding?: string;
    }) =>
      api.previewSupport(
        worldId,
        villageId,
        input.x,
        input.y,
        input.troops,
        input.kind,
        input.targetBuilding,
      ),
    onSuccess: (data) => {
      setConfirmation(data);
      setNotice('');
    },
  });
  const action = useMutation({
    mutationFn: (input: { action: RallyAction; requestId: string }) =>
      api.rallyAction(worldId, villageId, input.action, input.requestId),
    onSuccess: (data, input) => {
      intent.current = null;
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      setConfirmation(null);
      setDraft(null);
      setVersion((value) => value + 1);
      preview.reset();
      setNotice(
        input.action.type === 'attack'
          ? 'Ataque enviado.'
          : input.action.type === 'cancel'
            ? 'Comando cancelado. As tropas estão retornando.'
            : input.action.type === 'support'
              ? 'Apoio enviado.'
              : 'Retirada iniciada. As tropas estão retornando à aldeia.',
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
    },
  });
  function perform(value: RallyAction) {
    const input = intent.current ?? { action: value, requestId: newRequestKey() };
    intent.current = input;
    action.mutate(input);
  }
  const pending =
    action.isPending || preview.isPending || (action.isError && intent.current !== null);
  const error = action.error ?? preview.error ?? rally.error;
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
  const data = rally.data;
  if (!data)
    return (
      <div className="legacy-content">
        {alert ?? <p>Carregando praça de reunião…</p>}
        <button onClick={() => void rally.refetch()}>Atualizar</button>
      </div>
    );
  const clock = new Date(data.serverTime).getTime() + Math.max(0, Date.now() - rally.dataUpdatedAt);
  const totals = Object.fromEntries(
    data.unitTypes.map(({ code }) => [code, data.home[code]! + data.guests[code]!]),
  );
  if (confirmation) {
    const { target } = confirmation;
    const attack = confirmation.kind === 'attack';
    const note =
      target.playerId === null
        ? `Aldeia abandonada · ${numbers.format(target.points)} pts`
        : target.own
          ? `Sua aldeia · ${numbers.format(target.points)} pts`
          : `${target.username} · ${numbers.format(target.points)} pts`;
    const sentUnits = data.unitTypes.reduce(
      (sum, unit) => sum + (confirmation.troops[unit.code] ?? 0),
      0,
    );
    return (
      <div className="legacy-content confirm">
        {alert}
        <TripSummary
          label={attack ? 'Ataque' : 'Apoio'}
          tone={attack ? 'attack' : 'support'}
          origin={confirmation.origin}
          target={target}
          targetNote={note}
          distance={confirmation.distance}
          durationSeconds={confirmation.durationSeconds}
          departsAt={confirmation.departsAt}
          arrivesAt={new Date(clock + confirmation.durationSeconds * 1000).toISOString()}
          returnsAt={
            confirmation.returnsAt
              ? new Date(clock + confirmation.durationSeconds * 2000).toISOString()
              : null
          }
          returnLabel="Tropas de volta"
          clock={clock}
          footnote={`Velocidade do mundo ${speedLabel(confirmation.speeds.world)} · tropas ${speedLabel(confirmation.speeds.units)} · a unidade mais lenta (${confirmation.slowest.name}) define o tempo.`}
        />
        <ul className="confirm-facts">
          <li>
            <small>Unidades enviadas</small>
            <strong>{numbers.format(sentUnits)}</strong>
          </li>
          <li>
            <small>População</small>
            <strong>{numbers.format(confirmation.population)}</strong>
          </li>
          {confirmation.carry !== null ? (
            <li>
              <small>Capacidade de saque</small>
              <strong>{numbers.format(confirmation.carry)}</strong>
            </li>
          ) : null}
          {confirmation.morale !== null ? (
            <li>
              <small>Moral</small>
              <strong>{confirmation.morale}%</strong>
            </li>
          ) : null}
          {confirmation.targetBuilding ? (
            <li>
              <small>Alvo das catapultas</small>
              <strong>
                {data.catapultTargets.find((b) => b.code === confirmation.targetBuilding)?.name}
              </strong>
            </li>
          ) : null}
        </ul>
        <section className="confirm-block">
          <h2>Tropas enviadas</h2>
          <UnitStrip types={data.unitTypes} counts={confirmation.troops} />
        </section>
        <section className="confirm-block">
          <h2>Ficam na aldeia</h2>
          <UnitStrip
            types={data.unitTypes}
            counts={confirmation.remaining}
            empty="Nenhuma tropa fica na aldeia."
          />
        </section>
        <div className="confirm-actions">
          <button
            className={`trip-confirm ${attack ? 'attack' : 'support'}`}
            disabled={pending}
            onClick={() =>
              perform({
                type: confirmation.kind,
                ...(attack && confirmation.targetBuilding
                  ? { targetBuilding: confirmation.targetBuilding }
                  : {}),
                targetId: target.id,
                troops: confirmation.troops,
              })
            }
          >
            {attack ? 'Confirmar ataque' : 'Confirmar apoio'}
          </button>
          <button disabled={pending} className="button" onClick={() => setConfirmation(null)}>
            Voltar e editar
          </button>
        </div>
      </div>
    );
  }
  const homeTotal = data.unitTypes.reduce((sum, { code }) => sum + (data.home[code] ?? 0), 0);
  const guestTotal = data.unitTypes.reduce((sum, { code }) => sum + (data.guests[code] ?? 0), 0);
  const kindInfo = {
    attack: { label: 'Ataque', icon: <Swords size={18} /> },
    support: { label: 'Apoio', icon: <Shield size={18} /> },
    return: { label: 'Retorno', icon: <CornerDownLeft size={18} /> },
  } as const;
  return (
    <div className="building-panel rally-panel">
      <PanelHead building={building}>
        <div className="head-stats">
          <div>
            <small>Tropas na aldeia</small>
            <strong>{numbers.format(homeTotal)}</strong>
          </div>
          <div>
            <small>Comandos ativos</small>
            <strong>{numbers.format(data.movements.length)}</strong>
          </div>
          {guestTotal ? (
            <div>
              <small>Apoio recebido</small>
              <strong>{numbers.format(guestTotal)}</strong>
            </div>
          ) : null}
        </div>
      </PanelHead>
      {alert}
      {notice ? (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      ) : null}
      <SendForm
        key={`${version}:${params.get('x')}:${params.get('y')}`}
        data={data}
        pending={pending}
        x={params.get('x') ?? ''}
        y={params.get('y') ?? ''}
        initial={draft}
        onDraft={setDraft}
        onPreview={(x, y, troops, kind, targetBuilding) =>
          preview.mutate({ x, y, troops, kind, targetBuilding })
        }
      />
      {data.movements.length ? (
        <PanelCard
          title="Comandos em andamento"
          icon={<Swords size={16} />}
          aside={<span className="panel-count">{data.movements.length}</span>}
        >
          <ul className="transit-list">
            {data.movements.map((row) => {
              const info = kindInfo[row.kind];
              const cancellable = row.cancelUntil && new Date(row.cancelUntil).getTime() > clock;
              return (
                <TransitRow
                  key={row.id}
                  tone={row.kind}
                  icon={info.icon}
                  label={info.label}
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
                        onClick={() => perform({ type: 'cancel', movementId: row.id })}
                      >
                        Cancelar
                      </button>
                    ) : null
                  }
                >
                  <UnitStrip types={data.unitTypes} counts={row.troops} />
                </TransitRow>
              );
            })}
          </ul>
        </PanelCard>
      ) : null}
      {guestTotal || data.stationed.length ? (
        <PanelCard title="Apoios" icon={<Shield size={16} />}>
          <div className="support-overview">
            {guestTotal ? (
              <section>
                <h3>Defendendo esta aldeia</h3>
                <UnitStrip types={data.unitTypes} counts={data.guests} />
                <p className="panel-hint">
                  Total na defesa, com as suas:{' '}
                  {numbers.format(
                    data.unitTypes.reduce((sum, { code }) => sum + (totals[code] ?? 0), 0),
                  )}{' '}
                  unidades.
                </p>
              </section>
            ) : null}
            {data.stationed.length ? (
              <section>
                <h3>Suas tropas em outras aldeias</h3>
                <ul className="stationed-list">
                  {data.stationed.map((row) => (
                    <li key={row.location.id}>
                      <div>
                        <strong>{row.location.name}</strong>
                        <small>
                          ({row.location.x}|{row.location.y})
                        </small>
                      </div>
                      <UnitStrip types={data.unitTypes} counts={row.troops} />
                      <button
                        className="button"
                        disabled={pending}
                        onClick={() => perform({ type: 'recall', locationId: row.location.id })}
                      >
                        <CornerDownLeft size={14} aria-hidden="true" /> Retirar
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}

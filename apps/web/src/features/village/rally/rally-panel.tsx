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
import { completionDate, duration } from '../shared/index.js';
import { SendForm, UnitCells, UnitHeaders } from './rally-widgets.js';

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
    [params, setParams] = useSearchParams();
  const [confirmation, setConfirmation] = useState<SupportPreview | null>(null),
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
  const mode = params.get('mode') === 'units' ? 'units' : 'send';
  function changeMode(value: string) {
    const next = new URLSearchParams(params);
    next.set('mode', value);
    setParams(next);
    setConfirmation(null);
    preview.reset();
  }
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
  if (confirmation)
    return (
      <div className="legacy-content">
        {alert}
        <table className="legacy-table market-confirm">
          <thead>
            <tr>
              <th colSpan={2}>Informações:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Destino:</td>
              <td>{confirmation.target.name}</td>
            </tr>
            <tr>
              <td>Coordenadas:</td>
              <td>
                {confirmation.target.x}|{confirmation.target.y} K
                {Math.floor(confirmation.target.y / 100)}
                {Math.floor(confirmation.target.x / 100)}
              </td>
            </tr>
            <tr>
              <td>Jogador:</td>
              <td>{confirmation.target.username}</td>
            </tr>
            {confirmation.morale !== null ? (
              <tr>
                <td>Moral:</td>
                <td>{confirmation.morale}%</td>
              </tr>
            ) : null}
            {confirmation.targetBuilding ? (
              <tr>
                <td>Alvo das catapultas:</td>
                <td>
                  {data.catapultTargets.find((b) => b.code === confirmation.targetBuilding)?.name}
                </td>
              </tr>
            ) : null}
            <tr>
              <td>Duração:</td>
              <td>{duration(confirmation.durationSeconds)}</td>
            </tr>
            <tr>
              <td>Chegada:</td>
              <td>
                {completionDate(
                  new Date(clock + confirmation.durationSeconds * 1000).toISOString(),
                  clock,
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <button
                  disabled={pending}
                  onClick={() =>
                    perform({
                      type: confirmation.kind,
                      ...(confirmation.kind === 'attack' && confirmation.targetBuilding
                        ? { targetBuilding: confirmation.targetBuilding }
                        : {}),
                      targetId: confirmation.target.id,
                      troops: confirmation.troops,
                    })
                  }
                >
                  {confirmation.kind === 'attack' ? 'Atacar' : 'Apoiar'}
                </button>{' '}
                <button
                  disabled={pending}
                  className="text-button"
                  onClick={() => setConfirmation(null)}
                >
                  Voltar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="table-scroll">
          <table className="legacy-table rally-units">
            <thead>
              <tr>
                <UnitHeaders types={data.unitTypes} />
              </tr>
            </thead>
            <tbody>
              <tr>
                <UnitCells types={data.unitTypes} counts={confirmation.troops} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
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
            {[
              { code: 'send', name: 'Enviar tropas' },
              { code: 'units', name: 'Tropas' },
            ].map((row) => (
              <tr key={row.code}>
                <td>
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => changeMode(row.code)}
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
        <header className="legacy-building-heading">
          <img src="/legacy/build/place.jpg" alt="" />
          <div>
            <h1>
              {building.name} (nível {building.level})
            </h1>
            <p>{building.description}</p>
          </div>
        </header>
        {alert}
        {notice ? <p role="status">{notice}</p> : null}
        {mode === 'send' ? (
          <SendForm
            key={`${version}:${params.get('x')}:${params.get('y')}`}
            data={data}
            pending={pending}
            x={params.get('x') ?? ''}
            y={params.get('y') ?? ''}
            onPreview={(x, y, troops, kind, targetBuilding) =>
              preview.mutate({ x, y, troops, kind, targetBuilding })
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="legacy-table rally-units">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <UnitHeaders types={data.unitTypes} />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Desta aldeia</td>
                    <UnitCells types={data.unitTypes} counts={data.home} />
                  </tr>
                  <tr>
                    <td>De outras aldeias</td>
                    <UnitCells types={data.unitTypes} counts={data.guests} />
                  </tr>
                  <tr>
                    <th>Total</th>
                    <UnitCells types={data.unitTypes} counts={totals} />
                  </tr>
                </tbody>
              </table>
            </div>
            {data.stationed.length ? (
              <>
                <h2 className="market-section-title">Tropas em outras aldeias</h2>
                <div className="table-scroll">
                  <table className="legacy-table rally-units">
                    <thead>
                      <tr>
                        <th>Destino</th>
                        <UnitHeaders types={data.unitTypes} />
                      </tr>
                    </thead>
                    <tbody>
                      {data.stationed.map((row) => (
                        <tr key={row.location.id}>
                          <td>
                            {row.location.name} ({row.location.x}|{row.location.y}) [
                            <button
                              className="text-button"
                              disabled={pending}
                              onClick={() =>
                                perform({ type: 'recall', locationId: row.location.id })
                              }
                            >
                              Retirar
                            </button>
                            ]
                          </td>
                          <UnitCells types={data.unitTypes} counts={row.troops} />
                        </tr>
                      ))}
                      <tr>
                        <th>Total</th>
                        <UnitCells
                          types={data.unitTypes}
                          counts={Object.fromEntries(
                            data.unitTypes.map(({ code }) => [
                              code,
                              data.stationed.reduce((sum, row) => sum + (row.troops[code] ?? 0), 0),
                            ]),
                          )}
                        />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </>
        )}
        {data.movements.length ? (
          <>
            <h2 className="market-section-title">Comandos em andamento</h2>
            <div className="table-scroll">
              <table className="legacy-table rally-movements">
                <thead>
                  <tr>
                    <th>Comando</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Duração</th>
                    <th>Chegada</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.kind === 'attack'
                          ? 'Ataque'
                          : row.kind === 'return'
                            ? 'Retorno'
                            : 'Apoio'}{' '}
                        {row.cancelUntil && new Date(row.cancelUntil).getTime() > clock ? (
                          <button
                            className="text-button"
                            disabled={pending}
                            onClick={() => perform({ type: 'cancel', movementId: row.id })}
                          >
                            Cancelar
                          </button>
                        ) : null}
                      </td>
                      <td>
                        {row.from.name} ({row.from.x}|{row.from.y})
                      </td>
                      <td>
                        {row.to.name} ({row.to.x}|{row.to.y})
                      </td>
                      <td>{duration((new Date(row.endsAt).getTime() - clock) / 1000)}</td>
                      <td>{completionDate(row.endsAt, clock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

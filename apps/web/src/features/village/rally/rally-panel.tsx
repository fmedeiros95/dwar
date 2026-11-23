import { useState } from 'react';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import type { BuildingView, SupportPreview, VillageSnapshot } from '@dwar/api-client';
import { CornerDownLeft, Shield, Swords } from 'lucide-react';
import { arrivalDate, numbers } from '../shared/index.js';
import { OrderError, OrderReview, OrderReviewActions } from '../orders/order-review.js';
import { emptyChoice, useOrderFlow, useSavedDraft } from '../orders/use-order-flow.js';
import { useOrderTarget } from './order-target.js';
import { PanelCard, PanelHead } from '../shared/panel-head.js';
import { TransitRow } from '../shared/transit.js';
import { SendForm, UnitStrip, type SendDraft } from './rally-widgets.js';

/** Mesma revisão do mapa; aqui falta só descobrir de quem é a aldeia digitada. */
function useReviewOwner(snapshot: VillageSnapshot, confirmation: SupportPreview | null) {
  const info = useOrderTarget(
    snapshot.world.id,
    snapshot.village.id,
    confirmation?.target.x ?? null,
    confirmation?.target.y ?? null,
  );
  const target = confirmation?.target;
  return {
    owner: info.kind ?? (target?.playerId === null ? 'barbarian' : target?.own ? 'own' : 'player'),
    color: info.color || '#9a6236',
  } as const;
}

export function RallyPanel({
  snapshot,
  building,
}: {
  snapshot: VillageSnapshot;
  building: BuildingView;
}) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const [params] = useSearchParams();
  const paramX = params.get('x'),
    paramY = params.get('y');
  const [saved, setDraft] = useSavedDraft<SendDraft>(`praca:${worldId}:${villageId}`, {
    ...emptyChoice,
    x: '',
    y: '',
  });
  // Coordenadas trazidas por um link valem uma vez; depois o que o jogador digitar prevalece.
  const [linked, setLinked] = useState<string | null>(null);
  const link = paramX && paramY ? `${paramX}|${paramY}` : null;
  const draft = link && linked !== link ? { ...saved, x: paramX ?? '', y: paramY ?? '' } : saved;
  function edit(next: SendDraft) {
    flow.clearError();
    setLinked(link);
    setNotice('');
    setDraft(next);
  }
  const [notice, setNotice] = useState('');
  const flow = useOrderFlow(snapshot, (action, reviewed) => {
    if (reviewed) {
      setLinked(link);
      setDraft({ ...emptyChoice, x: '', y: '' });
      const arrives = new Date(flow.clock + reviewed.durationSeconds * 1000).toISOString();
      setNotice(
        `${reviewed.kind === 'attack' ? 'Ataque' : 'Apoio'} a caminho de ${reviewed.target.name} (${reviewed.target.x}|${reviewed.target.y}). Chega ${arrivalDate(arrives, flow.clock)}.`,
      );
    } else
      setNotice(
        action.type === 'cancel'
          ? 'Comando cancelado. As tropas estão retornando.'
          : 'Retirada iniciada. As tropas estão retornando à aldeia.',
      );
  });
  const { data, clock, confirmation, pending } = flow;
  const { owner, color } = useReviewOwner(snapshot, confirmation);
  const alert = <OrderError flow={flow} />;
  if (!data)
    return (
      <div className="legacy-content">
        {flow.error ? alert : <p>Carregando praça de reunião…</p>}
        <button onClick={flow.refetch}>Atualizar</button>
      </div>
    );
  const totals = Object.fromEntries(
    data.unitTypes.map(({ code }) => [code, data.home[code]! + data.guests[code]!]),
  );
  if (confirmation)
    return (
      <div
        className="order-review-window"
        data-kind={confirmation.kind}
        onKeyDown={(event) => {
          // Escape volta ao formulário; fechar a janela aqui jogaria a revisão fora.
          if (event.key !== 'Escape' || pending) return;
          event.stopPropagation();
          flow.back();
        }}
      >
        {alert}
        <OrderReview
          confirmation={confirmation}
          data={data}
          clock={clock}
          owner={owner}
          color={color}
        />
        <footer className="order-panel-foot">
          <OrderReviewActions flow={flow} kind={confirmation.kind} onBack={flow.back} />
        </footer>
      </div>
    );
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
      {flow.error && !flow.formError ? alert : null}
      {notice ? (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      ) : null}
      <SendForm
        worldId={worldId}
        villageId={villageId}
        data={data}
        pending={pending}
        draft={draft}
        onDraft={edit}
        error={flow.formError ? alert : null}
        onReview={(x, y) => flow.review(x, y, draft)}
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
                        onClick={() => flow.cancel(row.id)}
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
                        onClick={() => flow.recall(row.location.id)}
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

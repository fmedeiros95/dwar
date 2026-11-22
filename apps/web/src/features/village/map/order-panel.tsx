import { forwardRef, useRef, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  newRequestKey,
  type PublicVillage,
  type RallyAction,
  type SupportPreview,
  type TroopCounts,
  type VillageSnapshot,
} from '@dwar/api-client';
import {
  ArrowLeft,
  ArrowRight,
  Castle,
  CircleCheck,
  Coins,
  Info,
  Mail,
  Minus,
  Plus,
  Shield,
  Swords,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { MapCrest, type OwnerKind } from './map-legend.js';
import { friendly, relationLabel } from '../rally/order-target.js';
import { completionDate, duration, numbers, speedLabel } from '../shared/index.js';
import { unitIconSrc, unitIconSrcSet } from '../../../components/unit-icon.js';

export type OrderStep = 'target' | 'troops' | 'review' | 'sent';
/** Tudo o que o jogador já escolheu: sobrevive a voltar da revisão e a trocar de alvo no mapa. */
export type OrderDraft = {
  step: OrderStep;
  kind: 'attack' | 'support';
  counts: Record<string, number>;
  targetBuilding: string;
};
export const emptyDraft: OrderDraft = {
  step: 'target',
  kind: 'attack',
  counts: {},
  targetBuilding: 'main',
};

type Props = {
  snapshot: VillageSnapshot;
  target: PublicVillage;
  owner: OwnerKind;
  color: string;
  draft: OrderDraft;
  onDraft: (draft: OrderDraft) => void;
  onClose: () => void;
  /** Abre outra tela do jogo (informações, perfil, mensagem, mercado, praça, relatório). */
  onGo: (screen: string, extra: Record<string, string | number>) => void;
};

function Crest({ owner, color }: { owner: OwnerKind; color: string }) {
  return owner === 'barbarian' ? (
    <span className="map-legend-none" aria-hidden="true" />
  ) : (
    <MapCrest kind={owner} color={color} />
  );
}

function Portrait({ code }: { code: string }) {
  return <img src={unitIconSrc(code)} srcSet={unitIconSrcSet(code)} alt="" />;
}

/**
 * Ordem no mapa: o alvo escolhido no mapa vira um painel ao lado (folha no celular) que leva do
 * reconhecimento à confirmação sem cobrir o mapa. Etapas: alvo, tropas, revisão e enviado.
 */
export const OrderPanel = forwardRef<HTMLElement, Props>(function OrderPanel(
  { snapshot, target, owner, color, draft, onDraft, onClose, onGo },
  ref,
) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const client = useQueryClient();
  const rallyKey = ['rally', worldId, villageId];
  const rally = useQuery({
    queryKey: rallyKey,
    queryFn: () => api.rally(worldId, villageId),
    refetchInterval: 3000,
  });
  const info = useQuery({
    queryKey: ['village-popup', worldId, villageId, target.id],
    queryFn: () => api.villagePopup(worldId, villageId, target.id),
    staleTime: 10000,
  });
  const intent = useRef<{ action: RallyAction; requestId: string } | null>(null);
  const preview = useMutation({
    mutationFn: () =>
      api.previewSupport(
        worldId,
        villageId,
        target.x,
        target.y,
        // A API pede todas as unidades, inclusive as que não vão.
        Object.fromEntries(
          (rally.data?.unitTypes ?? []).map(({ code }) => [code, draft.counts[code] ?? 0]),
        ),
        draft.kind,
        draft.kind === 'attack' && (draft.counts.catapult ?? 0) > 0
          ? draft.targetBuilding
          : undefined,
      ),
    onSuccess: () => onDraft({ ...draft, step: 'review' }),
  });
  const send = useMutation({
    mutationFn: (input: { action: RallyAction; requestId: string }) =>
      api.rallyAction(worldId, villageId, input.action, input.requestId),
    onSuccess: (data) => {
      intent.current = null;
      client.setQueryData(rallyKey, data);
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      void client.invalidateQueries({ queryKey: ['map', worldId] });
      onDraft({ ...draft, step: 'sent' });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
    },
  });
  const data = rally.data;
  const clock = data
    ? new Date(data.serverTime).getTime() + Math.max(0, Date.now() - rally.dataUpdatedAt)
    : Date.now();
  const current = target.id === villageId;
  const attack = draft.kind === 'attack';
  const error = preview.error ?? send.error ?? rally.error;
  const types = data?.unitTypes ?? [];
  const chosen = types.filter(({ code }) => (draft.counts[code] ?? 0) > 0);
  const total = chosen.reduce((sum, { code }) => sum + (draft.counts[code] ?? 0), 0);
  const seconds = (code: string) => info.data?.units.find((unit) => unit.code === code)?.seconds;
  const slowest = chosen.reduce<{ code: string; name: string; seconds: number } | null>(
    (worst, unit) => {
      const value = seconds(unit.code) ?? 0;
      return !worst || value > worst.seconds ? { ...unit, seconds: value } : worst;
    },
    null,
  );
  const enRoute = (data?.movements ?? []).filter(
    (row) => row.to.id === target.id && row.kind !== 'return',
  );
  const returning = (data?.movements ?? []).filter(
    (row) => row.kind === 'return' && row.from.id === target.id,
  );
  const confirmation = preview.data as SupportPreview | undefined;
  function setCount(code: string, value: number) {
    const home = data?.home[code] ?? 0;
    onDraft({ ...draft, counts: { ...draft.counts, [code]: Math.max(0, Math.min(home, value)) } });
  }
  function confirm() {
    if (!confirmation) return;
    const action: RallyAction =
      confirmation.kind === 'attack'
        ? {
            type: 'attack',
            targetId: target.id,
            troops: confirmation.troops,
            ...(confirmation.targetBuilding ? { targetBuilding: confirmation.targetBuilding } : {}),
          }
        : { type: 'support', targetId: target.id, troops: confirmation.troops };
    const input = intent.current ?? { action, requestId: newRequestKey() };
    intent.current = input;
    send.mutate(input);
  }
  const busy = preview.isPending || send.isPending;
  const warn = attack && friendly.includes(owner);
  const steps: { code: OrderStep; label: string }[] = [
    { code: 'target', label: 'Alvo' },
    { code: 'troops', label: 'Tropas' },
    { code: 'review', label: 'Revisão' },
  ];

  const head = (
    <header className="order-panel-target">
      <span className="order-panel-crest">
        <Crest owner={owner} color={color} />
      </span>
      <div>
        <h2>
          {target.name}{' '}
          <em>
            {target.x}|{target.y}
          </em>
        </h2>
        <p>
          <b data-owner={owner}>{relationLabel[owner]}</b>
          {target.playerId !== null && !target.own ? <> · {target.username}</> : null}
          {target.tribe ? <> · [{target.tribe.tag}]</> : null} · {numbers.format(target.points)} pts
        </p>
      </div>
      <button type="button" className="order-panel-close" aria-label="Fechar" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </header>
  );

  let body: ReactNode;
  if (draft.step === 'target') {
    const travel = info.data?.units.filter((unit) => unit.seconds !== null) ?? [];
    const fastest = travel.reduce((min, unit) => Math.min(min, unit.seconds!), Infinity);
    const slow = travel.reduce((max, unit) => Math.max(max, unit.seconds!), 0);
    const blocked = info.data?.protectedUntil
      ? `Proteção de iniciante até ${completionDate(info.data.protectedUntil, clock)}`
      : info.data?.pointRatioBlocked
        ? 'Fora da proporção de pontos para atacar.'
        : null;
    body = (
      <>
        {current ? (
          <p className="order-panel-note">Esta é a aldeia em que você está.</p>
        ) : (
          <dl className="order-facts">
            <div>
              <dt>Distância</dt>
              <dd>{info.data ? `${numbers.format(info.data.distance)} campos` : '…'}</dd>
            </div>
            <div>
              <dt>Viagem</dt>
              <dd>
                {Number.isFinite(fastest)
                  ? `${duration(fastest)} a ${duration(slow)}`
                  : info.data
                    ? '—'
                    : '…'}
              </dd>
            </div>
            {info.data?.morale !== null && info.data?.morale !== undefined ? (
              <div>
                <dt>Moral</dt>
                <dd>{info.data.morale}%</dd>
              </div>
            ) : null}
          </dl>
        )}
        {blocked ? (
          <p className="order-warn">
            <TriangleAlert size={14} aria-hidden="true" /> {blocked}
          </p>
        ) : null}
        {enRoute.length ? <EnRoute rows={enRoute} clock={clock} /> : null}
        {current ? null : (
          <div className="order-choose" role="group" aria-label="O que fazer com esta aldeia">
            <button
              type="button"
              className="order-choose-attack"
              onClick={() => onDraft({ ...draft, kind: 'attack', step: 'troops' })}
            >
              <Swords size={20} aria-hidden="true" />
              <span>
                Atacar
                <small>{friendly.includes(owner) ? 'não é inimigo' : 'saquear e lutar'}</small>
              </span>
            </button>
            <button
              type="button"
              className="order-choose-support"
              onClick={() => onDraft({ ...draft, kind: 'support', step: 'troops' })}
            >
              <Shield size={20} aria-hidden="true" />
              <span>
                Apoiar
                <small>tropas ficam defendendo</small>
              </span>
            </button>
          </div>
        )}
        <ul className="order-links">
          <li>
            <button type="button" onClick={() => onGo('info_village', { id: target.id })}>
              <Info size={15} aria-hidden="true" /> Aldeia
            </button>
          </li>
          {target.playerId !== null ? (
            <li>
              <button type="button" onClick={() => onGo('info_player', { id: target.playerId! })}>
                <User size={15} aria-hidden="true" /> Perfil
              </button>
            </li>
          ) : null}
          {target.own && !current ? (
            <li>
              <button type="button" onClick={() => onGo('overview', { village: target.id })}>
                <Castle size={15} aria-hidden="true" /> Ir para a aldeia
              </button>
            </li>
          ) : target.playerId !== null && !target.own ? (
            <li>
              <button
                type="button"
                onClick={() => onGo('mail', { mode: 'new', id: target.playerId! })}
              >
                <Mail size={15} aria-hidden="true" /> Mensagem
              </button>
            </li>
          ) : null}
          {current ? null : (
            <li>
              <button
                type="button"
                onClick={() => onGo('market', { mode: 'send', x: target.x, y: target.y })}
              >
                <Coins size={15} aria-hidden="true" /> Recursos
              </button>
            </li>
          )}
        </ul>
      </>
    );
  } else if (draft.step === 'troops') {
    const available = types.filter(
      ({ code }) => (data?.home[code] ?? 0) > 0 || (draft.counts[code] ?? 0) > 0,
    );
    body = (
      <>
        <div className="order-kind-switch" role="radiogroup" aria-label="Tipo de ordem">
          {(
            [
              { code: 'attack', label: 'Ataque', icon: <Swords size={16} /> },
              { code: 'support', label: 'Apoio', icon: <Shield size={16} /> },
            ] as const
          ).map((option) => (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={draft.kind === option.code}
              data-kind={option.code}
              onClick={() => onDraft({ ...draft, kind: option.code })}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
        {warn ? (
          <p className="order-warn">
            <TriangleAlert size={14} aria-hidden="true" /> {relationLabel[owner]}: um ataque aqui
            atinge um aliado.
          </p>
        ) : null}
        <div className="order-troops-head">
          <span>Quem vai</span>
          <button
            type="button"
            onClick={() =>
              onDraft({ ...draft, counts: Object.fromEntries(Object.entries(data?.home ?? {})) })
            }
          >
            Todas
          </button>
          <button
            type="button"
            disabled={total === 0}
            onClick={() => onDraft({ ...draft, counts: {} })}
          >
            Limpar
          </button>
        </div>
        {!data ? (
          <p className="order-panel-note">Carregando tropas…</p>
        ) : available.length ? (
          <ul className="order-troops">
            {available.map(({ code, name }) => {
              const home = data.home[code] ?? 0;
              const value = draft.counts[code] ?? 0;
              const step = Math.max(1, Math.round(home / 10));
              const time = seconds(code);
              return (
                <li key={code} data-picked={value > 0 ? 'true' : undefined}>
                  <Portrait code={code} />
                  <span className="order-troop-name">
                    <strong>{name}</strong>
                    <small>
                      {numbers.format(home)} na aldeia
                      {time ? ` · ${duration(time)}` : ''}
                    </small>
                  </span>
                  <span className="order-stepper">
                    <button
                      type="button"
                      aria-label={`Menos ${name}`}
                      disabled={value === 0}
                      onClick={() => setCount(code, value - step)}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <input
                      aria-label={`Quantos ${name}`}
                      inputMode="numeric"
                      value={value || ''}
                      placeholder="0"
                      onChange={(event) =>
                        setCount(code, Number(event.target.value.replace(/\D/g, '')) || 0)
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Mais ${name}`}
                      disabled={value >= home}
                      onClick={() => setCount(code, value + step)}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="order-all"
                    aria-label={`Todos os ${name}`}
                    disabled={value >= home}
                    onClick={() => setCount(code, home)}
                  >
                    {numbers.format(home)}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="order-panel-note">Nenhuma tropa na aldeia. Recrute no quartel.</p>
        )}
        {attack && (draft.counts.catapult ?? 0) > 0 && data ? (
          <label className="order-field">
            <span>Alvo das catapultas</span>
            <select
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
      </>
    );
  } else if (draft.step === 'review' && confirmation) {
    const arrives = new Date(clock + confirmation.durationSeconds * 1000).toISOString();
    const back = confirmation.returnsAt
      ? new Date(clock + confirmation.durationSeconds * 2000).toISOString()
      : null;
    body = (
      <div className="order-review" data-kind={confirmation.kind}>
        <p className="order-review-kind">
          {attack ? (
            <Swords size={18} aria-hidden="true" />
          ) : (
            <Shield size={18} aria-hidden="true" />
          )}
          {attack ? 'Ataque' : 'Apoio'}
          <small>
            {attack ? 'as tropas lutam e voltam com saque' : 'as tropas ficam defendendo'}
          </small>
        </p>
        <ol className="order-route" aria-label="Rota">
          <li>
            <small>De</small>
            <strong>{confirmation.origin.name}</strong>
            <em>
              {confirmation.origin.x}|{confirmation.origin.y}
            </em>
          </li>
          <li className="order-route-line" aria-hidden="true">
            <span>
              {numbers.format(Math.round(confirmation.distance * 10) / 10)} campos ·{' '}
              {duration(confirmation.durationSeconds)}
            </span>
          </li>
          <li>
            <small>Para</small>
            <strong>
              <Crest owner={owner} color={color} /> {target.name}
            </strong>
            <em>
              {target.x}|{target.y} · {relationLabel[owner]}
              {target.playerId !== null && !target.own ? ` · ${target.username}` : ''}
            </em>
          </li>
        </ol>
        {warn ? (
          <p className="order-warn">
            <TriangleAlert size={14} aria-hidden="true" /> Este alvo não é inimigo.
          </p>
        ) : null}
        <div className="order-review-troops">
          <small>
            Tropas · <b>{numbers.format(total)}</b> · mais lenta: {confirmation.slowest.name}
          </small>
          <ul>
            {chosen.map(({ code, name }) => (
              <li key={code} title={name}>
                <Portrait code={code} />
                <strong>{numbers.format(draft.counts[code] ?? 0)}</strong>
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="order-times">
          <div>
            <dt>Saída</dt>
            <dd>agora</dd>
          </div>
          <div className="order-arrival">
            <dt>Chegada</dt>
            <dd>{completionDate(arrives, clock)}</dd>
          </div>
          {back ? (
            <div>
              <dt>Volta</dt>
              <dd>{completionDate(back, clock)}</dd>
            </div>
          ) : null}
        </dl>
        <ul className="order-review-facts">
          <li>População {numbers.format(confirmation.population)}</li>
          {confirmation.carry !== null ? (
            <li>Saque até {numbers.format(confirmation.carry)}</li>
          ) : null}
          {confirmation.morale !== null ? <li>Moral {confirmation.morale}%</li> : null}
          {confirmation.targetBuilding ? (
            <li>
              Catapultas:{' '}
              {data?.catapultTargets.find((b) => b.code === confirmation.targetBuilding)?.name}
            </li>
          ) : null}
          <li>
            Velocidade {speedLabel(confirmation.speeds.world)} · tropas{' '}
            {speedLabel(confirmation.speeds.units)}
          </li>
        </ul>
      </div>
    );
  } else {
    // Enviado: onde acompanhar a ordem daqui em diante.
    body = (
      <div className="order-sent" data-kind={draft.kind}>
        <p className="order-sent-title" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          {enRoute.length
            ? attack
              ? 'Ataque a caminho'
              : 'Apoio a caminho'
            : returning.length
              ? 'Ordem cancelada: tropas voltando'
              : 'Ordem concluída'}
        </p>
        {!enRoute.length && returning[0] ? (
          <p className="order-track">
            Voltam {completionDate(returning[0].endsAt, clock)} (
            {duration((new Date(returning[0].endsAt).getTime() - clock) / 1000)}).
          </p>
        ) : null}
        {enRoute.length ? (
          <EnRoute
            rows={enRoute}
            clock={clock}
            onCancel={(id) => {
              const input = {
                action: { type: 'cancel', movementId: id } as RallyAction,
                requestId: newRequestKey(),
              };
              send.mutate(input);
            }}
            pending={busy}
          />
        ) : null}
        <p className="order-track">
          Acompanhe pelo ícone de {attack ? 'espadas' : 'escudo'} sobre {target.name} no mapa, nesta
          lista enquanto o alvo estiver aberto, e em <b>Comandos em andamento</b> na Praça de
          reunião.
        </p>
      </div>
    );
  }

  const footer =
    draft.step === 'troops' ? (
      <footer className="order-panel-foot">
        <p className="order-summary" aria-live="polite">
          {total ? (
            <>
              <b>{numbers.format(total)}</b> tropas
              {slowest?.seconds ? (
                <>
                  {' '}
                  · chega{' '}
                  <b>
                    {completionDate(new Date(clock + slowest.seconds * 1000).toISOString(), clock)}
                  </b>
                  <small>
                    {duration(slowest.seconds)} no passo de {slowest.name.toLowerCase()}
                  </small>
                </>
              ) : null}
            </>
          ) : (
            'Escolha quem vai.'
          )}
        </p>
        <button
          type="button"
          className="order-back"
          onClick={() => onDraft({ ...draft, step: 'target' })}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Alvo
        </button>
        <button
          type="button"
          className={`order-next ${draft.kind}`}
          disabled={total === 0 || busy}
          onClick={() => preview.mutate()}
        >
          {preview.isPending ? <span className="btn-spinner" aria-hidden="true" /> : null}
          Revisar {attack ? 'ataque' : 'apoio'} <ArrowRight size={15} aria-hidden="true" />
        </button>
      </footer>
    ) : draft.step === 'review' ? (
      <footer className="order-panel-foot">
        <button
          type="button"
          className="order-back"
          disabled={send.isPending}
          onClick={() => onDraft({ ...draft, step: 'troops' })}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Ajustar tropas
        </button>
        <button
          type="button"
          className={`order-next confirm ${draft.kind}`}
          disabled={busy}
          onClick={confirm}
        >
          {send.isPending ? (
            <span className="btn-spinner" aria-hidden="true" />
          ) : attack ? (
            <Swords size={16} aria-hidden="true" />
          ) : (
            <Shield size={16} aria-hidden="true" />
          )}
          Confirmar {attack ? 'ataque' : 'apoio'}
        </button>
      </footer>
    ) : draft.step === 'sent' ? (
      <footer className="order-panel-foot">
        <button type="button" className="order-back" onClick={() => onGo('place', {})}>
          Abrir Praça de reunião
        </button>
        <button
          type="button"
          className="order-next neutral"
          onClick={() => {
            preview.reset();
            send.reset();
            onDraft({ ...draft, step: 'troops', counts: {} });
          }}
        >
          Nova ordem
        </button>
      </footer>
    ) : null;

  return (
    <aside
      ref={ref}
      className="order-panel"
      data-step={draft.step}
      data-kind={draft.step === 'target' ? undefined : draft.kind}
      aria-label={`Ordem para ${target.name}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {head}
      {draft.step !== 'sent' && !current ? (
        <ol className="order-steps" aria-label="Etapas">
          {steps.map((item, index) => (
            <li
              key={item.code}
              aria-current={item.code === draft.step ? 'step' : undefined}
              data-done={
                steps.findIndex((other) => other.code === draft.step) > index ? 'true' : undefined
              }
            >
              {index + 1}. {item.label}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="order-panel-body">
        {error ? (
          <p className="error" role="alert">
            {error.message}
            {send.isError && intent.current ? (
              <button
                type="button"
                className="text-button"
                onClick={() => intent.current && send.mutate(intent.current)}
              >
                Conferir e tentar novamente
              </button>
            ) : null}
          </p>
        ) : null}
        {body}
      </div>
      {footer}
    </aside>
  );
});

function EnRoute({
  rows,
  clock,
  onCancel,
  pending,
}: {
  rows: {
    id: number;
    kind: 'attack' | 'support' | 'return';
    endsAt: string;
    cancelUntil: string | null;
    troops: TroopCounts;
  }[];
  clock: number;
  onCancel?: (id: number) => void;
  pending?: boolean;
}) {
  return (
    <ul className="order-enroute" aria-label="Suas ordens a caminho deste alvo">
      {rows.map((row) => {
        const cancellable =
          onCancel && row.cancelUntil && new Date(row.cancelUntil).getTime() > clock;
        return (
          <li key={row.id} data-kind={row.kind}>
            {row.kind === 'attack' ? (
              <Swords size={15} aria-hidden="true" />
            ) : (
              <Shield size={15} aria-hidden="true" />
            )}
            <span>
              {row.kind === 'attack' ? 'Ataque' : 'Apoio'} chega {completionDate(row.endsAt, clock)}
            </span>
            <time>{duration((new Date(row.endsAt).getTime() - clock) / 1000)}</time>
            {cancellable ? (
              <button type="button" disabled={pending} onClick={() => onCancel(row.id)}>
                Cancelar
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

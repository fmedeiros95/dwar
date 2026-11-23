import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicVillage, type TroopCounts, type VillageSnapshot } from '@dwar/api-client';
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
import type { OwnerKind } from './map-legend.js';
import { friendly, ownTarget, relationLabel } from '../rally/order-target.js';
import {
  Crest,
  OrderError,
  OrderReview,
  OrderReviewActions,
  Portrait,
} from '../orders/order-review.js';
import {
  clampCounts,
  emptyChoice,
  useOrderFlow,
  type OrderChoice,
} from '../orders/use-order-flow.js';
import { arrivalDate, completionDate, duration, numbers } from '../shared/index.js';

export type OrderStep = 'target' | 'troops' | 'review' | 'sent';
/** Tudo o que o jogador já escolheu: sobrevive a voltar da revisão e a trocar de alvo no mapa. */
export type OrderDraft = OrderChoice & { step: OrderStep };
export const emptyDraft: OrderDraft = { ...emptyChoice, step: 'target' };

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
  const flow = useOrderFlow(snapshot, (action) => {
    if (action.type === 'attack' || action.type === 'support')
      onDraft({ ...draft, step: 'sent', kind: action.type });
  });
  const info = useQuery({
    queryKey: ['village-popup', worldId, villageId, target.id],
    queryFn: () => api.villagePopup(worldId, villageId, target.id),
    staleTime: 10000,
  });
  const { data, clock, confirmation } = flow;
  // Sem revisão guardada (painel reaberto) não há o que confirmar: volta às tropas, já preenchidas.
  const step: OrderStep = draft.step === 'review' && !confirmation ? 'troops' : draft.step;
  const current = target.id === villageId;
  const attack = draft.kind === 'attack';
  const counts = data ? clampCounts(draft.counts, data.home) : draft.counts;
  const panel = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  // Teclado: ao trocar de etapa o foco vai para o conteúdo novo, não se perde no botão que sumiu.
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    if (step !== 'review') panel.current?.focus();
  }, [step]);
  const types = data?.unitTypes ?? [];
  const chosen = types.filter(({ code }) => (counts[code] ?? 0) > 0);
  const total = chosen.reduce((sum, { code }) => sum + (counts[code] ?? 0), 0);
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
  function edit(next: Partial<OrderDraft>) {
    flow.clearError();
    onDraft({ ...draft, counts, ...next });
  }
  function setCount(code: string, value: number) {
    const home = data?.home[code] ?? 0;
    edit({ counts: { ...counts, [code]: Math.max(0, Math.min(home, value)) } });
  }
  function review() {
    if (total === 0 || flow.pending) return;
    flow.review(target.x, target.y, { ...draft, counts }, () =>
      onDraft({ ...draft, counts, step: 'review' }),
    );
  }
  const own = ownTarget(owner);
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
  if (step === 'target') {
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
        {own ? (
          current ? null : (
            <p className="order-panel-note">
              Ordens de ataque e apoio não valem entre as suas próprias aldeias.
            </p>
          )
        ) : (
          <div className="order-choose" role="group" aria-label="O que fazer com esta aldeia">
            <button
              type="button"
              className="order-choose-attack"
              onClick={() => edit({ kind: 'attack', step: 'troops' })}
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
              onClick={() => edit({ kind: 'support', step: 'troops' })}
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
  } else if (step === 'troops') {
    const available = types.filter(
      ({ code }) => (data?.home[code] ?? 0) > 0 || (counts[code] ?? 0) > 0,
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
              onClick={() => edit({ kind: option.code })}
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
          <button type="button" onClick={() => edit({ counts: { ...data?.home } })}>
            Todas
          </button>
          <button type="button" disabled={total === 0} onClick={() => edit({ counts: {} })}>
            Limpar
          </button>
        </div>
        {!data ? (
          <p className="order-panel-note">Carregando tropas…</p>
        ) : available.length ? (
          <ul className="order-troops">
            {available.map(({ code, name }) => {
              const home = data.home[code] ?? 0;
              const value = counts[code] ?? 0;
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
        {attack && (counts.catapult ?? 0) > 0 && data ? (
          <label className="order-field">
            <span>Alvo das catapultas</span>
            <select
              value={draft.targetBuilding}
              onChange={(event) => edit({ targetBuilding: event.target.value })}
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
  } else if (step === 'review' && confirmation && data) {
    body = (
      <OrderReview
        confirmation={confirmation}
        data={data}
        clock={clock}
        owner={owner}
        color={color}
      />
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
            Voltam {arrivalDate(returning[0].endsAt, clock)} (
            {duration((new Date(returning[0].endsAt).getTime() - clock) / 1000)}).
          </p>
        ) : null}
        {enRoute.length ? (
          <EnRoute rows={enRoute} clock={clock} onCancel={flow.cancel} pending={flow.pending} />
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
    step === 'troops' ? (
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
                    {arrivalDate(new Date(clock + slowest.seconds * 1000).toISOString(), clock)}
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
        <button type="button" className="order-back" onClick={() => edit({ step: 'target' })}>
          <ArrowLeft size={15} aria-hidden="true" /> Alvo
        </button>
        <button
          type="button"
          className={`order-next ${draft.kind}`}
          disabled={total === 0 || flow.pending}
          onClick={review}
        >
          {flow.reviewing ? <span className="btn-spinner" aria-hidden="true" /> : null}
          Revisar {attack ? 'ataque' : 'apoio'} <ArrowRight size={15} aria-hidden="true" />
        </button>
      </footer>
    ) : step === 'review' ? (
      <footer className="order-panel-foot">
        <OrderReviewActions
          flow={flow}
          kind={draft.kind}
          onBack={() => {
            flow.back();
            onDraft({ ...draft, step: 'troops' });
          }}
        />
      </footer>
    ) : step === 'sent' ? (
      <footer className="order-panel-foot">
        <button type="button" className="order-back" onClick={() => onGo('place', {})}>
          Abrir Praça de reunião
        </button>
        <button
          type="button"
          className="order-next neutral"
          onClick={() => {
            flow.clearError();
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
      data-step={step}
      data-kind={step === 'target' ? undefined : draft.kind}
      aria-label={`Ordem para ${target.name}`}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // Escape desfaz um passo por vez; a ordem em montagem não some de uma vez.
        if (event.key !== 'Escape' || flow.pending) return;
        event.stopPropagation();
        if (step === 'review') {
          flow.back();
          onDraft({ ...draft, step: 'troops' });
        } else if (step === 'troops') edit({ step: 'target' });
        else onClose();
      }}
    >
      {head}
      {step !== 'sent' && !own ? (
        <ol className="order-steps" aria-label="Etapas">
          {steps.map((item, index) => (
            <li
              key={item.code}
              aria-current={item.code === step ? 'step' : undefined}
              data-done={
                steps.findIndex((other) => other.code === step) > index ? 'true' : undefined
              }
            >
              {index + 1}. {item.label}
            </li>
          ))}
        </ol>
      ) : null}
      <div
        className="order-panel-body"
        ref={panel}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            step === 'troops' &&
            (event.target as HTMLElement).tagName === 'INPUT'
          ) {
            event.preventDefault();
            review();
          }
        }}
      >
        <OrderError flow={flow} />
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
              {row.kind === 'attack' ? 'Ataque' : 'Apoio'} chega {arrivalDate(row.endsAt, clock)}
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

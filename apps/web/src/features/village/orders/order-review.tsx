import { useEffect, useRef } from 'react';
import { ArrowLeft, Shield, Swords, TriangleAlert } from 'lucide-react';
import type { RallySnapshot, SupportPreview } from '@dwar/api-client';
import { MapCrest, type OwnerKind } from '../map/map-legend.js';
import { friendly, relationLabel } from '../rally/order-target.js';
import { arrivalDate, duration, numbers, speedLabel } from '../shared/index.js';
import { unitIconSrc, unitIconSrcSet } from '../../../components/unit-icon.js';
import type { OrderFlow } from './use-order-flow.js';

export function Crest({ owner, color }: { owner: OwnerKind; color: string }) {
  return owner === 'barbarian' ? (
    <span className="map-legend-none" aria-hidden="true" />
  ) : (
    <MapCrest kind={owner} color={color} />
  );
}

export function Portrait({ code }: { code: string }) {
  return <img src={unitIconSrc(code)} srcSet={unitIconSrcSet(code)} alt="" />;
}

function Troops({
  types,
  counts,
}: {
  types: RallySnapshot['unitTypes'];
  counts: Record<string, number>;
}) {
  return (
    <ul>
      {types
        .filter(({ code }) => (counts[code] ?? 0) > 0)
        .map(({ code, name }) => (
          <li key={code} title={name}>
            <Portrait code={code} />
            <strong>{numbers.format(counts[code] ?? 0)}</strong>
            <span>{name}</span>
          </li>
        ))}
    </ul>
  );
}

/** Aviso de falha da ordem; sem resposta do servidor, a única saída é conferir o que aconteceu. */
export function OrderError({ flow }: { flow: OrderFlow }) {
  if (!flow.error) return null;
  return (
    <p className="error" role="alert">
      {flow.error.message}
      {flow.uncertain ? (
        <button type="button" className="text-button" disabled={flow.sending} onClick={flow.retry}>
          Conferir e tentar novamente
        </button>
      ) : null}
    </p>
  );
}

/**
 * Revisão da ordem, a mesma no painel do mapa e na Praça: tudo aqui vem da resposta do servidor
 * que será enviada ao confirmar.
 */
export function OrderReview({
  confirmation,
  data,
  clock,
  owner,
  color,
}: {
  confirmation: SupportPreview;
  data: RallySnapshot;
  clock: number;
  owner: OwnerKind;
  color: string;
}) {
  const { target, kind, troops, remaining } = confirmation;
  const attack = kind === 'attack';
  const total = Object.values(troops).reduce((sum, value) => sum + value, 0);
  const left = Object.values(remaining).reduce((sum, value) => sum + value, 0);
  const at = (seconds: number) =>
    arrivalDate(new Date(clock + seconds * 1000).toISOString(), clock);
  const title = useRef<HTMLParagraphElement>(null);
  // Chegando na revisão, leitor de tela e teclado começam pelo tipo da ordem.
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    // A janela e o painel guardam a rolagem das tropas; a revisão começa pelo topo.
    title.current?.closest('.gw-body, .order-panel-body')?.scrollTo({ top: 0 });
  }, []);
  return (
    <div className="order-review" data-kind={kind}>
      <p className="order-review-kind" ref={title} tabIndex={-1}>
        {attack ? <Swords size={18} aria-hidden="true" /> : <Shield size={18} aria-hidden="true" />}
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
            {confirmation.distance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} campos ·{' '}
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
            {target.playerId !== null && !target.own ? ` · ${target.username}` : ''} ·{' '}
            {numbers.format(target.points)} pts
          </em>
        </li>
      </ol>
      {attack && friendly.includes(owner) ? (
        <p className="order-warn">
          <TriangleAlert size={14} aria-hidden="true" /> Este alvo não é inimigo.
        </p>
      ) : null}
      <div className="order-review-troops">
        <small>
          Vão <b>{numbers.format(total)}</b> · mais lenta: {confirmation.slowest.name}
        </small>
        <Troops types={data.unitTypes} counts={troops} />
      </div>
      <dl className="order-times">
        <div>
          <dt>Saída</dt>
          <dd>agora</dd>
        </div>
        <div className="order-arrival">
          <dt>Chegada</dt>
          <dd>{at(confirmation.durationSeconds)}</dd>
        </div>
        {confirmation.returnsAt ? (
          <div>
            <dt>Volta</dt>
            <dd>{at(confirmation.durationSeconds * 2)}</dd>
          </div>
        ) : null}
      </dl>
      <dl className="order-review-facts">
        {confirmation.targetBuilding ? (
          <div data-strong="true">
            <dt>Catapultas miram</dt>
            <dd>
              {data.catapultTargets.find((b) => b.code === confirmation.targetBuilding)?.name ??
                confirmation.targetBuilding}
            </dd>
          </div>
        ) : null}
        {confirmation.carry !== null ? (
          <div>
            <dt>Saque até</dt>
            <dd>{numbers.format(confirmation.carry)}</dd>
          </div>
        ) : null}
        {confirmation.morale !== null ? (
          <div>
            <dt>Moral</dt>
            <dd>{confirmation.morale}%</dd>
          </div>
        ) : null}
        <div>
          <dt>População</dt>
          <dd>{numbers.format(confirmation.population)}</dd>
        </div>
        <div>
          <dt>Velocidade</dt>
          <dd>
            {speedLabel(confirmation.speeds.world)} · tropas {speedLabel(confirmation.speeds.units)}
          </dd>
        </div>
      </dl>
      <div className="order-review-troops" data-left="true">
        <small>
          {left ? (
            <>
              Ficam na aldeia <b>{numbers.format(left)}</b>
            </>
          ) : (
            'Nenhuma tropa fica na aldeia.'
          )}
        </small>
        {left ? <Troops types={data.unitTypes} counts={remaining} /> : null}
      </div>
    </div>
  );
}

/** Voltar e confirmar, nas mesmas posições e com as mesmas palavras nas duas entradas. */
export function OrderReviewActions({
  flow,
  kind,
  onBack,
}: {
  flow: OrderFlow;
  kind: 'attack' | 'support';
  onBack: () => void;
}) {
  const attack = kind === 'attack';
  return (
    <>
      <button type="button" className="order-back" disabled={flow.pending} onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> Ajustar ordem
      </button>
      <button
        type="button"
        className={`order-next confirm ${kind}`}
        disabled={flow.pending}
        onClick={flow.confirm}
      >
        {flow.sending ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : attack ? (
          <Swords size={16} aria-hidden="true" />
        ) : (
          <Shield size={16} aria-hidden="true" />
        )}
        Confirmar {attack ? 'ataque' : 'apoio'}
      </button>
    </>
  );
}

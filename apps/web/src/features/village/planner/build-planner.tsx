import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { VillageSnapshot } from '@dwar/api-client';
import {
  ArrowUp,
  ChevronDown,
  Crown,
  Hammer,
  Hourglass,
  Lock,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { completionDate, duration, numbers, resources } from '../shared/index.js';
import { buildingArt } from '../overview/scene-model.js';
import { planObra, type ObraPlan } from './plan.js';

/** Até três obras lado a lado: cabe no painel do notebook e em duas colunas no celular. */
export const maxCompared = 3;
const stateLabel: Record<ObraPlan['state'], string> = {
  ready: 'Pode evoluir',
  wait: 'Aguardando recursos',
  blocked: 'Indisponível',
  max: 'Nível máximo',
};

/**
 * Escolhas da mesa de obras, guardadas por aldeia: a comparação sobrevive a fechar o painel,
 * trocar para o mapa ou recarregar a página.
 */
export function usePlannerState(villageId: number) {
  const key = `dwar:obras-comparar:${villageId}`;
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown;
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  };
  const [state, setState] = useState<{ key: string; codes: string[] }>(() => ({
    key,
    codes: read(),
  }));
  const codes = state.key === key ? state.codes : read();
  const [open, setOpen] = useState(() => localStorage.getItem('dwar:obras-aberta') === '1');
  const [ping, setPing] = useState(0);
  function save(next: string[]) {
    setState({ key, codes: next });
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* só nesta sessão */
    }
  }
  return {
    compared: codes,
    open,
    setOpen(value: boolean) {
      setOpen(value);
      localStorage.setItem('dwar:obras-aberta', value ? '1' : '0');
    },
    /** Põe na comparação (a mais antiga sai se já houver três) ou tira dela; quem já está não muda de coluna. */
    compare(code: string, on = true) {
      if (on && codes.includes(code)) return;
      const rest = codes.filter((item) => item !== code);
      save(on ? [...rest, code].slice(-maxCompared) : rest);
    },
    /** Quem sai da comparação se entrar mais uma obra (null enquanto houver lugar). */
    replaces: codes.length >= maxCompared ? (codes[0] ?? null) : null,
    /** Muda a cada pedido para mostrar a mesa já aberta (ver `show`). */
    ping,
    /** Abre a mesa; se já estava aberta, chama o olhar e o foco para ela. */
    show() {
      setOpen(true);
      localStorage.setItem('dwar:obras-aberta', '1');
      setPing((value) => value + 1);
    },
  };
}
export type PlannerState = ReturnType<typeof usePlannerState>;

/** Obras que acabaram de entrar na fila, para o painel mostrar o efeito da escolha. */
function useFreshQueue(snapshot: VillageSnapshot) {
  const known = useRef<{ village: number; ids: Set<number> } | null>(null);
  const [fresh, setFresh] = useState<Map<number, number>>(new Map());
  const ids = snapshot.queue.map((item) => item.id).join(',');
  useEffect(() => {
    const current = new Set(snapshot.queue.map((item) => item.id));
    const previous = known.current;
    known.current = { village: snapshot.village.id, ids: current };
    if (!previous || previous.village !== snapshot.village.id) return;
    const added = [...current].filter((id) => !previous.ids.has(id));
    if (!added.length) return;
    setFresh((map) => {
      const next = new Map(map);
      for (const id of added) next.set(id, Date.now() + 9000);
      return next;
    });
    // ids resume a fila; o snapshot muda a cada consulta mesmo sem obra nova.
  }, [ids]);
  useEffect(() => {
    if (!fresh.size) return;
    const timer = setTimeout(() => {
      setFresh((map) => new Map([...map].filter(([, until]) => until > Date.now())));
    }, 1000);
    return () => clearTimeout(timer);
  }, [fresh]);
  return fresh;
}

export type BuildPlannerProps = {
  snapshot: VillageSnapshot;
  clock: number;
  planner: PlannerState;
  pending: boolean;
  pendingCode?: string | undefined;
  onConstruct: (code: string) => void;
  onCancel: (id: number) => void;
  /** Abre a tela do edifício (indicadores completos, recrutamento, comércio…). */
  onOpen: (code: string) => void;
  /** dock: painel sobre o cenário, recolhível. window: dentro da janela do Edifício principal. */
  variant: 'dock' | 'window';
};

/**
 * Mesa de obras: fila, comparação lado a lado e todas as obras possíveis num só lugar. Substitui o
 * cartão de Obras e a lista do Edifício principal; o cenário continua visível ao lado.
 */
export function BuildPlanner(props: BuildPlannerProps) {
  const { snapshot, clock, planner, variant } = props;
  const expanded = variant === 'window' || planner.open;
  // No celular a mesa abre a meia altura, para os brasões continuarem tocáveis acima dela.
  const [tall, setTall] = useState(false);
  const fresh = useFreshQueue(snapshot);
  const plans = useMemo(
    () => snapshot.buildings.map((building) => planObra(snapshot, building, clock)),
    [snapshot, clock],
  );
  const root = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const seenPing = useRef(planner.ping);
  useEffect(() => {
    if (variant !== 'dock' || seenPing.current === planner.ping) return;
    seenPing.current = planner.ping;
    body.current?.scrollTo({ top: 0 });
    root.current?.focus({ preventScroll: true });
    root.current?.animate?.(
      [
        { boxShadow: '0 0 0 0 rgb(255 226 150 / 0.95)' },
        { boxShadow: '0 0 0 10px rgb(255 226 150 / 0)' },
      ],
      { duration: 700, iterations: 2, easing: 'ease-out' },
    );
  }, [planner.ping, variant]);
  const main = snapshot.buildings.find((building) => building.code === 'main');
  const compared = planner.compared
    .map((code) => plans.find((plan) => plan.building.code === code))
    .filter((plan): plan is ObraPlan => !!plan);
  const used = snapshot.queue.length;
  const max = snapshot.world.maxBuildQueue;
  return (
    <section
      ref={root}
      tabIndex={-1}
      className="planner"
      data-variant={variant}
      data-expanded={expanded ? 'true' : undefined}
      data-tall={tall ? 'true' : undefined}
      aria-label="Mesa de obras"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <header className="planner-head">
        <h2>
          <Hammer size={15} aria-hidden="true" /> Obras
        </h2>
        {variant === 'dock' && expanded && main ? (
          <small className="planner-main">Edifício principal {main.level}</small>
        ) : null}
        <small className="planner-slots" aria-label={`${used} de ${max} vagas da fila usadas`}>
          <b>{used}</b>/{max} vagas
        </small>
        {variant === 'dock' && expanded ? (
          <button
            type="button"
            className="planner-grow"
            aria-pressed={tall}
            aria-label={tall ? 'Mostrar mais do cenário' : 'Ampliar a mesa de obras'}
            onClick={() => setTall(!tall)}
          >
            {tall ? (
              <Minimize2 size={15} aria-hidden="true" />
            ) : (
              <Maximize2 size={15} aria-hidden="true" />
            )}
          </button>
        ) : null}
        {variant === 'dock' ? (
          <button
            type="button"
            className="planner-toggle"
            aria-expanded={expanded}
            onClick={() => planner.setOpen(!expanded)}
          >
            {expanded ? (
              <>
                Recolher <ChevronDown size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                <PanelRightOpen size={15} aria-hidden="true" /> Planejar
              </>
            )}
          </button>
        ) : null}
      </header>
      <div className="planner-body" ref={body}>
        <QueueTimeline {...props} fresh={fresh} expanded={expanded} />
        {expanded ? (
          <>
            <Comparison {...props} plans={compared} all={plans} fresh={fresh} />
            <Candidates {...props} plans={plans} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function QueueTimeline({
  variant,
  snapshot,
  clock,
  pending,
  onCancel,
  fresh,
  expanded,
}: BuildPlannerProps & { fresh: Map<number, number>; expanded: boolean }) {
  if (!snapshot.queue.length)
    return (
      <p className="planner-empty">
        {variant === 'window'
          ? 'Nenhuma obra na fila.'
          : expanded
            ? 'Nenhuma obra na fila.'
            : 'Nenhuma obra na fila. O brasão de um edifício compara obras; o edifício abre sua função.'}
      </p>
    );
  return (
    <ol className="planner-queue" aria-label="Fila de obras">
      {snapshot.queue.map((item) => {
        const start = new Date(item.startsAt).getTime();
        const end = new Date(item.endsAt).getTime();
        const running = start <= clock;
        const progress = Math.min(1, Math.max(0, (clock - start) / Math.max(1, end - start)));
        const remaining = (end - clock) / 1000;
        return (
          <li
            key={item.id}
            data-running={running ? 'true' : undefined}
            data-fresh={fresh.has(item.id) ? 'true' : undefined}
            style={{ '--progress': progress } as CSSProperties}
          >
            <img
              className="planner-thumb"
              src={buildingArt(
                item.buildingCode,
                item.targetLevel,
                snapshot.buildings.find((b) => b.code === item.buildingCode)?.maxLevel,
              )}
              alt=""
            />
            <span className="planner-queue-text">
              <strong>
                {item.name} <span>{item.targetLevel}</span>
                {fresh.has(item.id) ? <em className="planner-new">Nova</em> : null}
              </strong>
              <small>
                {running
                  ? `pronta ${completionDate(item.endsAt, clock)}`
                  : `começa ${completionDate(item.startsAt, clock)} · pronta ${completionDate(item.endsAt, clock)}`}
              </small>
            </span>
            <time>
              {running && remaining <= 0
                ? 'Concluindo…'
                : duration(running ? remaining : (end - start) / 1000)}
            </time>
            {expanded ? (
              <button
                type="button"
                className="planner-cancel"
                aria-label={`Cancelar ${item.name} nível ${item.targetLevel}`}
                title="Cancelar obra (os recursos voltam)"
                disabled={pending || remaining <= 0}
                onClick={() => onCancel(item.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
            <span className="planner-bar" aria-hidden="true" />
          </li>
        );
      })}
    </ol>
  );
}

function CostCell({ plan }: { plan: ObraPlan }) {
  return (
    <ul className="cmp-cost">
      {resources.map(({ code, name }) => {
        const short = plan.missing[code];
        return (
          <li
            key={code}
            data-short={short ? 'true' : undefined}
            title={short ? `Faltam ${numbers.format(short)} de ${name}` : `${name} suficiente`}
          >
            <ResourceIcon code={code} label={name} size={16} />
            {numbers.format(plan.cost[code])}
            {short ? <small>−{numbers.format(short)}</small> : null}
          </li>
        );
      })}
    </ul>
  );
}

function startText(plan: ObraPlan, clock: number) {
  if (plan.maxed) return 'Nível máximo';
  if (plan.startsAt === null) return plan.blockedReason ?? 'Fila cheia';
  if (plan.startsAt <= clock + 1000) return 'Agora';
  const waitingResources = plan.resourcesAt !== null && plan.resourcesAt > clock;
  const when = completionDate(new Date(plan.startsAt).toISOString(), clock);
  if (plan.afterQueue) return `Depois da fila · ${when}`;
  if (waitingResources)
    return `Recursos em ${duration((plan.resourcesAt! - clock) / 1000)} · ${when}`;
  return when;
}

function BuildAction({
  plan,
  clock,
  pending,
  pendingCode,
  onConstruct,
}: {
  plan: ObraPlan;
  clock: number;
  pending: boolean;
  pendingCode?: string | undefined;
  onConstruct: (code: string) => void;
}) {
  if (plan.maxed) return null;
  if (plan.building.canBuild)
    return (
      <button
        type="button"
        className="cmp-build"
        disabled={pending}
        onClick={() => onConstruct(plan.building.code)}
      >
        {pendingCode === plan.building.code ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          <ArrowUp size={15} aria-hidden="true" />
        )}
        {plan.building.queuedLevel === 0 ? 'Construir' : `Evoluir ao ${plan.nextLevel}`}
      </button>
    );
  return (
    <button type="button" className="cmp-build" disabled>
      {plan.state === 'wait' ? (
        <Hourglass size={15} aria-hidden="true" />
      ) : (
        <Lock size={14} aria-hidden="true" />
      )}
      {plan.state === 'wait' && plan.resourcesAt
        ? `Recursos em ${duration((plan.resourcesAt - clock) / 1000)}`
        : plan.queueFull
          ? 'Fila cheia'
          : 'Indisponível'}
    </button>
  );
}

/** Comparação lado a lado: uma coluna por obra, uma linha por pergunta da decisão. */
function Comparison({
  plans,
  clock,
  planner,
  pending,
  pendingCode,
  onConstruct,
  onOpen,
  snapshot,
  fresh,
  all,
  variant,
}: BuildPlannerProps & { plans: ObraPlan[]; all: ObraPlan[]; fresh: Map<number, number> }) {
  const suggestions = <Suggestions plans={plans} all={all} planner={planner} />;
  if (!plans.length)
    return (
      <section className="planner-compare empty">
        <h3>
          <Scale size={14} aria-hidden="true" /> Comparar
        </h3>
        <p>
          {variant === 'dock' ? (
            <>
              Clique no <b>brasão</b> de um edifício no cenário ou use
            </>
          ) : (
            'Use'
          )}{' '}
          <b>Comparar</b> na lista abaixo: até três obras lado a lado.
        </p>
        {suggestions}
      </section>
    );
  const ready = plans.filter((plan) => plan.endsAt !== null);
  const earliest = ready.length > 1 ? Math.min(...ready.map((plan) => plan.endsAt!)) : null;
  const open = plans.filter((plan) => !plan.maxed);
  const cheapest = open.length > 1 ? Math.min(...open.map((plan) => plan.costTotal)) : null;
  const hasEffect = plans.some((plan) => plan.effect);
  const row = (label: string, cell: (plan: ObraPlan) => ReactNode, className?: string) => (
    <tr className={className}>
      <th scope="row">{label}</th>
      {plans.map((plan) => (
        <td key={plan.building.code} data-state={plan.state}>
          {cell(plan)}
        </td>
      ))}
    </tr>
  );
  return (
    <section className="planner-compare" style={{ '--cols': plans.length } as CSSProperties}>
      <h3>
        <Scale size={14} aria-hidden="true" /> Comparar
        <small>
          {plans.length < 2
            ? 'adicione outra obra'
            : plans.length >= maxCompared
              ? `cheia: a próxima entra no lugar de ${plans[0]!.building.name}`
              : 'mesmas linhas, lado a lado'}
        </small>
      </h3>
      {plans.length < 2 ? suggestions : null}
      <div className="cmp-scroll">
        <table className="cmp-table">
          <thead>
            <tr>
              <td />
              {plans.map((plan) => {
                const justQueued = snapshot.queue.find(
                  (item) => item.buildingCode === plan.building.code && fresh.has(item.id),
                );
                return (
                  <th
                    key={plan.building.code}
                    scope="col"
                    data-state={plan.state}
                    data-chosen={justQueued ? 'true' : undefined}
                  >
                    <button
                      type="button"
                      className="cmp-remove"
                      aria-label={`Tirar ${plan.building.name} da comparação`}
                      title="Tirar da comparação"
                      onClick={() => planner.compare(plan.building.code, false)}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="cmp-art"
                      title={`Abrir ${plan.building.name}`}
                      onClick={() => onOpen(plan.building.code)}
                    >
                      <img
                        src={buildingArt(
                          plan.building.code,
                          Math.max(1, plan.building.level),
                          plan.building.maxLevel,
                        )}
                        alt=""
                      />
                    </button>
                    <strong className="cmp-name">{plan.building.name}</strong>
                    <span className="cmp-level">
                      {plan.maxed ? (
                        <>
                          <Crown size={12} aria-hidden="true" /> {plan.building.maxLevel}
                        </>
                      ) : (
                        <>
                          {plan.building.queuedLevel || 0} → <b>{plan.nextLevel}</b>
                        </>
                      )}
                    </span>
                    <span className="cmp-state">
                      <i aria-hidden="true" />
                      {stateLabel[plan.state]}
                    </span>
                    {plan.queued ? (
                      <span className="cmp-queued">
                        {plan.queued} {plan.queued === 1 ? 'nível' : 'níveis'} na fila
                      </span>
                    ) : null}
                    {justQueued ? (
                      <p className="cmp-chosen" role="status">
                        Nível {justQueued.targetLevel} entrou na fila · pronta{' '}
                        {completionDate(justQueued.endsAt, clock)}
                      </p>
                    ) : null}
                    <BuildAction
                      plan={plan}
                      clock={clock}
                      pending={pending}
                      pendingCode={pendingCode}
                      onConstruct={onConstruct}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {row('Ganho', (plan) =>
              plan.gain ? (
                <span className="cmp-gain">
                  {plan.gain.label}
                  <span>
                    {numbers.format(plan.gain.current)} → <b>{numbers.format(plan.gain.next)}</b>
                  </span>
                  <em>
                    +{numbers.format(plan.gain.diff)} {plan.gain.unit}
                  </em>
                </span>
              ) : (
                <span className="cmp-muted">{plan.building.description}</span>
              ),
            )}
            {row(
              'Fica pronta',
              (plan) =>
                plan.endsAt !== null ? (
                  <>
                    <b className="cmp-ready">
                      {completionDate(new Date(plan.endsAt).toISOString(), clock)}
                    </b>
                    <span
                      className="cmp-start"
                      data-tone={
                        plan.resourcesAt !== null && plan.resourcesAt > clock ? 'wait' : undefined
                      }
                    >
                      Começa: {startText(plan, clock).toLowerCase()}
                    </span>
                    <span className="cmp-time">{duration(plan.durationSeconds)} de obra</span>
                    {earliest !== null && plan.endsAt === earliest ? (
                      <span className="cmp-tag ok">primeira a ficar pronta</span>
                    ) : null}
                  </>
                ) : (
                  <span className="cmp-start" data-tone="blocked">
                    {startText(plan, clock)}
                  </span>
                ),
              'cmp-row-strong',
            )}
            {row('Custo', (plan) =>
              plan.maxed ? (
                <span className="cmp-muted">—</span>
              ) : (
                <>
                  <CostCell plan={plan} />
                  {cheapest !== null && plan.costTotal === cheapest ? (
                    <span className="cmp-tag">mais barata</span>
                  ) : null}
                </>
              ),
            )}
            {row('Depois de pagar', (plan) =>
              plan.maxed ? (
                '—'
              ) : plan.leftover ? (
                <ul className="cmp-left" aria-label="Sobra no armazém">
                  {resources.map(({ code, name }) => (
                    <li key={code}>
                      <ResourceIcon code={code} label={name} size={16} />
                      {numbers.format(plan.leftover![code])}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="cmp-short">
                  Falta{' '}
                  {resources
                    .filter(({ code }) => plan.missing[code])
                    .map(
                      ({ code, name }) =>
                        `${numbers.format(plan.missing[code]!)} de ${name.toLowerCase()}`,
                    )
                    .join(', ')}
                </span>
              ),
            )}
            {hasEffect
              ? row('Efeito', (plan) =>
                  plan.effect ? (
                    <span className="cmp-effect">
                      {plan.effect.label}
                      <b>
                        {plan.effect.before ? `${plan.effect.before} → ` : ''}
                        {plan.effect.after}
                      </b>
                    </span>
                  ) : (
                    <span className="cmp-muted">—</span>
                  ),
                )
              : null}
          </tbody>
        </table>
      </div>
      {plans.length >= 2 && plans.length < maxCompared ? suggestions : null}
    </section>
  );
}

const economy = ['wood', 'stone', 'iron', 'storage', 'farm', 'hide', 'mill', 'market', 'treasury'];
/** Ordem natural da economia: produtores, depois quem guarda e quem sustenta a população. */
const orderOf = (code: string) => {
  const index = economy.indexOf(code);
  return index < 0 ? economy.length : index;
};
const familyOf = (code: string) =>
  economy.includes(code) ? 'economy' : code === 'main' ? 'main' : 'army';

/** Atalho de toque: as próximas obras viáveis a um toque de entrar na comparação. */
function Suggestions({
  plans,
  all,
  planner,
}: {
  plans: ObraPlan[];
  all: ObraPlan[];
  planner: PlannerState;
}) {
  const rank = { ready: 0, wait: 1, blocked: 2, max: 3 } as const;
  // Compara-se o que disputa o mesmo papel: economia com economia, exército com exército.
  const families = new Set(plans.map((plan) => familyOf(plan.building.code)));
  const options = all
    .filter((plan) => plan.state !== 'max' && !plans.includes(plan))
    .sort(
      (a, b) =>
        Number(!families.has(familyOf(a.building.code))) -
          Number(!families.has(familyOf(b.building.code))) ||
        orderOf(a.building.code) - orderOf(b.building.code) ||
        rank[a.state] - rank[b.state],
    )
    .slice(0, 6);
  if (!options.length) return null;
  return (
    <div className="cmp-suggest" role="group" aria-label="Comparar com">
      <span>Comparar com</span>
      <ul>
        {options.map((plan) => (
          <li key={plan.building.code}>
            <button
              type="button"
              data-state={plan.state}
              onClick={() => planner.compare(plan.building.code, true)}
            >
              <i aria-hidden="true" />
              {plan.building.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const groups: { state: ObraPlan['state']; title: string; icon: ReactNode }[] = [
  { state: 'ready', title: 'Podem evoluir agora', icon: <Sparkles size={14} /> },
  { state: 'wait', title: 'Aguardando recursos', icon: <Hourglass size={14} /> },
  { state: 'blocked', title: 'Indisponíveis', icon: <Lock size={14} /> },
];

function Candidates({
  plans,
  clock,
  planner,
  pending,
  pendingCode,
  onConstruct,
}: BuildPlannerProps & { plans: ObraPlan[] }) {
  const maxed = plans.filter((plan) => plan.state === 'max');
  const replaced = plans.find((plan) => plan.building.code === planner.replaces)?.building.name;
  return (
    <section className="planner-all" aria-label="Todas as obras">
      {groups.map((group) => {
        const list = plans.filter((plan) => plan.state === group.state);
        if (!list.length) return null;
        return (
          <div key={group.state} className="planner-group" data-state={group.state}>
            <h3>
              {group.icon} {group.title} <span className="panel-count">{list.length}</span>
            </h3>
            <ul>
              {list.map((plan) => {
                const on = planner.compared.includes(plan.building.code);
                return (
                  <li key={plan.building.code} data-compared={on ? 'true' : undefined}>
                    <img
                      className="planner-thumb"
                      src={buildingArt(
                        plan.building.code,
                        Math.max(1, plan.building.level),
                        plan.building.maxLevel,
                      )}
                      alt=""
                      loading="lazy"
                    />
                    <span className="planner-row">
                      <strong>
                        {plan.building.name} <span>→ {plan.nextLevel}</span>
                      </strong>
                      <small>
                        {plan.gain
                          ? `+${numbers.format(plan.gain.diff)}${plan.gain.unit === '%' ? '%' : ''} ${plan.gain.label.toLowerCase()}`
                          : plan.building.description}
                      </small>
                      <small className="planner-when">
                        {plan.state === 'ready'
                          ? duration(plan.durationSeconds)
                          : plan.state === 'wait' && plan.resourcesAt
                            ? `recursos em ${duration((plan.resourcesAt - clock) / 1000)}`
                            : plan.blockedReason}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="planner-compare-toggle"
                      aria-pressed={on}
                      title={
                        on
                          ? 'Tirar da comparação'
                          : replaced
                            ? `Pôr na comparação no lugar de ${replaced}`
                            : 'Pôr na comparação'
                      }
                      onClick={() => planner.compare(plan.building.code, !on)}
                    >
                      <Scale size={14} aria-hidden="true" />
                      <span>{on ? 'Comparando' : 'Comparar'}</span>
                    </button>
                    {plan.state === 'ready' ? (
                      <button
                        type="button"
                        className="planner-build"
                        disabled={pending}
                        aria-label={`Evoluir ${plan.building.name} para o nível ${plan.nextLevel}`}
                        onClick={() => onConstruct(plan.building.code)}
                      >
                        {pendingCode === plan.building.code ? (
                          <span className="btn-spinner" aria-hidden="true" />
                        ) : (
                          <ArrowUp size={14} aria-hidden="true" />
                        )}
                        {plan.nextLevel}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {maxed.length ? (
        <details className="planner-group planner-max">
          <summary>
            <Crown size={14} aria-hidden="true" /> Nível máximo{' '}
            <span className="panel-count">{maxed.length}</span>
          </summary>
          <p>{maxed.map((plan) => plan.building.name).join(', ')}</p>
        </details>
      ) : null}
    </section>
  );
}

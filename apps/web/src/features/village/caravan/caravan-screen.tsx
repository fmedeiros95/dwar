import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Flag, Hourglass, PackageOpen } from 'lucide-react';
import {
  api,
  type CaravanAction,
  type CaravanLot,
  type CaravanOverview,
  type CaravanResource,
  type CaravanView,
  type Resources,
  type VillageSnapshot,
} from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { arrivalDate, completionDate, duration, numbers } from '../shared/index.js';
import { CaravanScene, LotEmblem } from './caravan-art.js';
import {
  describeLoad,
  aimSplit,
  leadPercent,
  lotName,
  lotTotal,
  otherLot,
  previewSplit,
  resourceCodes,
  resourceName,
  splitHasChoice,
  type LotUse,
  usesOf,
} from './caravan-rules.js';

const title = (lot: CaravanLot) => (lot === 'sun' ? 'Carroça do Sol' : 'Carroça da Lua');
const left = (deadline: string, clock: number) =>
  duration((new Date(deadline).getTime() - clock) / 1000);

function Load({ load }: { load: Resources }) {
  return (
    <ul className="cv-load">
      {resourceCodes.map((code) => (
        <li key={code} data-empty={load[code] === 0 ? 'true' : undefined}>
          <ResourceIcon code={code} label={resourceName[code]} size={20} />
          <b>{numbers.format(load[code])}</b>
        </li>
      ))}
    </ul>
  );
}

function Uses({
  snapshot,
  load,
  clock,
  aim,
}: {
  snapshot: VillageSnapshot;
  load: Resources;
  clock: number;
  /** Ao dividir: ajuste que põe nesta carroça o que falta para a obra. */
  aim?: (missing: NonNullable<LotUse['missing']>) => (() => void) | null;
}) {
  return (
    <ul className="cv-uses" aria-label={`O que esta carroça permite em ${snapshot.village.name}`}>
      {usesOf(snapshot, load, clock).map((use) => {
        const apply = use.missing && aim ? aim(use.missing) : null;
        return (
          <li key={use.key} data-tone={use.tone}>
            {apply ? (
              <button type="button" title="Pôr nesta carroça o que falta" onClick={apply}>
                {use.text}
              </button>
            ) : (
              use.text
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LotColumn({
  lot,
  load,
  snapshot,
  clock,
  intro,
  aim,
  children,
}: {
  lot: CaravanLot;
  load: Resources;
  snapshot: VillageSnapshot;
  clock: number;
  intro: string;
  aim?: (missing: NonNullable<LotUse['missing']>) => (() => void) | null;
  children?: ReactNode;
}) {
  return (
    <section className="cv-lot" data-lot={lot} aria-label={title(lot)}>
      <h2>
        <LotEmblem lot={lot} /> {title(lot)}
      </h2>
      <Load load={load} />
      <p className="cv-intro">{intro}</p>
      <Uses snapshot={snapshot} load={load} clock={clock} {...(aim ? { aim } : {})} />
      {children}
    </section>
  );
}

/** Confirmação em dois tempos, sem janela: a decisão sela e não volta. */
function Seal({
  label,
  question,
  confirm,
  pending,
  disabled,
  onConfirm,
}: {
  label: string;
  question: string;
  confirm: string;
  pending: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) button.current?.focus();
  }, [asking]);
  if (!asking)
    return (
      <button
        type="button"
        className="cv-go"
        disabled={disabled || pending}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    );
  return (
    <div
      className="cv-seal"
      role="group"
      aria-label={question}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setAsking(false);
      }}
    >
      <p>{question}</p>
      <button type="button" ref={button} className="cv-go" disabled={pending} onClick={onConfirm}>
        {pending ? <span className="btn-spinner" aria-hidden="true" /> : <Check size={16} />}
        {confirm}
      </button>
      <button type="button" className="cv-back" disabled={pending} onClick={() => setAsking(false)}>
        Voltar
      </button>
    </div>
  );
}

function Divide({
  caravan,
  snapshot,
  clock,
  sun,
  onSun,
  pending,
  onAct,
}: {
  caravan: CaravanView;
  snapshot: VillageSnapshot;
  clock: number;
  sun: Resources;
  onSun: (sun: Resources) => void;
  pending: boolean;
  onAct: (action: CaravanAction) => void;
}) {
  const { cargo, rival } = caravan;
  const { lots, toll } = previewSplit(cargo, sun);
  const empty = !splitHasChoice(cargo, sun);
  const aim = (lot: CaravanLot) => (missing: NonNullable<LotUse['missing']>) => {
    const next = aimSplit(cargo, sun, lot, missing);
    return next ? () => onSun(next) : null;
  };
  const set = (code: CaravanResource, value: number) =>
    onSun({ ...sun, [code]: Math.max(0, Math.min(cargo[code], Math.round(value) || 0)) });
  return (
    <>
      <LotColumn
        lot="sun"
        load={lots.sun}
        snapshot={snapshot}
        clock={clock}
        intro="Se esta ficar com você"
        aim={aim('sun')}
      />
      <section className="cv-desk" aria-label="Dividir a carga">
        {resourceCodes.map((code) => (
          <div key={code} className="cv-rope" data-resource={code}>
            <ResourceIcon code={code} label={resourceName[code]} size={24} />
            <input
              aria-label={`${resourceName[code]} na carroça do Sol`}
              inputMode="numeric"
              value={sun[code]}
              onChange={(event) => set(code, Number(event.target.value.replace(/\D/g, '')))}
            />
            <span className="cv-track">
              <input
                type="range"
                aria-label={`Dividir ${resourceName[code]}: parte da carroça do Sol`}
                aria-valuetext={`${sun[code]} no Sol, ${cargo[code] - sun[code]} na Lua`}
                min={0}
                max={cargo[code]}
                step={10}
                value={sun[code]}
                style={{ '--part': sun[code] / cargo[code] } as CSSProperties}
                onChange={(event) => set(code, Number(event.target.value))}
              />
              <span className="cv-quick">
                <button
                  type="button"
                  aria-label={`Toda a ${resourceName[code]} no Sol`}
                  title="Tudo no Sol"
                  onClick={() => set(code, cargo[code])}
                >
                  Sol
                </button>
                <button type="button" onClick={() => set(code, cargo[code] / 2)}>
                  meio
                </button>
                <button
                  type="button"
                  aria-label={`Toda a ${resourceName[code]} na Lua`}
                  title="Tudo na Lua"
                  onClick={() => set(code, 0)}
                >
                  Lua
                </button>
                <small data-free={toll[code] ? undefined : 'true'}>
                  {toll[code] ? `pedágio ${numbers.format(toll[code])}` : 'sem pedágio'}
                </small>
              </span>
            </span>
            <input
              aria-label={`${resourceName[code]} na carroça da Lua`}
              inputMode="numeric"
              value={cargo[code] - sun[code]}
              onChange={(event) =>
                set(code, cargo[code] - Number(event.target.value.replace(/\D/g, '')))
              }
            />
          </div>
        ))}
        <Seal
          label="Selar a divisão"
          question={`${rival.username} escolhe primeiro e você fica com a outra. Selada, não muda.`}
          confirm="Selar agora"
          pending={pending}
          disabled={empty}
          onConfirm={() => onAct({ type: 'divide', sun })}
        />
        <p className="cv-note">
          {empty
            ? `Sem diferença não há escolha: cada carroça precisa levar ao menos ${leadPercent}% de algum recurso.`
            : `Cada recurso repartido paga ao caravaneiro um quarto da parte menor. Total: ${numbers.format(lotTotal(toll))}.`}
        </p>
      </section>
      <LotColumn
        lot="moon"
        load={lots.moon}
        snapshot={snapshot}
        clock={clock}
        intro="Se esta ficar com você"
        aim={aim('moon')}
      />
    </>
  );
}

function Choose({
  caravan,
  snapshot,
  clock,
  pending,
  onAct,
}: {
  caravan: CaravanView;
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onAct: (action: CaravanAction) => void;
}) {
  const lots = caravan.lots!;
  const paid = lotTotal(caravan.cargo) - lotTotal(lots.sun) - lotTotal(lots.moon);
  const column = (lot: CaravanLot) => (
    <LotColumn
      lot={lot}
      load={lots[lot]}
      snapshot={snapshot}
      clock={clock}
      intro={`Em ${snapshot.village.name}, com esta`}
    >
      <Seal
        label={`Levar a ${lotName[lot]}`}
        question={`${caravan.rival.username} fica com ${describeLoad(lots[otherLot(lot)])}.`}
        confirm={`Levar ${lot === 'sun' ? 'Sol' : 'Lua'}`}
        pending={pending}
        onConfirm={() => onAct({ type: 'choose', lot })}
      />
    </LotColumn>
  );
  return (
    <>
      {column('sun')}
      <section className="cv-desk cv-read" aria-label="O que se sabe">
        <p>
          {caravan.absent
            ? `${caravan.rival.username} não veio dividir; o caravaneiro carregou as carroças e pagou`
            : `${caravan.rival.username} fez esta divisão sabendo que a decisão é sua. Pagou`}{' '}
          <b>{numbers.format(paid)}</b> de pedágio
          {paid === 0
            ? ': não abriu nenhum recurso.'
            : ` sobre ${resourceCodes
                .filter(
                  (code) => caravan.sun![code] > 0 && caravan.sun![code] < caravan.cargo[code],
                )
                .map((code) => resourceName[code])
                .join(', ')}.`}
        </p>
        {caravan.banner ? (
          <p>
            Sua flâmula pedia <b>{resourceName[caravan.banner]}</b>.
          </p>
        ) : null}
        <Memories caravan={caravan} />
      </section>
      {column('moon')}
    </>
  );
}

/** Passado entre os dois: é o que o jogador pode saber do outro sem espionar. */
function Memories({ caravan }: { caravan: CaravanView }) {
  const { rival, memories } = caravan;
  return (
    <div className="cv-memories">
      <h3>Com {rival.username}, antes</h3>
      {memories.length ? (
        <ul>
          {memories.map((memory) => (
            <li key={memory.at}>
              {memory.absent === 'divider' || memory.absent === 'both'
                ? `${memory.youDivided ? 'Você' : rival.username} não veio dividir. `
                : ''}
              {memory.absent === 'chooser' || memory.absent === 'both'
                ? `${memory.youDivided ? rival.username : 'Você'} não veio escolher. `
                : ''}
              {memory.youDivided ? rival.username : 'Você'}
              {memory.banner ? ` pediu ${resourceName[memory.banner]} e` : ''} levou{' '}
              {describeLoad(memory.taken)}; {memory.youDivided ? 'sobrou para você' : 'deixou'}{' '}
              {describeLoad(memory.left)}.
            </li>
          ))}
        </ul>
      ) : (
        <p>É a primeira partilha de vocês.</p>
      )}
    </div>
  );
}

function Banner({
  caravan,
  pending,
  onAct,
}: {
  caravan: CaravanView;
  pending: boolean;
  onAct: (action: CaravanAction) => void;
}) {
  return (
    <div className="cv-banner" role="radiogroup" aria-label="Flâmula">
      {[...resourceCodes, null].map((code) => (
        <button
          key={code ?? 'none'}
          type="button"
          role="radio"
          aria-checked={caravan.banner === code}
          data-resource={code ?? undefined}
          disabled={pending}
          onClick={() => onAct({ type: 'banner', resource: code })}
        >
          {code ? <ResourceIcon code={code} label="" size={24} /> : <Flag size={18} />}
          {code ? `Quero ${resourceName[code]}` : 'Ficar em silêncio'}
        </button>
      ))}
    </div>
  );
}

function Waiting({
  caravan,
  pending,
  onAct,
}: {
  caravan: CaravanView;
  pending: boolean;
  onAct: (action: CaravanAction) => void;
}) {
  const { rival, cargo, lots } = caravan;
  if (caravan.phase === 'dividing')
    return (
      <section className="cv-wide">
        <div>
          <h2>{rival.username} está dividindo a carga</h2>
          <Load load={cargo} />
          <p>
            Depois você escolhe uma das carroças. Até lá, pode hastear uma flâmula. Ela é vista por{' '}
            {rival.username} e não obriga você a nada: pode ser pedido, pode ser engano.
          </p>
          <Banner caravan={caravan} pending={pending} onAct={onAct} />
          <p className="cv-note">
            Se você não escolher no prazo, leva a carroça com mais do recurso da flâmula ou, sem
            flâmula, a mais pesada. Se {rival.username} não vier, o caravaneiro põe o recurso maior
            numa carroça e o resto na outra.
          </p>
        </div>
        <Memories caravan={caravan} />
      </section>
    );
  return (
    <section className="cv-wide">
      <div>
        <h2>A divisão está selada. {rival.username} escolhe</h2>
        <div className="cv-pair">
          {(['sun', 'moon'] as const).map((lot) => (
            <div key={lot} data-lot={lot}>
              <h3>
                <LotEmblem lot={lot} size={22} /> {title(lot)}
              </h3>
              <Load load={lots![lot]} />
            </div>
          ))}
        </div>
        <p className="cv-note">
          Pode sair: a carroça que sobrar vai sozinha até o seu portão. Sem resposta no prazo,{' '}
          {rival.username} leva{' '}
          {caravan.banner
            ? `a que tem mais ${resourceName[caravan.banner]}, como pedia a flâmula`
            : 'a mais pesada'}
          .
        </p>
      </div>
      <Memories caravan={caravan} />
    </section>
  );
}

function Outcome({
  caravan,
  snapshot,
  clock,
  pending,
  onAct,
  onVillage,
}: {
  caravan: CaravanView;
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onAct: (action: CaravanAction) => void;
  onVillage: () => void;
}) {
  const { rival, role, absent, banner, cart } = caravan;
  const lots = caravan.lots!;
  const mine = caravan.mine!;
  const chosen = caravan.chosen!;
  const chooser = role === 'chooser' ? 'Você' : rival.username;
  const kept =
    banner && lots[chosen][banner] >= lots[otherLot(chosen)][banner] ? 'cumpriu' : 'contrariou';
  return (
    <section className="cv-wide cv-outcome">
      <div>
        <h2>
          {role === 'chooser' ? 'Você levou' : `${rival.username} levou`} a {lotName[chosen]}
        </h2>
        <p className="cv-story">
          {absent === 'divider' || absent === 'both'
            ? `${role === 'divider' ? 'Você não veio' : `${rival.username} não veio`} dividir, então o caravaneiro carregou as carroças. `
            : ''}
          {absent === 'chooser' || absent === 'both'
            ? `${chooser} não veio escolher, e valeu a regra do prazo. `
            : ''}
          Ficou com {rival.username}: {describeLoad(lots[otherLot(mine)])}.
          {banner && !absent
            ? ` A flâmula pedia ${resourceName[banner]}; a escolha ${kept} a flâmula.`
            : ''}
        </p>
        <div className="cv-mine" data-lot={mine}>
          <h3>
            <LotEmblem lot={mine} size={24} /> Sua: {describeLoad(lots[mine])}
          </h3>
          {cart && !cart.empty ? (
            <>
              <button
                type="button"
                className="cv-go"
                disabled={pending}
                onClick={() => onAct({ type: 'unload' })}
              >
                <PackageOpen size={17} aria-hidden="true" /> Descarregar no armazém
              </button>
              {lotTotal(cart.left) < lotTotal(cart.load) ? (
                <p className="cv-note">Ainda na carroça: {describeLoad(cart.left)}.</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="cv-done" role="status">
                <Check size={16} aria-hidden="true" /> Tudo no armazém de {caravan.me.name}.
              </p>
              <button type="button" className="cv-go" onClick={onVillage}>
                Usar na aldeia
              </button>
            </>
          )}
        </div>
      </div>
      <div className="cv-memories">
        <h3>{cart && !cart.empty ? 'Ao descarregar' : 'Agora na aldeia'}</h3>
        {cart && !cart.empty ? (
          <Uses snapshot={snapshot} load={cart.left} clock={clock} />
        ) : (
          <ul>
            {snapshot.buildings
              .filter((item) => item.canBuild)
              .sort((a, b) => lotTotal(b.cost) - lotTotal(a.cost))
              .slice(0, 4)
              .map((item) => (
                <li key={item.code}>
                  Pode evoluir: {item.name} {item.queuedLevel + 1}
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function CaravanScreen({
  snapshot,
  overview,
  clock,
  id,
  onMap,
  onVillage,
}: {
  snapshot: VillageSnapshot;
  overview: CaravanOverview | undefined;
  clock: number;
  id: number;
  onMap: (x: number, y: number) => void;
  onVillage: () => void;
}) {
  const worldId = snapshot.world.id;
  const client = useQueryClient();
  const caravan = overview?.caravans.find((item) => item.id === id) ?? overview?.caravans[0];
  const draftKey = `dwar:caravana:${worldId}:${caravan?.id ?? 0}`;
  const [draft, setDraft] = useState<{ key: string; sun: Resources } | null>(null);
  const act = useMutation({
    mutationFn: (action: CaravanAction) => api.caravanAction(worldId, caravan!.id, action),
    onSuccess: (data) => {
      client.setQueryData(['caravans', worldId], data);
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      void client.invalidateQueries({ queryKey: ['map', worldId] });
    },
    // Depois de uma recusa, a tela mostra o que de fato aconteceu.
    onError: () => void client.invalidateQueries({ queryKey: ['caravans', worldId] }),
  });
  if (!caravan)
    return (
      <div className="cv-stage cv-none">
        <p>
          {overview
            ? 'Nenhuma caravana na sua fronteira agora. Quando uma parar, ela aparece no mapa.'
            : 'Procurando a caravana…'}
        </p>
      </div>
    );
  function saved(): Resources {
    const whole = { wood: caravan!.cargo.wood, stone: 0, iron: 0 };
    try {
      const value = JSON.parse(localStorage.getItem(draftKey) ?? 'null') as Resources | null;
      return value && resourceCodes.every((c) => value[c] >= 0 && value[c] <= caravan!.cargo[c])
        ? value
        : whole;
    } catch {
      return whole;
    }
  }
  const sun = draft?.key === draftKey ? draft.sun : saved();
  const dividing = caravan.phase === 'dividing' && caravan.role === 'divider';
  const shown = caravan.lots ?? previewSplit(caravan.cargo, dividing ? sun : caravan.cargo).lots;
  const waitingUnsplit = caravan.phase === 'dividing' && !dividing;
  // Antes da divisão o vizinho vê a carga inteira, repartida só para caber na cena.
  const half = (load: Resources): Resources => ({
    wood: load.wood / 2,
    stone: load.stone / 2,
    iron: load.iron / 2,
  });
  const scene = waitingUnsplit ? { sun: half(caravan.cargo), moon: half(caravan.cargo) } : shown;
  const toll = waitingUnsplit
    ? 0
    : lotTotal(caravan.cargo) - lotTotal(scene.sun) - lotTotal(scene.moon);
  const wrongVillage = caravan.me.villageId !== snapshot.village.id;
  const props = {
    caravan,
    snapshot,
    clock,
    pending: act.isPending,
    onAct: (action: CaravanAction) => act.mutate(action),
  };
  return (
    <div className="cv-stage" data-phase={caravan.phase}>
      <header className="cv-head">
        <button type="button" className="cv-back" onClick={() => onMap(caravan.x, caravan.y)}>
          <ArrowLeft size={16} aria-hidden="true" /> Mapa
        </button>
        <div>
          <h1>Partilha da Caravana</h1>
          <p>
            {caravan.me.name} e {caravan.rival.name}, de {caravan.rival.username}
            {caravan.rival.tribe ? ` [${caravan.rival.tribe}]` : ''}, com{' '}
            {numbers.format(caravan.rival.points)} pontos
          </p>
        </div>
        <p className="cv-turn" data-mine={caravan.yourTurn ? 'true' : undefined}>
          <strong>
            {caravan.phase === 'delivered'
              ? 'Partilha encerrada'
              : caravan.yourTurn
                ? dividing
                  ? 'Você divide'
                  : 'Você escolhe'
                : caravan.phase === 'dividing'
                  ? 'O vizinho divide'
                  : 'O vizinho escolhe'}
          </strong>
          <span>
            {caravan.phase === 'delivered' ? (
              completionDate(caravan.deadline, clock)
            ) : (
              <>
                <Hourglass size={13} aria-hidden="true" /> até{' '}
                {arrivalDate(caravan.deadline, clock)} ({left(caravan.deadline, clock)})
              </>
            )}
          </span>
        </p>
      </header>
      <div className="cv-view">
        <CaravanScene
          sun={scene.sun}
          moon={scene.moon}
          toll={toll}
          unit={Math.max(...resourceCodes.map((code) => caravan.cargo[code])) / 8}
          mine={caravan.mine}
          leaving={caravan.phase === 'delivered'}
        />
        {caravan.banner && caravan.phase !== 'delivered' ? (
          <p className="cv-pennant" data-resource={caravan.banner}>
            <ResourceIcon code={caravan.banner} label="" size={24} />
            {caravan.role === 'chooser' ? 'Sua flâmula' : caravan.rival.username}: “quero{' '}
            {resourceName[caravan.banner]}”
          </p>
        ) : dividing ? (
          <p className="cv-pennant">{caravan.rival.username} não hasteou flâmula</p>
        ) : null}
      </div>
      {act.error ? (
        <p className="error" role="alert">
          {act.error.message}
        </p>
      ) : null}
      <div className="cv-floor">
        {wrongVillage ? (
          <section className="cv-wide">
            <p>Carregando o armazém de {caravan.me.name}…</p>
          </section>
        ) : caravan.phase === 'delivered' ? (
          <Outcome {...props} onVillage={onVillage} />
        ) : dividing ? (
          <Divide
            {...props}
            sun={sun}
            onSun={(next) => {
              setDraft({ key: draftKey, sun: next });
              try {
                localStorage.setItem(draftKey, JSON.stringify(next));
              } catch {
                /* só nesta sessão */
              }
            }}
          />
        ) : caravan.yourTurn ? (
          <Choose {...props} />
        ) : (
          <Waiting {...props} />
        )}
      </div>
    </div>
  );
}

/** Chamada na barra da aldeia: o que a caravana pede agora, de qualquer tela. */
export function CaravanChip({
  overview,
  clock,
  onOpen,
}: {
  overview: CaravanOverview | undefined;
  clock: number;
  onOpen: (caravan: CaravanView) => void;
}) {
  const list = overview?.caravans ?? [];
  const caravan =
    list.find((item) => item.yourTurn) ??
    list.find((item) => item.cart && !item.cart.empty) ??
    list.find((item) => item.phase !== 'delivered');
  if (!caravan) return null;
  const text =
    caravan.phase === 'delivered'
      ? `Carroça no portão de ${caravan.me.name}`
      : caravan.yourTurn
        ? caravan.phase === 'dividing'
          ? 'Caravana: divida a carga'
          : 'Caravana: escolha sua carroça'
        : caravan.phase === 'dividing'
          ? `Caravana: ${caravan.rival.username} divide`
          : `Caravana: ${caravan.rival.username} escolhe`;
  return (
    <button
      type="button"
      className="cv-chip"
      data-turn={caravan.yourTurn || (caravan.cart && !caravan.cart.empty) ? 'true' : undefined}
      onClick={() => onOpen(caravan)}
    >
      {text}
      {caravan.phase === 'delivered' ? null : <small>{left(caravan.deadline, clock)}</small>}
    </button>
  );
}

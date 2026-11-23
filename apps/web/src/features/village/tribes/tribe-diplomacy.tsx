import { useState, type FormEvent } from 'react';
import type {
  MessageTarget,
  RelationKind,
  TribeAction,
  TribeOverview,
  TribeWarView,
} from '@dwar/api-client';
import { BBEditor } from '../../../components/bbcode-editor.js';
import { MailContent } from '../mail/mail-content.js';
import { completionDate, numbers } from '../shared/index.js';

type Props = {
  data: TribeOverview;
  pending: boolean;
  onAction: (action: TribeAction) => void;
  onTarget: (type: MessageTarget, id: number) => void;
};

export const relationNames: Record<RelationKind, string> = {
  ally: 'Aliada',
  nap: 'Pacto de não agressão',
  enemy: 'Inimiga',
};
const groups: { kind: RelationKind; title: string }[] = [
  { kind: 'ally', title: 'Tribos aliadas' },
  { kind: 'nap', title: 'Pactos de não agressão' },
  { kind: 'enemy', title: 'Tribos inimigas' },
];
const receivedText: Record<RelationKind, string> = {
  ally: 'considera a nossa tribo aliada',
  nap: 'firmou pacto de não agressão conosco',
  enemy: 'considera a nossa tribo inimiga',
};

function Stats({ war }: { war: TribeWarView }) {
  return (
    <ul className="confirm-facts war-stats" aria-label="Estatísticas da guerra">
      <li>
        <small>Nossos ataques</small>
        <strong>{numbers.format(war.stats.ourAttacks)}</strong>
      </li>
      <li>
        <small>Ataques deles</small>
        <strong>{numbers.format(war.stats.theirAttacks)}</strong>
      </li>
      <li>
        <small>Unidades que derrotamos</small>
        <strong>{numbers.format(war.stats.ourKills)}</strong>
      </li>
      <li>
        <small>Unidades que perdemos</small>
        <strong>{numbers.format(war.stats.theirKills)}</strong>
      </li>
    </ul>
  );
}

function ActiveWar({
  war,
  can,
  pending,
  onAction,
  onTarget,
}: {
  war: TribeWarView;
  can: boolean;
  pending: boolean;
  onAction: (action: TribeAction) => void;
  onTarget: Props['onTarget'];
}) {
  return (
    <article className="tribe-war" aria-label={`Guerra: ${war.title}`}>
      <header>
        <strong>{war.title}</strong>
        <span>
          contra{' '}
          <button className="text-button" onClick={() => onTarget('tribe', war.other.id)}>
            {war.other.name} <span className="tribe-tag static">{war.other.tag}</span>
          </button>
        </span>
        <small>
          {war.declaredByUs ? 'declarada por nós' : 'declarada por eles'} ·{' '}
          {completionDate(war.declaredAt, Date.now())}
        </small>
      </header>
      <Stats war={war} />
      <details>
        <summary>Declaração de guerra</summary>
        <div className="mail-text">
          <MailContent nodes={war.declaration} onTarget={onTarget} />
        </div>
      </details>
      {can ? (
        <div className="tribe-row-actions">
          {!war.peace ? (
            <button
              className="button"
              disabled={pending}
              onClick={() => onAction({ type: 'offer_peace', warId: war.id })}
            >
              Pedir paz
            </button>
          ) : war.peace.offeredByUs ? (
            <>
              <span className="muted">Pedido de paz enviado. Aguardando resposta.</span>
              <button
                className="button"
                disabled={pending}
                onClick={() => onAction({ type: 'withdraw_peace', warId: war.id })}
              >
                Retirar pedido
              </button>
            </>
          ) : (
            <>
              <span role="status">
                <strong>{war.other.tag}</strong> pediu paz.
              </span>
              <button
                className="bcard-action green"
                disabled={pending}
                onClick={() => onAction({ type: 'accept_peace', warId: war.id })}
              >
                Aceitar paz
              </button>
              <button
                className="button"
                disabled={pending}
                onClick={() => onAction({ type: 'reject_peace', warId: war.id })}
              >
                Recusar
              </button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function Diplomacy({ data, pending, onAction, onTarget }: Props) {
  const can = data.me.rights.canDiplomacy;
  const [tag, setTag] = useState(''),
    [kind, setKind] = useState<RelationKind>('ally');
  const [warTag, setWarTag] = useState(''),
    [title, setTitle] = useState(''),
    [declaration, setDeclaration] = useState(''),
    [confirming, setConfirming] = useState(false);
  const { diplomacy } = data;
  function relate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction({ type: 'set_relation', tag, kind });
    setTag('');
  }
  function declare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirming(true);
  }
  return (
    <div className="tribe-stack">
      <section className="tribe-card" aria-label="Relações">
        <h2>Relações com outras tribos</h2>
        {can ? (
          <form className="tribe-form inline relation-form" onSubmit={relate}>
            <label>
              Tag da tribo
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                minLength={2}
                maxLength={6}
                required
                disabled={pending}
              />
            </label>
            <label>
              Relação
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as RelationKind)}
                disabled={pending}
              >
                {(Object.keys(relationNames) as RelationKind[]).map((value) => (
                  <option key={value} value={value}>
                    {relationNames[value]}
                  </option>
                ))}
              </select>
            </label>
            <button className="bcard-action green" disabled={pending}>
              Definir
            </button>
          </form>
        ) : (
          <p className="muted">Só quem tem a permissão de diplomacia altera as relações.</p>
        )}
        {groups.map((group) => {
          const rows = diplomacy.declared.filter((row) => row.kind === group.kind);
          return (
            <div key={group.kind} className="relation-group">
              <h3>{group.title}</h3>
              {rows.length ? (
                <ul className="tribe-invites">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <button
                        className="text-button"
                        onClick={() => onTarget('tribe', row.tribe.id)}
                      >
                        {row.tribe.name} <span className="tribe-tag static">{row.tribe.tag}</span>
                      </button>
                      {can ? (
                        <button
                          className="button"
                          disabled={pending}
                          onClick={() => onAction({ type: 'cancel_relation', relationId: row.id })}
                        >
                          Encerrar
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhuma.</p>
              )}
            </div>
          );
        })}
        {diplomacy.received.length ? (
          <div className="relation-group">
            <h3>Como outras tribos nos veem</h3>
            <ul className="tribe-events">
              {diplomacy.received.map((row) => (
                <li key={row.id}>
                  <time dateTime={row.createdAt}>{completionDate(row.createdAt, Date.now())}</time>
                  <span>
                    <button className="text-button" onClick={() => onTarget('tribe', row.tribe.id)}>
                      {row.tribe.name} <span className="tribe-tag static">{row.tribe.tag}</span>
                    </button>{' '}
                    {receivedText[row.kind]}.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="tribe-card" aria-label="Guerras em andamento">
        <h2>Guerras em andamento</h2>
        {diplomacy.wars.length ? (
          diplomacy.wars.map((war) => (
            <ActiveWar
              key={war.id}
              war={war}
              can={can}
              pending={pending}
              onAction={onAction}
              onTarget={onTarget}
            />
          ))
        ) : (
          <p className="muted">Nenhuma guerra em andamento.</p>
        )}
      </section>

      {can ? (
        <section className="tribe-card" aria-label="Declarar guerra">
          <h2>Declarar guerra</h2>
          <form className="tribe-form" onSubmit={declare}>
            <label>
              Tag da tribo
              <input
                value={warTag}
                onChange={(event) => {
                  setWarTag(event.target.value);
                  setConfirming(false);
                }}
                minLength={2}
                maxLength={6}
                required
                disabled={pending}
              />
            </label>
            <label>
              Nome da guerra (até 32 caracteres)
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setConfirming(false);
                }}
                maxLength={32}
                required
                disabled={pending}
              />
            </label>
            <BBEditor
              label="Declaração de guerra"
              value={declaration}
              onChange={setDeclaration}
              rows={6}
              maxLength={10000}
              disabled={pending}
            />
            {confirming ? (
              <div className="tribe-row-actions" role="alert">
                <span>Todos os membros das duas tribos serão avisados. Confirma?</span>
                <button
                  type="button"
                  className="button danger"
                  disabled={pending}
                  onClick={() => {
                    setConfirming(false);
                    onAction({ type: 'declare_war', tag: warTag, title, declaration });
                    setWarTag('');
                    setTitle('');
                    setDeclaration('');
                  }}
                >
                  Declarar guerra
                </button>
                <button type="button" className="button" onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="button danger" disabled={pending}>
                Declarar guerra…
              </button>
            )}
          </form>
        </section>
      ) : null}

      <section className="tribe-card" aria-label="Guerras encerradas">
        <h2>Guerras encerradas</h2>
        {diplomacy.endedWars.length ? (
          <ul className="tribe-old-wars">
            {diplomacy.endedWars.map((war) => (
              <li key={war.id}>
                <span className="tribe-member-name">
                  <strong>{war.title}</strong>
                  <small>
                    contra{' '}
                    <button className="text-button" onClick={() => onTarget('tribe', war.other.id)}>
                      {war.other.name} <span className="tribe-tag static">{war.other.tag}</span>
                    </button>
                  </small>
                  <small>
                    {new Date(war.declaredAt).toLocaleDateString('pt-BR')} a{' '}
                    {war.endedAt ? new Date(war.endedAt).toLocaleDateString('pt-BR') : '—'}
                  </small>
                </span>
                <span className="tribe-member-stat">
                  <b>
                    {numbers.format(war.stats.ourAttacks)} ×{' '}
                    {numbers.format(war.stats.theirAttacks)}
                  </b>{' '}
                  <small>ataques, nós × eles</small>
                </span>
                <span className="tribe-member-stat">
                  <b>
                    {numbers.format(war.stats.ourKills)} × {numbers.format(war.stats.theirKills)}
                  </b>{' '}
                  <small>derrotamos × perdemos</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma guerra encerrada.</p>
        )}
      </section>
    </div>
  );
}

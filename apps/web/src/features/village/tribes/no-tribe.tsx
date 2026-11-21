import { useState, type FormEvent } from 'react';
import type { MyTribeInvite, TribeAction } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';

const limits = { name: [4, 25], tag: [2, 6] } as const;

/** Quem ainda não tem tribo: aceita convites ou funda a sua. */
export function NoTribe({
  invites,
  pending,
  onAction,
  onOpen,
}: {
  invites: MyTribeInvite[];
  pending: boolean;
  onAction: (action: TribeAction) => void;
  onOpen: (tribeId: number) => void;
}) {
  const [name, setName] = useState(''),
    [tag, setTag] = useState('');
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction({ type: 'create', name, tag });
  }
  return (
    <div className="tribe-grid">
      <section className="tribe-card" aria-label="Convites recebidos">
        <h2>Convites recebidos</h2>
        {invites.length ? (
          <ul className="tribe-invites">
            {invites.map((invite) => (
              <li key={invite.id}>
                <div>
                  <button className="text-button" onClick={() => onOpen(invite.tribe.id)}>
                    {invite.tribe.name} <span className="tribe-tag static">{invite.tribe.tag}</span>
                  </button>
                  <small>
                    convite de {invite.invitedBy} · {completionDate(invite.createdAt, Date.now())}
                  </small>
                </div>
                <div className="tribe-row-actions">
                  <button
                    className="bcard-action green"
                    disabled={pending}
                    onClick={() => onAction({ type: 'accept_invite', inviteId: invite.id })}
                  >
                    Entrar
                  </button>
                  <button
                    className="button"
                    disabled={pending}
                    onClick={() => onAction({ type: 'decline_invite', inviteId: invite.id })}
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum convite no momento. Peça a um líder para convidar você.</p>
        )}
      </section>
      <section className="tribe-card" aria-label="Fundar uma tribo">
        <h2>Fundar uma tribo</h2>
        <form className="tribe-form" onSubmit={create}>
          <label>
            Nome ({limits.name[0]} a {limits.name[1]} caracteres)
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={limits.name[0]}
              maxLength={limits.name[1]}
              required
              disabled={pending}
            />
          </label>
          <label>
            Tag ({limits.tag[0]} a {limits.tag[1]} caracteres, sem espaços)
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              minLength={limits.tag[0]}
              maxLength={limits.tag[1]}
              required
              disabled={pending}
            />
          </label>
          <button className="bcard-action green" disabled={pending}>
            Fundar tribo
          </button>
        </form>
        <p className="muted">
          Você será o fundador e poderá convidar jogadores, definir cargos e escrever o perfil da
          tribo.
        </p>
      </section>
    </div>
  );
}

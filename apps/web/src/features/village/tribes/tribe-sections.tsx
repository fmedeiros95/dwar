import { useState, type FormEvent } from 'react';
import type {
  MessageTarget,
  TribeAction,
  TribeMemberView,
  TribeOverview,
  TribeRightsView,
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

const rightNames: Record<keyof TribeRightsView, { name: string; hint: string }> = {
  isFounder: {
    name: 'Fundador',
    hint: 'Nomeia fundadores, muda nome e tag e dissolve a tribo.',
  },
  canLead: {
    name: 'Líder',
    hint: 'Administra membros, cargos e o texto interno. Inclui todas as outras permissões.',
  },
  canInvite: { name: 'Convidar', hint: 'Convida jogadores para a tribo.' },
  canDiplomacy: {
    name: 'Diplomacia',
    hint: 'Edita o perfil público e cuida das relações com outras tribos.',
  },
  canMassMail: { name: 'Mensagem em massa', hint: 'Envia uma mensagem para todos os membros.' },
  canModerate: { name: 'Moderar fórum', hint: 'Modera os tópicos e respostas do fórum.' },
  canHiddenForum: { name: 'Fórum oculto', hint: 'Acessa os fóruns reservados.' },
};
const rightKeys = Object.keys(rightNames) as (keyof TribeRightsView)[];

/** Mesma hierarquia do servidor: fundador inclui líder, e líder inclui as demais permissões. */
function settle(rights: TribeRightsView): TribeRightsView {
  const lead = rights.isFounder || rights.canLead;
  return {
    isFounder: rights.isFounder,
    canLead: lead,
    canInvite: lead || rights.canInvite,
    canDiplomacy: lead || rights.canDiplomacy,
    canMassMail: lead || rights.canMassMail,
    canModerate: lead || rights.canModerate,
    canHiddenForum: lead || rights.canHiddenForum,
  };
}

function roleOf(member: TribeMemberView): string {
  if (member.rights.isFounder) return 'Fundador';
  if (member.rights.canLead) return 'Líder';
  return 'Membro';
}

export function Overview({ data, onTarget }: Pick<Props, 'data' | 'onTarget'>) {
  return (
    <div className="tribe-stack">
      <section className="tribe-card" aria-label="Texto interno">
        <h2>Texto interno</h2>
        <div className="mail-text">
          <MailContent nodes={data.internalContent} onTarget={onTarget} />
        </div>
      </section>
      <section className="tribe-card" aria-label="Eventos recentes">
        <h2>Eventos recentes</h2>
        {data.events.length ? (
          <ul className="tribe-events">
            {data.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.createdAt}>
                  {completionDate(event.createdAt, Date.now())}
                </time>
                <span>
                  <MailContent nodes={event.content} onTarget={onTarget} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum evento registrado ainda.</p>
        )}
      </section>
    </div>
  );
}

function RightsEditor({
  member,
  actorIsFounder,
  pending,
  onSave,
  onCancel,
}: {
  member: TribeMemberView;
  actorIsFounder: boolean;
  pending: boolean;
  onSave: (title: string, rights: TribeRightsView) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(member.title),
    [rights, setRights] = useState<TribeRightsView>(member.rights);
  const effective = settle(rights);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(title, effective);
  }
  return (
    <form className="tribe-rights" onSubmit={submit} aria-label={`Cargo de ${member.username}`}>
      <label>
        Cargo (até 24 caracteres)
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={24}
          disabled={pending}
        />
      </label>
      <div className="tribe-right-list">
        {rightKeys.map((key) => {
          const implied =
            key !== 'isFounder' && key !== 'canLead' && (effective.canLead || effective.isFounder);
          const lockedByLead = key === 'canLead' && effective.isFounder;
          const founderLocked = key === 'isFounder' && !actorIsFounder;
          return (
            <label key={key} title={rightNames[key].hint}>
              <input
                type="checkbox"
                checked={effective[key]}
                disabled={pending || implied || lockedByLead || founderLocked}
                onChange={(event) => setRights({ ...rights, [key]: event.target.checked })}
              />
              {rightNames[key].name}
            </label>
          );
        })}
      </div>
      <div className="tribe-row-actions">
        <button className="bcard-action green" disabled={pending}>
          Salvar cargo
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Members({ data, pending, onAction, onTarget }: Props) {
  const [editing, setEditing] = useState<number | null>(null),
    [kicking, setKicking] = useState<number | null>(null);
  const me = data.me.rights;
  return (
    <section className="tribe-card" aria-label="Membros">
      <h2>
        Membros ({data.members.length} de {data.limits.members})
      </h2>
      <ul className="tribe-members">
        {data.members.map((member) => {
          const manageable = me.canLead && (!member.rights.isFounder || me.isFounder);
          const self = member.playerId === data.me.playerId;
          const open = editing === member.playerId;
          return (
            <li key={member.playerId} data-self={self ? 'true' : undefined}>
              <span className="tribe-member-name">
                <button className="text-button" onClick={() => onTarget('player', member.playerId)}>
                  {member.username}
                </button>
                {self ? <em className="rank-you">você</em> : null}
                <small>
                  {member.title ? <b>{member.title} · </b> : null}
                  {roleOf(member)} · desde {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                </small>
              </span>
              <span className="tribe-member-stat">
                <b>{numbers.format(member.points)}</b> <small>pontos</small>
              </span>
              <span className="tribe-member-stat">
                <b>{numbers.format(member.villages)}</b>{' '}
                <small>{member.villages === 1 ? 'aldeia' : 'aldeias'}</small>
              </span>
              {manageable ? (
                <span className="tribe-row-actions">
                  <button
                    className="button"
                    disabled={pending}
                    aria-expanded={open}
                    aria-label={`Cargo de ${member.username}`}
                    onClick={() => setEditing(open ? null : member.playerId)}
                  >
                    Cargo
                  </button>
                  {self ? null : kicking === member.playerId ? (
                    <>
                      <button
                        className="button danger"
                        disabled={pending}
                        aria-label={`Confirmar expulsão de ${member.username}`}
                        onClick={() => {
                          setKicking(null);
                          onAction({ type: 'kick', playerId: member.playerId });
                        }}
                      >
                        Confirmar
                      </button>
                      <button className="button" onClick={() => setKicking(null)}>
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      className="button"
                      disabled={pending}
                      aria-label={`Expulsar ${member.username}`}
                      onClick={() => setKicking(member.playerId)}
                    >
                      Expulsar
                    </button>
                  )}
                </span>
              ) : null}
              {open && manageable ? (
                <RightsEditor
                  member={member}
                  actorIsFounder={me.isFounder}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSave={(title, rights) => {
                    setEditing(null);
                    onAction({ type: 'rights', playerId: member.playerId, title, rights });
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Invites({ data, pending, onAction }: Props) {
  const [username, setUsername] = useState('');
  const can = data.me.rights.canInvite;
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction({ type: 'invite', username });
    setUsername('');
  }
  return (
    <section className="tribe-card" aria-label="Convites">
      <h2>Convites</h2>
      {can ? (
        <form className="tribe-form inline" onSubmit={invite}>
          <label>
            Convidar jogador
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={24}
              placeholder="Nome do jogador"
              required
              disabled={pending}
            />
          </label>
          <button className="bcard-action green" disabled={pending}>
            Convidar
          </button>
        </form>
      ) : (
        <p className="muted">Só quem tem a permissão de convidar pode enviar convites.</p>
      )}
      {data.invites.length ? (
        <ul className="tribe-invites">
          {data.invites.map((invite) => (
            <li key={invite.id}>
              <div>
                <strong>{invite.player.username}</strong>
                <small>
                  convidado por {invite.invitedBy} · {completionDate(invite.createdAt, Date.now())}
                </small>
              </div>
              {can ? (
                <button
                  className="button"
                  disabled={pending}
                  onClick={() => onAction({ type: 'cancel_invite', inviteId: invite.id })}
                >
                  Cancelar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum convite pendente.</p>
      )}
    </section>
  );
}

function TextEditor({
  title,
  hint,
  value,
  allowed,
  denied,
  pending,
  onSave,
}: {
  title: string;
  hint: string;
  value: string;
  allowed: boolean;
  denied: string;
  pending: boolean;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <section className="tribe-card" aria-label={title}>
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      {allowed ? (
        <form
          className="note-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(text);
          }}
        >
          <BBEditor
            label={title}
            value={text}
            onChange={setText}
            rows={9}
            maxLength={10000}
            disabled={pending}
          />
          <div className="note-actions">
            <span className="muted note-count">
              {[...text].length.toLocaleString('pt-BR')} / 10.000
            </span>
            <button className="bcard-action green" disabled={pending || text === value}>
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <p className="muted">{denied}</p>
      )}
    </section>
  );
}

export function EditProfile({ data, pending, onAction }: Props) {
  const me = data.me.rights;
  const [name, setName] = useState(data.profile.name),
    [tag, setTag] = useState(data.profile.tag);
  return (
    <div className="tribe-stack">
      <TextEditor
        title="Perfil público"
        hint="Aparece para todos os jogadores na página da tribo."
        value={data.descriptionText}
        allowed={me.canDiplomacy}
        denied="Só quem tem a permissão de diplomacia pode editar o perfil público."
        pending={pending}
        onSave={(description) => onAction({ type: 'edit', description })}
      />
      <TextEditor
        title="Texto interno"
        hint="Só os membros veem este texto."
        value={data.internalText}
        allowed={me.canLead}
        denied="Só líderes podem editar o texto interno."
        pending={pending}
        onSave={(internalText) => onAction({ type: 'edit', internalText })}
      />
      <section className="tribe-card" aria-label="Nome e tag">
        <h2>Nome e tag</h2>
        {me.isFounder ? (
          <form
            className="tribe-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAction({ type: 'edit', name, tag });
            }}
          >
            <label>
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={4}
                maxLength={25}
                required
                disabled={pending}
              />
            </label>
            <label>
              Tag
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                minLength={2}
                maxLength={6}
                required
                disabled={pending}
              />
            </label>
            <button
              className="bcard-action green"
              disabled={pending || (name === data.profile.name && tag === data.profile.tag)}
            >
              Salvar nome e tag
            </button>
          </form>
        ) : (
          <p className="muted">Só fundadores podem mudar o nome e a tag.</p>
        )}
      </section>
    </div>
  );
}

export function Options({ data, pending, onAction }: Props) {
  const [confirming, setConfirming] = useState<'leave' | 'disband' | null>(null);
  const alone = data.members.length === 1;
  const onlyFounder =
    data.me.rights.isFounder && data.members.filter((m) => m.rights.isFounder).length === 1;
  return (
    <section className="tribe-card" aria-label="Sair da tribo">
      <h2>Sair ou dissolver</h2>
      {onlyFounder && !alone ? (
        <p className="muted">
          Você é o único fundador. Para sair, nomeie outro fundador na aba Membros ou dissolva a
          tribo.
        </p>
      ) : null}
      <div className="tribe-row-actions">
        {confirming === 'leave' ? (
          <>
            <span role="alert">
              {alone ? 'Sair vai dissolver a tribo, pois você é o único membro. ' : ''}Confirma?
            </span>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => {
                setConfirming(null);
                onAction({ type: 'leave' });
              }}
            >
              Sair da tribo
            </button>
            <button className="button" onClick={() => setConfirming(null)}>
              Cancelar
            </button>
          </>
        ) : confirming === 'disband' ? (
          <>
            <span role="alert">Todos os membros serão avisados. Confirma?</span>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => {
                setConfirming(null);
                onAction({ type: 'disband' });
              }}
            >
              Dissolver a tribo
            </button>
            <button className="button" onClick={() => setConfirming(null)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              className="button"
              disabled={pending || (onlyFounder && !alone)}
              onClick={() => setConfirming('leave')}
            >
              Sair da tribo
            </button>
            {data.me.rights.isFounder ? (
              <button
                className="button"
                disabled={pending}
                onClick={() => setConfirming('disband')}
              >
                Dissolver a tribo
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

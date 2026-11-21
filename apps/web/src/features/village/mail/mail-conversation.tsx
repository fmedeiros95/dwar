import { useState, type FormEvent } from 'react';
import type { MailThreadView, MessageTarget } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';
import { BBEditor } from '../../../components/bbcode-editor.js';
import { MailContent } from './mail-content.js';

export function Conversation({
  data,
  pending,
  clock,
  onReply,
  onDelete,
  onTarget,
}: {
  data: MailThreadView;
  pending: boolean;
  clock: number;
  onReply: (text: string) => void;
  onDelete: () => void;
  onTarget: (type: MessageTarget, id: number) => void;
}) {
  const [replying, setReplying] = useState(false),
    [text, setText] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReply(text);
  }
  return (
    <div className="mail-conversation">
      <div className="mail-thread-head">
        <div>
          <h2>{data.title}</h2>
          <span className="muted">
            Com{' '}
            <button className="text-button" onClick={() => onTarget('player', data.partner.id)}>
              {data.partner.username}
            </button>
          </span>
        </div>
        <div className="mail-thread-actions">
          <button className="button" disabled={pending} onClick={() => setReplying(true)}>
            Responder
          </button>
          <button className="button" disabled={pending} onClick={onDelete}>
            Excluir
          </button>
        </div>
      </div>
      {replying ? (
        <form className="mail-reply" onSubmit={submit} aria-label="Responder mensagem">
          <BBEditor
            label="Texto da resposta"
            rows={7}
            value={text}
            onChange={setText}
            minLength={3}
            required
            disabled={pending}
          />
          <button className="bcard-action green" disabled={pending}>
            Enviar resposta
          </button>
        </form>
      ) : null}
      <ul className="mail-posts">
        {data.posts.map((post) => (
          <li key={post.id} className="mail-post">
            <div className="mail-post-heading">
              <button className="text-button" onClick={() => onTarget('player', post.author.id)}>
                {post.author.username}
              </button>
              <time dateTime={post.createdAt}>{completionDate(post.createdAt, clock)}</time>
            </div>
            <div className="mail-text">
              <MailContent nodes={post.content} onTarget={onTarget} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import type { MailThreadView } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';
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
  onTarget: (type: 'player' | 'village', id: number) => void;
}) {
  const [replying, setReplying] = useState(false),
    [text, setText] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReply(text);
  }
  return (
    <table className="legacy-table mail-conversation">
      <tbody>
        <tr>
          <th>Assunto:</th>
          <th>{data.title}</th>
        </tr>
        <tr>
          <td>Participante:</td>
          <td>
            <img src={`/legacy/icons/${data.partnerStatus}_mail.png`} alt="" />{' '}
            <button className="text-button" onClick={() => onTarget('player', data.partner.id)}>
              {data.partner.username}
            </button>
          </td>
        </tr>
        {replying ? (
          <tr>
            <td colSpan={2}>
              <form onSubmit={submit} aria-label="Responder mensagem">
                <textarea
                  aria-label="Texto da resposta"
                  cols={70}
                  rows={10}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  minLength={3}
                  maxLength={16000}
                  required
                  disabled={pending}
                />
                <p>
                  <button disabled={pending}>Enviar resposta</button>
                </p>
              </form>
            </td>
          </tr>
        ) : null}
        {data.posts.map((post) => (
          <tr key={post.id}>
            <td colSpan={2}>
              <div className="mail-post">
                <div className="mail-post-heading">
                  <button
                    className="text-button"
                    onClick={() => onTarget('player', post.author.id)}
                  >
                    {post.author.username}
                  </button>
                  <time dateTime={post.createdAt}>{completionDate(post.createdAt, clock)}</time>
                </div>
                <div className="mail-text">
                  <MailContent nodes={post.content} onTarget={onTarget} />
                </div>
              </div>
            </td>
          </tr>
        ))}
        <tr>
          <td className="mail-center">
            <button className="text-button" disabled={pending} onClick={() => setReplying(true)}>
              Responder
            </button>
          </td>
          <td className="mail-center">
            <button className="text-button" disabled={pending} onClick={onDelete}>
              Excluir
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

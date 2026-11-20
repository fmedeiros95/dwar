import { useState, type FormEvent } from 'react';
import type { MailAction } from '@dwar/api-client';

export function ComposeMail({
  recipient,
  pending,
  onSend,
  onPreview,
  preview,
}: {
  recipient: string;
  pending: boolean;
  onSend: (action: MailAction) => void;
  onPreview: (text: string) => void;
  preview: string | null;
}) {
  const [to, setTo] = useState(recipient),
    [subject, setSubject] = useState(''),
    [text, setText] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend({ type: 'send', recipient: to, title: subject, text });
  }
  return (
    <form onSubmit={submit} aria-label="Nova mensagem">
      <table className="legacy-table mail-compose">
        <tbody>
          {preview !== null ? (
            <>
              <tr>
                <th colSpan={2}>Prévia:</th>
              </tr>
              <tr>
                <td colSpan={2} className="mail-text mail-center">
                  {preview}
                </td>
              </tr>
            </>
          ) : null}
          <tr>
            <th colSpan={2}>Nova mensagem:</th>
          </tr>
          <tr>
            <td>
              <label htmlFor="mail-recipient">Para:</label>
            </td>
            <td>
              <input
                id="mail-recipient"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                maxLength={24}
                size={30}
                required
                disabled={pending}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor="mail-subject">Assunto:</label>
            </td>
            <td>
              <input
                id="mail-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                minLength={3}
                maxLength={120}
                size={30}
                required
                disabled={pending}
              />
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <textarea
                aria-label="Texto da mensagem"
                value={text}
                onChange={(event) => setText(event.target.value)}
                cols={70}
                rows={16}
                minLength={3}
                maxLength={16000}
                required
                disabled={pending}
              />
            </td>
          </tr>
          <tr>
            <th colSpan={2}>
              <button type="button" onClick={() => onPreview(text)} disabled={pending}>
                Prévia
              </button>{' '}
              <button disabled={pending}>Enviar</button>
            </th>
          </tr>
        </tbody>
      </table>
    </form>
  );
}

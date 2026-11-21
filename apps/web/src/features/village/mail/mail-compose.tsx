import { useState, type FormEvent } from 'react';
import type { MailAction, MessageNode } from '@dwar/api-client';
import { BBEditor } from '../../../components/bbcode-editor.js';
import { MailContent } from './mail-content.js';

export function ComposeMail({
  recipient,
  pending,
  onSend,
  onPreview,
  preview,
  onTarget,
}: {
  recipient: string;
  pending: boolean;
  onSend: (action: MailAction) => void;
  onPreview: (text: string) => void;
  preview: MessageNode[] | null;
  onTarget: (type: 'player' | 'village', id: number) => void;
}) {
  const [to, setTo] = useState(recipient),
    [subject, setSubject] = useState(''),
    [text, setText] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend({ type: 'send', recipient: to, title: subject, text });
  }
  return (
    <form className="mail-compose" onSubmit={submit} aria-label="Nova mensagem">
      {preview !== null ? (
        <section className="mail-preview" aria-label="Prévia">
          <h2 className="tech-heading">Prévia</h2>
          <div className="mail-text">
            <MailContent nodes={preview} onTarget={onTarget} />
          </div>
        </section>
      ) : null}
      <div className="mail-fields">
        <label htmlFor="mail-recipient">
          Para
          <input
            id="mail-recipient"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            maxLength={24}
            required
            disabled={pending}
          />
        </label>
        <label htmlFor="mail-subject">
          Assunto
          <input
            id="mail-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            minLength={3}
            maxLength={120}
            required
            disabled={pending}
          />
        </label>
      </div>
      <BBEditor
        label="Texto da mensagem"
        value={text}
        onChange={setText}
        rows={12}
        minLength={3}
        required
        disabled={pending}
      />
      <div className="mail-compose-actions">
        <button className="button" type="button" onClick={() => onPreview(text)} disabled={pending}>
          Prévia
        </button>
        <button className="bcard-action green" disabled={pending}>
          Enviar
        </button>
      </div>
    </form>
  );
}

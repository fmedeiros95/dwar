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
    <form className="mail-compose" onSubmit={submit} aria-label="Nova mensagem">
      {preview !== null ? (
        <section className="mail-preview" aria-label="Prévia">
          <h2 className="tech-heading">Prévia</h2>
          <div className="mail-text">{preview}</div>
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
      <textarea
        aria-label="Texto da mensagem"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        minLength={3}
        maxLength={16000}
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

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { newRequestKey, type TribeAction, type TribeOverview } from '@dwar/api-client';
import { BBEditor } from '../../../components/bbcode-editor.js';

type Result = { sent: number; skipped: number; repeated: boolean };

/** Mensagem para todos os membros da tribo (cada um recebe uma conversa na sua caixa de entrada). */
export function MassMail({
  data,
  pending,
  result,
  onAction,
}: {
  data: TribeOverview;
  pending: boolean;
  result: Result | null;
  onAction: (action: TribeAction) => void;
}) {
  const [title, setTitle] = useState(''),
    [text, setText] = useState(''),
    [confirming, setConfirming] = useState(false);
  // Uma chave por mensagem: se o envio for repetido sem querer, o servidor não duplica.
  const requestId = useRef(newRequestKey());
  const recipients = data.members.length - 1;
  useEffect(() => {
    if (!result) return;
    setTitle('');
    setText('');
    setConfirming(false);
    requestId.current = newRequestKey();
  }, [result]);
  if (!data.me.rights.canMassMail)
    return (
      <section className="tribe-card">
        <h2>Mensagem para a tribo</h2>
        <p className="muted">Só quem tem a permissão de mensagem em massa pode enviar.</p>
      </section>
    );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirming(true);
  }
  return (
    <section className="tribe-card" aria-label="Mensagem para a tribo">
      <h2>Mensagem para a tribo</h2>
      <p className="muted">
        Cada membro recebe a mensagem na caixa de entrada, como uma conversa que pode ser
        respondida. Quem bloqueou você não recebe.
      </p>
      {result ? (
        <p role="status" className="tribe-sent">
          {result.repeated
            ? 'Esta mensagem já tinha sido enviada.'
            : `Mensagem enviada para ${result.sent} ${result.sent === 1 ? 'membro' : 'membros'}${
                result.skipped ? `; ${result.skipped} não recebeu por bloquear você` : ''
              }.`}
        </p>
      ) : null}
      {recipients < 1 ? (
        <p className="muted">Você é o único membro da tribo; não há para quem enviar.</p>
      ) : (
        <form className="tribe-form" onSubmit={submit}>
          <label>
            Assunto
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setConfirming(false);
              }}
              minLength={3}
              maxLength={120}
              required
              disabled={pending}
            />
          </label>
          <BBEditor
            label="Texto da mensagem"
            value={text}
            onChange={(value) => {
              setText(value);
              setConfirming(false);
            }}
            rows={9}
            minLength={3}
            required
            disabled={pending}
          />
          {confirming ? (
            <div className="tribe-row-actions" role="alert">
              <span>
                Enviar para {recipients} {recipients === 1 ? 'membro' : 'membros'}?
              </span>
              <button
                type="button"
                className="bcard-action green"
                disabled={pending}
                onClick={() =>
                  onAction({
                    type: 'mass_mail',
                    title,
                    text,
                    requestId: requestId.current,
                  })
                }
              >
                Enviar
              </button>
              <button type="button" className="button" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="bcard-action green" disabled={pending}>
              Enviar para {recipients} {recipients === 1 ? 'membro' : 'membros'}…
            </button>
          )}
        </form>
      )}
    </section>
  );
}

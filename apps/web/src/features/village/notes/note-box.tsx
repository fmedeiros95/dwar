import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MessageNode } from '@dwar/api-client';
import { BBEditor } from '../../../components/bbcode-editor.js';
import { MailContent } from '../mail/mail-content.js';

const limit = 10000;

/**
 * Uma nota pessoal com BBCode: a geral (sem `villageId`) ou a de uma aldeia. Mostra o texto
 * formatado e alterna para o editor com prévia; texto vazio apaga a nota.
 */
export function NoteBox({
  worldId,
  villageId,
  onTarget,
  emptyText,
}: {
  worldId: number;
  villageId?: number;
  onTarget: (type: 'player' | 'village', id: number) => void;
  emptyText: string;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null),
    [preview, setPreview] = useState<MessageNode[] | null>(null);
  const note = useQuery({
    queryKey: ['note', worldId, villageId ?? 0],
    queryFn: async () =>
      villageId ? api.note(worldId, villageId) : (await api.notes(worldId)).general,
  });
  const save = useMutation({
    mutationFn: (text: string) => api.saveNote(worldId, text, villageId),
    onSuccess: (saved) => {
      client.setQueryData(['note', worldId, villageId ?? 0], saved);
      void client.invalidateQueries({ queryKey: ['notes', worldId] });
      setDraft(null);
      setPreview(null);
    },
  });
  const previewing = useMutation({
    mutationFn: (text: string) => api.previewMail(worldId, text),
    onSuccess: (result) => setPreview(result.content),
  });
  const data = note.data;
  if (!data)
    return (
      <p className="muted" role={note.error ? 'alert' : 'status'}>
        {note.error?.message ?? 'Carregando nota…'}
      </p>
    );
  const editing = draft !== null;
  const error = save.error ?? previewing.error;
  return (
    <section className="note-box" aria-label="Nota">
      {editing ? (
        <form
          className="note-form"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(draft);
          }}
        >
          {preview ? (
            <div className="note-preview mail-text" aria-label="Prévia">
              <MailContent nodes={preview} onTarget={onTarget} />
            </div>
          ) : null}
          <BBEditor
            label="Texto da nota"
            value={draft}
            onChange={(value) => {
              setDraft(value);
              setPreview(null);
            }}
            rows={14}
            maxLength={limit}
            disabled={save.isPending}
          />
          <div className="note-actions">
            <span className="muted note-count">
              {[...draft].length.toLocaleString('pt-BR')} / {limit.toLocaleString('pt-BR')}
            </span>
            <button
              type="button"
              className="button"
              disabled={save.isPending || previewing.isPending || [...draft].length < 3}
              onClick={() => previewing.mutate(draft)}
            >
              Prévia
            </button>
            <button
              type="button"
              className="button"
              disabled={save.isPending}
              onClick={() => {
                setDraft(null);
                setPreview(null);
                save.reset();
              }}
            >
              Cancelar
            </button>
            <button className="bcard-action green" disabled={save.isPending}>
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="note-body mail-text">
            {data.text ? (
              <MailContent nodes={data.content} onTarget={onTarget} />
            ) : (
              <span className="muted">{emptyText}</span>
            )}
          </div>
          <div className="note-actions">
            {data.updatedAt ? (
              <span className="muted note-count">
                Atualizada em {new Date(data.updatedAt).toLocaleString('pt-BR')}
              </span>
            ) : null}
            <button className="button" onClick={() => setDraft(data.text)}>
              {data.text ? 'Editar' : 'Escrever'}
            </button>
          </div>
        </>
      )}
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
    </section>
  );
}

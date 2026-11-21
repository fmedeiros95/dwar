import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { MailboxSnapshot } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';
import { pageWindow } from '../ranking/ranking-screen.js';

const statusLabel = { new: 'Não lida', answered: 'Respondida', read: 'Lida' } as const;

function Pagination({ data, onPage }: { data: MailboxSnapshot; onPage: (page: number) => void }) {
  if (data.pageCount <= 1) return null;
  return (
    <nav className="pager" aria-label="Páginas de mensagens">
      <button
        className="button"
        disabled={data.page <= 1}
        onClick={() => onPage(data.page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      {pageWindow(data.page, data.pageCount).map((page, index) =>
        page === null ? (
          <span key={`gap-${index}`} className="pager-gap">
            …
          </span>
        ) : (
          <button
            key={page}
            className={page === data.page ? 'button active' : 'button'}
            aria-current={page === data.page ? 'page' : undefined}
            onClick={() => onPage(page)}
          >
            {page}
          </button>
        ),
      )}
      <button
        className="button"
        disabled={data.page >= data.pageCount}
        onClick={() => onPage(data.page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export function MailList({
  data,
  pending,
  clock,
  onOpen,
  onDelete,
  onPlayer,
  onPage,
}: {
  data: MailboxSnapshot;
  pending: boolean;
  clock: number;
  onOpen: (id: number) => void;
  onDelete: (ids: number[]) => void;
  onPlayer: (id: number) => void;
  onPage: (page: number) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const ids = data.threads.map((row) => row.id),
    visible = selected.filter((id) => ids.includes(id));
  if (!data.threads.length)
    return <p className="empty-state">Nenhuma mensagem. Escreva a primeira em “Nova mensagem”.</p>;
  return (
    <div className="mail-list">
      <div className="mail-toolbar">
        <label>
          <input
            aria-label="Selecionar todas as mensagens"
            type="checkbox"
            checked={ids.length > 0 && visible.length === ids.length}
            disabled={pending || !ids.length}
            onChange={(event) => setSelected(event.target.checked ? ids : [])}
          />
          Selecionar todas
        </label>
        <button
          className="button"
          disabled={pending || !visible.length}
          onClick={() => onDelete(visible)}
        >
          <Trash2 size={14} aria-hidden="true" /> Excluir selecionadas
        </button>
      </div>
      <ul className="mail-rows">
        {data.threads.map((row) => (
          <li key={row.id} className={`mail-row ${row.status}`}>
            <input
              aria-label={`Selecionar ${row.title}`}
              type="checkbox"
              checked={visible.includes(row.id)}
              disabled={pending}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...visible, row.id]
                    : visible.filter((id) => id !== row.id),
                )
              }
            />
            <button className="mail-subject" onClick={() => onOpen(row.id)}>
              <span className="mail-state">{statusLabel[row.status]}</span>
              <span className="mail-title">
                {row.title}
                {row.postCount > 1 ? ` (${row.postCount})` : ''}
              </span>
            </button>
            <button
              className="text-button mail-partner"
              title={
                row.partnerStatus === 'new'
                  ? 'Ainda não lida pelo participante'
                  : row.partnerStatus === 'answered'
                    ? 'Participante respondeu'
                    : 'Lida pelo participante'
              }
              onClick={() => onPlayer(row.partner.id)}
            >
              {row.partner.username}
            </button>
            <time dateTime={row.lastPostAt}>{completionDate(row.lastPostAt, clock)}</time>
          </li>
        ))}
      </ul>
      <Pagination data={data} onPage={onPage} />
    </div>
  );
}

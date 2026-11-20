import { Fragment, useState } from 'react';
import type { MailboxSnapshot } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';

function Pagination({ data, onPage }: { data: MailboxSnapshot; onPage: (page: number) => void }) {
  if (data.pageCount <= 1) return null;
  const pages = [
    ...(data.page > 1
      ? [
          { page: 1, label: '<<' },
          { page: data.page - 1, label: '<' },
        ]
      : []),
    ...Array.from({ length: 11 }, (_, index) => data.page - 5 + index)
      .filter((page) => page >= 1 && page <= data.pageCount)
      .map((page) => ({ page, label: String(page) })),
    ...(data.page < data.pageCount
      ? [
          { page: data.page + 1, label: '>' },
          { page: data.pageCount, label: '>>' },
        ]
      : []),
  ];
  return (
    <tr>
      <td colSpan={4} className="mail-pagination">
        {pages.map(({ page, label }, index) => (
          <Fragment key={index}>
            {page === data.page && label === String(page) ? (
              <span> [{label}] </span>
            ) : (
              <button className="text-button" onClick={() => onPage(page)}>
                {label}
              </button>
            )}{' '}
          </Fragment>
        ))}
      </td>
    </tr>
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
  return (
    <div className="table-scroll">
      <table className="legacy-table mail-list">
        <thead>
          <tr>
            <th>#</th>
            <th>Assunto</th>
            <th>Participante</th>
            <th>Última resposta</th>
          </tr>
        </thead>
        <tbody>
          <Pagination data={data} onPage={onPage} />
          {data.threads.map((row) => (
            <tr key={row.id}>
              <td>
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
              </td>
              <td>
                <button className="text-button" onClick={() => onOpen(row.id)}>
                  <img
                    src={`/legacy/icons/${row.status}_mail.png`}
                    alt={
                      row.status === 'new'
                        ? 'Não lida'
                        : row.status === 'answered'
                          ? 'Respondida'
                          : 'Lida'
                    }
                  />{' '}
                  {row.title}
                  {row.postCount > 1 ? ` (${row.postCount})` : ''}
                </button>
              </td>
              <td>
                <img
                  src={`/legacy/icons/${row.partnerStatus}_mail.png`}
                  alt={
                    row.partnerStatus === 'new'
                      ? 'Ainda não lida pelo participante'
                      : row.partnerStatus === 'answered'
                        ? 'Participante respondeu'
                        : 'Lida pelo participante'
                  }
                />{' '}
                <button className="text-button" onClick={() => onPlayer(row.partner.id)}>
                  {row.partner.username}
                </button>
              </td>
              <td>{completionDate(row.lastPostAt, clock)}</td>
            </tr>
          ))}
          {!data.threads.length ? (
            <tr>
              <td colSpan={4}>Nenhuma mensagem.</td>
            </tr>
          ) : null}
          <Pagination data={data} onPage={onPage} />
          <tr>
            <th>
              <input
                id="mail-select-all"
                aria-label="Selecionar todas as mensagens"
                type="checkbox"
                checked={ids.length > 0 && visible.length === ids.length}
                disabled={pending || !ids.length}
                onChange={(event) => setSelected(event.target.checked ? ids : [])}
              />
            </th>
            <th colSpan={2}>
              <label htmlFor="mail-select-all">Selecionar todas</label>
            </th>
            <th className="mail-right">
              <button disabled={pending || !visible.length} onClick={() => onDelete(visible)}>
                Excluir selecionadas
              </button>
            </th>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Swords, Trash2 } from 'lucide-react';
import type { ReportAction, ReportGroup, ReportRef, ReportsSnapshot } from '@dwar/api-client';
import { completionDate } from '../shared/index.js';
import { Marks, kindIcon, refKey, roleLabel } from './report-parts.js';

export function ReportList({
  data,
  clock,
  group,
  pending,
  onOpen,
  onAction,
  onPage,
}: {
  data: ReportsSnapshot;
  clock: number;
  group: ReportGroup;
  pending: boolean;
  onOpen: (ref: ReportRef) => void;
  onAction: (action: ReportAction) => void;
  onPage: (page: number) => void;
}) {
  const [selected, setSelected] = useState<ReportRef[]>([]),
    [confirming, setConfirming] = useState(false);
  const isSelected = (ref: ReportRef) => selected.some((s) => refKey(s) === refKey(ref));
  const everyone = data.reports.length > 0 && selected.length === data.reports.length;
  const toggle = (ref: ReportRef) =>
    setSelected((now) =>
      isSelected(ref) ? now.filter((s) => refKey(s) !== refKey(ref)) : [...now, ref],
    );
  const refs = (report: { source: ReportRef['source']; id: number }): ReportRef => ({
    source: report.source,
    id: report.id,
  });
  const groupTotal = data.groups[group].total;
  return (
    <>
      {data.reports.length ? (
        <>
          <div className="report-tools">
            <label className="report-select-all">
              <input
                type="checkbox"
                checked={everyone}
                onChange={() => setSelected(everyone ? [] : data.reports.map(refs))}
              />
              Selecionar tudo
            </label>
            <button
              className="button"
              disabled={!selected.length || pending}
              onClick={() => onAction({ type: 'delete', items: selected })}
            >
              <Trash2 size={14} aria-hidden="true" /> Excluir
              {selected.length ? ` (${selected.length})` : ''}
            </button>
            <button
              className="button"
              disabled={!selected.length || pending}
              onClick={() => onAction({ type: 'read', items: selected })}
            >
              Marcar como lidos
            </button>
            <button
              className="button"
              disabled={!selected.length || pending}
              onClick={() => onAction({ type: 'unread', items: selected })}
            >
              Marcar como não lidos
            </button>
            <button
              className="button"
              disabled={!data.groups[group].unread || pending}
              onClick={() => onAction({ type: 'read', group })}
            >
              Marcar tudo como lido
            </button>
            {confirming ? (
              <span className="report-confirm" role="alert">
                Excluir {groupTotal} {groupTotal === 1 ? 'relatório' : 'relatórios'}?
                <button
                  className="button danger"
                  disabled={pending}
                  onClick={() => {
                    setConfirming(false);
                    onAction({ type: 'delete', group });
                  }}
                >
                  Confirmar
                </button>
                <button className="button" onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button className="button" disabled={pending} onClick={() => setConfirming(true)}>
                <Trash2 size={14} aria-hidden="true" /> Excluir{' '}
                {group === 'all' ? 'todos' : 'a aba'}
              </button>
            )}
          </div>
          <ul className="report-list">
            {data.reports.map((r) => {
              const Icon = kindIcon[r.group];
              const tone = r.source === 'battle' ? r.outcome : 'neutral';
              return (
                <li key={refKey(r)} className={`report-item ${tone}${r.read ? '' : ' unread'}`}>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar relatório: ${r.title}`}
                    checked={isSelected(r)}
                    onChange={() => toggle(refs(r))}
                  />
                  <button className="report-row" onClick={() => onOpen(refs(r))}>
                    <span
                      className="report-dot"
                      aria-label={`${r.read ? 'Lido' : 'Não lido'} · ${roleLabel(r)}`}
                    />
                    <Icon size={16} aria-hidden="true" className="report-kind" />
                    <span className="report-title">
                      {r.title}
                      <small>{roleLabel(r)}</small>
                    </span>
                    <Marks report={r} />
                    <time dateTime={r.occurredAt}>{completionDate(r.occurredAt, clock)}</time>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="empty-state">
          <Swords size={28} aria-hidden="true" />
          {group === 'all'
            ? 'Nenhum relatório ainda. Batalhas, remessas e apoios aparecem aqui.'
            : 'Nenhum relatório nesta categoria.'}
        </p>
      )}
      {data.pageCount > 1 ? (
        <nav className="pager" aria-label="Páginas de relatórios">
          <button
            className="button"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span>
            {data.page} / {data.pageCount}
          </span>
          <button
            className="button"
            disabled={data.page >= data.pageCount}
            onClick={() => onPage(data.page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </>
  );
}

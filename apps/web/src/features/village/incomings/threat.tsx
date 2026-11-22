import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ScrollText, Swords, X } from 'lucide-react';
import type { IncomingOverview, ReportSummary } from '@dwar/api-client';
import { completionDate, duration } from '../shared/index.js';

/** Abaixo disso o selo pulsa: a ameaça ficou urgente. */
const urgentSeconds = 5 * 60;
const seenKey = 'dwar:attacks-seen';

function nextAttack(data: IncomingOverview | undefined, clock: number) {
  const attacks = (data?.commands ?? []).filter(
    (item) => item.kind === 'attack' && new Date(item.endsAt).getTime() > clock,
  );
  attacks.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  return { attacks, first: attacks[0] ?? null };
}

const noticeKey = 'dwar:attack-notice';
const knownKey = 'dwar:attacks-known';
/** Por quanto tempo o selo pós-batalha fica na barra depois da chegada. */
const aftermathMs = 3 * 60 * 1000;
type Known = { id: number; endsAt: number; target: string };

function readKnown(): Known[] {
  try {
    return JSON.parse(sessionStorage.getItem(knownKey) ?? '[]') as Known[];
  } catch {
    return [];
  }
}

/**
 * Depois da chegada: o ataque mais recente que já terminou e o relatório de defesa dele, achado
 * pelo horário da batalha. Enquanto o servidor resolve, o selo diz que a batalha está acontecendo.
 */
function aftermath(known: Known[], active: Set<number>, reports: ReportSummary[], clock: number) {
  const done = known
    .filter(
      (item) => !active.has(item.id) && item.endsAt <= clock && clock - item.endsAt < aftermathMs,
    )
    .sort((a, b) => b.endsAt - a.endsAt)[0];
  if (!done) return null;
  const report = reports.find(
    (item) =>
      item.source === 'battle' &&
      item.role === 'defender' &&
      Math.abs(new Date(item.occurredAt).getTime() - done.endsAt) < 5000,
  );
  return { done, report: report?.source === 'battle' ? report : null };
}
const outcomeLabel = { won: 'Defesa vencida', lost: 'Defesa perdida', draw: 'Empate' } as const;
/** Quanto tempo o cartão de chegada fica aberto (igual à animação em art.css). */
const noticeMs = 8000;
type Notice = { id: number; until: number };

function store(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* só nesta aba */
  }
}
function readNotice(): Notice | null {
  try {
    return JSON.parse(sessionStorage.getItem(noticeKey) ?? 'null') as Notice | null;
  } catch {
    return null;
  }
}

function readSeen(): Set<number> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(seenKey) ?? '[]') as number[]);
  } catch {
    return new Set();
  }
}

/**
 * Ataque chegando: quebra a calma da aldeia em três camadas.
 * 1. Na primeira vez que um ataque aparece, as bordas do palco pulsam em carmesim e um cartão
 *    desce do selo com a aldeia afetada, o tempo e o caminho para os detalhes.
 * 2. O selo fica na barra superior (que nenhuma janela cobre) enquanto houver ataque a caminho.
 * 3. Os detalhes abrem numa janela própria, sem fechar a janela em que o jogador estava.
 */
export function ThreatAlert({
  data,
  clock,
  onOpen,
  reports = [],
  onReport,
}: {
  data: IncomingOverview | undefined;
  clock: number;
  onOpen: () => void;
  /** Relatórios recentes, para levar do alerta ao resultado da batalha. */
  reports?: ReportSummary[];
  onReport?: (id: number | null) => void;
}) {
  const { attacks, first } = nextAttack(data, clock);
  // O aviso de chegada vive no sessionStorage, não no componente: a barra superior pode ser
  // montada de novo (troca de tela ou de aldeia) e o aviso não pode sumir nem repetir.
  const [notice, setNotice] = useState<Notice | null>(readNotice);
  const seen = useRef<Set<number> | null>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const ids = attacks.map((item) => item.id).join(',');

  useEffect(() => {
    if (!data) return;
    seen.current ??= readSeen();
    const fresh = data.commands.find(
      (item) => item.kind === 'attack' && !seen.current!.has(item.id),
    );
    for (const item of data.commands) if (item.kind === 'attack') seen.current.add(item.id);
    store(seenKey, [...seen.current]);
    const known = new Map(readKnown().map((item) => [item.id, item]));
    for (const item of data.commands)
      if (item.kind === 'attack')
        known.set(item.id, {
          id: item.id,
          endsAt: new Date(item.endsAt).getTime(),
          target: item.to.name,
        });
    store(
      knownKey,
      [...known.values()].filter((item) => Date.now() - item.endsAt < aftermathMs),
    );
    if (fresh) {
      const next = { id: fresh.id, until: Date.now() + noticeMs };
      store(noticeKey, next);
      setNotice(next);
    }
    // ids resume a lista de ataques; data muda a cada consulta mesmo sem novidade.
  }, [ids]);

  function dismiss() {
    store(noticeKey, null);
    setNotice(null);
  }

  const after = aftermath(readKnown(), new Set(attacks.map((item) => item.id)), reports, clock);
  const afterChip = after ? (
    <button
      type="button"
      className="threat-after"
      data-outcome={after.report?.outcome ?? 'pending'}
      onClick={() => onReport?.(after.report?.id ?? null)}
      aria-label={`Batalha em ${after.done.target}: ${after.report ? outcomeLabel[after.report.outcome] : 'resolvendo'}. Ver relatório`}
    >
      <ScrollText size={15} aria-hidden="true" />
      <span>
        <strong>{after.report ? outcomeLabel[after.report.outcome] : 'Batalha agora'}</strong>
        <small>
          {after.done.target} · {after.report ? 'ver relatório' : 'resolvendo…'}
        </small>
      </span>
    </button>
  ) : null;
  if (!first) return afterChip ? <div className="threat threat-done">{afterChip}</div> : null;
  const remaining = (new Date(first.endsAt).getTime() - clock) / 1000;
  const urgent = remaining <= urgentSeconds;
  const shown =
    notice && Date.now() < notice.until
      ? (attacks.find((item) => item.id === notice.id) ?? null)
      : null;
  return (
    <div className="threat" data-urgent={urgent ? 'true' : undefined}>
      <button
        ref={chip}
        type="button"
        className="threat-chip"
        onClick={onOpen}
        title={`${attacks.length} ${attacks.length === 1 ? 'ataque' : 'ataques'} a caminho. Abrir detalhes`}
        aria-label={`Ataque a caminho de ${first.to.name}, chega em ${duration(remaining)}. Abrir detalhes`}
      >
        <span className="threat-chip-icon" aria-hidden="true">
          <Swords size={16} />
          {attacks.length > 1 ? <b>{attacks.length}</b> : null}
        </span>
        <span className="threat-chip-text">
          <strong>
            Ataque em <time>{duration(remaining)}</time>
          </strong>
          <small>{first.to.name}</small>
        </span>
      </button>
      {afterChip}
      {shown
        ? createPortal(
            <>
              <div className="threat-vignette" aria-hidden="true" />
              <section
                className="threat-card"
                role="alert"
                aria-label="Ataque a caminho"
                style={
                  {
                    '--chip-left': `${chip.current?.getBoundingClientRect().left ?? 16}px`,
                    '--chip-bottom': `${chip.current?.getBoundingClientRect().bottom ?? 64}px`,
                  } as CSSProperties
                }
              >
                <header>
                  <Swords size={18} aria-hidden="true" />
                  <strong>Ataque a caminho</strong>
                  <button
                    type="button"
                    className="threat-close"
                    aria-label="Fechar aviso"
                    onClick={dismiss}
                  >
                    <X size={16} />
                  </button>
                </header>
                <p className="threat-target">
                  {shown.to.name}{' '}
                  <em>
                    {shown.to.x}|{shown.to.y}
                  </em>
                </p>
                <p className="threat-time">
                  Chega em <b>{duration((new Date(shown.endsAt).getTime() - clock) / 1000)}</b> ·{' '}
                  {completionDate(shown.endsAt, clock)}
                </p>
                <p className="threat-from">
                  De {shown.sender} · {shown.from.name} ({shown.from.x}|{shown.from.y})
                </p>
                <button
                  type="button"
                  className="threat-open"
                  onClick={() => {
                    dismiss();
                    onOpen();
                  }}
                >
                  Ver ataques
                </button>
              </section>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

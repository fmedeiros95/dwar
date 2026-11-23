import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ScrollText, Swords, X } from 'lucide-react';
import type { IncomingOverview } from '@dwar/api-client';
import { arrivalDate, defenseOutcome, duration, timeFormat } from '../shared/index.js';

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
/** Quantas batalhas cabem no selo; as demais ficam a um clique, na lista de relatórios. */
const maxSeals = 2;

/**
 * Selo pós-batalha: uma entrada por ataque que já virou batalha. O servidor liga cada ataque ao
 * seu relatório pelo id do comando, então dois ataques quase juntos viram duas entradas, cada uma
 * com o próprio resultado. Enquanto a batalha não foi resolvida, a entrada diz que está acontecendo.
 */
function AftermathSeals({
  data,
  clock,
  onReport,
  attacking,
}: {
  data: IncomingOverview | undefined;
  clock: number;
  onReport: (id: number | null) => void;
  /** Há ataque a caminho: o selo dele divide a barra com estes. */
  attacking: boolean;
}) {
  const resolved = data?.resolved ?? [];
  const fighting = (data?.commands ?? []).filter(
    (item) => item.kind === 'attack' && new Date(item.endsAt).getTime() <= clock,
  );
  const seals = [
    ...fighting.map((item) => ({
      id: item.id,
      reportId: null as number | null,
      at: item.endsAt,
      target: item.to,
      attacker: item.sender,
      outcome: 'pending' as const,
    })),
    ...resolved
      .filter((item) => !fighting.some((other) => other.id === item.movementId))
      .map((item) => ({
        id: item.movementId,
        reportId: item.reportId,
        at: item.occurredAt,
        target: item.target,
        attacker: item.attacker,
        outcome: item.outcome,
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime() || b.id - a.id);
  if (!seals.length) return null;
  // No celular o ataque a caminho tem prioridade: um selo e o resto em "+N".
  const compact = attacking && matchMedia('(max-width: 900px)').matches;
  const shown = seals.slice(0, compact ? 1 : maxSeals);
  const rest = seals.length - shown.length;
  const several = seals.length > 1;
  const sameVillage = seals.every((item) => item.target.id === seals[0]!.target.id);
  return (
    <div
      className="threat-seals"
      data-several={several ? 'true' : undefined}
      data-compact={compact ? 'true' : undefined}
      role="status"
    >
      {shown.map((seal) => {
        const label = seal.outcome === 'pending' ? 'Batalha agora' : defenseOutcome[seal.outcome];
        const time = timeFormat.format(new Date(seal.at));
        const detail = several
          ? sameVillage
            ? time
            : seal.target.name
          : `${seal.target.name} · ${seal.reportId === null ? 'resolvendo…' : 'ver relatório'}`;
        const full = `${label}. ${seal.target.name}, ataque de ${seal.attacker} às ${time}`;
        return (
          <button
            key={seal.id}
            type="button"
            className="threat-after"
            data-outcome={seal.outcome}
            data-movement={seal.id}
            data-report={seal.reportId ?? undefined}
            title={`${full}${seal.reportId === null ? '' : '. Abrir relatório'}`}
            aria-label={`${full}. ${seal.reportId === null ? 'Batalha em andamento' : 'Abrir relatório'}`}
            disabled={seal.reportId === null}
            onClick={() => onReport(seal.reportId)}
          >
            {several ? null : <ScrollText size={15} aria-hidden="true" />}
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
          </button>
        );
      })}
      {rest > 0 ? (
        <button
          type="button"
          className="threat-more"
          aria-label={`Mais ${rest} ${rest === 1 ? 'batalha recente' : 'batalhas recentes'}. Abrir relatórios`}
          onClick={() => onReport(null)}
        >
          +{rest}
        </button>
      ) : null}
    </div>
  );
}
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
  onReport,
}: {
  data: IncomingOverview | undefined;
  clock: number;
  onOpen: () => void;
  /** Leva do selo ao relatório da batalha (ou à lista, quando não há um só). */
  onReport: (id: number | null) => void;
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

  const seals = (
    <AftermathSeals attacking={!!first} data={data} clock={clock} onReport={onReport} />
  );
  if (!first) return <div className="threat threat-done">{seals}</div>;
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
            <span className="threat-chip-label">Ataque em </span>
            <time>{duration(remaining)}</time>
          </strong>
          <small>{first.to.name}</small>
        </span>
      </button>
      {seals}
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
                  {arrivalDate(shown.endsAt, clock)}
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

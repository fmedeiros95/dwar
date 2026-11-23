import {
  Coins,
  Crown,
  Eye,
  HeartHandshake,
  Medal,
  PackageCheck,
  Shield,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { ReportGroup, ReportRef, ReportSummary } from '@dwar/api-client';
import { defenseOutcome, numbers } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

export const outcome = { won: 'Vitória', lost: 'Derrota', draw: 'Empate' };
export const tabs: { code: ReportGroup; label: string }[] = [
  { code: 'all', label: 'Todos' },
  { code: 'attack', label: 'Ataques' },
  { code: 'defense', label: 'Defesas' },
  { code: 'support', label: 'Apoios' },
  { code: 'trade', label: 'Mercado' },
  { code: 'other', label: 'Outros' },
];

export const kindIcon: Record<ReportSummary['group'], LucideIcon> = {
  attack: Swords,
  defense: Shield,
  support: HeartHandshake,
  trade: Coins,
  other: Medal,
};

/** Frase curta que diz o que o relatório significa para quem lê. */
export function roleLabel(report: ReportSummary): string {
  if (report.source === 'battle') {
    const role = { attacker: 'Você atacou', defender: 'Você defendeu', support: 'Você apoiou' }[
      report.role
    ];
    const result = report.role === 'defender' ? defenseOutcome : outcome;
    return `${role} · ${result[report.outcome]}`;
  }
  if (report.kind === 'medal') return 'Nova medalha';
  if (report.kind === 'support')
    return report.role === 'sender' ? 'Seu apoio chegou' : 'Você recebeu apoio';
  return report.role === 'sender' ? 'Remessa enviada' : 'Remessa recebida';
}

/** Chave estável de um relatório na seleção: batalhas e avisos têm numerações separadas. */
export const refKey = (ref: ReportRef) => `${ref.source}:${ref.id}`;

/** Marcas rápidas de uma batalha: o que aconteceu sem precisar abrir o relatório. */
export function Marks({ report }: { report: ReportSummary }) {
  if (report.source !== 'battle') return null;
  const marks = [
    report.conquered && { Icon: Crown, label: 'Aldeia conquistada', tone: 'gold' },
    report.lootFull && { Icon: PackageCheck, label: 'Saque cheio', tone: 'green' },
    !report.lootFull &&
      report.lootTotal > 0 && {
        Icon: PackageCheck,
        label: `Saque de ${numbers.format(report.lootTotal)}`,
        tone: 'muted',
      },
    report.spy && { Icon: Eye, label: 'Espionagem', tone: 'muted' },
    report.lossless && { Icon: ShieldCheck, label: 'Sem baixas', tone: 'green' },
  ].filter((mark): mark is { Icon: LucideIcon; label: string; tone: string } => !!mark);
  return (
    <span className="report-marks">
      {marks.map(({ Icon, label, tone }) => (
        <span key={label} className={`report-mark ${tone}`} title={label}>
          <Icon size={14} aria-label={label} />
        </span>
      ))}
    </span>
  );
}

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/** Porcentagem de tropas perdidas, como no Speed Wars; null quando não havia tropas. */
export function lossPercent(
  counts: Record<string, number>,
  losses: Record<string, number>,
): { percent: number; lost: number; total: number } | null {
  const all = total(counts);
  if (!all) return null;
  const lost = total(losses);
  return { percent: Math.round((lost / all) * 100), lost, total: all };
}

/** Tabela de tropas (e, quando há, de perdas) com o ícone de cada unidade. */
export function TroopTable({
  unitTypes,
  counts,
  losses,
}: {
  unitTypes: { code: string; name: string }[];
  counts: Record<string, number>;
  losses?: Record<string, number> | null;
}) {
  return (
    <div className="table-scroll">
      <table className="legacy-table rally-units">
        <thead>
          <tr>
            <th></th>
            {unitTypes.map((u) => (
              <th key={u.code}>
                <img
                  src={unitIconSrc(u.code)}
                  alt={u.name}
                  title={u.name}
                  loading="lazy"
                  decoding="async"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Quantidade</td>
            {unitTypes.map((u) => (
              <td key={u.code} className="num">
                {numbers.format(counts[u.code] ?? 0)}
              </td>
            ))}
          </tr>
          {losses ? (
            <tr className="loss-row">
              <td>Perdas</td>
              {unitTypes.map((u) => (
                <td key={u.code} className="num">
                  {numbers.format(losses[u.code] ?? 0)}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

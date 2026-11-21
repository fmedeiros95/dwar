import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  HeartHandshake,
  PackageCheck,
  ShieldCheck,
  Shield,
  Swords,
  Trash2,
} from 'lucide-react';
import {
  api,
  type VillageSnapshot,
  type BattleReportView,
  type BattleReportSummary,
  type ReportGroup,
  type ReportsSnapshot,
} from '@dwar/api-client';
import { useGameSearchParams } from '../../../routing.js';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { numbers, completionDate } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

const outcome = {
  won: 'Vitória',
  lost: 'Derrota',
  draw: 'Empate',
};
const roleText = {
  attacker: 'Você atacou',
  defender: 'Você defendeu',
  support: 'Você apoiou',
};
const tabs: { code: ReportGroup; label: string }[] = [
  { code: 'all', label: 'Todos' },
  { code: 'attack', label: 'Ataques' },
  { code: 'defense', label: 'Defesas' },
  { code: 'support', label: 'Apoios' },
];
const groupIcon = { attack: Swords, defense: Shield, support: HeartHandshake } as const;

/** Marcas rápidas de uma linha da lista: o que aconteceu na batalha, sem abrir o relatório. */
function Marks({ report }: { report: BattleReportSummary }) {
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
  ].filter((mark): mark is { Icon: typeof Crown; label: string; tone: string } => !!mark);
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

function ReportList({
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
  onOpen: (id: number) => void;
  onAction: (
    action:
      { type: 'delete'; ids: number[] } | { type: 'read'; ids?: number[]; group?: ReportGroup },
  ) => void;
  onPage: (page: number) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const everyone = data.reports.length > 0 && selected.length === data.reports.length;
  const toggle = (id: number) =>
    setSelected((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return (
    <>
      {data.reports.length ? (
        <>
          <div className="report-tools">
            <label className="report-select-all">
              <input
                type="checkbox"
                checked={everyone}
                onChange={() => setSelected(everyone ? [] : data.reports.map((r) => r.id))}
              />
              Selecionar tudo
            </label>
            <button
              className="button"
              disabled={!selected.length || pending}
              onClick={() => onAction({ type: 'delete', ids: selected })}
            >
              <Trash2 size={14} aria-hidden="true" /> Excluir
              {selected.length ? ` (${selected.length})` : ''}
            </button>
            <button
              className="button"
              disabled={!selected.length || pending}
              onClick={() => onAction({ type: 'read', ids: selected })}
            >
              Marcar como lidos
            </button>
            <button
              className="button"
              disabled={!data.groups[group].unread || pending}
              onClick={() => onAction({ type: 'read', group })}
            >
              Marcar tudo como lido
            </button>
          </div>
          <ul className="report-list">
            {data.reports.map((r) => {
              const Icon = groupIcon[r.group];
              return (
                <li key={r.id} className={`report-item ${r.outcome}${r.read ? '' : ' unread'}`}>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar relatório: ${r.title}`}
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  <button className="report-row" onClick={() => onOpen(r.id)}>
                    <span
                      className="report-dot"
                      aria-label={`${r.read ? 'Lido' : 'Não lido'} · ${outcome[r.outcome]}`}
                    />
                    <Icon size={16} aria-hidden="true" className="report-kind" />
                    <span className="report-title">
                      {r.title}
                      <small>
                        {roleText[r.role]} · {outcome[r.outcome]}
                      </small>
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
            ? 'Nenhum relatório ainda. Batalhas e espionagens aparecem aqui.'
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
const lootCodes = [
  { code: 'wood', label: 'Madeira' },
  { code: 'stone', label: 'Argila' },
  { code: 'iron', label: 'Ferro' },
] as const;

function Troops({
  data,
  label,
  icon,
  counts,
  losses,
}: {
  data: BattleReportView;
  label: string;
  icon: 'attack' | 'defense';
  counts: Record<string, number> | null;
  losses: Record<string, number> | null;
}) {
  return (
    <section className={`report-side ${icon}`} aria-label={label}>
      <h2>
        {icon === 'attack' ? (
          <Swords size={16} aria-hidden="true" />
        ) : (
          <Shield size={16} aria-hidden="true" />
        )}
        {label}
      </h2>
      {counts && losses ? (
        <div className="table-scroll">
          <table className="legacy-table rally-units">
            <thead>
              <tr>
                <th></th>
                {data.unitTypes.map((u) => (
                  <th key={u.code}>
                    <img src={unitIconSrc(u.code)} alt={u.name} title={u.name} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quantidade</td>
                {data.unitTypes.map((u) => (
                  <td key={u.code} className="num">
                    {numbers.format(counts[u.code] ?? 0)}
                  </td>
                ))}
              </tr>
              <tr className="loss-row">
                <td>Perdas</td>
                {data.unitTypes.map((u) => (
                  <td key={u.code} className="num">
                    {numbers.format(losses[u.code] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Nenhuma informação disponível.</p>
      )}
    </section>
  );
}

export function ReportsPanel({ snapshot, clock }: { snapshot: VillageSnapshot; clock: number }) {
  const [params, setParams] = useGameSearchParams(),
    client = useQueryClient();
  const id = Number(params.get('id')),
    page = Math.max(1, Number(params.get('page')) || 1);
  const requested = params.get('group');
  const group: ReportGroup = tabs.some((tab) => tab.code === requested)
    ? (requested as ReportGroup)
    : 'all';
  const list = useQuery({
    queryKey: ['reports', snapshot.world.id, page, group],
    queryFn: () => api.reports(snapshot.world.id, page, undefined, group),
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });
  const action = useMutation({
    mutationFn: (input: Parameters<typeof api.reportAction>[1]) =>
      api.reportAction(snapshot.world.id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reports', snapshot.world.id] });
      void client.invalidateQueries({ queryKey: ['report', snapshot.world.id] });
    },
  });
  const report = useQuery({
    queryKey: ['report', snapshot.world.id, id],
    enabled: id > 0,
    queryFn: async () => {
      const result = await api.report(snapshot.world.id, id);
      void client.invalidateQueries({ queryKey: ['reports', snapshot.world.id] });
      return result;
    },
  });
  function go(extra: Record<string, string | number> = {}) {
    setParams({
      village: snapshot.village.id,
      screen: 'reports',
      ...(group === 'all' ? {} : { group }),
      ...extra,
    });
  }
  function target(type: 'player' | 'village', targetId: number) {
    setParams({
      village: snapshot.village.id,
      screen: type === 'player' ? 'info_player' : 'info_village',
      id: targetId,
    });
  }
  const data = report.data,
    error = report.error ?? list.error ?? action.error;
  const buildingName = (code: string) =>
    snapshot.buildings.find((b) => b.code === code)?.name ?? code;
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Swords size={22} aria-hidden="true" /> Relatórios
        </h1>
        {id > 0 ? (
          <button className="button" onClick={() => go()}>
            <ChevronLeft size={15} aria-hidden="true" /> Todos os relatórios
          </button>
        ) : null}
      </header>
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
      {id > 0 ? (
        data ? (
          <div className="report-detail">
            <div className="report-detail-tools">
              <button
                className="button"
                disabled={!data.previousId}
                onClick={() => go({ id: data.previousId! })}
              >
                <ChevronLeft size={15} aria-hidden="true" /> Mais antigo
              </button>
              <button
                className="button"
                disabled={!data.nextId}
                onClick={() => go({ id: data.nextId! })}
              >
                Mais novo <ChevronRight size={15} aria-hidden="true" />
              </button>
              <button
                className="button"
                disabled={action.isPending}
                onClick={() =>
                  action.mutate(
                    { type: 'delete', ids: [data.id] },
                    { onSuccess: () => go({ id: data.nextId ?? data.previousId ?? 0 }) },
                  )
                }
              >
                <Trash2 size={14} aria-hidden="true" /> Excluir
              </button>
            </div>
            <div className={`report-banner ${data.outcome}`}>
              <strong>{data.title}</strong>
              <span>
                {roleText[data.role]} · {outcome[data.outcome]} ·{' '}
                {completionDate(data.occurredAt, clock)}
              </span>
              <Marks report={data} />
            </div>
            <dl className="report-parties">
              <div>
                <dt>Atacante</dt>
                <dd>
                  {data.from.playerId ? (
                    <button
                      className="text-button"
                      onClick={() => target('player', data.from.playerId!)}
                    >
                      {data.from.username}
                    </button>
                  ) : (
                    data.from.username
                  )}
                  <small>
                    <button
                      className="text-button"
                      onClick={() => target('village', data.from.villageId)}
                    >
                      {data.from.name} ({data.from.x}|{data.from.y})
                    </button>
                  </small>
                </dd>
              </div>
              <div>
                <dt>Defensor</dt>
                <dd>
                  {data.to.playerId ? (
                    <button
                      className="text-button"
                      onClick={() => target('player', data.to.playerId!)}
                    >
                      {data.to.username}
                    </button>
                  ) : (
                    data.to.username
                  )}
                  <small>
                    <button
                      className="text-button"
                      onClick={() => target('village', data.to.villageId)}
                    >
                      {data.to.name} ({data.to.x}|{data.to.y})
                    </button>
                  </small>
                </dd>
              </div>
              {data.morale !== null ? (
                <div>
                  <dt>Moral do atacante</dt>
                  <dd>{data.morale}%</dd>
                </div>
              ) : null}
              {data.luck !== null ? (
                <div>
                  <dt>Sorte</dt>
                  <dd>{data.luck}%</dd>
                </div>
              ) : null}
            </dl>
            {data.role === 'support' ? (
              <Troops
                data={data}
                label="Suas tropas de apoio"
                icon="defense"
                counts={data.supportTroops}
                losses={data.supportLosses}
              />
            ) : (
              <>
                <Troops
                  data={data}
                  label="Atacante"
                  icon="attack"
                  counts={data.attacker}
                  losses={data.attackerLosses}
                />
                <Troops
                  data={data}
                  label="Defensor"
                  icon="defense"
                  counts={data.defender}
                  losses={data.defenderLosses}
                />
              </>
            )}
            {data.loot ? (
              <section className="report-side" aria-label="Saque">
                <h2>Saque</h2>
                <ul className="bcard-cost">
                  {lootCodes.map(({ code, label }) => (
                    <li key={code}>
                      <ResourceIcon code={code} label={label} />
                      {numbers.format(data.loot![code])}
                    </li>
                  ))}
                  <li className="bcard-time">
                    {numbers.format(Object.values(data.loot).reduce((a, b) => a + b, 0))}/
                    {numbers.format(data.lootCapacity ?? 0)}
                  </li>
                </ul>
              </section>
            ) : null}
            {(data.wall && data.wall.before !== data.wall.after) ||
            data.demolition ||
            data.loyalty ? (
              <ul className="report-effects">
                {data.wall && data.wall.before !== data.wall.after ? (
                  <li>
                    Muralha: nível {data.wall.before} → {data.wall.after}
                  </li>
                ) : null}
                {data.demolition ? (
                  <li>
                    {buildingName(data.demolition.code)}: nível {data.demolition.before} →{' '}
                    {data.demolition.after}
                  </li>
                ) : null}
                {data.loyalty ? (
                  <li>
                    Lealdade: {data.loyalty.before} → {Math.max(0, data.loyalty.after)}
                    {data.loyalty.conquered
                      ? '. A aldeia foi conquistada; lealdade reiniciada em 25. O saque permanece na aldeia conquistada.'
                      : ''}
                  </li>
                ) : null}
              </ul>
            ) : null}
            {data.intel?.resources ? (
              <section className="report-side" aria-label="Recursos espionados">
                <h2>Recursos espionados</h2>
                <ul className="bcard-cost">
                  {lootCodes.map(({ code, label }) => (
                    <li key={code}>
                      <ResourceIcon code={code} label={label} />
                      {numbers.format(data.intel!.resources![code])}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {data.intel?.buildings ? (
              <section className="report-side" aria-label="Edifícios espionados">
                <h2>Edifícios espionados</h2>
                <ul className="report-chips">
                  {Object.entries(data.intel.buildings).map(([code, level]) => (
                    <li key={code}>
                      {buildingName(code)} <strong>{level}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {data.intel?.outsideTroops ? (
              <section className="report-side" aria-label="Tropas fora da aldeia">
                <h2>Tropas fora da aldeia</h2>
                <ul className="report-chips">
                  {data.unitTypes.map((u) => (
                    <li key={u.code}>
                      {u.name}{' '}
                      <strong>{numbers.format(data.intel!.outsideTroops![u.code] ?? 0)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="muted">Carregando relatório…</p>
        )
      ) : list.data ? (
        <>
          <nav className="report-tabs" aria-label="Tipo de relatório">
            {tabs.map((tab) => (
              <button
                key={tab.code}
                className={tab.code === group ? 'active' : undefined}
                aria-current={tab.code === group ? 'page' : undefined}
                onClick={() =>
                  setParams({
                    village: snapshot.village.id,
                    screen: 'reports',
                    ...(tab.code === 'all' ? {} : { group: tab.code }),
                  })
                }
              >
                {tab.label}
                {list.data.groups[tab.code].unread ? (
                  <span className="report-count">{list.data.groups[tab.code].unread}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <ReportList
            key={`${group}-${list.data.page}`}
            data={list.data}
            clock={clock}
            group={group}
            pending={action.isPending}
            onOpen={(reportId) => go({ id: reportId })}
            onAction={(input) => action.mutate(input)}
            onPage={(next) => go({ page: next })}
          />
        </>
      ) : (
        <p className="muted">Carregando relatórios…</p>
      )}
    </div>
  );
}

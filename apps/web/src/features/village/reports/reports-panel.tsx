import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Shield, Swords } from 'lucide-react';
import { api, type VillageSnapshot, type BattleReportView } from '@dwar/api-client';
import { useGameSearchParams } from '../../../routing.js';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { numbers, completionDate } from '../shared/index.js';
import { unitIconSrc } from '../../../components/unit-icon.js';

const outcome = {
  attacker: 'Vitória do atacante',
  defender: 'Vitória do defensor',
  draw: 'Empate',
};
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
  const list = useQuery({
    queryKey: ['reports', snapshot.world.id, page],
    queryFn: () => api.reports(snapshot.world.id, page),
    refetchInterval: 5000,
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
    setParams({ village: snapshot.village.id, screen: 'reports', ...extra });
  }
  const data = report.data,
    error = report.error ?? list.error;
  const buildingName = (code: string) => snapshot.buildings.find((b) => b.code === code)?.name ?? code;
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
            <div className={`report-banner ${data.winner}`}>
              <strong>{data.title}</strong>
              <span>
                {outcome[data.winner]} · {completionDate(data.occurredAt, clock)}
              </span>
            </div>
            <dl className="report-parties">
              <div>
                <dt>Atacante</dt>
                <dd>
                  {data.from.username}
                  <small>
                    {data.from.name} ({data.from.x}|{data.from.y})
                  </small>
                </dd>
              </div>
              <div>
                <dt>Defensor</dt>
                <dd>
                  {data.to.username}
                  <small>
                    {data.to.name} ({data.to.x}|{data.to.y})
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
                      {u.name} <strong>{numbers.format(data.intel!.outsideTroops![u.code] ?? 0)}</strong>
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
          {list.data.reports.length ? (
            <ul className="report-list">
              {list.data.reports.map((r) => (
                <li key={r.id}>
                  <button
                    className={`report-row ${r.winner}${r.read ? '' : ' unread'}`}
                    onClick={() => go({ id: r.id })}
                  >
                    <span className="report-dot" aria-label={r.read ? 'Lido' : 'Não lido'} />
                    <span className="report-title">{r.title}</span>
                    <span className="report-badge">{outcome[r.winner]}</span>
                    <time dateTime={r.occurredAt}>{completionDate(r.occurredAt, clock)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              <Swords size={28} aria-hidden="true" />
              Nenhum relatório ainda. Batalhas e espionagens aparecem aqui.
            </p>
          )}
          {list.data.pageCount > 1 ? (
            <nav className="pager" aria-label="Páginas de relatórios">
              <button
                className="button"
                disabled={list.data.page <= 1}
                onClick={() => go({ page: list.data!.page - 1 })}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span>
                {list.data.page} / {list.data.pageCount}
              </span>
              <button
                className="button"
                disabled={list.data.page >= list.data.pageCount}
                onClick={() => go({ page: list.data!.page + 1 })}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <p className="muted">Carregando relatórios…</p>
      )}
    </div>
  );
}

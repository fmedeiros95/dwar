import { useQuery, useQueryClient } from '@tanstack/react-query';
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
function Troops({
  data,
  label,
  counts,
  losses,
}: {
  data: BattleReportView;
  label: string;
  counts: Record<string, number> | null;
  losses: Record<string, number> | null;
}) {
  return (
    <>
      <h2>{label}</h2>
      {counts && losses ? (
        <div className="table-scroll">
          <table className="legacy-table rally-units">
            <thead>
              <tr>
                <th>Unidades</th>
                {data.unitTypes.map((u) => (
                  <th key={u.code}>
                    <img src={unitIconSrc(u.code)} alt={u.name} title={u.name} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quantidade:</td>
                {data.unitTypes.map((u) => (
                  <td key={u.code}>{numbers.format(counts[u.code] ?? 0)}</td>
                ))}
              </tr>
              <tr>
                <td>Perdas:</td>
                {data.unitTypes.map((u) => (
                  <td key={u.code}>{numbers.format(losses[u.code] ?? 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p>Nenhuma informação disponível.</p>
      )}
    </>
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
  return (
    <div className="legacy-content">
      <h1>Relatórios</h1>
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
      {id > 0 ? (
        <>
          <p>
            <button className="text-button" onClick={() => go()}>
              » Todos os relatórios
            </button>
          </p>
          {data ? (
            <>
              <h2>{data.title}</h2>
              <p>
                {completionDate(data.occurredAt, clock)} · {outcome[data.winner]}
              </p>
              <table className="legacy-table">
                <tbody>
                  <tr>
                    <th>Atacante:</th>
                    <td>
                      {data.from.username} — {data.from.name} ({data.from.x}|{data.from.y})
                    </td>
                  </tr>
                  <tr>
                    <th>Defensor:</th>
                    <td>
                      {data.to.username} — {data.to.name} ({data.to.x}|{data.to.y})
                    </td>
                  </tr>
                  {data.morale !== null ? (
                    <tr>
                      <td>Moral do atacante:</td>
                      <td>{data.morale}%</td>
                    </tr>
                  ) : null}
                  {data.luck !== null ? (
                    <tr>
                      <td>Sorte:</td>
                      <td>{data.luck}%</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {data.role === 'support' ? (
                <Troops
                  data={data}
                  label="Suas tropas de apoio"
                  counts={data.supportTroops}
                  losses={data.supportLosses}
                />
              ) : (
                <>
                  <Troops
                    data={data}
                    label="Atacante"
                    counts={data.attacker}
                    losses={data.attackerLosses}
                  />
                  <Troops
                    data={data}
                    label="Defensor"
                    counts={data.defender}
                    losses={data.defenderLosses}
                  />
                </>
              )}
              {data.loot ? (
                <table className="legacy-table">
                  <tbody>
                    <tr>
                      <th>Saque:</th>
                      <td>
                        {(['wood', 'stone', 'iron'] as const).map((c) => (
                          <span className="resource-amount" key={c}>
                            <ResourceIcon
                              code={c}
                              label={c === 'wood' ? 'Madeira' : c === 'stone' ? 'Argila' : 'Ferro'}
                            />
                            {numbers.format(data.loot![c])}
                          </span>
                        ))}
                      </td>
                      <td>
                        {numbers.format(Object.values(data.loot).reduce((a, b) => a + b, 0))}/
                        {numbers.format(data.lootCapacity ?? 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              {data.wall && data.wall.before !== data.wall.after ? (
                <p>
                  Muralha: nível {data.wall.before} → {data.wall.after}.
                </p>
              ) : null}
              {data.demolition ? (
                <p>
                  {snapshot.buildings.find((b) => b.code === data.demolition!.code)?.name}: nível{' '}
                  {data.demolition.before} → {data.demolition.after}.
                </p>
              ) : null}
              {data.loyalty ? (
                <p>
                  Lealdade: {data.loyalty.before} → {Math.max(0, data.loyalty.after)}.{' '}
                  {data.loyalty.conquered
                    ? 'A aldeia foi conquistada; lealdade reiniciada em 25. O saque permanece na aldeia conquistada.'
                    : ''}
                </p>
              ) : null}
              {data.intel?.resources ? (
                <>
                  <h2>Recursos espionados</h2>
                  <table className="legacy-table">
                    <tbody>
                      <tr>
                        {(['wood', 'stone', 'iron'] as const).map((c) => (
                          <td key={c}>
                            <ResourceIcon
                              code={c}
                              label={c === 'wood' ? 'Madeira' : c === 'stone' ? 'Argila' : 'Ferro'}
                            />
                            {numbers.format(data.intel!.resources![c])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : null}
              {data.intel?.buildings ? (
                <>
                  <h2>Edifícios espionados</h2>
                  <table className="legacy-table">
                    <tbody>
                      {Object.entries(data.intel.buildings).map(([code, level]) => (
                        <tr key={code}>
                          <td>{snapshot.buildings.find((b) => b.code === code)?.name ?? code}</td>
                          <td>{level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
              {data.intel?.outsideTroops ? (
                <>
                  <h2>Tropas fora da aldeia</h2>
                  <table className="legacy-table">
                    <tbody>
                      {data.unitTypes.map((u) => (
                        <tr key={u.code}>
                          <td>{u.name}</td>
                          <td>{numbers.format(data.intel!.outsideTroops![u.code] ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </>
          ) : (
            <p>Carregando relatório…</p>
          )}
        </>
      ) : list.data ? (
        <>
          <table className="legacy-table">
            <thead>
              <tr>
                <th>Assunto</th>
                <th>Resultado</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {list.data.reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="text-button" onClick={() => go({ id: r.id })}>
                      {r.read ? '' : '● '}
                      {r.title}
                    </button>
                  </td>
                  <td>{outcome[r.winner]}</td>
                  <td>{completionDate(r.occurredAt, clock)}</td>
                </tr>
              ))}
              {!list.data.reports.length ? (
                <tr>
                  <td colSpan={3}>Nenhum relatório.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p>
            <button
              disabled={list.data.page <= 1}
              onClick={() => go({ page: list.data!.page - 1 })}
            >
              Anterior
            </button>{' '}
            {list.data.page}/{list.data.pageCount}{' '}
            <button
              disabled={list.data.page >= list.data.pageCount}
              onClick={() => go({ page: list.data!.page + 1 })}
            >
              Próxima
            </button>
          </p>
        </>
      ) : (
        <p>Carregando relatórios…</p>
      )}
    </div>
  );
}

import type { IncomingCommand, IncomingOverview, VillageSnapshot } from '@dwar/api-client';
import { HeartHandshake, ShieldCheck } from 'lucide-react';
import { EmptyState } from '../../../components/empty-state.js';
import { numbers, duration } from '../shared/index.js';

function villageLabel(village: IncomingCommand['from']) {
  return `${village.name} (${village.x}|${village.y})`;
}

export function IncomingsPanel({
  snapshot,
  data,
  clock,
  mode,
}: {
  snapshot: VillageSnapshot;
  data: IncomingOverview | undefined;
  clock: number;
  mode: 'attack' | 'support';
}) {
  const rows = data?.commands.filter((item) => item.kind === mode) ?? [];
  const label = mode === 'attack' ? 'Ataques recebidos' : 'Apoios recebidos';
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>{label}</h1>
        <span className="muted">Todas as aldeias</span>
      </header>
      {data === undefined ? (
        <p className="muted">Carregando comandos…</p>
      ) : rows.length === 0 ? (
        mode === 'attack' ? (
          <EmptyState icon={<ShieldCheck size={30} />} title="Nenhum ataque a caminho">
            Suas aldeias estão em paz. Ataques inimigos aparecem aqui com a hora de chegada.
          </EmptyState>
        ) : (
          <EmptyState icon={<HeartHandshake size={30} />} title="Nenhum apoio a caminho">
            Tropas enviadas por aliados para defender suas aldeias aparecem aqui.
          </EmptyState>
        )
      ) : (
        <div className="table-scroll">
          <table className="legacy-table incoming-table">
            <thead>
              <tr>
                <th>Comando</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Jogador</th>
                <th>Chegada</th>
                <th>Em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const remaining = Math.max(0, (new Date(item.endsAt).getTime() - clock) / 1000);
                return (
                  <tr key={item.id}>
                    <td>{item.kind === 'attack' ? 'Ataque' : 'Apoio'}</td>
                    <td>{villageLabel(item.from)}</td>
                    <td>
                      {villageLabel(item.to)}
                      {item.to.id === snapshot.village.id ? ' · atual' : ''}
                    </td>
                    <td>{item.sender}</td>
                    <td>{new Date(item.endsAt).toLocaleString('pt-BR')}</td>
                    <td>
                      {numbers.format(Math.ceil(remaining))}s ({duration(remaining)})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

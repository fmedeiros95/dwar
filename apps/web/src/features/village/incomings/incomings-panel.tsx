import type { IncomingCommand, IncomingOverview, VillageSnapshot } from '@dwar/api-client';
import { HeartHandshake, Shield, ShieldCheck, Swords } from 'lucide-react';
import { EmptyState } from '../../../components/empty-state.js';
import { completionDate, duration } from '../shared/index.js';

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
        <ul className="incoming-list">
          {rows
            .slice()
            .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
            .map((item) => {
              const remaining = Math.max(0, (new Date(item.endsAt).getTime() - clock) / 1000);
              const attack = item.kind === 'attack';
              return (
                <li key={item.id} className="incoming-card" data-kind={item.kind}>
                  <span className="incoming-kind">
                    {attack ? (
                      <Swords size={18} aria-hidden="true" />
                    ) : (
                      <Shield size={18} aria-hidden="true" />
                    )}
                    {attack ? 'Ataque' : 'Apoio'}
                  </span>
                  <div className="incoming-when">
                    <strong>{duration(remaining)}</strong>
                    <small>chega {completionDate(item.endsAt, clock)}</small>
                  </div>
                  <dl>
                    <div>
                      <dt>Para</dt>
                      <dd>
                        {villageLabel(item.to)}
                        {item.to.id === snapshot.village.id ? <em> · aldeia atual</em> : null}
                      </dd>
                    </div>
                    <div>
                      <dt>De</dt>
                      <dd>
                        {item.sender} · {villageLabel(item.from)}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

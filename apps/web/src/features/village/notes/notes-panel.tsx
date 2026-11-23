import { LoadState } from '../../../components/load-state.js';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { api, type MessageTarget, type VillageSnapshot } from '@dwar/api-client';
import { targetScreen } from '../shared/index.js';
import { Icon } from '../../../components/icons.js';
import { useGameSearchParams } from '../../../routing.js';
import { NoteBox } from './note-box.js';

export function NotesPanel({ snapshot }: { snapshot: VillageSnapshot }) {
  const [params, setParams] = useGameSearchParams();
  const worldId = snapshot.world.id;
  const tab = params.get('tab') === 'villages' ? 'villages' : 'general',
    noteVillage = Number(params.get('note')) || 0;
  const overview = useQuery({
    queryKey: ['notes', worldId],
    queryFn: () => api.notes(worldId),
    enabled: tab === 'villages',
  });
  function go(extra: Record<string, string | number> = {}) {
    setParams({ village: snapshot.village.id, screen: 'notes', ...extra });
  }
  function onTarget(type: MessageTarget, id: number) {
    setParams({
      village: snapshot.village.id,
      screen: targetScreen[type],
      id,
    });
  }
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Icon name="notes" size={22} /> Notas
        </h1>
      </header>
      <nav className="report-tabs" aria-label="Tipo de nota">
        <button
          className={tab === 'general' ? 'active' : undefined}
          aria-current={tab === 'general' ? 'page' : undefined}
          onClick={() => go()}
        >
          Geral
        </button>
        <button
          className={tab === 'villages' ? 'active' : undefined}
          aria-current={tab === 'villages' ? 'page' : undefined}
          onClick={() => go({ tab: 'villages' })}
        >
          Aldeias
          {overview.data?.villages.length ? (
            <span className="report-count">{overview.data.villages.length}</span>
          ) : null}
        </button>
      </nav>
      {tab === 'general' ? (
        <NoteBox
          worldId={worldId}
          onTarget={onTarget}
          emptyText="Nenhuma nota ainda. Use este espaço para planos, alvos e lembretes."
        />
      ) : noteVillage ? (
        <>
          <button className="button note-back" onClick={() => go({ tab: 'villages' })}>
            <ChevronLeft size={15} aria-hidden="true" /> Todas as notas de aldeias
          </button>
          <NoteBox
            key={noteVillage}
            worldId={worldId}
            villageId={noteVillage}
            onTarget={onTarget}
            emptyText="Nenhuma nota sobre esta aldeia ainda."
          />
        </>
      ) : (
        <>
          <p className="muted note-hint">
            Anote o que sabe sobre uma aldeia (defesa, horários, planos). Também dá para escrever a
            nota direto na página de informações da aldeia.
          </p>
          <button
            className="button"
            onClick={() => go({ tab: 'villages', note: snapshot.village.id })}
          >
            Nota da aldeia atual ({snapshot.village.x}|{snapshot.village.y})
          </button>
          {overview.data?.villages.length ? (
            <ul className="note-list">
              {overview.data.villages.map((row) => (
                <li key={row.villageId}>
                  <button onClick={() => go({ tab: 'villages', note: row.villageId })}>
                    <strong>
                      {row.name} ({row.x}|{row.y})
                    </strong>
                    <span>{row.excerpt}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : overview.data ? (
            <p className="empty-state">Nenhuma aldeia com nota.</p>
          ) : (
            <LoadState query={overview} loading="Carregando notas…" />
          )}
        </>
      )}
    </div>
  );
}

import { LoadState } from '../../../components/load-state.js';
import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { useQuery } from '@tanstack/react-query';

import { api, type VillageSnapshot } from '@dwar/api-client';
import { Icon } from '../../../components/icons.js';
import { numbers } from '../shared/index.js';
import { PanelCard } from '../shared/panel-head.js';
import { NoteBox } from '../notes/index.js';

export function PublicVillageScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const [params, setParams] = useSearchParams(),
    targetId = Number(params.get('id'));
  const target = useQuery({
    queryKey: ['public-village', snapshot.world.id, snapshot.village.id, targetId],
    queryFn: () => api.publicVillage(snapshot.world.id, snapshot.village.id, targetId),
    enabled: !!targetId,
  });
  const reports = useQuery({
    queryKey: ['village-reports', snapshot.world.id, targetId],
    queryFn: () => api.reports(snapshot.world.id, 1, targetId),
    enabled: !!targetId,
    refetchInterval: 5000,
  });
  const data = target.data;
  if (!data)
    return (
      <div className="legacy-content">
        {targetId ? (
          <LoadState query={target} loading="Carregando aldeia…" message />
        ) : (
          <p role="status">Aldeia não encontrada.</p>
        )}
      </div>
    );
  function go(screen: string, extra: Record<string, string | number>) {
    setParams({ village: snapshot.village.id, screen, ...extra });
  }
  const coords = { x: String(data.x), y: String(data.y) };
  const list = reports.data?.reports.slice(0, 10) ?? [];
  return (
    <div className="legacy-content public-page">
      <header className="public-heading">
        <Icon name="village" size={34} />
        <div>
          <strong>{data.name}</strong>
          <small>
            {data.x}|{data.y} · K{Math.floor(data.y / 100)}
            {Math.floor(data.x / 100)}
          </small>
        </div>
      </header>
      <ul className="confirm-facts">
        <li>
          <small>Pontos</small>
          <strong>{numbers.format(data.points)}</strong>
        </li>
        <li>
          <small>Jogador</small>
          {data.playerId ? (
            <button
              className="text-button"
              onClick={() => go('info_player', { id: data.playerId! })}
            >
              {data.username}
            </button>
          ) : (
            <strong>Aldeia abandonada</strong>
          )}
        </li>
        <li>
          <small>Tribo</small>
          {data.tribe ? (
            <button
              className="text-button"
              onClick={() => go('info_tribe', { id: data.tribe!.id })}
            >
              {data.tribe.name} <span className="tribe-tag static">{data.tribe.tag}</span>
            </button>
          ) : (
            <strong>—</strong>
          )}
        </li>
      </ul>
      <div className="public-actions">
        <button className="button" onClick={() => go('map', coords)}>
          <Icon name="map" size={16} /> Centralizar mapa
        </button>
        <button className="button" onClick={() => go('place', { mode: 'send', ...coords })}>
          <Icon name="sword" size={16} /> Enviar tropas
        </button>
        {data.id !== snapshot.village.id ? (
          <button className="button" onClick={() => go('market', { mode: 'send', ...coords })}>
            <Icon name="coin" size={16} /> Enviar recursos
          </button>
        ) : null}
      </div>
      <div className="public-columns">
        <PanelCard
          title="Últimos relatórios"
          icon={<Icon name="reports" size={18} />}
          aside={list.length ? <span className="panel-count">{list.length}</span> : undefined}
        >
          {list.length ? (
            <ul className="public-list">
              {list.map((report) => (
                <li key={`${report.source}:${report.id}`}>
                  <button
                    className="text-button"
                    onClick={() =>
                      go('reports', {
                        id: report.id,
                        ...(report.source === 'notice' ? { kind: 'notice' } : {}),
                      })
                    }
                  >
                    {report.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-panel" role={reports.error ? 'alert' : 'status'}>
              {reports.error?.message ??
                (reports.isPending
                  ? 'Carregando relatórios…'
                  : 'Nenhum relatório sobre esta aldeia.')}
            </p>
          )}
        </PanelCard>
        <PanelCard title="Sua nota" icon={<Icon name="notes" size={18} />}>
          <NoteBox
            worldId={snapshot.world.id}
            villageId={targetId}
            onTarget={(type, id) => go(type === 'player' ? 'info_player' : 'info_village', { id })}
            emptyText="Nenhuma nota ainda. Só você vê o que escrever aqui."
          />
        </PanelCard>
      </div>
    </div>
  );
}

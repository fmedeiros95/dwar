import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { useQuery } from '@tanstack/react-query';

import { api, type VillageSnapshot } from '@dwar/api-client';
import { numbers } from '../shared/index.js';
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
        <p role={target.error ? 'alert' : 'status'}>
          {target.error?.message ?? (targetId ? 'Carregando aldeia…' : 'Aldeia não encontrada.')}
        </p>
      </div>
    );
  function go(screen: string, extra: Record<string, string | number>) {
    setParams({ village: snapshot.village.id, screen, ...extra });
  }
  return (
    <div className="legacy-content public-village-layout">
      <table className="legacy-table">
        <thead>
          <tr>
            <th colSpan={2}>{data.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Coordenadas:</td>
            <td>
              {data.x}|{data.y}
            </td>
          </tr>
          <tr>
            <td>Pontos:</td>
            <td>{numbers.format(data.points)}</td>
          </tr>
          <tr>
            <td>Jogador:</td>
            <td>
              {data.playerId ? (
                <button
                  className="text-button"
                  onClick={() => go('info_player', { id: data.playerId! })}
                >
                  {data.username}
                </button>
              ) : (
                'Aldeia abandonada'
              )}
            </td>
          </tr>
          <tr>
            <td>Tribo:</td>
            <td>—</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <button
                className="text-button"
                onClick={() => go('map', { x: String(data.x), y: String(data.y) })}
              >
                » Centralizar mapa
              </button>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <button
                className="text-button"
                onClick={() => go('place', { mode: 'send', x: String(data.x), y: String(data.y) })}
              >
                » Enviar tropas
              </button>
            </td>
          </tr>
          {data.id !== snapshot.village.id ? (
            <tr>
              <td colSpan={2}>
                <button
                  className="text-button"
                  onClick={() =>
                    go('market', { mode: 'send', x: String(data.x), y: String(data.y) })
                  }
                >
                  » Enviar recursos
                </button>
              </td>
            </tr>
          ) : null}
          <tr>
            <th colSpan={2}>&nbsp;</th>
          </tr>
        </tbody>
      </table>
      <table className="legacy-table">
        <thead>
          <tr>
            <th>Últimos 10 relatórios sobre esta aldeia:</th>
          </tr>
        </thead>
        <tbody>
          {reports.data?.reports.slice(0, 10).map((report) => (
            <tr key={`${report.source}:${report.id}`}>
              <td>
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
              </td>
            </tr>
          ))}
          {!reports.data?.reports.length ? (
            <tr>
              <td>
                {reports.error?.message ??
                  (reports.isPending ? 'Carregando relatórios…' : 'Nenhum relatório disponível.')}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="note-section">
        <h2 className="note-heading">Sua nota sobre esta aldeia</h2>
        <NoteBox
          worldId={snapshot.world.id}
          villageId={targetId}
          onTarget={(type, id) => go(type === 'player' ? 'info_player' : 'info_village', { id })}
          emptyText="Nenhuma nota ainda. Só você vê o que escrever aqui."
        />
      </div>
    </div>
  );
}

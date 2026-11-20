import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MapSnapshot, type MapAction, type VillageSnapshot } from '@dwar/api-client';

export function MapOptions({ snapshot, map }: { snapshot: VillageSnapshot; map: MapSnapshot }) {
  const client = useQueryClient();
  const action = useMutation({
    mutationFn: (input: MapAction) => api.mapAction(snapshot.world.id, snapshot.village.id, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['map-options', snapshot.world.id] }),
        client.invalidateQueries({ queryKey: ['map', snapshot.world.id] }),
      ]);
    },
  });
  return (
    <div className="map-options-layout">
      <form
        key={JSON.stringify(map.settings)}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          action.mutate({
            type: 'settings',
            settings: {
              width: Number(form.get('width')),
              height: Number(form.get('height')),
              minimapSize: Number(form.get('minimapSize')),
              contextMenu: form.has('contextMenu'),
              popup: form.has('popup'),
            },
          });
        }}
      >
        <table className="legacy-table">
          <thead>
            <tr>
              <th colSpan={2}>Mostrar opções</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2}>
                <label>
                  <input
                    name="contextMenu"
                    type="checkbox"
                    defaultChecked={map.settings.contextMenu}
                  />{' '}
                  Ativar menu de contexto
                </label>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <label>
                  <input name="popup" type="checkbox" defaultChecked={map.settings.popup} /> Mostrar
                  popup
                </label>
              </td>
            </tr>
            <tr>
              <td>Tamanho do mapa:</td>
              <td>
                <select name="width" aria-label="Largura do mapa" defaultValue={map.settings.width}>
                  {Array.from({ length: 27 }, (_, i) => i + 4).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>{' '}
                ×{' '}
                <select
                  name="height"
                  aria-label="Altura do mapa"
                  defaultValue={map.settings.height}
                >
                  {Array.from({ length: 27 }, (_, i) => i + 4).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="minimap-size">Tamanho do minimapa:</label>
              </td>
              <td>
                <select
                  id="minimap-size"
                  name="minimapSize"
                  defaultValue={map.settings.minimapSize}
                >
                  {Array.from({ length: 21 }, (_, i) => 20 + i * 5).map((n) => (
                    <option key={n} value={n}>
                      {n} × {n}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <button disabled={action.isPending}>Salvar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
      <div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            action.mutate({
              type: 'mark',
              username: String(form.get('username')),
              color: String(form.get('color')),
            });
          }}
        >
          <table className="legacy-table">
            <thead>
              <tr>
                <th colSpan={3}>Marcar jogador</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <label htmlFor="map-mark-player">Jogador:</label>
                </td>
                <td>
                  <input id="map-mark-player" name="username" maxLength={24} required />
                </td>
                <td rowSpan={2}>
                  <button disabled={action.isPending}>OK</button>
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="map-mark-color">Cor:</label>
                </td>
                <td>
                  <input id="map-mark-color" name="color" type="color" defaultValue="#ff0000" />
                </td>
              </tr>
            </tbody>
          </table>
        </form>
        <table className="legacy-table">
          <thead>
            <tr>
              <th colSpan={3}>Jogadores marcados</th>
            </tr>
          </thead>
          <tbody>
            {map.marks.map((mark) => (
              <tr key={mark.playerId}>
                <td className="map-legend-swatch" style={{ background: mark.color }} />
                <td>{mark.username}</td>
                <td>
                  <button
                    disabled={action.isPending}
                    onClick={() => action.mutate({ type: 'unmark', playerId: mark.playerId })}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {!map.marks.length ? (
              <tr>
                <td colSpan={3}>Nenhuma marcação encontrada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {action.error ? (
        <p className="error" role="alert">
          {action.error.message}
        </p>
      ) : null}
    </div>
  );
}

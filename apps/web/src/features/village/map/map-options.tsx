import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MapSnapshot, type MapAction, type VillageSnapshot } from '@dwar/api-client';

const toggles = [
  { name: 'contextMenu', label: 'Ativar menu de contexto' },
  { name: 'popup', label: 'Mostrar popup' },
  { name: 'popupUnits', label: 'Mostrar as tropas nas suas aldeias' },
  { name: 'popupTimes', label: 'Mostrar o tempo de viagem das unidades' },
  { name: 'reportDots', label: 'Mostrar o resultado do último ataque ao lado das aldeias' },
] as const;
const sizes = Array.from({ length: 27 }, (_, i) => i + 4);

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
              popupUnits: form.has('popupUnits'),
              reportDots: form.has('reportDots'),
              popupTimes: form.has('popupTimes'),
            },
          });
        }}
      >
        <h2>Mostrar no mapa</h2>
        {toggles.map(({ name, label }) => (
          <label key={name} className="map-toggle">
            <input name={name} type="checkbox" defaultChecked={map.settings[name]} /> {label}
          </label>
        ))}
        <div className="map-field">
          <span>Tamanho do mapa</span>
          <span>
            <select name="width" aria-label="Largura do mapa" defaultValue={map.settings.width}>
              {sizes.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>{' '}
            ×{' '}
            <select name="height" aria-label="Altura do mapa" defaultValue={map.settings.height}>
              {sizes.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </span>
        </div>
        <div className="map-field">
          <label htmlFor="minimap-size">Tamanho do minimapa</label>
          <select id="minimap-size" name="minimapSize" defaultValue={map.settings.minimapSize}>
            {Array.from({ length: 21 }, (_, i) => 20 + i * 5).map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </div>
        <button disabled={action.isPending}>Salvar</button>
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
          <h2>Marcar jogador</h2>
          <div className="map-field">
            <label htmlFor="map-mark-player">Jogador</label>
            <input id="map-mark-player" name="username" maxLength={24} required />
          </div>
          <div className="map-field">
            <label htmlFor="map-mark-color">Cor</label>
            <input id="map-mark-color" name="color" type="color" defaultValue="#ff0000" />
          </div>
          <button disabled={action.isPending}>Marcar</button>
        </form>
        <h2>Jogadores marcados</h2>
        {map.marks.length ? (
          <ul className="map-marks">
            {map.marks.map((mark) => (
              <li key={mark.playerId}>
                <i style={{ background: mark.color }} aria-hidden="true" />
                <span>{mark.username}</span>
                <button
                  className="button"
                  disabled={action.isPending}
                  aria-label={`Remover a marca de ${mark.username}`}
                  onClick={() => action.mutate({ type: 'unmark', playerId: mark.playerId })}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma marcação encontrada.</p>
        )}
      </div>
      {action.error ? (
        <p className="error" role="alert">
          {action.error.message}
        </p>
      ) : null}
    </div>
  );
}

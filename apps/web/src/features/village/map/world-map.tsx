import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { useState, type FormEvent, type PointerEvent } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  api,
  type MapSnapshot,
  type MapSettings,
  type PublicVillage,
  type VillageSnapshot,
} from '@dwar/api-client';
import { useMapNavigation } from './map-navigation.js';
import { MapResize } from './map-resize.js';
import { MapOptions } from './map-options.js';
import { MapLegend, VillagePopup, ownerColor, villageGraphic } from './map-legend.js';

const coordinate = (value: string | null, fallback: number) =>
  value !== null && /^\d{1,3}$/.test(value) ? Number(value) : fallback;
export function WorldMap({ snapshot }: { snapshot: VillageSnapshot }) {
  const options = useQuery({
    queryKey: ['map-options', snapshot.world.id, snapshot.village.id],
    queryFn: () =>
      api.map(snapshot.world.id, snapshot.village.id, snapshot.village.x, snapshot.village.y),
  });
  if (!options.data)
    return (
      <div className="legacy-content">
        <p role={options.error ? 'alert' : 'status'}>
          {options.error?.message ?? 'Carregando mapa…'}
        </p>
      </div>
    );
  return <MapCanvas snapshot={snapshot} options={options.data} />;
}
function MapCanvas({ snapshot, options }: { snapshot: VillageSnapshot; options: MapSnapshot }) {
  const client = useQueryClient();
  const [resizeDraft, setResizeDraft] = useState<MapSettings | null>(null);
  const settings = resizeDraft ?? options.settings;
  const { width, height, minimapSize, contextMenu, popup } = settings;
  const resizeAction = useMutation({
    mutationFn: (next: MapSettings) =>
      api.mapAction(snapshot.world.id, snapshot.village.id, { type: 'settings', settings: next }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['map-options', snapshot.world.id] }),
        client.invalidateQueries({ queryKey: ['map', snapshot.world.id] }),
      ]);
    },
    onSettled: () => setResizeDraft(null),
  });
  const resizeProps = {
    settings,
    disabled: resizeAction.isPending,
    onPreview: setResizeDraft,
    onSave: (next: MapSettings) => resizeAction.mutate(next),
    onCancel: () => setResizeDraft(null),
  };
  const pixelWidth = width * 60,
    pixelHeight = height * 60,
    miniPixels = minimapSize * 5;

  const [params, setParams] = useSearchParams(),
    [selectedId, setSelectedId] = useState<number | null>(null);
  const [hover, setHover] = useState<{ village: PublicVillage; x: number; y: number } | null>(null);
  const routeX = coordinate(params.get('x'), snapshot.village.x),
    routeY = coordinate(params.get('y'), snapshot.village.y);
  const nav = useMapNavigation(
    routeX,
    routeY,
    (x, y) => {
      const next = new URLSearchParams(params);
      next.set('x', String(x));
      next.set('y', String(y));
      setParams(next, { replace: true });
    },
    width,
    height,
  );
  const { position, center } = nav;
  const map = useQuery({
    queryKey: ['map', snapshot.world.id, snapshot.village.id, center.x, center.y, minimapSize],
    queryFn: () => api.map(snapshot.world.id, snapshot.village.id, center.x, center.y),
    placeholderData: keepPreviousData,
    staleTime: 15000,
    refetchInterval: 15000,
  });
  const known = new Map(map.data?.villages.map((row) => [`${row.x}|${row.y}`, row]));
  const selected = map.data?.villages.find((row) => row.id === selectedId);
  const left = Math.floor(position.x),
    top = Math.floor(position.y),
    miniLeft = position.x - Math.floor((minimapSize - width) / 2),
    miniTop = position.y - Math.floor((minimapSize - height) / 2);
  function closeMenus() {
    setSelectedId(null);
    setHover(null);
  }
  function go(screen: string, extra: Record<string, string | number>) {
    setParams({ village: snapshot.village.id, screen, ...extra });
  }
  function info(village: PublicVillage) {
    go('info_village', { id: village.id });
  }
  function select(village?: PublicVillage) {
    setHover(null);
    if (!village) setSelectedId(null);
    else if (!contextMenu || village.id === selectedId) info(village);
    else setSelectedId(village.id);
  }
  function villageAt(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return known.get(
      `${Math.floor(position.x + (event.clientX - rect.left) / 60)}|${Math.floor(position.y + (event.clientY - rect.top) / 60)}`,
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    closeMenus();
    nav.focus(Number(form.get('x')), Number(form.get('y')));
  }
  function arrow(direction: string, label: string, dx: number, dy: number) {
    return (
      <button
        className="map-arrow"
        aria-label={label}
        onClick={() => {
          closeMenus();
          nav.block(dx, dy);
        }}
      >
        <img src={`/legacy/map/map_${direction}.png`} alt="" />
      </button>
    );
  }
  const contextActions = selected
    ? [
        {
          code: 'info',
          title: 'Informações da aldeia',
          offset: 144,
          x: -12,
          y: -12,
          action: () => info(selected),
        },
        ...(selected.playerId
          ? [
              {
                code: 'profile',
                title: 'Perfil do jogador',
                offset: 120,
                x: 20,
                y: -30,
                action: selected.playerId
                  ? () => go('info_player', { id: selected.playerId! })
                  : undefined,
              },
            ]
          : []),
        ...(selected.playerId
          ? [
              selected.own
                ? {
                    code: 'overview',
                    title: 'Visão da aldeia',
                    offset: 144,
                    x: 20,
                    y: 6,
                    action: () => setParams({ village: selected.id, screen: 'overview' }),
                  }
                : {
                    code: 'message',
                    title: 'Enviar mensagem',
                    offset: 96,
                    x: 20,
                    y: 6,
                    action: selected.playerId
                      ? () => go('mail', { mode: 'new', id: selected.playerId! })
                      : undefined,
                  },
            ]
          : []),
        ...(selected.id !== snapshot.village.id
          ? [
              {
                code: 'resources',
                title: 'Enviar recursos',
                offset: 0,
                x: -44,
                y: 6,
                action: () =>
                  go('market', { mode: 'send', x: String(selected.x), y: String(selected.y) }),
              },
              {
                code: 'troops',
                title: 'Enviar tropas',
                offset: 24,
                x: -44,
                y: -30,
                action: () =>
                  go('place', { mode: 'send', x: String(selected.x), y: String(selected.y) }),
              },
            ]
          : []),
      ]
    : [];
  return (
    <div
      className="legacy-content legacy-map-content"
      style={
        {
          '--map-width': `${pixelWidth}px`,
          '--map-height': `${pixelHeight}px`,
          '--mini-size': `${miniPixels}px`,
        } as import('react').CSSProperties
      }
    >
      <h1>
        Continente{' '}
        <span>
          {Math.floor(center.y / 100)}
          {Math.floor(center.x / 100)}
        </span>
      </h1>
      {map.error ? (
        <p className="error" role="alert">
          {map.error.message} <button onClick={() => void map.refetch()}>Atualizar</button>
        </p>
      ) : null}
      <div className="table-scroll">
        <table className="world-map-layout">
          <tbody>
            <tr>
              <td className="world-map-big">
                <table className="world-map-shell">
                  <tbody>
                    <tr>
                      <td />
                      <td className="map-arrow-cell">
                        {arrow('n', 'Mover mapa para o norte', 0, -1)}
                      </td>
                      <td />
                    </tr>
                    <tr>
                      <td className="map-arrow-cell">
                        {arrow('w', 'Mover mapa para o oeste', -1, 0)}
                      </td>
                      <td>
                        <table className="world-map-coordinate-frame">
                          <tbody>
                            <tr>
                              <td>
                                <div className="map-y-axis">
                                  {Array.from({ length: height + 1 }, (_, index) => (
                                    <span
                                      key={top + index}
                                      style={{ top: (top + index - position.y) * 60 }}
                                    >
                                      {top + index}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="world-map-viewport">
                                  <div
                                    className="world-map-region"
                                    role="region"
                                    aria-label="Mapa da região"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Escape') closeMenus();
                                      const delta: Record<string, [number, number]> = {
                                        ArrowLeft: [-1, 0],
                                        ArrowRight: [1, 0],
                                        ArrowUp: [0, -1],
                                        ArrowDown: [0, 1],
                                      };
                                      const step = delta[event.key];
                                      if (step) {
                                        event.preventDefault();
                                        closeMenus();
                                        nav.focus(center.x + step[0], center.y + step[1]);
                                      }
                                    }}
                                    onPointerDown={(event) => {
                                      setHover(null);
                                      nav.pointerDown(event);
                                    }}
                                    onPointerMove={(event) => {
                                      if (nav.pointerMove(event)) {
                                        closeMenus();
                                        return;
                                      }
                                      const village = villageAt(event);
                                      if (village && village.id !== selectedId) {
                                        setSelectedId(null);
                                        setHover({ village, x: event.clientX, y: event.clientY });
                                      } else setHover(null);
                                    }}
                                    onPointerUp={(event) => {
                                      const moved = nav.pointerUp(event);
                                      if (moved === false) select(villageAt(event));
                                    }}
                                    onPointerCancel={nav.pointerCancel}
                                    onPointerLeave={() => setHover(null)}
                                  >
                                    <div
                                      className="world-map-grid"
                                      style={{
                                        gridTemplateColumns: `repeat(${width + 1}, 60px)`,
                                        gridTemplateRows: `repeat(${height + 1}, 60px)`,
                                        width: (width + 1) * 60,
                                        height: (height + 1) * 60,
                                        left: (left - position.x) * 60,
                                        top: (top - position.y) * 60,
                                      }}
                                    >
                                      {Array.from(
                                        { length: (width + 1) * (height + 1) },
                                        (_, index) => {
                                          const x = left + (index % (width + 1)),
                                            y = top + Math.floor(index / (width + 1)),
                                            village = known.get(`${x}|${y}`),
                                            grass =
                                              (Math.abs((x * 73856093) ^ (y * 19349663)) % 8) + 1;
                                          return (
                                            <div
                                              className="world-map-tile"
                                              key={`${x}|${y}`}
                                              style={{
                                                backgroundImage: `url(/legacy/map/new/grass${grass}.png)`,
                                              }}
                                            >
                                              {village ? (
                                                <button
                                                  className="world-map-village"
                                                  aria-label={`${village.name} (${x}|${y})`}
                                                  style={{
                                                    backgroundColor: ownerColor(
                                                      village,
                                                      snapshot.village.id,
                                                      options.marks,
                                                    ),
                                                  }}
                                                  onClick={(event) => {
                                                    if (event.detail === 0) select(village);
                                                  }}
                                                  onFocus={(event) => {
                                                    const r =
                                                      event.currentTarget.getBoundingClientRect();
                                                    setHover({ village, x: r.right, y: r.bottom });
                                                  }}
                                                  onBlur={() => setHover(null)}
                                                >
                                                  <img
                                                    src={`/legacy/map/new/vil_${villageGraphic(village.points)}n.png`}
                                                    alt=""
                                                    draggable={false}
                                                  />
                                                </button>
                                              ) : null}
                                              {x % 5 === 0 ? (
                                                <span
                                                  className="map-sector-line vertical"
                                                  style={{
                                                    backgroundColor:
                                                      x % 100 === 0 ? '#000' : '#214b18',
                                                  }}
                                                />
                                              ) : null}
                                              {y % 5 === 0 ? (
                                                <span
                                                  className="map-sector-line horizontal"
                                                  style={{
                                                    backgroundColor:
                                                      y % 100 === 0 ? '#000' : '#214b18',
                                                  }}
                                                />
                                              ) : null}
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                  <MapResize mode="map" {...resizeProps} />
                                  <div className="world-minimap">
                                    <div
                                      className="world-minimap-surface"
                                      role="button"
                                      aria-label="Centralizar usando o minimapa"
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          closeMenus();
                                          nav.focus(snapshot.village.x, snapshot.village.y);
                                        }
                                      }}
                                      onPointerDown={(event) => {
                                        closeMenus();
                                        nav.pointerDown(event, true);
                                      }}
                                      onPointerMove={nav.pointerMove}
                                      onPointerCancel={nav.pointerCancel}
                                      onPointerUp={(event) => {
                                        const moved = nav.pointerUp(event);
                                        if (moved === false) {
                                          const rect = event.currentTarget.getBoundingClientRect();
                                          nav.focus(
                                            Math.floor(miniLeft + (event.clientX - rect.left) / 5),
                                            Math.floor(miniTop + (event.clientY - rect.top) / 5),
                                          );
                                        }
                                      }}
                                    >
                                      <svg
                                        viewBox={`0 0 ${miniPixels} ${miniPixels}`}
                                        aria-hidden="true"
                                        shapeRendering="crispEdges"
                                      >
                                        <rect
                                          width={miniPixels}
                                          height={miniPixels}
                                          fill="#57751a"
                                        />
                                        {map.data?.villages.map((row) => (
                                          <rect
                                            key={row.id}
                                            x={(row.x - miniLeft) * 5}
                                            y={(row.y - miniTop) * 5}
                                            width="6"
                                            height="6"
                                            fill={ownerColor(
                                              row,
                                              snapshot.village.id,
                                              options.marks,
                                            )}
                                          />
                                        ))}
                                        {Array.from({ length: minimapSize + 1 }, (_, index) => {
                                          const x = Math.ceil(miniLeft) + index,
                                            y = Math.ceil(miniTop) + index;
                                          return (
                                            <g key={index}>
                                              <path
                                                d={`M ${(x - miniLeft) * 5} 0 V ${miniPixels}`}
                                                stroke={
                                                  x % 100 === 0
                                                    ? '#000'
                                                    : x % 5 === 0
                                                      ? '#2f480d'
                                                      : '#426112'
                                                }
                                              />
                                              <path
                                                d={`M 0 ${(y - miniTop) * 5} H ${miniPixels}`}
                                                stroke={
                                                  y % 100 === 0
                                                    ? '#000'
                                                    : y % 5 === 0
                                                      ? '#2f480d'
                                                      : '#426112'
                                                }
                                              />
                                            </g>
                                          );
                                        })}
                                      </svg>
                                      <span
                                        className="minimap-viewport"
                                        style={{
                                          left: (position.x - miniLeft) * 5,
                                          top: (position.y - miniTop) * 5,
                                          width: width * 5,
                                          height: height * 5,
                                        }}
                                      />
                                    </div>
                                    <MapResize mode="minimap" {...resizeProps} />
                                  </div>
                                  <form
                                    key={`${center.x}|${center.y}`}
                                    className="world-map-coordinates"
                                    onSubmit={submit}
                                    aria-label="Centralizar mapa"
                                  >
                                    <label>
                                      X:{' '}
                                      <input
                                        name="x"
                                        aria-label="Coordenada X do mapa"
                                        size={3}
                                        maxLength={3}
                                        pattern="[0-9]+"
                                        inputMode="numeric"
                                        required
                                        defaultValue={center.x}
                                      />
                                    </label>{' '}
                                    <label>
                                      Y:{' '}
                                      <input
                                        name="y"
                                        aria-label="Coordenada Y do mapa"
                                        size={3}
                                        maxLength={3}
                                        pattern="[0-9]+"
                                        inputMode="numeric"
                                        required
                                        defaultValue={center.y}
                                      />
                                    </label>{' '}
                                    <button>OK</button>
                                  </form>
                                  {selected ? (
                                    <div
                                      className="world-map-context"
                                      role="group"
                                      aria-label={`Ações de ${selected.name}`}
                                    >
                                      {contextActions.map((item) => (
                                        <button
                                          key={item.code}
                                          className="map-context-action"
                                          title={item.title}
                                          aria-label={item.title}
                                          disabled={!item.action}
                                          style={{
                                            left: (selected.x - position.x) * 60 + 30 + item.x,
                                            top: (selected.y - position.y) * 60 + 30 + item.y,
                                            backgroundPositionX: -item.offset,
                                          }}
                                          onClick={item.action}
                                        />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td />
                              <td>
                                <div className="map-x-axis">
                                  {Array.from({ length: width + 1 }, (_, index) => (
                                    <span
                                      key={left + index}
                                      style={{ left: (left + index - position.x) * 60 }}
                                    >
                                      {left + index}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                      <td className="map-arrow-cell">
                        {arrow('e', 'Mover mapa para o leste', 1, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td />
                      <td className="map-arrow-cell">
                        {arrow('s', 'Mover mapa para o sul', 0, 1)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <MapLegend />
      </div>
      {resizeAction.error ? (
        <p className="error" role="alert">
          {resizeAction.error.message}
        </p>
      ) : null}
      <MapOptions snapshot={snapshot} map={options} />
      {hover && popup ? <VillagePopup village={hover.village} x={hover.x} y={hover.y} /> : null}
    </div>
  );
}

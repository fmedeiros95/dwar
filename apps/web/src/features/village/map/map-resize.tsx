import { useRef, type PointerEvent } from 'react';
import type { MapSettings } from '@dwar/api-client';

export function MapResize({
  mode,
  settings,
  disabled,
  onPreview,
  onSave,
  onCancel,
}: {
  mode: 'map' | 'minimap';
  settings: MapSettings;
  disabled: boolean;
  onPreview: (settings: MapSettings) => void;
  onSave: (settings: MapSettings) => void;
  onCancel: () => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; start: MapSettings } | null>(null);
  function resized(start: MapSettings, dx: number, dy: number): MapSettings {
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    if (mode === 'map') {
      const width = clamp(start.width + Math.round(dx / 60), 4, 30);
      const height = clamp(start.height + Math.round(dy / 60), 4, 30);
      return {
        ...start,
        width,
        height,
        minimapSize: Math.min(
          start.minimapSize,
          Math.floor((Math.min(width, height) * 60) / 25) * 5,
        ),
      };
    }
    const maximum = Math.min(120, Math.floor((Math.min(start.width, start.height) * 60) / 25) * 5);
    return {
      ...start,
      minimapSize: clamp(start.minimapSize + Math.round(Math.max(dx, dy) / 25) * 5, 20, maximum),
    };
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    onSave(resized(current.start, event.clientX - current.x, event.clientY - current.y));
  }
  return (
    <button
      type="button"
      className="map-resizer"
      disabled={disabled}
      aria-label={mode === 'map' ? 'Redimensionar mapa' : 'Redimensionar minimapa'}
      title="Arraste para redimensionar; use as setas do teclado para ajustar"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: settings };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        event.stopPropagation();
        onPreview(resized(current.start, event.clientX - current.x, event.clientY - current.y));
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        drag.current = null;
        onCancel();
      }}
      onKeyDown={(event) => {
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const step = delta[event.key];
        if (!step) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          mode === 'map'
            ? resized(settings, step[0] * 60, step[1] * 60)
            : resized(settings, (step[0] + step[1]) * 25, (step[0] + step[1]) * 25);
        onSave(next);
      }}
    />
  );
}

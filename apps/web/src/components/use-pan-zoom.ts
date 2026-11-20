import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

type View = { scale: number; x: number; y: number };

/**
 * Arrastar e dar zoom em um conteúdo de tamanho fixo (width x height) dentro de um viewport.
 * O conteúdo sempre cobre o viewport inteiro; o zoom mínimo é o que o cobre. Arrastar com o
 * mouse/dedo move a vista, a roda do mouse dá zoom no ponteiro e há atalhos de teclado.
 */
export function usePanZoom({
  width,
  height,
  focus = { x: width / 2, y: height / 2 },
  maxScale = 1.6,
}: {
  width: number;
  height: number;
  focus?: { x: number; y: number };
  maxScale?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const initialized = useRef(false);
  const drag = useRef<{
    pointer: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  const cover = size.w ? Math.max(size.w / width, size.h / height) : 1;

  const clamp = useCallback(
    (next: View): View => {
      const scale = Math.min(maxScale, Math.max(cover, next.scale));
      const minX = Math.min(0, size.w - width * scale);
      const minY = Math.min(0, size.h - height * scale);
      return {
        scale,
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [cover, maxScale, size.w, size.h, width, height],
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w) return;
    if (!initialized.current) {
      initialized.current = true;
      setView(
        clamp({
          scale: cover,
          x: size.w / 2 - focus.x * cover,
          y: size.h / 2 - focus.y * cover,
        }),
      );
    } else setView((current) => clamp(current));
  }, [size.w, size.h, cover, clamp, focus.x, focus.y]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      setView((current) => {
        const scale = Math.min(maxScale, Math.max(cover, current.scale * factor));
        const ratio = scale / current.scale;
        return clamp({ scale, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio });
      });
    },
    [clamp, cover, maxScale],
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    dragged.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!dragged.current && Math.hypot(dx, dy) < 5) return;
    if (!dragged.current) {
      dragged.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setView((current) => clamp({ ...current, x: state.originX + dx, y: state.originY + dy }));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    // O clique que encerra um arrasto não deve acionar edifícios; libera no próximo tick.
    setTimeout(() => {
      dragged.current = false;
    }, 0);
  };

  const zoomBy = useCallback(
    (factor: number) => zoomAt(factor, size.w / 2, size.h / 2),
    [zoomAt, size.w, size.h],
  );
  const reset = useCallback(
    () =>
      setView(
        clamp({ scale: cover, x: size.w / 2 - focus.x * cover, y: size.h / 2 - focus.y * cover }),
      ),
    [clamp, cover, size.w, size.h, focus.x, focus.y],
  );
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 80;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setView((current) => clamp({ ...current, x: current.x + move[0], y: current.y + move[1] }));
    } else if (event.key === '+' || event.key === '=') zoomBy(1.2);
    else if (event.key === '-') zoomBy(1 / 1.2);
    else if (event.key === '0') reset();
  };

  return {
    viewportRef,
    view,
    dragging,
    didDrag: () => dragged.current,
    zoomBy,
    reset,
    canZoomIn: view.scale < maxScale - 0.01,
    canZoomOut: view.scale > cover + 0.01,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
    },
  };
}

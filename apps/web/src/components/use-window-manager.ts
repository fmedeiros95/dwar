import { useCallback, useMemo, useRef, useState } from 'react';

export type WindowState = {
  id: number;
  /** Parâmetros da tela da janela (`screen=market&mode=…`), no formato de query string. */
  search: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
};

/** Margens fixas do jogo: trilho à esquerda e barra superior. */
export const frameInset = { left: 92, top: 68 };
export const maxWindows = 3;

function viewport() {
  return { vw: window.innerWidth, vh: window.innerHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Mantém a barra de título sempre ao alcance do mouse. */
export function clampPosition(x: number, y: number, w: number) {
  const { vw, vh } = viewport();
  return {
    x: clamp(x, frameInset.left - w + 140, vw - 140),
    y: clamp(y, frameInset.top, vh - 48),
  };
}

export function screenOf(search: string) {
  return new URLSearchParams(search).get('screen') ?? '';
}

export type WindowManager = ReturnType<typeof useWindowManager>;

export function useWindowManager(defaultSize: (screen: string) => { w: number; h: number }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const counter = useRef(0);
  const zIndex = useRef(0);

  /** Abre uma janela para a tela; se já houver uma da mesma tela, reaproveita e traz para a frente. */
  const open = useCallback(
    (search: string) => {
      const screen = screenOf(search);
      setWindows((current) => {
        const z = ++zIndex.current;
        const existing = current.find((item) => screenOf(item.search) === screen);
        if (existing)
          return current.map((item) =>
            item.id === existing.id ? { ...item, search, minimized: false, z } : item,
          );
        let list = current;
        if (list.length >= maxWindows) {
          const oldest = [...list].sort((a, b) => a.z - b.z)[0]!;
          list = list.filter((item) => item.id !== oldest.id);
        }
        const { vw, vh } = viewport();
        const size = defaultSize(screen);
        const w = Math.min(size.w, vw - frameInset.left - 24);
        const h = Math.min(size.h, vh - frameInset.top - 24);
        const step = list.length * 30;
        const position = clampPosition(
          frameInset.left + Math.max(24, (vw - frameInset.left - w) / 2) - 40 + step,
          frameInset.top + 28 + step,
          w,
        );
        return [
          ...list,
          { id: ++counter.current, search, ...position, w, h, minimized: false, maximized: false, z },
        ];
      });
    },
    [defaultSize],
  );

  const patch = useCallback((id: number, change: Partial<WindowState>) => {
    setWindows((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  return useMemo(
    () => ({
      windows,
      open,
      close: (id: number) => setWindows((current) => current.filter((item) => item.id !== id)),
      focus: (id: number) => patch(id, { z: ++zIndex.current, minimized: false }),
      minimize: (id: number) => patch(id, { minimized: true }),
      toggleMaximize: (id: number) => {
        setWindows((current) =>
          current.map((item) =>
            item.id === id ? { ...item, maximized: !item.maximized, z: ++zIndex.current } : item,
          ),
        );
      },
      move: (id: number, x: number, y: number) => patch(id, { x, y }),
      resize: (id: number, w: number, h: number) => patch(id, { w, h }),
      setSearch: (id: number, search: string) => patch(id, { search }),
      /** A janela em foco é a visível com maior ordem de empilhamento. */
      focusedId: windows
        .filter((item) => !item.minimized)
        .sort((a, b) => b.z - a.z)[0]?.id,
    }),
    [windows, open, patch],
  );
}

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { WindowScopeContext, serializeParams, type GameParams } from '../routing.js';
import { clampPosition, type WindowManager, type WindowState } from './use-window-manager.js';

const minSize = { w: 360, h: 240 };

function GameWindow({
  win,
  manager,
  title,
  focused,
  rank,
  onNavigate,
  children,
}: {
  win: WindowState;
  manager: WindowManager;
  title: string;
  focused: boolean;
  rank: number;
  onNavigate: (search: string) => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // A janela que vem para a frente recebe o foco, para o teclado e o leitor de tela começarem
  // nela. As janelas não são modais: o Tab sai delas normalmente.
  useEffect(() => {
    if (!focused || root.current?.contains(document.activeElement)) return;
    // O body (janela de cima fechada) e a barra de janelas não servem de origem: a anterior vale.
    const from = document.activeElement;
    if (from !== document.body && !from?.closest('.window-dock')) opener.current = from;
    root.current?.focus({ preventScroll: true });
  }, [focused, win.z]);

  /** Ao fechar ou minimizar, o foco volta para onde estava, se esse lugar ainda existe. */
  function leave(action: (id: number) => void) {
    const back = opener.current;
    const inside = root.current?.contains(document.activeElement);
    action(win.id);
    if (!inside) return;
    // Depois do React retirar a janela; um quadro de desenho pode demorar em segundo plano.
    setTimeout(() => {
      if (
        back instanceof HTMLElement &&
        back !== document.body &&
        back.isConnected &&
        back.getClientRects().length
      )
        back.focus({ preventScroll: true });
    });
  }
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (win.maximized || event.button !== 0) return;
    drag.current = { dx: event.clientX - win.x, dy: event.clientY - win.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const next = clampPosition(
      event.clientX - drag.current.dx,
      event.clientY - drag.current.dy,
      win.w,
    );
    manager.move(win.id, next.x, next.y);
  }
  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (win.maximized || event.button !== 0) return;
    event.stopPropagation();
    resize.current = { x: event.clientX, y: event.clientY, w: win.w, h: win.h };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onResize(event: PointerEvent<HTMLDivElement>) {
    const start = resize.current;
    if (!start) return;
    manager.resize(
      win.id,
      Math.max(minSize.w, start.w + event.clientX - start.x),
      Math.max(minSize.h, start.h + event.clientY - start.y),
    );
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (
      event.key === 'Escape' &&
      !event.defaultPrevented &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
    )
      leave(manager.close);
  }

  const style = win.maximized
    ? { zIndex: 40 + rank }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: 40 + rank };

  return (
    <div
      ref={root}
      tabIndex={-1}
      className="game-window"
      role="dialog"
      aria-label={title}
      data-focused={focused ? 'true' : undefined}
      data-maximized={win.maximized ? 'true' : undefined}
      hidden={win.minimized}
      style={style}
      onPointerDownCapture={() => {
        if (!focused) manager.focus(win.id);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="gw-bar"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => manager.toggleMaximize(win.id)}
      >
        <span className="gw-title">{title}</span>
        <div className="gw-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Minimizar" onClick={() => leave(manager.minimize)}>
            <Minus size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gw-maximize"
            aria-label={win.maximized ? 'Restaurar' : 'Maximizar'}
            onClick={() => manager.toggleMaximize(win.id)}
          >
            {win.maximized ? (
              <Minimize2 size={14} aria-hidden="true" />
            ) : (
              <Maximize2 size={14} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="gw-close"
            aria-label="Fechar"
            onClick={() => leave(manager.close)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* O teclado também precisa rolar telas sem nenhum controle, como Medalhas. */}
      <div className="gw-body" role="group" aria-label={`Conteúdo: ${title}`} tabIndex={0}>
        <WindowScopeContext.Provider
          value={{
            params: new URLSearchParams(win.search),
            set: (next) => {
              const previous = new URLSearchParams(win.search);
              const value: GameParams = typeof next === 'function' ? next(previous) : next;
              onNavigate(serializeParams(value).toString());
            },
          }}
        >
          {children}
        </WindowScopeContext.Provider>
      </div>
      {win.maximized ? null : (
        <div
          className="gw-resize"
          aria-hidden="true"
          onPointerDown={startResize}
          onPointerMove={onResize}
          onPointerUp={() => (resize.current = null)}
          onPointerCancel={() => (resize.current = null)}
        />
      )}
    </div>
  );
}

/** Camada de janelas flutuantes e a barra com as janelas abertas. */
export function WindowLayer({
  manager,
  titleOf,
  onNavigate,
  render,
}: {
  manager: WindowManager;
  titleOf: (search: string) => string;
  /** Navegação feita de dentro da janela; o pai decide se vira outra tela da janela ou o fundo. */
  onNavigate: (id: number, search: string) => void;
  render: (win: WindowState) => ReactNode;
}) {
  if (!manager.windows.length) return null;
  const order = [...manager.windows].sort((a, b) => a.z - b.z).map((item) => item.id);
  return (
    <>
      {manager.windows.map((win) => (
        <GameWindow
          key={win.id}
          win={win}
          manager={manager}
          title={titleOf(win.search)}
          focused={manager.focusedId === win.id}
          rank={order.indexOf(win.id)}
          onNavigate={(search) => onNavigate(win.id, search)}
        >
          {render(win)}
        </GameWindow>
      ))}
      <div className="window-dock" role="toolbar" aria-label="Janelas abertas">
        {manager.windows.map((win) => (
          <button
            key={win.id}
            type="button"
            className="dock-chip"
            data-active={manager.focusedId === win.id ? 'true' : undefined}
            data-minimized={win.minimized ? 'true' : undefined}
            onClick={() =>
              manager.focusedId === win.id ? manager.minimize(win.id) : manager.focus(win.id)
            }
          >
            {titleOf(win.search)}
          </button>
        ))}
      </div>
    </>
  );
}

import { useEffect, useRef, useState, type PointerEvent } from 'react';

type Point = { x: number; y: number };
const bound = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
export function useMapNavigation(
  routeX: number,
  routeY: number,
  onCommit: (x: number, y: number) => void,
  width = 13,
  height = 9,
) {
  const halfX = Math.floor(width / 2),
    halfY = Math.floor(height / 2);
  const route = `${routeX}|${routeY}|${width}|${height}`;
  // `from` e `to` são as rotas (da URL) em que a câmera vale. Ao confirmar um arrasto a URL só muda
  // um instante depois; sem aceitar as duas, a posição voltaria à antiga por um quadro e pularia.
  const [camera, setCamera] = useState<{ from: string; to: string; position: Point } | null>(null);
  const position =
    camera && (camera.from === route || camera.to === route)
      ? camera.position
      : { x: bound(routeX - halfX, 1000 - width), y: bound(routeY - halfY, 1000 - height) };
  const animation = useRef<ReturnType<typeof setInterval> | null>(null);
  const gesture = useRef<{
    id: number;
    client: Point;
    start: Point;
    scale: number;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    // a URL alcançou a câmera: a rota antiga deixa de valer (voltar no navegador reposiciona)
    if (camera && camera.to === route && camera.from !== route) setCamera({ ...camera, from: route });
  }, [camera, route]);
  useEffect(
    () => () => {
      if (animation.current !== null) clearInterval(animation.current);
    },
    [],
  );
  function stopAnimation() {
    if (animation.current !== null) clearInterval(animation.current);
    animation.current = null;
  }
  function move(next: Point, commit = false) {
    const bounded = { x: bound(next.x, 1000 - width), y: bound(next.y, 1000 - height) };
    const x = Math.floor(bounded.x + halfX),
      y = Math.floor(bounded.y + halfY);
    const target = commit ? `${x}|${y}|${width}|${height}` : route;
    setCamera({ from: route, to: target, position: bounded });
    if (commit) onCommit(x, y);
    return bounded;
  }
  function focus(x: number, y: number) {
    stopAnimation();
    move({ x: x - halfX, y: y - halfY }, true);
  }
  function block(dx: number, dy: number) {
    stopAnimation();
    let steps = 0;
    // actions/map.php keeps TWMap.size=[7,7]; scrollBlock advances one field every 30ms.
    animation.current = setInterval(() => {
      steps += 1;
      move(
        { x: Math.floor(position.x) + dx * steps, y: Math.floor(position.y) + dy * steps },
        steps === 7,
      );
      if (steps === 7) stopAnimation();
    }, 30);
  }
  function pointerDown(event: PointerEvent<HTMLElement>, minimap = false) {
    if (event.button !== 0) return;
    stopAnimation();
    gesture.current = {
      id: event.pointerId,
      client: { x: event.clientX, y: event.clientY },
      start: position,
      // Mapa em tela cheia: o conteúdo acompanha o cursor 1:1 (60px por tile).
      scale: minimap ? 1 / 5 : 1 / 60,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return false;
    const dx = event.clientX - active.client.x,
      dy = event.clientY - active.client.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) active.moved = true;
    if (active.moved)
      move({ x: active.start.x - dx * active.scale, y: active.start.y - dy * active.scale });
    return true;
  }
  function pointerUp(event: PointerEvent<HTMLElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return null;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (active.moved)
      move(
        {
          x: active.start.x - (event.clientX - active.client.x) * active.scale,
          y: active.start.y - (event.clientY - active.client.y) * active.scale,
        },
        true,
      );
    return active.moved;
  }
  function pointerCancel() {
    gesture.current = null;
    move(position, true);
  }
  return {
    position,
    center: { x: Math.floor(position.x + halfX), y: Math.floor(position.y + halfY) },
    focus,
    block,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
  };
}
